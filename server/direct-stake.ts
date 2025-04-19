/**
 * Direct Staking Implementation
 * 
 * This module provides direct staking functionality using our referral staking smart contract
 */
import { Request, Response } from 'express';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
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
      // Instead of using the Anchor-dependent function, check directly
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
        // Instead of using the Anchor Program, we'll manually create the transaction instruction
        // This avoids BN.js issues completely
        
        // Find the user info PDA
        const [userInfoPDA] = referralStaking.findUserInfoPDA(userPublicKey);
        console.log(`User Info PDA for registration: ${userInfoPDA.toString()}`);
        
        // Create a hardcoded instruction data buffer directly
        // This is equivalent to the anchor encode but without any BN dependencies
        // The instruction discriminator for 'registerUser' is hardcoded (first 8 bytes)
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
    
    // 5. Add staking instruction
    console.log(`
    Creating staking instruction:
    - User wallet: ${userPublicKey.toString()}
    - User token account: ${userTokenAccount.toString()}
    - Amount: ${adjustedAmount.toString()} lamports (${amount} tokens)
    - Program ID: ${referralStaking.PROGRAM_ID.toString()}
    - Vault token account: ${referralStaking.VAULT_TOKEN_ACCOUNT.toString()}
    `);
    
    try {
      // Create a manual stake instruction that doesn't rely on BN.js
      console.log(`Creating manual stake instruction for amount: ${adjustedAmount.toString()}`);
      
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
      // This is equivalent to the anchor encode but without any BN dependencies
      // Format: [discriminator(8 bytes)][amount(8 bytes)]
      
      // The discriminator bytes for 'stake' instruction (anchor.hash('global:stake'))
      const stakeDiscriminator = Buffer.from([
        206, 176, 202, 18, 200, 209, 179, 108  // Updated discriminator matching SimpleStaking IDL
      ]);
      
      // Convert the bigint amount to an 8-byte buffer (little-endian)
      const amountBuffer = Buffer.alloc(8);
      // We need to handle BigInt conversion to buffer without BN
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
      
      // Verify all account keys are defined
      stakeInstruction.keys.forEach((key: { pubkey: PublicKey }, index: number) => {
        if (!key.pubkey) {
          throw new Error(`Required account at position ${index} is undefined in staking instruction`);
        }
      });
      
      console.log(`Manual staking instruction created successfully`);
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