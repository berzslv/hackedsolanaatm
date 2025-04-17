/**
 * On-Chain Verification Module
 * 
 * This module provides functions to verify staking information directly on the Solana blockchain
 * bypassing the Railway API to get direct confirmation from on-chain accounts
 */
import { Request, Response } from 'express';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getOnChainStakingInfo, VAULT_TOKEN_ACCOUNT } from './direct-staking-utils';

/**
 * Handle on-chain staking verification
 * @param req Express request with wallet address as parameter
 * @param res Express response
 */
export async function handleOnChainStakingVerification(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        error: "Wallet address is required" 
      });
    }
    
    console.log(`Performing on-chain verification for wallet: ${walletAddress}`);
    
    // Create connection to the Solana network
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // 1. Get the user's staking information directly from the blockchain
    const onChainStakingInfo = await getOnChainStakingInfo(walletAddress);
    
    // 2. Get the vault token account balance (the amount of tokens in the staking vault)
    let vaultBalance = 0;
    try {
      const vaultTokenAccount = new PublicKey(VAULT_TOKEN_ACCOUNT);
      const vaultAccountInfo = await connection.getTokenAccountBalance(vaultTokenAccount);
      vaultBalance = Number(vaultAccountInfo.value.amount);
      console.log(`Vault token account (${VAULT_TOKEN_ACCOUNT}) balance: ${vaultBalance}`);
    } catch (vaultError) {
      console.error("Error getting vault balance:", vaultError);
      // Continue anyway - we'll still return user info
    }
    
    // 3. Return the combined verification results
    return res.json({
      success: true,
      stakingInfo: onChainStakingInfo,
      vaultBalance,
      message: "Staking information verified directly from the blockchain",
      dataSource: "blockchain"
    });
  } catch (error) {
    console.error("Error verifying staking on blockchain:", error);
    return res.status(500).json({ 
      success: false,
      error: "Failed to verify staking information on blockchain",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}