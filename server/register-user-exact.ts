/**
 * Register User - Exact Implementation
 * 
 * This is the implementation of user registration that exactly matches
 * the smart contract's expected account structure and instruction format.
 * It uses the fixed "user_info" seed for PDAs.
 */

import { Request, Response } from 'express';
import {
  PublicKey,
  Transaction,
  Connection,
  clusterApiUrl,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  findUserStakingPDA,
  findVaultPDA,
  findVaultAuthorityPDA,
  createRegisterUserInstruction
} from './staking-contract-functions';

/**
 * Handle the register user endpoint
 * Creates a transaction to register a user with the staking program
 */
export async function handleRegisterUser(req: Request, res: Response) {
  try {
    const { walletAddress, referrer } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    console.log(`Creating registration transaction for wallet: ${walletAddress}`);
    
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
    const transaction = await createRegisterUserTransaction(
      userPublicKey,
      referrerPublicKey
    );
    
    console.log('Registration transaction created successfully');
    
    // Serialize and return the transaction
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');
    
    return res.json({
      success: true,
      message: "Registration transaction created",
      transaction: serializedTransaction
    });
  } catch (error) {
    console.error('Error creating registration transaction:', error);
    return res.status(500).json({
      error: "Failed to create registration transaction",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a transaction to register a user with the staking program
 * 
 * @param userPublicKey The user's wallet address as a PublicKey
 * @param referrer Optional referrer's wallet address as a PublicKey
 * @returns The transaction for the user to sign
 */
export async function createRegisterUserTransaction(
  userPublicKey: PublicKey,
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
  
  // Create the register user instruction and add it to the transaction
  const registerInstruction = await createRegisterUserInstruction(userPublicKey, referrer);
  transaction.add(registerInstruction);
  
  return transaction;
}