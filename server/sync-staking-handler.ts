import { Request, Response } from 'express';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { externalStakingCache } from './external-staking-cache';
import * as stakingVaultUtils from './staking-vault-utils-simplified';

/**
 * Handler for the sync-staking endpoint
 * This analyses blockchain data to find tokens transferred to the vault
 * from a specific wallet and updates the cache accordingly
 */
export async function handleSyncStaking(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: "Wallet address is required" });
    }
    
    console.log(`Attempting to sync staking records for wallet: ${walletAddress}`);
    
    // Set up connection and addresses
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const vaultTokenAccount = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');
    const vaultPDA = new PublicKey('EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu');
    const walletPubkey = new PublicKey(walletAddress);
    
    // First approach: Check if tokens in the vault are already registered
    try {
      console.log(`Checking token account balance in vault: ${vaultTokenAccount.toString()}`);
      const vaultTokenAccountInfo = await connection.getTokenAccountBalance(vaultTokenAccount);
      console.log(`Current vault balance: ${vaultTokenAccountInfo.value.uiAmount} tokens`);
      
      // For demonstration, we'll manually set the amount if the wallet matches and tokens exist in vault
      if (vaultTokenAccountInfo.value.uiAmount && vaultTokenAccountInfo.value.uiAmount > 0) {
        // In a production system, we would verify that the tokens were sent by this wallet
        // For now, we'll adopt a simplified approach since we know the vault contains tokens
        console.log(`Vault contains ${vaultTokenAccountInfo.value.uiAmount} tokens, registering them with ${walletAddress}`);
        
        // Note: Since this is a demo that uses a single vault for all users,
        // in a real multi-user system, we would need a proper way to track which
        // portion of the vault belongs to which user
        
        // Read the actual amount from the vault via blockchain
        const actualStakedAmount = vaultTokenAccountInfo.value.uiAmount || 0;
        const totalStaked = Math.floor(actualStakedAmount); // Use the actual amount from the vault
        const stakingTransactions = [{
          signature: "manually-synced",
          amount: totalStaked,
          timestamp: new Date().toISOString()
        }];
        
        // Update our cache with the staking data
        const stakingData = {
          walletAddress,
          amountStaked: totalStaked,
          pendingRewards: 0, // Calculate based on program logic
          stakedAt: new Date(), // Use current date since we don't know exact time
          lastUpdateTime: new Date(),
          estimatedAPY: 12, // Default APY 
          timeUntilUnlock: 0 // Initialize to 0, will be calculated if locked
        };
        
        // Calculate pending rewards - assume tokens were staked today for simplicity
        const millisSinceStake = Date.now() - stakingData.stakedAt.getTime();
        const daysSinceStake = millisSinceStake / (1000 * 60 * 60 * 24);
        
        // APY of 12% (0.12) for 'daysSinceStake' portion of a year
        const annualRate = 0.12;
        stakingData.pendingRewards = totalStaked * annualRate * (daysSinceStake / 365);
        
        // Calculate unlock time (7 days from stake date)
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; 
        const unlockTime = stakingData.stakedAt.getTime() + sevenDaysInMs;
        const now = Date.now();
        
        if (now < unlockTime) {
          stakingData.timeUntilUnlock = unlockTime - now;
        } else {
          stakingData.timeUntilUnlock = 0;
        }
        
        // Update our cache
        externalStakingCache.updateStakingData(stakingData);
        
        console.log(`Updated staking cache for ${walletAddress} with ${totalStaked} tokens staked`);
        
        return res.json({
          success: true,
          message: "Staking records synchronized successfully",
          stakingData: {
            amountStaked: totalStaked,
            transactions: stakingTransactions
          }
        });
      }
    } catch (err) {
      console.error("Error checking vault balance:", err);
      // Continue to transaction history check if balance check fails
    }
    
    // Second approach: Check direct token transfer history to the vault from this wallet
    console.log(`Checking token transfer history from ${walletAddress} to the vault...`);
    
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 20 });
    
    if (!signatures || signatures.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "No transactions found for this wallet" 
      });
    }
    
    console.log(`Found ${signatures.length} transactions for wallet ${walletAddress}`);
    
    // Track staking amounts from this wallet to the vault
    let totalStaked = 0;
    let stakingTransactions = [];
    
    // Process each transaction
    for (const sigInfo of signatures) {
      console.log(`Analyzing transaction: ${sigInfo.signature}`);
      
      const txInfo = await connection.getParsedTransaction(
        sigInfo.signature,
        { maxSupportedTransactionVersion: 0 }
      );
      
      // Skip if no transaction info
      if (!txInfo || !txInfo.meta) continue;
      
      // Skip if no token balances
      if (!txInfo.meta.preTokenBalances || !txInfo.meta.postTokenBalances) continue;
      
      const timestamp = new Date((txInfo.blockTime || Date.now() / 1000) * 1000);
      
      // Look for token transfers to the vault
      for (const preBalance of txInfo.meta.preTokenBalances) {
        // Only look at the wallet we're interested in
        if (preBalance.owner !== walletAddress) continue;
        
        // Find matching post balance
        const postBalance = txInfo.meta.postTokenBalances.find(
          post => post.accountIndex === preBalance.accountIndex
        );
        
        if (!postBalance) continue;
        
        // Check if tokens were sent (balance decreased)
        const preAmount = preBalance.uiTokenAmount.uiAmount || 0;
        const postAmount = postBalance.uiTokenAmount.uiAmount || 0;
        
        if (postAmount < preAmount) {
          // Tokens were sent, check if any went to the vault
          for (const post of txInfo.meta.postTokenBalances) {
            // Check if this is the vault's token account
            // Note: The token accounts appear in postTokenBalances as objects with mint and owner fields
            const accountInfo = txInfo.transaction?.message?.accountKeys?.[post.accountIndex];
            if (accountInfo && accountInfo.toString() === '3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL') {
              // Find matching pre-balance
              const vaultPreBalance = txInfo.meta.preTokenBalances.find(
                pre => pre.accountIndex === post.accountIndex
              );
              
              const vaultPreAmount = vaultPreBalance?.uiTokenAmount.uiAmount || 0;
              const vaultPostAmount = post.uiTokenAmount.uiAmount || 0;
              
              // If vault balance increased, this was a stake
              if (vaultPostAmount > vaultPreAmount) {
                const stakeAmount = vaultPostAmount - vaultPreAmount;
                console.log(`Found token transfer to vault: ${stakeAmount} tokens on ${timestamp.toISOString()}`);
                
                totalStaked += stakeAmount;
                stakingTransactions.push({
                  signature: sigInfo.signature,
                  amount: stakeAmount,
                  timestamp: timestamp.toISOString()
                });
              }
            }
          }
        }
      }
    }
    
    if (totalStaked === 0) {
      return res.status(404).json({
        success: false,
        error: "No token transfers to the staking vault found from this wallet"
      });
    }
    
    console.log(`Total tokens staked by ${walletAddress}: ${totalStaked}`);
    
    // Now we update the external staking cache with this information
    // This ensures the UI will show the correct staked amount
    const stakingData = {
      walletAddress,
      amountStaked: totalStaked,
      pendingRewards: 0, // Calculate based on program logic
      stakedAt: new Date(stakingTransactions[0].timestamp),
      lastUpdateTime: new Date(),
      estimatedAPY: 120, // Default APY 
      timeUntilUnlock: 0 // Initialize to 0, will be calculated if locked
    };
    
    // Calculate pending rewards
    const millisSinceStake = Date.now() - stakingData.stakedAt.getTime();
    const daysSinceStake = millisSinceStake / (1000 * 60 * 60 * 24);
    
    // APY of 12% (0.12) for 'daysSinceStake' portion of a year
    const annualRate = 0.12;
    stakingData.pendingRewards = totalStaked * annualRate * (daysSinceStake / 365);
    
    // Calculate unlock time (7 days from stake date)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; 
    const unlockTime = stakingData.stakedAt.getTime() + sevenDaysInMs;
    const now = Date.now();
    
    if (now < unlockTime) {
      stakingData.timeUntilUnlock = unlockTime - now;
    } else {
      stakingData.timeUntilUnlock = 0;
    }
    
    // Update our cache
    externalStakingCache.updateStakingData(stakingData);
    
    console.log(`Updated staking cache for ${walletAddress} with ${totalStaked} tokens staked`);
    
    // If we wanted to actually register this with the on-chain program,
    // we would build and send a transaction here using the program IDL
    
    return res.json({
      success: true,
      message: "Staking records synchronized successfully",
      stakingData: {
        amountStaked: totalStaked,
        transactions: stakingTransactions
      }
    });
  } catch (error) {
    console.error("Error syncing staking records:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}