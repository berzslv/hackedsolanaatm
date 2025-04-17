/**
 * Direct Staking Utilities
 * This module provides direct access to the referral staking program using Anchor
 * It correctly handles the combined staking and referral functionality
 */
import { PublicKey, Connection, clusterApiUrl, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Constants for staking program
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const STAKING_VAULT_ADDRESS = new PublicKey('DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

// Load the referral staking IDL
let idl: any = null;
try {
  // Attempt to load the referral staking IDL
  const idlPath = path.join(process.cwd(), './attached_assets/idl (1).json');
  if (fs.existsSync(idlPath)) {
    const idlString = fs.readFileSync(idlPath, 'utf8');
    idl = JSON.parse(idlString);
    console.log('Successfully loaded referral_staking IDL');
  } else {
    console.warn('IDL file not found at', idlPath);
    // Try alternative path
    const altIdlPath = path.join(process.cwd(), './idl/referral_staking.json');
    if (fs.existsSync(altIdlPath)) {
      const idlString = fs.readFileSync(altIdlPath, 'utf8');
      idl = JSON.parse(idlString);
      console.log('Successfully loaded referral_staking IDL from alternative path');
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

    const connection = getConnection();
    // Create a proper NodeWallet instance that satisfies the Wallet interface
    const keypair = anchor.web3.Keypair.generate();
    const dummyWallet = new anchor.Wallet(keypair);
    
    const provider = new anchor.AnchorProvider(
      connection,
      dummyWallet,
      { commitment: 'confirmed' }
    );

    return new anchor.Program(idl, PROGRAM_ID, provider);
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
 * Create a user registration instruction for the referral staking program
 * @param userWallet The user's wallet public key 
 * @param referrer Optional referrer public key
 * @returns The transaction instruction for registering a user
 */
export function createRegisterUserInstruction(
  userWallet: PublicKey,
  referrer?: PublicKey
): TransactionInstruction {
  if (!idl) {
    throw new Error('IDL not loaded, cannot create register user instruction');
  }
  
  try {
    // Create a temporary program to create the instruction
    const program = createStakingProgram();
    if (!program) {
      throw new Error('Failed to create staking program');
    }
    
    // Find the user info PDA
    const [userInfoPDA] = findUserInfoPDA(userWallet);
    console.log(`User Info PDA: ${userInfoPDA.toString()}`);
    
    // The instruction data for the registerUser instruction
    const data = program.coder.instruction.encode('registerUser', { 
      referrer: referrer ? referrer : null 
    });
    
    // The accounts required for the referral staking instruction
    // Based on the referral_staking IDL, the registerUser instruction requires:
    // owner, userInfo, systemProgram, rent
    const keys = [
      { pubkey: userWallet, isSigner: true, isWritable: true },           // owner
      { pubkey: userInfoPDA, isSigner: false, isWritable: true },         // userInfo
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
      { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },     // rent
    ];
    
    console.log(`Creating register user instruction${referrer ? ' with referrer: ' + referrer.toString() : ''}`);
    
    // Create the instruction
    return new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data,
    });
  } catch (error) {
    console.error('Error creating register user instruction:', error);
    throw error;
  }
}

/**
 * Get on-chain staking information for a user directly from the blockchain
 * This function doesn't use Anchor, just direct Solana web3 calls
 * 
 * @param walletAddress The user's wallet address
 * @returns Staking information fetched directly from the blockchain
 */
export async function getOnChainStakingInfo(walletAddress: string): Promise<any> {
  try {
    const connection = getConnection();
    const walletPubkey = new PublicKey(walletAddress);
    
    // 1. Find user staking account PDA
    const [userInfoPDA] = findUserInfoPDA(walletPubkey);
    
    console.log(`Looking up on-chain staking info for wallet: ${walletAddress}`);
    console.log(`User Info PDA: ${userInfoPDA.toString()}`);
    
    // 2. Get staking account data from the blockchain
    const accountInfo = await connection.getAccountInfo(userInfoPDA);
    
    if (!accountInfo || !accountInfo.data) {
      console.log(`No staking account found on-chain for ${walletAddress}`);
      return {
        amountStaked: 0,
        pendingRewards: 0,
        stakedAt: new Date().toISOString(),
        referrer: null,
        isInitialized: false,
        lastUpdateTime: new Date().toISOString()
      };
    }
    
    // 3. This is a simplified approach - in a production environment we would use
    // a proper borsh deserializer to parse the account data according to its layout
    // Here we'll look at if the account exists, which confirms it's initialized
    console.log(`Found on-chain staking account for ${walletAddress} with ${accountInfo.data.length} bytes of data`);
    
    // Check if account has our correct owner (staking program)
    const isProgramOwned = accountInfo.owner.equals(PROGRAM_ID);
    
    // For development purposes, we might try to manually extract some data
    // For simplicity, this implementation just returns that the account exists
    return {
      amountStaked: -1, // Signal to client that we can't determine exact amount
      pendingRewards: 0,
      stakedAt: new Date().toISOString(),
      referrer: null, 
      isInitialized: true,
      accountExists: true,
      isProgramOwned,
      dataSize: accountInfo.data.length,
      lastUpdateTime: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching on-chain staking info:", error);
    return {
      amountStaked: 0,
      pendingRewards: 0,
      stakedAt: new Date().toISOString(),
      referrer: null,
      isInitialized: false,
      error: error instanceof Error ? error.message : String(error),
      lastUpdateTime: new Date().toISOString()
    };
  }
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
    const data = program.coder.instruction.encode('stake', { amount: new BN(amount.toString()) });
    
    // The accounts required for the referral staking instruction
    // Based on the referral_staking IDL, the stake instruction requires exactly these accounts in this order:
    // owner, globalState, userInfo, userTokenAccount, vault, tokenProgram, systemProgram
    const keys = [
      { pubkey: userWallet, isSigner: true, isWritable: true },           // owner
      { pubkey: globalStatePDA, isSigner: false, isWritable: true },      // globalState
      { pubkey: userInfoPDA, isSigner: false, isWritable: true },         // userInfo
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },    // userTokenAccount
      { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // vault (this should be the token account, not the vault PDA)
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },   // tokenProgram
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
    ];
    
    console.log(`Creating staking instruction with amount: ${amount.toString()}`);
    console.log(`Vault token account used: ${VAULT_TOKEN_ACCOUNT.toString()}`);
    
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