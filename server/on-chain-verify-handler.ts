/**
 * On-Chain Verification Handler
 * 
 * This module provides API routes to verify and synchronize on-chain staking data
 */
import { Request, Response } from 'express';
import { syncOnChainStakingData, syncAllStakingData } from './on-chain-sync';

/**
 * Handle request to force sync on-chain staking data for a wallet
 * 
 * @param req Express request with walletAddress in body
 * @param res Express response
 */
export async function handleForceSyncOnChain(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    console.log(`Force syncing on-chain staking data for wallet: ${walletAddress}`);
    
    // Synchronize on-chain staking data for the wallet
    const stakingData = await syncOnChainStakingData(walletAddress);
    
    return res.json({
      success: true,
      message: `On-chain staking data synchronized for ${walletAddress}`,
      stakingData
    });
  } catch (error) {
    console.error("Error force syncing on-chain staking data:", error);
    return res.status(500).json({
      error: "Failed to force sync on-chain staking data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Handle request to sync all on-chain staking data
 * 
 * @param req Express request
 * @param res Express response
 */
export async function handleSyncAllOnChain(req: Request, res: Response) {
  try {
    console.log('Syncing all on-chain staking data');
    
    // Start synchronization process
    // We'll do this asynchronously so the request doesn't time out
    syncAllStakingData()
      .then(() => console.log('All on-chain staking data synchronized'))
      .catch(error => console.error('Error syncing all on-chain staking data:', error));
    
    return res.json({
      success: true,
      message: "On-chain staking data synchronization started for all wallets"
    });
  } catch (error) {
    console.error("Error syncing all on-chain staking data:", error);
    return res.status(500).json({
      error: "Failed to sync all on-chain staking data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Add on-chain data to staking info response
 * This can be used to augment the existing getStakingInfo handler
 * 
 * @param walletAddress The wallet address to get staking info for
 * @param stakingInfo The existing staking info from Railway
 * @returns The updated staking info with on-chain data
 */
export async function addOnChainDataToStakingInfo(walletAddress: string, stakingInfo: any): Promise<any> {
  try {
    // Get on-chain staking data
    const onChainData = await syncOnChainStakingData(walletAddress);
    
    // Merge on-chain data with Railway data (prioritize on-chain data)
    const mergedData = {
      ...stakingInfo,
      amountStaked: onChainData.amountStaked || stakingInfo.amountStaked,
      pendingRewards: onChainData.pendingRewards || stakingInfo.pendingRewards,
      stakedAt: onChainData.stakedAt || stakingInfo.stakedAt,
      timeUntilUnlock: onChainData.timeUntilUnlock,
      isLocked: onChainData.isLocked,
      onChainVerified: true,
      dataSource: 'blockchain'
    };
    
    return mergedData;
  } catch (error) {
    console.error(`Error adding on-chain data to staking info: ${error instanceof Error ? error.message : String(error)}`);
    
    // Return original data with flag indicating on-chain verification failed
    return {
      ...stakingInfo,
      onChainVerified: false
    };
  }
}