/**
 * On-Chain Verification Module
 * 
 * This module provides functions to verify staking information directly on the Solana blockchain
 * bypassing the Railway API to get direct confirmation from on-chain accounts
 */
import { Request, Response } from 'express';
import { getOnChainStakingInfo } from './direct-staking-utils';

/**
 * Handle on-chain staking verification
 * @param req Express request with wallet address as parameter
 * @param res Express response
 */
export async function handleOnChainStakingVerification(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    console.log(`Getting direct on-chain staking verification for wallet: ${walletAddress}`);
    
    // Get on-chain staking information directly from blockchain
    const onChainData = await getOnChainStakingInfo(walletAddress);
    
    console.log(`On-chain staking verification for ${walletAddress}:`, onChainData);
    
    return res.json({
      ...onChainData,
      message: onChainData.accountExists 
        ? `Found on-chain staking account for ${walletAddress}` 
        : `No on-chain staking account found for ${walletAddress}`
    });
  } catch (error) {
    console.error("Error in on-chain staking verification:", error);
    return res.status(500).json({
      error: "Failed to verify on-chain staking account",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}