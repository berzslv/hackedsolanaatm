/**
 * Direct Staking Implementation
 * 
 * This module provides direct staking functionality using our referral staking smart contract
 */
import { Request, Response } from 'express';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, getAccount, TokenAccountNotFoundError, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import * as referralStaking from './referral-staking-client';
import { getConnection } from './simple-token';

/**
 * Handle direct staking functionality
 * This creates a transaction that stakes tokens using the referral staking program
 */
export async function handleDirectStake(req: Request, res: Response) {
  try {
    const { walletAddress, amount, referralAddress } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ error: "Wallet address and amount are required" });
    }
    
    // Parse token amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }
    
    console.log(`Processing direct stake request for wallet: ${walletAddress}, amount: ${parsedAmount}, referral: ${referralAddress || 'none'}`);
    
    try {
      // Validate referral address if provided
      let referralPublicKey: PublicKey | undefined = undefined;
      let referralMessage = '';
      
      if (referralAddress) {
        try {
          // Validate that the referral address is a valid Solana address
          referralPublicKey = new PublicKey(referralAddress);
          referralMessage = `Using referral from ${referralAddress}`;
          console.log(`Valid referral address: ${referralAddress}`);
        } catch (error) {
          console.error("Invalid referral address format:", error);
          // Continue even if validation fails, but don't pass the referral
        }
      }
      
      // Create the staking transaction
      const serializedTransaction = await createDirectStakingTransaction(
        walletAddress,
        parsedAmount,
        referralPublicKey
      );
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to stake ${parsedAmount} HATM tokens. ${referralMessage}`,
        transaction: serializedTransaction,
        amount: parsedAmount,
        referralValid: !!referralPublicKey,
        isStaking: true
      });
    } catch (error) {
      console.error("Error in direct stake process:", error);
      return res.status(500).json({
        error: "Failed to create staking transaction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing direct stake request:", error);
    return res.status(500).json({
      error: "Failed to process direct stake request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a direct staking transaction
 * This transaction will stake tokens to the referral staking program
 * 
 * @param userWalletAddress The user's wallet address
 * @param amount The amount of tokens to stake
 * @param referrer Optional referral public key
 * @returns The serialized transaction as base64 string
 */
export async function createDirectStakingTransaction(
  userWalletAddress: string,
  amount: number,
  referrer?: PublicKey
): Promise<string> {
  try {
    console.log(`Creating direct staking transaction for ${userWalletAddress}, amount: ${amount}, referral: ${referrer?.toString() || 'none'}`);
    
    const connection = getConnection();
    const userPublicKey = new PublicKey(userWalletAddress);
    const tokenMintAddress = referralStaking.TOKEN_MINT_ADDRESS;
    
    // Create transaction object
    let transaction = new Transaction();
    
    // 1. Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      tokenMintAddress,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    // 2. Check if user's token account exists
    try {
      await getAccount(connection, userTokenAccount);
      console.log("User token account exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("User token account doesn't exist, will create it");
        
        // Create the associated token account for the user
        const createAtaInstruction = createAssociatedTokenAccountInstruction(
          userPublicKey,           // payer
          userTokenAccount,        // associated token account to create
          userPublicKey,           // owner of the token account
          tokenMintAddress,        // token mint
          TOKEN_PROGRAM_ID
        );
        
        transaction.add(createAtaInstruction);
      } else {
        throw error;
      }
    }
    
    // 3. Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = BigInt(amount * Math.pow(10, decimals));
    
    // 4. Check if user is registered with the staking program
    const isUserRegistered = await referralStaking.isUserRegistered(userPublicKey);
    
    // If not registered, add registration instruction
    if (!isUserRegistered) {
      console.log(`User ${userWalletAddress} is not registered with the staking program, adding registration instruction`);
      const registerInstruction = referralStaking.createRegisterUserInstruction(
        userPublicKey,
        referrer
      );
      transaction.add(registerInstruction);
    } else {
      console.log(`User ${userWalletAddress} is already registered with the staking program`);
    }
    
    // 5. Add staking instruction
    console.log(`Adding staking instruction for ${amount} tokens`);
    const stakeInstruction = referralStaking.createStakingInstruction(
      userPublicKey,
      adjustedAmount,
      userTokenAccount
    );
    
    transaction.add(stakeInstruction);
    
    // 6. Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    // 7. Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Direct staking transaction created for ${amount} tokens`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating direct staking transaction:", error);
    throw error;
  }
}