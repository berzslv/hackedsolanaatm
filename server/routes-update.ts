import express, { Request, Response, NextFunction, Express } from 'express';
import { createServer, Server } from 'http';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import cors from 'cors';
import { insertUserSchema } from '@shared/schema';
import { storage } from './storage';
import { WebSocketServer } from 'ws';
import * as tokenUtils from './simple-token';
import * as stakingVault from './staking-vault-utils-simplified';
import { handleBuyAndStake } from './buy-and-stake';
import { externalStakingCache } from './external-staking-cache';
import * as railwayApi from './railway-api';
import { Connection, PublicKey, clusterApiUrl, SystemProgram, Transaction } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import fs from 'fs';

/**
 * Add this new endpoint to synchronize staking records
 * This will help fix the issue where tokens are in the vault but not showing in user staking records
 */
export function addSyncStakingRoute(app: Express) {
  app.post("/api/sync-staking", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: "Wallet address is required" });
      }
      
      console.log(`Attempting to sync staking records for wallet: ${walletAddress}`);
      
      // Get vault token account balance to determine actual staked amount
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const vaultTokenAccount = new PublicKey(stakingVault.STAKING_VAULT_ADDRESS);
      
      // Check direct token transfer history to the vault from this wallet
      console.log(`Checking token transfer history from ${walletAddress} to the vault...`);
      
      const walletPubkey = new PublicKey(walletAddress);
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
              if (post.owner === stakingVault.STAKING_VAULT_ADDRESS) {
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
        timeUntilUnlock: null // Calculate based on lock period
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
        error: error.message || "Failed to sync staking records"
      });
    }
  });
}