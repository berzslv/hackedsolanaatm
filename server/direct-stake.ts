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
    const { walletAddress, amount, referrer } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ error: "Wallet address and amount are required" });
    }
    
    // Parse token amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }
    
    console.log(`========== PROCESSING STAKE REQUEST ==========`);
    console.log(`Wallet: ${walletAddress}`);
    console.log(`Amount: ${parsedAmount}`);
    console.log(`Referrer: ${referrer || 'none'}`);
    console.log(`Token mint: ${referralStaking.TOKEN_MINT_ADDRESS.toString()}`);
    console.log(`Staking vault: ${referralStaking.STAKING_VAULT_ADDRESS.toString()}`);
    console.log(`Vault token account: ${referralStaking.VAULT_TOKEN_ACCOUNT.toString()}`);
    console.log(`Program ID: ${referralStaking.PROGRAM_ID.toString()}`);
    console.log(`================================================`);
    
    try {
      // Validate referrer address if provided
      let referrerPublicKey: PublicKey | undefined = undefined;
      let referrerMessage = '';
      
      if (referrer) {
        try {
          // Validate that the referrer address is a valid Solana address
          referrerPublicKey = new PublicKey(referrer);
          referrerMessage = `Using referrer ${referrer}`;
          console.log(`Valid referrer address: ${referrer}`);
        } catch (error) {
          console.error("Invalid referrer address format:", error);
          // Continue even if validation fails, but don't pass the referral
        }
      }
      
      // Create the staking transaction
      const serializedTransaction = await createDirectStakingTransaction(
        walletAddress,
        parsedAmount,
        referrerPublicKey
      );
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to stake ${parsedAmount} HATM tokens. ${referrerMessage}`,
        transaction: serializedTransaction,
        amount: parsedAmount,
        referrerValid: !!referrerPublicKey,
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
    // Validate parameters
    if (!userWalletAddress) {
      throw new Error('User wallet address is required');
    }
    
    if (!amount || amount <= 0) {
      throw new Error(`Invalid staking amount: ${amount}`);
    }
    
    if (!referralStaking.TOKEN_MINT_ADDRESS) {
      throw new Error('TOKEN_MINT_ADDRESS is undefined');
    }
    
    if (!referralStaking.STAKING_VAULT_ADDRESS) {
      throw new Error('STAKING_VAULT_ADDRESS is undefined');
    }
    
    if (!referralStaking.VAULT_TOKEN_ACCOUNT) {
      throw new Error('VAULT_TOKEN_ACCOUNT is undefined');
    }
    
    if (!referralStaking.PROGRAM_ID) {
      throw new Error('PROGRAM_ID is undefined');
    }
    
    console.log(`
    Creating direct staking transaction:
    - User wallet: ${userWalletAddress}
    - Amount: ${amount} tokens
    - Referral: ${referrer?.toString() || 'none'}
    - Token mint: ${referralStaking.TOKEN_MINT_ADDRESS.toString()}
    - Staking vault: ${referralStaking.STAKING_VAULT_ADDRESS.toString()}
    - Vault token account: ${referralStaking.VAULT_TOKEN_ACCOUNT.toString()}
    - Program ID: ${referralStaking.PROGRAM_ID.toString()}
    `);
    
    // Get connection and validate user wallet
    const connection = getConnection();
    if (!connection) {
      throw new Error('Failed to get Solana connection');
    }
    
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(userWalletAddress);
    } catch (error) {
      throw new Error(`Invalid wallet address format: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const tokenMintAddress = referralStaking.TOKEN_MINT_ADDRESS;
    
    // Create transaction object
    let transaction = new Transaction();
    
    // 1. Get user's token account
    let userTokenAccount: PublicKey;
    try {
      userTokenAccount = await getAssociatedTokenAddress(
        tokenMintAddress,
        userPublicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      console.log(`User token account address: ${userTokenAccount.toString()}`);
    } catch (error) {
      throw new Error(`Failed to derive token account address: ${error instanceof Error ? error.message : String(error)}`);
    }
    
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
    let adjustedAmount: bigint;
    try {
      adjustedAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));
      console.log(`Adjusted amount with decimals: ${adjustedAmount.toString()} (${amount} tokens with ${decimals} decimals)`);
    } catch (error) {
      throw new Error(`Failed to convert amount to lamports: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 4. Check if user is registered with the staking program
    let isUserRegistered: boolean;
    try {
      isUserRegistered = await referralStaking.isUserRegistered(userPublicKey);
      console.log(`User registration check result: ${isUserRegistered}`);
    } catch (error) {
      console.error(`Error checking user registration, assuming not registered: ${error instanceof Error ? error.message : String(error)}`);
      isUserRegistered = false;
    }
    
    // If not registered, add registration instruction
    if (!isUserRegistered) {
      console.log(`User ${userWalletAddress} is not registered with the staking program, adding registration instruction`);
      try {
        const registerInstruction = referralStaking.createRegisterUserInstruction(
          userPublicKey,
          referrer
        );
        console.log(`Registration instruction created successfully`);
        transaction.add(registerInstruction);
      } catch (error) {
        throw new Error(`Failed to create registration instruction: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log(`User ${userWalletAddress} is already registered with the staking program`);
    }
    
    // 5. Add staking instruction
    console.log(`
    Creating staking instruction:
    - User wallet: ${userPublicKey.toString()}
    - User token account: ${userTokenAccount.toString()}
    - Amount: ${adjustedAmount.toString()} lamports (${amount} tokens)
    - Program ID: ${referralStaking.PROGRAM_ID.toString()}
    - Vault token account: ${referralStaking.VAULT_TOKEN_ACCOUNT.toString()}
    `);
    
    let stakeInstruction;
    try {
      stakeInstruction = referralStaking.createStakingInstruction(
        userPublicKey,
        adjustedAmount,
        userTokenAccount
      );
      console.log(`Staking instruction created successfully`);
      transaction.add(stakeInstruction);
    } catch (error) {
      throw new Error(`Failed to create staking instruction: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 6. Get the latest blockhash
    try {
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;
      console.log(`Added blockhash: ${blockhash}`);
    } catch (error) {
      throw new Error(`Failed to get recent blockhash: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 7. Serialize the transaction
    let serializedTransaction: string;
    try {
      serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      }).toString('base64');
      console.log(`Transaction serialized successfully (length: ${serializedTransaction.length})`);
    } catch (error) {
      throw new Error(`Failed to serialize transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log(`Direct staking transaction created for ${amount} tokens`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating direct staking transaction:", error);
    throw error;
  }
}