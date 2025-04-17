/**
 * Direct Staking Implementation - Exact Match for Smart Contract
 * 
 * This module provides direct staking functionality using the exact 
 * account structure required by the staking vault contract
 */
import { Request, Response } from 'express';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import * as stakingVault from './staking-vault-exact';

/**
 * Handle direct staking functionality
 * This creates a transaction that stakes tokens using the staking vault program
 */
export async function handleDirectStake(req: Request, res: Response) {
  try {
    const { walletAddress, amount } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ error: "Wallet address and amount are required" });
    }
    
    // Parse token amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }
    
    console.log(`Processing direct stake request for wallet: ${walletAddress}, amount: ${parsedAmount}`);
    
    try {
      // Create the direct staking transaction
      const serializedTransaction = await createDirectStakingTransaction(
        walletAddress,
        parsedAmount
      );
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to stake ${parsedAmount} HATM tokens.`,
        transaction: serializedTransaction,
        amount: parsedAmount,
        isStaking: true
      });
    } catch (error) {
      console.error("Error in staking process:", error);
      return res.status(500).json({
        error: "Failed to create staking transaction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing stake request:", error);
    return res.status(500).json({
      error: "Failed to process stake request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a direct staking transaction for the staking vault program
 * with the exact account structure required by the smart contract
 * 
 * @param userWalletAddress The user's wallet address
 * @param amount The amount of tokens to stake
 * @returns The serialized transaction as base64 string
 */
export async function createDirectStakingTransaction(
  userWalletAddress: string,
  amount: number
): Promise<string> {
  try {
    console.log(`Creating direct staking transaction for ${userWalletAddress}, amount: ${amount}`);
    
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Create transaction object
    const transaction = new Transaction();
    
    // Get the token account for the user
    const userTokenAccount = await getAssociatedTokenAddress(
      stakingVault.TOKEN_MINT_ADDRESS,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    // Check if user's token account exists, create if needed
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
          stakingVault.TOKEN_MINT_ADDRESS,  // token mint
          TOKEN_PROGRAM_ID
        );
        
        transaction.add(createAtaInstruction);
      } else {
        throw error;
      }
    }
    
    // Verify that the token account exists and has tokens
    try {
      const tokenAccount = await getAccount(connection, userTokenAccount);
      console.log(`User token account exists with balance: ${tokenAccount.amount}`);
      
      // Check if user has enough tokens
      const tokenAmount = BigInt(tokenAccount.amount.toString());
      const adjustedAmount = BigInt(amount * Math.pow(10, 9)); // 9 decimals
      
      if (tokenAmount < adjustedAmount) {
        throw new Error(`Insufficient token balance. Required: ${adjustedAmount}, Available: ${tokenAmount}`);
      }
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        throw new Error(`Token account doesn't exist. Please ensure you have HATM tokens in your wallet.`);
      }
      throw error;
    }
    
    // Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount: bigint = BigInt(amount * Math.pow(10, decimals));
    
    // Create and add the stake instruction using the proper account structure from the smart contract
    console.log(`Creating staking instruction for ${amount} tokens using exact smart contract layout`);
    const stakeInstruction = stakingVault.createStakingInstruction(
      userPublicKey,
      adjustedAmount,
      userTokenAccount
    );
    
    transaction.add(stakeInstruction);
    
    // Get the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;
    
    // Add a small delay before serializing to ensure proper setup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Direct staking transaction created for ${amount} tokens`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating staking transaction:", error);
    throw error;
  }
}