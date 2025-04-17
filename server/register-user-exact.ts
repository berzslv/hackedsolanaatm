/**
 * Register User - Exact Implementation for the Staking Vault Contract
 * 
 * This creates a transaction that registers a user with the staking vault contract
 * using the exact account structure required by the smart contract
 */
import { Request, Response } from 'express';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as stakingVault from './staking-vault-exact';
import * as contractFunctions from './staking-contract-functions';

/**
 * Handle register user functionality
 * This creates a transaction that registers a user using the staking vault program
 */
export async function handleRegisterUser(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    
    console.log(`Processing register user request for wallet: ${walletAddress}`);
    
    try {
      // Check if the user is already registered
      const userPublicKey = new PublicKey(walletAddress);
      const isRegistered = await stakingVault.isUserRegistered(userPublicKey);
      
      if (isRegistered) {
        return res.json({
          success: true,
          message: `User ${walletAddress} is already registered with the staking program.`,
          isRegistered: true
        });
      }
      
      // Create the registration transaction
      const serializedTransaction = await createRegisterUserTransaction(walletAddress);
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to register ${walletAddress} with the staking program.`,
        transaction: serializedTransaction,
        isRegistered: false
      });
    } catch (error) {
      console.error("Error in registration process:", error);
      return res.status(500).json({
        error: "Failed to create registration transaction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing registration request:", error);
    return res.status(500).json({
      error: "Failed to process registration request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a user registration transaction for the staking vault program
 * with the exact account structure required by the smart contract
 * 
 * @param userWalletAddress The user's wallet address
 * @returns The serialized transaction as base64 string
 */
export async function createRegisterUserTransaction(
  userWalletAddress: string
): Promise<string> {
  try {
    console.log(`Creating registration transaction for ${userWalletAddress}`);
    
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Create transaction object
    const transaction = new Transaction();
    
    // Create and add the register user instruction
    console.log(`Creating register user instruction using exact smart contract layout`);
    const registerInstruction = contractFunctions.createRegisterUserInstruction(userPublicKey);
    
    transaction.add(registerInstruction);
    
    // Get the latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Registration transaction created for ${userWalletAddress}`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating registration transaction:", error);
    throw error;
  }
}