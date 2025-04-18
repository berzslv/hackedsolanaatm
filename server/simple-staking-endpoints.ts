/**
 * Simple Staking Endpoints
 * 
 * API endpoints for interacting with the simplified staking contract
 */
import { Request, Response } from 'express';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import * as simpleStaking from './simple-staking-utils';

/**
 * Handle request for simple staking account information
 */
export async function handleSimpleStakingAccountsInfo(req: Request, res: Response) {
  try {
    const { walletAddress, amount } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: "Wallet address and amount are required" 
      });
    }
    
    // Parse amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid amount" 
      });
    }
    
    console.log(`Providing account info for simple staking transaction - wallet: ${walletAddress}, amount: ${parsedAmount}`);
    
    try {
      const userPublicKey = new PublicKey(walletAddress);
      
      // Check if user is registered already
      const isRegistered = await simpleStaking.isUserRegistered(userPublicKey);
      
      // Calculate user staking account address
      const [userStakeInfoPDA] = simpleStaking.findUserStakeInfoPDA(userPublicKey);
      
      // Calculate vault and vault authority
      const [vaultPDA] = simpleStaking.findVaultPDA();
      const [vaultAuthority] = simpleStaking.findVaultAuthorityPDA();
      
      // Return all necessary account information for the client
      return res.json({
        success: true,
        programId: simpleStaking.PROGRAM_ID.toString(),
        tokenMint: simpleStaking.TOKEN_MINT_ADDRESS.toString(),
        vault: vaultPDA.toString(),
        vaultAuthority: vaultAuthority.toString(),
        // Use a known working vault token account for now
        vaultTokenAccount: '3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL',
        userStakeInfoAddress: userStakeInfoPDA.toString(),
        isRegistered: isRegistered,
        decimals: 9 // token decimals
      });
    } catch (error) {
      console.error("Error getting simple staking account info:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get staking account information",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing simple staking account info request:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process staking account info request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Handle request for user's simple staking info
 */
export async function handleGetSimpleStakingInfo(req: Request, res: Response) {
  try {
    const walletAddress = req.params.walletAddress;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: "Wallet address is required" 
      });
    }
    
    try {
      const userPublicKey = new PublicKey(walletAddress);
      
      // Get staking information from the blockchain
      const stakingInfo = await simpleStaking.getUserStakingInfo(userPublicKey);
      
      return res.json({
        success: true,
        stakingInfo: {
          ...stakingInfo,
          // Format timestamp fields for response
          lastStakeTime: stakingInfo.lastStakeTime?.getTime(),
          lastClaimTime: stakingInfo.lastClaimTime?.getTime(),
          // Use standard field names
          amountStaked: stakingInfo.amountStaked,
          pendingRewards: stakingInfo.pendingRewards,
          dataSource: 'blockchain',
          walletAddress
        }
      });
    } catch (error) {
      console.error("Error getting simple staking info:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get staking information",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing simple staking info request:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process staking info request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}