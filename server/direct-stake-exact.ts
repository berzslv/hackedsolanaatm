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
  TransactionInstruction,
  SystemProgram,
  clusterApiUrl
} from '@solana/web3.js';
import {
  findUserStakingPDA,
  findVaultPDA,
  findVaultAuthorityPDA,
  findAssociatedTokenAccount,
  createStakeInstruction
} from './staking-contract-functions';

// Constants for the staking program and token
const STAKING_PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV3cYfrx53ky19RD56eRRGm');
const TOKEN_MINT = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';

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
 * This will automatically register the user first if they aren't already registered
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
  
  // Check if the user is already registered with the staking vault
  // Get the user's staking account PDA
  const [userStakingAccount, _userBump] = findUserStakingPDA(userPublicKey);
  const userStakingAccountInfo = await connection.getAccountInfo(userStakingAccount);
  
  // If the user isn't registered, add a registration instruction first
  if (!userStakingAccountInfo) {
    console.log(`User ${userPublicKey.toString()} is not registered. Adding registration instruction.`);
    
    // Create the vault token account PDA
    const [vaultTokenAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), STAKING_PROGRAM_ID.toBuffer()],
      STAKING_PROGRAM_ID
    );
    
    // Find the token mint
    const tokenMint = new PublicKey(TOKEN_MINT);
    
    // Get the user's associated token account
    const userTokenAccount = await findAssociatedTokenAccount(userPublicKey, tokenMint);
    
    // Register user instruction
    const registerInstruction = new TransactionInstruction({
      programId: STAKING_PROGRAM_ID,
      keys: [
        { pubkey: userPublicKey, isSigner: true, isWritable: true },
        { pubkey: userStakingAccount, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: referrer || userPublicKey, isSigner: false, isWritable: false }
      ],
      data: Buffer.from([0]) // 0 = initialize instruction
    });
    
    transaction.add(registerInstruction);
    console.log("Added registration instruction to transaction");
  } else {
    console.log(`User ${userPublicKey.toString()} is already registered.`);
  }
  
  // Create the staking instruction
  const stakeInstruction = await createStakeInstruction(userPublicKey, amount, referrer);
  
  // Add the instruction to the transaction
  transaction.add(stakeInstruction);
  
  return transaction;
}