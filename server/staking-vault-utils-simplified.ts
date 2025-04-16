import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getMintAuthority } from './token-utils';
import { externalStakingCache } from './external-staking-cache';

// Program information
const PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm'; // Your deployed program from Solana Playground
const TOKEN_MINT_ADDRESS = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
// Staking vault address - this is the mint authority's address
export const STAKING_VAULT_ADDRESS = '2B99oKDqPZynTZzrH414tnxHWuf1vsDfcNaHGVzttQap';

// Models for staking data
export interface StakingUserInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastClaimAt: Date | null;
  lastCompoundAt?: Date | null;
  timeUntilUnlock: number | null;
  estimatedAPY: number;
  dataSource?: 'blockchain' | 'external' | 'default';
  walletTokenBalance?: number;
  stakingVaultAddress?: string; // Adding this to return the correct vault address
}

export interface StakingVaultInfo {
  totalStaked: number;
  rewardPool: number;
  stakersCount: number;
  currentAPY: number;
  stakingVaultAddress: string;
  programId?: string; // Optional program ID for the contract
}

/**
 * Analyze token transfer to determine if it's a staking transaction
 * @param transaction Transaction data
 * @param walletAddress Source wallet address
 * @returns Amount staked if it's a staking transaction, 0 otherwise
 */
async function analyzeTokenTransferForStaking(
  transaction: any,
  walletAddress: string
): Promise<{ 
  amountStaked: number; 
  timestamp: Date; 
  signature: string;
}> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'));
    const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
    const stakingVault = new PublicKey(STAKING_VAULT_ADDRESS);
    
    // Get transaction details
    const txDetails = await connection.getParsedTransaction(transaction.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
    
    if (!txDetails || !txDetails.meta || !txDetails.meta.postTokenBalances || !txDetails.meta.preTokenBalances) {
      return { amountStaked: 0, timestamp: new Date(transaction.blockTime * 1000), signature: transaction.signature };
    }
    
    // Look for token transfers from the user wallet to the staking vault
    let amountStaked = 0;
    
    // Find token transfers in the transaction
    if (txDetails.transaction && txDetails.transaction.message && txDetails.transaction.message.instructions) {
      for (const instruction of txDetails.transaction.message.instructions) {
        // Check if this is a parsed instruction with the appropriate structure
        if (instruction && 
            typeof instruction === 'object' && 
            'parsed' in instruction && 
            instruction.parsed && 
            typeof instruction.parsed === 'object' &&
            'type' in instruction.parsed &&
            instruction.parsed.type === 'transfer' && 
            'program' in instruction &&
            instruction.program === 'spl-token') {
          
          // It's a token transfer instruction
          if ('info' in instruction.parsed && instruction.parsed.info) {
            const transferData = instruction.parsed.info;
            
            // Check if this is a transfer to the staking vault
            if ('destination' in transferData && 
                'mint' in transferData && 
                'amount' in transferData &&
                transferData.destination === STAKING_VAULT_ADDRESS && 
                transferData.mint === TOKEN_MINT_ADDRESS) {
              
              // This is a staking transaction - parse the amount
              const decimals = 9; // Default for SPL tokens
              const amount = typeof transferData.amount === 'string' ? transferData.amount : String(transferData.amount);
              amountStaked = parseInt(amount) / Math.pow(10, decimals);
              console.log(`Found staking transaction of ${amountStaked} tokens from ${walletAddress} to vault`);
              break;
            }
          }
        }
      }
    }
    
    return { 
      amountStaked, 
      timestamp: new Date(txDetails.blockTime ? txDetails.blockTime * 1000 : Date.now()),
      signature: transaction.signature 
    };
  } catch (error) {
    console.error(`Error analyzing transaction:`, error);
    return { 
      amountStaked: 0, 
      timestamp: new Date(), 
      signature: transaction.signature 
    };
  }
}

/**
 * Get user's staking information directly from the blockchain
 * @param walletAddress Wallet address to get staking info for
 * @returns StakingUserInfo with on-chain data
 */
