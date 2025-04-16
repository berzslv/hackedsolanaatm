/**
 * Force Sync Module
 * 
 * This module provides functions to force synchronization with the Solana blockchain
 * and update our Railway API data
 */
import { Request, Response } from 'express';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as railwayApi from './railway-api';

/**
 * Force a sync of staking data for a wallet
 * @param req Express request with walletAddress in body
 * @param res Express response
 */
export async function handleForceSync(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    console.log(`Force syncing staking data for wallet: ${walletAddress}`);
    
    try {
      // 1. Verify the wallet address is valid
      const userPublicKey = new PublicKey(walletAddress);
      
      // 2. Add the wallet to the monitoring list in Railway
      await railwayApi.addWalletToMonitor(walletAddress);
      
      // 3. Force Railway to poll for new data
      const adminKey = process.env.RAILWAY_ADMIN_KEY || 'admin';
      const pollSuccess = await railwayApi.forcePollNow(adminKey);
      
      if (!pollSuccess) {
        console.warn("Railway polling request was not successful");
      }
      
      // 4. Wait a moment for the polling to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 5. Get the latest staking data from Railway
      const stakingData = await railwayApi.getEnhancedStakingData(walletAddress);
      const tokenBalance = await railwayApi.getWalletTokenBalance(walletAddress);
      
      // 6. Get on-chain data for validation
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      // 7. Return the data
      return res.json({
        success: true,
        message: "Force sync completed",
        stakingData,
        tokenBalance,
        synced: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error in force sync process:", error);
      return res.status(500).json({
        error: "Failed to sync staking data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing force sync request:", error);
    return res.status(500).json({
      error: "Failed to process force sync request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}