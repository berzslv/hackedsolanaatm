/**
 * Register User Handler
 * Creates a user staking account in preparation for staking
 */
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from '@solana/web3.js';
import { Request, Response } from 'express';
import { PROGRAM_ID, VAULT_ADDRESS, TOKEN_MINT_ADDRESS, findUserStakeInfoPDA, isUserRegistered } from './staking-vault-exact';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

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
    
    // For this staking contract, we'll use instruction data for the "stake" function
    // The Anchor-generated instruction discriminator for "stake" can be derived or pre-calculated
    // For now, we'll use a special case to register: staking 0 tokens which creates account but doesn't transfer
    
    try {
      // Check if the user has an associated token account for the token mint
      // If not, we'll need to create one as part of the registration process
      console.log('Checking for user token account');
      
      // Import token program and find associated token address
      const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      
      // Find the associated token account for the user
      const userTokenAccount = await PublicKey.findProgramAddressSync(
        [
          userPublicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          TOKEN_MINT_ADDRESS.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      console.log(`User token account: ${userTokenAccount[0].toString()}`);
      
      // Create the instruction data for stake with minimum amount (0)
      // This initializes the user stake account without transferring tokens
      // The instruction discriminator for "stake" (first 8 bytes) + amount (8 bytes for u64)
      const stakeInstructionPrefix = Buffer.from([163, 52, 200, 231, 140, 3, 69, 186]); // Anchor discriminator for "stake"
      const amountBytes = Buffer.alloc(8); // 8 bytes for amount (u64) = 0
      
      // Combine the instruction discriminator and amount
      const instructionData = Buffer.concat([stakeInstructionPrefix, amountBytes]);
      
      // Based on the IDL "stake" instruction has these accounts
      transaction.add({
        keys: [
          { pubkey: userPublicKey, isSigner: true, isWritable: true }, // User account (signer)
          { pubkey: VAULT_ADDRESS, isSigner: false, isWritable: true }, // Staking vault (initialized vault account)
          { pubkey: userStakingPDA, isSigner: false, isWritable: true }, // User stake account (PDA)
          { pubkey: userTokenAccount[0], isSigner: false, isWritable: true }, // User token account
          { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // Vault token account
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // Token program
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // System program to create account
        ],
        programId: PROGRAM_ID,
        data: instructionData
      });
    } catch (error) {
      console.error('Error setting up registration transaction:', error);
      throw error;
    }
    
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