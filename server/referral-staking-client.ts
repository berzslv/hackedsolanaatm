/**
 * Referral Staking Client
 * 
 * This module provides direct access to the referral staking program using Anchor
 * It correctly handles the combined staking and referral functionality
 */
import { PublicKey, Connection, clusterApiUrl, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Constants for referral staking program
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const STAKING_VAULT_ADDRESS = new PublicKey('EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

// Load the referral staking IDL
let idl: any = null;
try {
  // First try to load from the IDL directory
  const idlPath = path.join(process.cwd(), './idl/referral_staking.json');
  if (fs.existsSync(idlPath)) {
    const idlString = fs.readFileSync(idlPath, 'utf8');
    idl = JSON.parse(idlString);
    console.log('Successfully loaded referral_staking IDL');
  } else {
    console.warn('IDL file not found at', idlPath);
    // Fallback to attached assets
    const fallbackPath = path.join(process.cwd(), './attached_assets/idl (1).json');
    if (fs.existsSync(fallbackPath)) {
      const idlString = fs.readFileSync(fallbackPath, 'utf8');
      idl = JSON.parse(idlString);
      console.log('Successfully loaded referral_staking IDL from attached assets');
    } else {
      console.error('Could not find referral_staking IDL file');
    }
  }
} catch (error) {
  console.error('Failed to load IDL:', error);
}

/**
 * Get the connection to the Solana cluster
 */
export function getConnection(): Connection {
  return new Connection(clusterApiUrl('devnet'), 'confirmed');
}

/**
 * Create an Anchor program instance for the staking program
 */
export function createStakingProgram(): anchor.Program | null {
  try {
    if (!idl) {
      console.error('IDL not loaded, cannot create program');
      return null;
    }
    
    if (!PROGRAM_ID) {
      console.error('PROGRAM_ID is undefined');
      return null;
    }

    const connection = getConnection();
    // Create a properly initialized wallet
    const keypair = anchor.web3.Keypair.generate();
    const wallet = new anchor.Wallet(keypair);
    
    // More extensive logging to help with debugging
    console.log(`Creating staking program in referral-staking-client:
      - Program ID: ${PROGRAM_ID.toString()}
      - Connection endpoint: ${connection.rpcEndpoint}
      - IDL name: ${idl.name}, version: ${idl.version}
      - Wallet public key: ${wallet.publicKey.toString()}
    `);
    
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
    
    console.log(`Provider created successfully, creating program instance...`);

    // Create the program instance with proper typing
    return new anchor.Program(
      idl as anchor.Idl,
      PROGRAM_ID,
      provider as anchor.Provider
    );
  } catch (error) {
    console.error('Error creating staking program:', error);
    return null;
  }
}

/**
 * Find the Global State PDA
 * @returns The PDA address for the global state
 */
export function findGlobalStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );
}

/**
 * Find the User Info PDA
 * @param userWalletAddress The user's wallet address
 * @returns The PDA address for the user's info
 */
export function findUserInfoPDA(userWalletAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_info"), userWalletAddress.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Create a staking instruction for the referral staking program
 * @param userWallet The user's wallet public key
 * @param amount The amount to stake (already converted to lamports)
 * @param userTokenAccount The user's token account
 * @returns The transaction instruction for staking
 */
export function createStakingInstruction(
  userWallet: PublicKey,
  amount: bigint,
  userTokenAccount: PublicKey
): TransactionInstruction {
  if (!idl) {
    throw new Error('IDL not loaded, cannot create staking instruction');
  }
  
  try {
    // Create a temporary program to create the instruction
    const program = createStakingProgram();
    if (!program) {
      throw new Error('Failed to create staking program');
    }
    
    // Find the global state PDA
    const [globalStatePDA] = findGlobalStatePDA();
    console.log(`Global State PDA: ${globalStatePDA.toString()}`);
    
    // Find the user info PDA
    const [userInfoPDA] = findUserInfoPDA(userWallet);
    console.log(`User Info PDA: ${userInfoPDA.toString()}`);
    
    // The instruction data for the stake instruction
    // Convert amount to a string format for encoding to avoid BN.js import issues
    const data = program.coder.instruction.encode('stake', { 
      amount: { toString: () => amount.toString() }
    });
    
    // The accounts required for the referral staking instruction
    // Based on the referral_staking IDL, the stake instruction requires exactly these accounts in this order:
    // owner, globalState, userInfo, userTokenAccount, vault, tokenProgram, systemProgram
    const keys = [
      { pubkey: userWallet, isSigner: true, isWritable: true },          // owner
      { pubkey: globalStatePDA, isSigner: false, isWritable: true },     // globalState
      { pubkey: userInfoPDA, isSigner: false, isWritable: true },        // userInfo
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },   // userTokenAccount
      { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // vault (this is the token account for the vault)
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },  // tokenProgram
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
    ];
    
    console.log(`Creating staking instruction with amount: ${amount.toString()}`);
    console.log(`Using vault token account: ${VAULT_TOKEN_ACCOUNT.toString()}`);
    console.log(`Using user token account: ${userTokenAccount.toString()}`);
    
    // Create the instruction
    return new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data,
    });
  } catch (error) {
    console.error('Error creating staking instruction:', error);
    throw error;
  }
}

