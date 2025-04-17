/**
 * Direct Staking Implementation - Exact
 * 
 * This module provides direct staking functionality using the correct staking vault contract
 * and PDA seed ("user_info" instead of "user-stake-info").
 */

import { Request, Response } from 'express';
import {
  PublicKey,
  Transaction,
  Connection,
  clusterApiUrl
} from '@solana/web3.js';
import {
  findUserStakingPDA,
  findVaultPDA,
  findVaultAuthorityPDA,
  findAssociatedTokenAccount,
  createStakeInstruction
} from './staking-contract-functions';

/**
 * Handle direct staking functionality
 * This creates a transaction that stakes tokens using the staking vault program
 */
export async function handleDirectStake(req: Request, res: Response) {
  try {
    const { walletAddress, amount, referrer } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    console.log(`Creating staking transaction for wallet: ${walletAddress}, amount: ${amount}`);
    
    // Parse the amount as a number
    const parsedAmount = parseFloat(amount);
    
    // Convert wallet address to PublicKey
    const userPublicKey = new PublicKey(walletAddress);
    
    // Convert referrer to PublicKey if provided
    let referrerPublicKey: PublicKey | undefined;
    if (referrer) {
      try {
        referrerPublicKey = new PublicKey(referrer);
        console.log(`Using referrer: ${referrer}`);
      } catch (error) {
        console.warn(`Invalid referrer public key: ${referrer}. Proceeding without referrer.`);
      }
    }
    
    // Create the transaction
    const transaction = await createDirectStakingTransaction(
      userPublicKey,
      parsedAmount,
      referrerPublicKey
    );
    
    console.log('Staking transaction created successfully');
    
    // Serialize and return the transaction
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');
    
    return res.json({
      success: true,
      message: "Staking transaction created",
      transaction: serializedTransaction
    });
  } catch (error) {
    console.error('Error creating staking transaction:', error);
    return res.status(500).json({
      error: "Failed to create staking transaction",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a direct staking transaction for the staking vault program
 * 
 * @param userPublicKey The user's wallet address as a PublicKey
 * @param amount The amount of tokens to stake
 * @param referrer Optional referrer's wallet address as a PublicKey
 * @returns The transaction for the user to sign
 */
export async function createDirectStakingTransaction(
  userPublicKey: PublicKey,
  amount: number,
  referrer?: PublicKey
): Promise<Transaction> {
  // Get a connection to the Solana cluster
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Get the recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  // Create a new transaction with the blockhash
  const transaction = new Transaction({
    feePayer: userPublicKey,
    blockhash,
    lastValidBlockHeight
  });
  
  // Create the staking instruction
  const stakeInstruction = await createStakeInstruction(userPublicKey, amount, referrer);
  
  // Add the instruction to the transaction
  transaction.add(stakeInstruction);
  
  return transaction;
}