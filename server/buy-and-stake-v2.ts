/**
 * Buy And Stake - Version 2
 * This is a completely reimplemented buy-and-stake flow that 
 * properly uses the referral staking smart contract
 */
import { Request, Response } from 'express';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMintToInstruction, createAssociatedTokenAccountInstruction, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { getConnection, getMintAuthority } from './simple-token';
import * as referralStaking from './referral-staking-client';
import fs from 'fs';
import path from 'path';

/**
 * Handler for the buy-and-stake endpoint (v2)
 * This creates a transaction that buys and stakes tokens in one step
 * using the proper referral staking program
 */
export async function handleBuyAndStakeV2(req: Request, res: Response) {
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
    
    console.log(`Processing combined buy and stake request for wallet: ${walletAddress}, amount: ${parsedAmount}, referral: ${referralAddress || 'none'}`);
    
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
      
      // Create the combined transaction
      const serializedTransaction = await createCombinedBuyAndStakeTransactionV2(
        walletAddress,
        parsedAmount,
        referralPublicKey
      );
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to buy and stake ${parsedAmount} HATM tokens. ${referralMessage}`,
        transaction: serializedTransaction,
        amount: parsedAmount,
        referralValid: !!referralPublicKey,
        isStaking: true
      });
    } catch (error) {
      console.error("Error in buy and stake process:", error);
      return res.status(500).json({
        error: "Failed to create buy and stake transaction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing buy and stake request:", error);
    return res.status(500).json({
      error: "Failed to process buy and stake request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a combined transaction for buying and staking tokens in one step
 * that correctly integrates with the referral staking program
 * 
 * @param userWalletAddress The user's wallet address
 * @param amount The amount of tokens to buy and stake
 * @param referrer Optional referral public key
 * @returns The serialized transaction as base64 string
 */
export async function createCombinedBuyAndStakeTransactionV2(
  userWalletAddress: string,
  amount: number,
  referrer?: PublicKey
): Promise<string> {
  try {
    console.log(`Creating combined buy and stake transaction (v2) for ${userWalletAddress}, amount: ${amount}, referral: ${referrer?.toString() || 'none'}`);
    
    const connection = getConnection();
    const { mintPublicKey, keypair: mintAuthority } = getMintAuthority();
    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Create transaction object
    let transaction = new Transaction();
    
    // 1. Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    // 2. Check if user's token account exists, create if needed
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
          mintPublicKey,           // token mint
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
    
    // 4. Add mint instruction to send tokens to user
    const mintInstruction = createMintToInstruction(
      mintPublicKey,
      userTokenAccount,
      mintAuthority.publicKey,
      adjustedAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    
    transaction.add(mintInstruction);

    // 5. Check if user is registered with the staking program
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
    
    // 6. Add staking instruction
    console.log(`Adding staking instruction for ${amount} tokens`);
    const stakeInstruction = referralStaking.createStakingInstruction(
      userPublicKey,
      adjustedAmount,
      userTokenAccount
    );
    
    transaction.add(stakeInstruction);
    
    // 7. Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    // 8. Partially sign with mint authority (for the mint instruction)
    transaction.partialSign(mintAuthority);
    
    // 9. Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Combined buy and stake transaction created for ${amount} tokens`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating combined buy and stake transaction:", error);
    throw error;
  }
}