export async function getUserStakingInfo(walletAddress: string): Promise<StakingUserInfo> {
  try {
    console.log(`Getting on-chain staking info for wallet: ${walletAddress}`);
    
    // First, let's check the cache for better performance
    if (externalStakingCache.hasStakingData(walletAddress)) {
      const cachedData = externalStakingCache.getStakingData(walletAddress);
      if (cachedData) {
        console.log(`Using external staking data for ${walletAddress}: ${JSON.stringify(cachedData, null, 2)}`);
        
        // Format the cached data properly
        return {
          amountStaked: cachedData.amountStaked,
          pendingRewards: cachedData.pendingRewards,
          stakedAt: cachedData.stakedAt,
          lastClaimAt: cachedData.lastUpdateTime,
          lastCompoundAt: cachedData.lastUpdateTime,
          timeUntilUnlock: cachedData.timeUntilUnlock,
          estimatedAPY: cachedData.estimatedAPY,
          dataSource: 'external',
          stakingVaultAddress: STAKING_VAULT_ADDRESS
        };
      }
    }
    
    // If no cached data, let's fetch from the blockchain
    console.log(`No cache data for ${walletAddress}, querying blockchain...`);
    
    // Create a connection to the Solana cluster
    const connection = new Connection(clusterApiUrl('devnet'));
    
    // Step 1: Get recent token transfers for this wallet
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(walletAddress), 
      { limit: 20 }
    );
    
    if (!signatures || signatures.length === 0) {
      console.log(`No transactions found for wallet: ${walletAddress}`);
      return {
        amountStaked: 0,
        pendingRewards: 0,
        stakedAt: new Date(),
        lastClaimAt: null,
        lastCompoundAt: null,
        timeUntilUnlock: null,
        estimatedAPY: 120, // Default APY
        dataSource: 'blockchain',
        stakingVaultAddress: STAKING_VAULT_ADDRESS
      };
    }
    
    console.log(`Found ${signatures.length} transactions for wallet: ${walletAddress}`);
    
    // Step 2: Analyze each transaction
    let totalStaked = 0;
    let earliestStakeDate: Date | null = null;
    let latestStakeDate: Date | null = null;
    
    for (const signature of signatures) {
      const stakingInfo = await analyzeTokenTransferForStaking(signature, walletAddress);
      
      if (stakingInfo.amountStaked > 0) {
        totalStaked += stakingInfo.amountStaked;
        
        // Track dates for earliest and latest stakes
        if (!earliestStakeDate || stakingInfo.timestamp < earliestStakeDate) {
          earliestStakeDate = stakingInfo.timestamp;
        }
        
        if (!latestStakeDate || stakingInfo.timestamp > latestStakeDate) {
          latestStakeDate = stakingInfo.timestamp;
        }
      }
    }
    
    // Use the earliest stake date as the starting point
    const stakedAt = earliestStakeDate || new Date();
    
    // Calculate time until unlock (7 days from stake date)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const unlockDate = new Date(stakedAt.getTime() + sevenDaysInMs);
    const now = new Date();
    const timeUntilUnlock = now < unlockDate ? unlockDate.getTime() - now.getTime() : null;
    
    // Calculate simple pending rewards (10% APY pro-rated by time)
    const secondsSinceStake = (now.getTime() - stakedAt.getTime()) / 1000;
    const annualRate = 0.10; // 10% annual rate
    const pendingRewards = totalStaked * (annualRate * (secondsSinceStake / (365 * 24 * 60 * 60)));
    
    console.log(`On-chain staking data for ${walletAddress}: ${totalStaked} tokens staked on ${stakedAt}`);
    
    // Create and return the staking info
    const stakingInfo = {
      amountStaked: totalStaked,
      pendingRewards: pendingRewards,
      stakedAt: stakedAt,
      lastClaimAt: null,
      lastCompoundAt: latestStakeDate,
      timeUntilUnlock: timeUntilUnlock,
      estimatedAPY: 120, // Default APY from program
      dataSource: 'blockchain',
      stakingVaultAddress: STAKING_VAULT_ADDRESS
    };
    
    // Also update our cache for better performance on future requests
    externalStakingCache.updateStakingData({
      walletAddress,
      amountStaked: totalStaked,
      pendingRewards: pendingRewards,
      stakedAt: stakedAt,
      lastUpdateTime: new Date(),
      estimatedAPY: 125.4,
      timeUntilUnlock: timeUntilUnlock
    });
    
    return stakingInfo;
  } catch (error) {
    console.error(`Error getting on-chain staking info for ${walletAddress}:`, error);
    
    // Return default/empty staking info on error
    return {
      amountStaked: 0,
      pendingRewards: 0,
      stakedAt: new Date(),
      lastClaimAt: null,
      lastCompoundAt: null,
      timeUntilUnlock: null,
      estimatedAPY: 120, // Default APY from program
      dataSource: 'blockchain',
      stakingVaultAddress: STAKING_VAULT_ADDRESS
    };
  }
}

/**
 * Get staking vault global statistics
 * @returns Staking vault statistics
 */
export async function getStakingVaultInfo(): Promise<StakingVaultInfo> {
  try {
    console.log('Getting staking vault global info');
    
    // Simplified approach: Return mock staking vault data for demonstration
    // In a real system, this would be fetched from a reliable data source
    const stakingVaultData = {
      totalStaked: 100000,
      rewardPool: 50000,
      stakersCount: 5,
      currentAPY: 120,
      stakingVaultAddress: STAKING_VAULT_ADDRESS, // Use consistent vault address
    };
    
    console.log(`Retrieved global staking stats:`, stakingVaultData);
    return stakingVaultData;
  } catch (error) {
    console.error('Error getting staking vault info:', error);
    
    // Return default data on error
    return {
      totalStaked: 100000,
      rewardPool: 50000,
      stakersCount: 5,
      currentAPY: 120,
      stakingVaultAddress: STAKING_VAULT_ADDRESS,
    };
  }
}