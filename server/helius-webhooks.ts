import { Request, Response } from 'express';
import crypto from 'crypto';

// In-memory storage for Helius webhook data (can be replaced with database in production)
interface StakingData {
  walletAddress: string;
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastUpdateTime: Date;
}

interface TokenTransferData {
  fromWallet: string;
  toWallet: string;
  amount: number;
  timestamp: Date;
  signature: string;
  referralCode?: string;
}

// Simple in-memory storage (replace with database in production)
// Export this Map so it can be accessed from other modules
export const stakingDataStore = new Map<string, StakingData>();
const tokenTransferStore: TokenTransferData[] = [];

// Configure webhook secret (should match the one set in Helius)
const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET || 'default-webhook-secret';

// Verify webhook signature (optional but recommended for security)
function verifyWebhookSignature(req: Request): boolean {
  // Skip validation if no secret is set
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'default-webhook-secret') {
    console.warn('WEBHOOK_SECRET not properly configured, skipping signature verification');
    return true;
  }

  // First check if using x-api-key header (our configuration)
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    console.log('Verifying webhook using x-api-key');
    return apiKey === WEBHOOK_SECRET;
  }

  // Fallback to standard Helius signature verification if available
  const signature = req.headers['x-helius-signature'] as string;
  if (!signature) {
    console.warn('No authentication headers found in webhook request');
    return false;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const calculatedSignature = hmac
    .update(JSON.stringify(req.body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

// Parse Helius transaction data for stake events
export function handleStakeEvent(req: Request, res: Response) {
  try {
    // Verify webhook signature (for security)
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const transactions = req.body;
    
    console.log('Received stake event:', JSON.stringify(transactions, null, 2));
    
    // Process each transaction in the webhook
    for (const tx of transactions) {
      // Find the stake instruction in the transaction
      const stakeInstruction = tx.instructions?.find((instr: any) => 
        instr.programId === 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm' && 
        (instr.data?.startsWith('stake') || 
         (instr.parsed?.type === 'stake'))
      );
      
      if (!stakeInstruction) {
        console.log('No stake instruction found in transaction');
        continue;
      }
      
      // Extract staker wallet address from feePayer or user account
      let stakerWallet = '';
      
      // Try to get it from accountData first
      if (tx.accountData && Array.isArray(tx.accountData)) {
        const accountData = tx.accountData.find((acc: any) => acc.account === tx.feePayer);
        if (accountData) {
          stakerWallet = accountData.owner;
        }
      }
      
      // If not found, try to get it from user account in instruction
      if (!stakerWallet && stakeInstruction.accounts) {
        const userAccount = stakeInstruction.accounts.find((acc: any) => acc.name === 'user');
        if (userAccount) {
          stakerWallet = userAccount.pubkey;
        }
      }
      
      // Last resort: use feePayer directly
      if (!stakerWallet) {
        stakerWallet = tx.feePayer;
      }
      
      // Extract amount from parsed data or data string
      let amountStaked = 0;
      
      // Try to get it from parsed data first
      if (stakeInstruction.parsed?.info?.amount) {
        amountStaked = parseFloat(stakeInstruction.parsed.info.amount) / 1e9; // Convert from lamports to SOL
      } 
      // If not found, try to extract from data string (e.g. "stake:1000000")
      else if (stakeInstruction.data && typeof stakeInstruction.data === 'string') {
        const dataParts = stakeInstruction.data.split(':');
        if (dataParts.length > 1) {
          amountStaked = parseFloat(dataParts[1]) / 1e9;
        }
      }
      
      if (!stakerWallet || amountStaked <= 0) {
        console.log(`Skipping invalid stake data: wallet=${stakerWallet}, amount=${amountStaked}`);
        continue;
      }
      
      // Store staking data
      stakingDataStore.set(stakerWallet, {
        walletAddress: stakerWallet,
        amountStaked,
        pendingRewards: 0, // Will be updated separately
        stakedAt: new Date(tx.timestamp * 1000),
        lastUpdateTime: new Date()
      });
      
      console.log(`Processed stake: ${stakerWallet} staked ${amountStaked}`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing stake event:', error);
    res.status(500).json({ error: 'Failed to process stake event' });
  }
}

// Parse Helius transaction data for unstake events
export function handleUnstakeEvent(req: Request, res: Response) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const transactions = req.body;
    
    console.log('Received unstake event:', JSON.stringify(transactions, null, 2));
    
    // Process each transaction in the webhook
    for (const tx of transactions) {
      // Find the unstake instruction
      const unstakeInstruction = tx.instructions?.find((instr: any) => 
        instr.programId === 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm' && 
        instr.data.startsWith('unstake')
      );
      
      if (!unstakeInstruction) continue;
      
      // Extract staker wallet and amount
      const stakerWallet = tx.accountData.find((acc: any) => acc.account === tx.feePayer)?.owner || '';
      const amountUnstaked = parseFloat(unstakeInstruction.parsed?.info?.amount || '0') / 1e9;
      
      // Update staking data
      const existingStake = stakingDataStore.get(stakerWallet);
      if (existingStake) {
        existingStake.amountStaked = Math.max(0, existingStake.amountStaked - amountUnstaked);
        existingStake.lastUpdateTime = new Date();
        stakingDataStore.set(stakerWallet, existingStake);
      }
      
      console.log(`Processed unstake: ${stakerWallet} unstaked ${amountUnstaked}`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing unstake event:', error);
    res.status(500).json({ error: 'Failed to process unstake event' });
  }
}

// Parse Helius transaction data for token transfers
export function handleTokenTransfer(req: Request, res: Response) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const transactions = req.body;
    
    console.log('Received token transfer event:', JSON.stringify(transactions, null, 2));
    
    // Process each transaction
    for (const tx of transactions) {
      // Check if it's a token transfer for our token
      const tokenTransfer = tx.tokenTransfers?.find((transfer: any) => 
        transfer.mint === '12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5'
      );
      
      if (!tokenTransfer) continue;
      
      // Extract transfer data
      const fromWallet = tokenTransfer.fromUserAccount || '';
      const toWallet = tokenTransfer.toUserAccount || '';
      const amount = parseFloat(tokenTransfer.tokenAmount) / 1e9; // Adjust decimals as needed
      
      // Store transfer data
      tokenTransferStore.push({
        fromWallet,
        toWallet,
        amount,
        timestamp: new Date(tx.timestamp * 1000),
        signature: tx.signature,
        // Extract referral code if present in memo or instruction data
        referralCode: tx.instructions?.find((i: any) => i.programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')?.parsed?.info?.memo || undefined
      });
      
      console.log(`Processed transfer: ${fromWallet} sent ${amount} tokens to ${toWallet}`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing token transfer:', error);
    res.status(500).json({ error: 'Failed to process token transfer' });
  }
}

// Parse Helius transaction data for claim rewards
export function handleClaimEvent(req: Request, res: Response) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const transactions = req.body;
    
    console.log('Received claim event:', JSON.stringify(transactions, null, 2));
    
    // Process each transaction
    for (const tx of transactions) {
      // Find the claim instruction
      const claimInstruction = tx.instructions?.find((instr: any) => 
        instr.programId === 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm' && 
        instr.data.startsWith('claim')
      );
      
      if (!claimInstruction) continue;
      
      // Extract claimer wallet and amount
      const claimer = tx.accountData.find((acc: any) => acc.account === tx.feePayer)?.owner || '';
      const amountClaimed = parseFloat(claimInstruction.parsed?.info?.amount || '0') / 1e9;
      
      // Update staking data to reset pendingRewards
      const existingStake = stakingDataStore.get(claimer);
      if (existingStake) {
        existingStake.pendingRewards = 0;
        existingStake.lastUpdateTime = new Date();
        stakingDataStore.set(claimer, existingStake);
      }
      
      console.log(`Processed claim: ${claimer} claimed ${amountClaimed} rewards`);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing claim event:', error);
    res.status(500).json({ error: 'Failed to process claim event' });
  }
}

// Get staking data for a specific wallet
export function getStakingInfo(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Get staking data for the wallet
    const stakingData = stakingDataStore.get(walletAddress);
    
    if (!stakingData) {
      return res.status(404).json({ 
        walletAddress,
        amountStaked: 0,
        pendingRewards: 0,
        stakedAt: null,
        lastUpdateTime: null,
        dataSource: 'helius'
      });
    }
    
    // Calculate estimated APY and any pending rewards
    // This is a simplified example - actual APY calculations would be more complex
    const currentAPY = 120; // 120%
    const stakedTimeMs = Date.now() - stakingData.stakedAt.getTime();
    const stakedTimeDays = stakedTimeMs / (1000 * 60 * 60 * 24);
    const pendingRewards = stakingData.amountStaked * (currentAPY / 100) * (stakedTimeDays / 365);
    
    res.status(200).json({
      ...stakingData,
      pendingRewards,
      estimatedAPY: currentAPY,
      dataSource: 'helius'
    });
  } catch (error) {
    console.error('Error fetching staking info:', error);
    res.status(500).json({ error: 'Failed to fetch staking info' });
  }
}

// Get token transfers for a wallet
export function getTokenTransfers(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Filter transfers involving the wallet
    const transfers = tokenTransferStore.filter(
      transfer => transfer.fromWallet === walletAddress || transfer.toWallet === walletAddress
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by most recent
    
    res.status(200).json(transfers);
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    res.status(500).json({ error: 'Failed to fetch token transfers' });
  }
}

// Get referral stats for a wallet
export function getReferralStats(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Calculate referral stats based on transfers with referral codes
    const referralTransfers = tokenTransferStore.filter(
      transfer => transfer.toWallet === walletAddress && transfer.referralCode
    );
    
    const totalReferrals = new Set(referralTransfers.map(t => t.fromWallet)).size;
    const totalEarnings = referralTransfers.reduce((sum, t) => sum + t.amount * 0.05, 0); // 5% referral reward
    
    res.status(200).json({
      walletAddress,
      totalReferrals,
      totalEarnings,
      referralCode: walletAddress.slice(0, 8), // Simplified referral code generation
      recentActivity: referralTransfers.slice(0, 5).map(t => ({
        date: t.timestamp.toISOString(),
        fromWallet: t.fromWallet,
        amount: t.amount,
        reward: t.amount * 0.05,
      }))
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
}

// Get global staking stats
export function getGlobalStats(req: Request, res: Response) {
  try {
    // Calculate total staked tokens
    let totalStaked = 0;
    
    // Convert Map iterator to array to avoid compatibility issues
    const stakeValues = Array.from(stakingDataStore.values());
    for (const stake of stakeValues) {
      totalStaked += stake.amountStaked;
    }
    
    res.status(200).json({
      totalStaked,
      stakersCount: stakingDataStore.size,
      currentAPY: 120, // 120%
      stakingVaultAddress: 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm',
      lastUpdated: new Date().toISOString(),
      dataSource: 'helius'
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
}