/**
 * Create a registration instruction for the referral staking program
 * @param userWallet The user's wallet address
 * @param referrer Optional referrer address
 * @returns The transaction instruction for user registration
 */
export function createRegisterUserInstruction(
  userWallet: PublicKey,
  referrer?: PublicKey
): TransactionInstruction {
  if (!idl) {
    throw new Error('IDL not loaded, cannot create registration instruction');
  }
  
  try {
    // Create a temporary program to create the instruction
    const program = createStakingProgram();
    if (!program) {
      throw new Error('Failed to create staking program');
    }
    
    // Find the user info PDA
    const [userInfoPDA] = findUserInfoPDA(userWallet);
    console.log(`User Info PDA for registration: ${userInfoPDA.toString()}`);
    
    // The instruction data for the registerUser instruction
    // We need to handle the referrer specially to avoid BN issues
    let instructionArgs: any = {};
    
    if (referrer) {
      // Convert the referrer to a simple string representation
      instructionArgs.referrer = referrer.toString();
    } else {
      instructionArgs.referrer = null;
    }
    
    console.log(`Encoding registerUser instruction with args:`, JSON.stringify(instructionArgs));
    const data = program.coder.instruction.encode('registerUser', instructionArgs);
    
    // The accounts required for the registerUser instruction
    // Based on the IDL, we need: owner, userInfo, systemProgram, rent
    const keys = [
      { pubkey: userWallet, isSigner: true, isWritable: true },          // owner
      { pubkey: userInfoPDA, isSigner: false, isWritable: true },        // userInfo
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
      { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
    ];
    
    console.log(`Creating user registration instruction ${referrer ? 'with referrer: ' + referrer.toString() : 'without referrer'}`);
    
    // Create the instruction
    return new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data,
    });
  } catch (error) {
    console.error('Error creating registration instruction:', error);
    throw error;
  }
}

/**
 * Check if a user is registered with the staking program
 * This function verifies if a user has a registered account with the staking program
 * by checking if their associated PDA account exists on the blockchain
 * 
 * @param userWallet The user's wallet address
 * @returns True if the user is registered, false otherwise
 */
export async function isUserRegistered(userWallet: PublicKey): Promise<boolean> {
  if (!userWallet) {
    console.error('Invalid wallet address provided to isUserRegistered');
    return false;
  }
  
  if (!PROGRAM_ID) {
    console.error('PROGRAM_ID is undefined, cannot check user registration');
    return false;
  }
  
  try {
    const connection = getConnection();
    if (!connection) {
      throw new Error('Failed to get Solana connection');
    }
    
    // Find the user info PDA
    const [userInfoPDA, bump] = findUserInfoPDA(userWallet);
    console.log(`Checking if user ${userWallet.toString()} is registered with the staking program`);
    console.log(`User Info PDA: ${userInfoPDA.toString()} (bump: ${bump})`);
    
    // Get the account info from the blockchain
    const accountInfo = await connection.getAccountInfo(userInfoPDA);
    
    // More detailed check: verify both existence and correct program ownership
    const isRegistered = accountInfo !== null && accountInfo.owner.equals(PROGRAM_ID);
    
    console.log(`
    User registration check result for ${userWallet.toString()}:
    - Account exists: ${accountInfo !== null ? 'Yes' : 'No'}
    ${accountInfo !== null ? `- Account owner: ${accountInfo.owner.toString()}` : ''}
    ${accountInfo !== null ? `- Owner matches program: ${accountInfo.owner.equals(PROGRAM_ID) ? 'Yes' : 'No'}` : ''}
    ${accountInfo !== null ? `- Data size: ${accountInfo.data.length} bytes` : ''}
    - Is registered: ${isRegistered ? 'Yes ✓' : 'No ✗'}
    `);
    
    return isRegistered;
  } catch (error) {
    console.error(`Error checking user registration for ${userWallet.toString()}:`, error);
    
    // More detailed error reporting
    if (error instanceof Error) {
      console.error(`Error type: ${error.name}, Message: ${error.message}`);
      if (error.stack) {
        console.error(`Stack trace: ${error.stack}`);
      }
    }
    
    return false;
  }
}