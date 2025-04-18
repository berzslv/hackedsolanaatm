/**
 * Register User Handler
 * Creates a user staking account in preparation for staking
 */
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from '@solana/web3.js';
import { Request, Response } from 'express';
import { PROGRAM_ID, VAULT_ADDRESS, findUserStakeInfoPDA, isUserRegistered } from './staking-vault-exact';

export async function handleRegisterUser(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required"
      });
    }
    
    console.log(`Processing registration request for wallet: ${walletAddress}`);
    
    const userPublicKey = new PublicKey(walletAddress);
    
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Check if the user is already registered
    const isRegistered = await isUserRegistered(userPublicKey);
    
    if (isRegistered) {
      console.log(`User ${walletAddress} is already registered`);
      return res.json({
        success: true,
        message: "User is already registered for staking",
        isRegistered: true
      });
    }
    
    // Find the PDA for this user's staking account
    const [userStakingPDA, bump] = findUserStakeInfoPDA(userPublicKey);
    console.log(`User staking PDA: ${userStakingPDA.toString()}, bump: ${bump}`);
    
    // Create a transaction to initialize the user's staking account
    const transaction = new Transaction();
    
    // Get the latest blockhash for transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Create the instruction data for the register instruction
    // The smart contract expects an 8-byte instruction discriminator followed by any parameters
    // For registration, typically just the instruction discriminator is enough
    // Instruction index 0 is commonly used for "initialize" or "register" functions
    const instructionData = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]); // 8 bytes for instruction discriminator
    
    // Add the instruction to register the user
    transaction.add({
      keys: [
        { pubkey: userPublicKey, isSigner: true, isWritable: true }, // User account (signer)
        { pubkey: userStakingPDA, isSigner: false, isWritable: true }, // PDA account to store user staking info
        { pubkey: VAULT_ADDRESS, isSigner: false, isWritable: false }, // Vault address (not modified)
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // System program to create account
      ],
      programId: PROGRAM_ID,
      data: instructionData
    });
    
    // Set the fee payer
    transaction.feePayer = userPublicKey;
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Generated registration transaction for ${walletAddress}`);
    
    // Return the transaction for the client to sign
    return res.json({
      success: true,
      message: "Registration transaction created",
      transaction: serializedTransaction,
      userStakeInfoPDA: userStakingPDA.toString()
    });
  } catch (error) {
    console.error("Error processing registration request:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create registration transaction",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}