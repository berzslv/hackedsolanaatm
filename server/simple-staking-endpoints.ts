/**
 * Simple Staking Endpoints
 * 
 * These endpoints provide information for the simplified staking contract.
 */

import { Request, Response } from 'express';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { 
  PROGRAM_ID, 
  TOKEN_MINT_ADDRESS,
  findVaultPDA, 
  findVaultAuthorityPDA,
  findUserStakeInfoPDA,
  getUserStakingInfo,
  isUserRegistered 
} from './simple-staking-utils';

// Get staking info for a user
export async function getSimpleStakingInfo(req: Request, res: Response) {
  try {
    const walletAddress = req.params.wallet;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Wallet address is required' 
      });
    }
    
    try {
      const userPubkey = new PublicKey(walletAddress);
      const stakingInfo = await getUserStakingInfo(userPubkey);
      
      return res.json({
        success: true,
        stakingInfo
      });
    } catch (error) {
      console.error("Error parsing wallet address:", error);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid wallet address' 
      });
    }
  } catch (error) {
    console.error("Error in getSimpleStakingInfo:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error getting staking info' 
    });
  }
}

// Get account information for client-side transaction building
export async function getSimpleStakingAccountsInfo(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Wallet address is required' 
      });
    }
    
    try {
      const userPubkey = new PublicKey(walletAddress);
      const connection = new Connection(clusterApiUrl('devnet'));
      
      // Find vault PDAs
      const [vaultPDA] = findVaultPDA();
      const [vaultAuthority] = findVaultAuthorityPDA();
      
      // Get the vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT_ADDRESS,
        vaultAuthority,
        true // allowOwnerOffCurve - true for PDAs
      );
      
      // Find user staking account PDA
      const [userStakeInfoAddress] = findUserStakeInfoPDA(userPubkey);
      
      // Check if user is already registered
      const registered = await isUserRegistered(userPubkey);
      
      return res.json({
        success: true,
        programId: PROGRAM_ID.toString(),
        tokenMint: TOKEN_MINT_ADDRESS.toString(),
        vault: vaultPDA.toString(),
        vaultAuthority: vaultAuthority.toString(),
        vaultTokenAccount: vaultTokenAccount.toString(),
        userStakeInfoAddress: userStakeInfoAddress.toString(),
        isRegistered: registered
      });
    } catch (error) {
      console.error("Error processing wallet address:", error);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid wallet address' 
      });
    }
  } catch (error) {
    console.error("Error in getSimpleStakingAccountsInfo:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error getting account info' 
    });
  }
}