/**
 * Buy And Stake - Version 2
 * This is a completely reimplemented buy-and-stake flow that 
 * properly uses the referral staking smart contract
 */
import { Request, Response } from 'express';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
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
    const { walletAddress, amount, referrer } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ error: "Wallet address and amount are required" });
    }
    
    // Parse token amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }
    
    console.log(`Processing combined buy and stake request for wallet: ${walletAddress}, amount: ${parsedAmount}, referrer: ${referrer || 'none'}`);
    
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
      
      // Create the combined transaction
      const serializedTransaction = await createCombinedBuyAndStakeTransactionV2(
        walletAddress,
        parsedAmount,
        referrerPublicKey
      );
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to buy and stake ${parsedAmount} HATM tokens. ${referrerMessage}`,
        transaction: serializedTransaction,
        amount: parsedAmount,
        referrerValid: !!referrerPublicKey,
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
    console.log(`Creating combined buy and stake transaction (v2) for ${userWalletAddress}, amount: ${amount}, referrer: ${referrer?.toString() || 'none'}`);
    
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

    // 5. Check if user is registered with the staking program by directly querying the PDA
    let isUserRegistered: boolean;
    try {
      // Find the user's PDA
      const [userInfoPDA] = referralStaking.findUserInfoPDA(userPublicKey);
      console.log(`Checking if user account exists at PDA: ${userInfoPDA.toString()}`);
      
      // Get account info directly from connection
      const accountInfo = await connection.getAccountInfo(userInfoPDA);
      
      // User is registered if the account exists and is owned by our program
      isUserRegistered = accountInfo !== null && 
        accountInfo.owner.equals(referralStaking.PROGRAM_ID);
      
      console.log(`User registration check result: ${isUserRegistered}`);
      console.log(`Account exists: ${accountInfo !== null ? 'Yes' : 'No'}`);
      if (accountInfo !== null) {
        console.log(`Account owner: ${accountInfo.owner.toString()}`);
        console.log(`Owner matches program: ${accountInfo.owner.equals(referralStaking.PROGRAM_ID)}`);
      }
    } catch (error) {
      console.error(`Error checking user registration, assuming not registered: ${error instanceof Error ? error.message : String(error)}`);
      isUserRegistered = false;
    }
    
    // If not registered, add registration instruction
    if (!isUserRegistered) {
      console.log(`User ${userWalletAddress} is not registered with the staking program, adding manual registration instruction`);
      try {
        // Create manual registration instruction
        // Find the user info PDA
        const [userInfoPDA] = referralStaking.findUserInfoPDA(userPublicKey);
        console.log(`User Info PDA for registration: ${userInfoPDA.toString()}`);
        
        // Create a hardcoded instruction data buffer directly
        // Format: [discriminator(8 bytes)][has_referrer(1 byte)][referrer_pubkey(optional 32 bytes)]
        let instructionData: Buffer;
        
        // The discriminator bytes for 'registerUser' instruction
        const registerUserDiscriminator = Buffer.from([
          156, 52, 137, 65, 173, 158, 30, 105  // Updated discriminator matching SimpleStaking IDL
        ]);
        
        // If referrer is provided, include it in the instruction data
        if (referrer) {
          console.log(`Creating registration with referrer: ${referrer.toString()}`);
          // 1 byte for 'has referrer' flag (1 = true)
          const hasReferrerByte = Buffer.from([1]);
          // 32 bytes for the referrer public key
          const referrerBytes = referrer.toBuffer();
          // Combine all parts
          instructionData = Buffer.concat([registerUserDiscriminator, hasReferrerByte, referrerBytes]);
        } else {
          console.log(`Creating registration without referrer`);
          // 1 byte for 'has referrer' flag (0 = false)
          const hasReferrerByte = Buffer.from([0]);
          // Combine the parts (no referrer pubkey included)
          instructionData = Buffer.concat([registerUserDiscriminator, hasReferrerByte]);
        }
        
        // Create the manual instruction
        const registerInstruction = new TransactionInstruction({
          keys: [
            { pubkey: userPublicKey, isSigner: true, isWritable: true },           // user (signer)
            { pubkey: userInfoPDA, isSigner: false, isWritable: true },            // userInfo (pda)
            { pubkey: referralStaking.STAKING_VAULT_ADDRESS, isSigner: false, isWritable: false }, // vault
            { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false }, // systemProgram
            { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false }, // rent
          ],
          programId: referralStaking.PROGRAM_ID,
          data: instructionData,
        });
        
        console.log(`Manual registration instruction created successfully`);
        transaction.add(registerInstruction);
      } catch (error) {
        throw new Error(`Failed to create registration instruction: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log(`User ${userWalletAddress} is already registered with the staking program`);
    }
    
    // 6. Add manual staking instruction
    console.log(`Creating manual staking instruction for ${amount} tokens`);
    try {
      // Get necessary PDAs
      const [globalStatePDA] = referralStaking.findGlobalStatePDA();
      const [userInfoPDA] = referralStaking.findUserInfoPDA(userPublicKey);
      
      console.log(`
      Manual staking instruction accounts:
      - Global state PDA: ${globalStatePDA.toString()}
      - User info PDA: ${userInfoPDA.toString()}
      - User token account: ${userTokenAccount.toString()}
      - Vault token account: ${referralStaking.VAULT_TOKEN_ACCOUNT.toString()}
      `);
      
      // Create a hardcoded instruction data buffer directly
      // Format: [discriminator(8 bytes)][amount(8 bytes)]
      
      // The discriminator bytes for 'stake' instruction
      const stakeDiscriminator = Buffer.from([
        206, 176, 202, 18, 200, 209, 179, 108  // Updated discriminator matching SimpleStaking IDL
      ]);
      
      // Convert the bigint amount to an 8-byte buffer (little-endian)
      const amountBuffer = Buffer.alloc(8);
      // Handle BigInt conversion to buffer without BN
      const amountBigInt = BigInt(adjustedAmount.toString());
      // Write the amount as a little-endian 64-bit value
      for (let i = 0; i < 8; i++) {
        amountBuffer[i] = Number((amountBigInt >> BigInt(i * 8)) & BigInt(0xff));
      }
      
      // Combine instruction data parts
      const instructionData = Buffer.concat([stakeDiscriminator, amountBuffer]);
      
      // Create the manual staking instruction
      const stakeInstruction = new TransactionInstruction({
        keys: [
          { pubkey: userPublicKey, isSigner: true, isWritable: true },           // owner
          { pubkey: globalStatePDA, isSigner: false, isWritable: true },         // globalState
          { pubkey: userInfoPDA, isSigner: false, isWritable: true },            // userInfo
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },       // userTokenAccount
          { pubkey: referralStaking.VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // vault token account
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // tokenProgram
          { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false } // systemProgram
        ],
        programId: referralStaking.PROGRAM_ID,
        data: instructionData,
      });
      
      console.log(`Manual staking instruction created successfully`);
      transaction.add(stakeInstruction);
    } catch (error) {
      throw new Error(`Failed to create staking instruction: ${error instanceof Error ? error.message : String(error)}`);
    }
    
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