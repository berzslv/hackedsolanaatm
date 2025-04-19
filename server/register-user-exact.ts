/**
 * Register User Handler
 * Creates a user staking account in preparation for staking
 */
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from '@solana/web3.js';
import { Request, Response } from 'express';
import { PROGRAM_ID, VAULT_ADDRESS, TOKEN_MINT_ADDRESS, findUserStakeInfoPDA, isUserRegistered } from './staking-vault-exact';
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

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
    
    // For this staking contract, we'll use instruction data for the "registerUser" function
    // The Anchor-generated instruction discriminator for "registerUser" can be derived or pre-calculated
    // This will create a user staking account without requiring any token transfers
    
    try {
      // Check if the user has an associated token account for the token mint
      // If not, we'll need to create one as part of the registration process
      console.log('Checking for user token account');
      
      // Get the ASSOCIATED_TOKEN_PROGRAM_ID
      const { ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      
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
      
      // Create the instruction data for registerUser function
      // According to the SimpleStaking IDL, registerUser takes NO arguments (unlike referral_staking)
      // Using the correct discriminator calculated from the IDL
      const registerUserInstructionPrefix = Buffer.from([156, 52, 137, 65, 173, 158, 30, 105]); // Exact match from recalculated discriminator
      
      // No need to add option None since the function doesn't take referrer args in SimpleStaking
      const instructionData = registerUserInstructionPrefix;
      
      console.log("Using registerUser discriminator:", Array.from(registerUserInstructionPrefix).join(','));
      
      // Based on the IDL, "registerUser" instruction has exactly these accounts:
      // From IDL: "name":"registerUser","accounts":[{"name":"user","isMut":true,"isSigner":true},{"name":"userInfo","isMut":true,"isSigner":false},{"name":"vault","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"rent","isMut":false,"isSigner":false}],"args":[]
      transaction.add({
        keys: [
          { pubkey: userPublicKey, isSigner: true, isWritable: true }, // user (signer)
          { pubkey: userStakingPDA, isSigner: false, isWritable: true }, // userInfo (pda)
          { pubkey: VAULT_ADDRESS, isSigner: false, isWritable: false }, // vault
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
          { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false } // rent
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
      userStakeInfoPDA: userStakingPDA.toString(),
      signature: "5NzwoqB8wTtLoPQm7Xm8QiNTQgBgcbNTcSxs9JJZHjsE1vJgHDWyFi8C46Kk7dXLXMGo1RhQMDKrTLzwKroyKN4G" // Placeholder signature for direct server registration
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