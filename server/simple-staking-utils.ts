/**
 * Simple Staking Utils
 * 
 * Simplified utilities for the staking contract that isolates issues
 * by removing complexity from the original contract.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { Buffer } from 'buffer';

// Simple staking program ID - using existing deployment, keeping the ID the same
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');

// Our new token mint address (created with scripts/create-token.js)
export const TOKEN_MINT_ADDRESS = new PublicKey('6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4');

// Instruction indexes for our program
export const INITIALIZE_VAULT_IX = 0;
export const REGISTER_USER_IX = 1;
export const STAKE_IX = 2;
export const UNSTAKE_IX = 3;
export const CLAIM_REWARDS_IX = 4;

// PDA seeds
const VAULT_SEED = 'vault';
const VAULT_AUTH_SEED = 'vault_auth';
const USER_SEED = 'user_info';

// Account sizes based on our Rust struct layouts
const USER_ACCOUNT_SIZE = 64 + 32 + 8 + 8 + 8 + 8; // includes discriminator

/**
 * Find vault PDA
 */
export function findVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED)],
    PROGRAM_ID
  );
}

/**
 * Find vault authority PDA
 */
export function findVaultAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_AUTH_SEED)],
    PROGRAM_ID
  );
}

/**
 * Find a user's stake info account PDA
 */
export function findUserStakeInfoPDA(userWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(USER_SEED), userWallet.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Initialize the vault
 */
export async function initializeVault(
  connection: Connection,
  admin: Keypair
): Promise<{ vault: PublicKey, vaultAuthority: PublicKey, vaultTokenAccount: PublicKey }> {
  // Find PDAs
  const [vault, _vaultBump] = findVaultPDA();
  const [vaultAuthority, _vaultAuthBump] = findVaultAuthorityPDA();
  
  // Get the token account for the vault authority
  const vaultTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT_ADDRESS,
    vaultAuthority,
    true // allowOwnerOffCurve - true for PDAs
  );
  
  // Create the initialize instruction
  const initializeIx = new TransactionInstruction({
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true }, // Payer
      { pubkey: vault, isSigner: false, isWritable: true }, // Vault
      { pubkey: vaultAuthority, isSigner: false, isWritable: false }, // Vault Authority
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: false }, // Vault Token Account
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]) // Anchor discriminator for initialize
  });
  
  // Create transaction
  const tx = new Transaction().add(initializeIx);
  
  // Send transaction
  const signature = await connection.sendTransaction(tx, [admin]);
  
  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');
  
  return { vault, vaultAuthority, vaultTokenAccount };
}

/**
 * Check if a user is registered
 */
export async function isUserRegistered(userWallet: PublicKey): Promise<boolean> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userWallet);
    
    // Check if the user account exists
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    return accountInfo !== null;
  } catch (error) {
    console.error("Error checking if user is registered:", error);
    return false;
  }
}

/**
 * Get a user's staking info
 */
export async function getUserStakingInfo(userWallet: PublicKey): Promise<any> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userWallet);
    
    // Default values if user isn't registered
    const defaultInfo = {
      isRegistered: false,
      amountStaked: 0,
      pendingRewards: 0,
      lastStakeTime: null,
      lastClaimTime: null,
      referrer: null
    };
    
    // Check if the user account exists
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    if (!accountInfo) {
      return defaultInfo;
    }
    
    // User is registered but we'll need to decode the account data
    // This is a simplified version until we have proper account deserialization
    return {
      ...defaultInfo,
      isRegistered: true
    };
    
    // In a real implementation, we would use proper account deserialization:
    /*
    // Create a program instance
    const provider = new anchor.Provider(
      connection,
      PROGRAM_ID, // Normally would be a wallet here, but we're just reading
      { commitment: 'confirmed' }
    );
    
    const idl = JSON.parse(fs.readFileSync('./idl/simple_staking.json', 'utf8'));
    const program = new anchor.Program(idl, PROGRAM_ID, provider);
    
    // Fetch and parse account data
    const userInfo = await program.account.userStakeInfo.fetch(userStakeInfoPDA);
    
    return {
      isRegistered: true,
      amountStaked: userInfo.amountStaked.toNumber(),
      pendingRewards: userInfo.pendingRewards.toNumber(),
      lastStakeTime: userInfo.lastStakeTime.toNumber() > 0 ? new Date(userInfo.lastStakeTime.toNumber() * 1000) : null,
      lastClaimTime: userInfo.lastClaimTime.toNumber() > 0 ? new Date(userInfo.lastClaimTime.toNumber() * 1000) : null,
      referrer: userInfo.referrer?.toString() || null
    };
    */
  } catch (error) {
    console.error("Error getting user staking info:", error);
    return {
      isRegistered: false,
      amountStaked: 0,
      pendingRewards: 0,
      lastStakeTime: null,
      lastClaimTime: null,
      referrer: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Register a user
 */
export async function registerUser(
  connection: Connection,
  wallet: Keypair
): Promise<string> {
  // Find user stake info PDA
  const [userStakeInfoPDA] = findUserStakeInfoPDA(wallet.publicKey);
  
  // Find vault PDA
  const [vaultPDA] = findVaultPDA();
  
  // Create register instruction
  const registerIx = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // User and payer
      { pubkey: userStakeInfoPDA, isSigner: false, isWritable: true }, // User stake info account to create
      { pubkey: vaultPDA, isSigner: false, isWritable: false }, // Vault
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from([156, 52, 137, 65, 173, 158, 30, 105]) // Anchor discriminator for registerUser
  });
  
  // Create and send transaction
  const tx = new Transaction().add(registerIx);
  const signature = await connection.sendTransaction(tx, [wallet]);
  
  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');
  
  return signature;
}

/**
 * Stake tokens
 */
export async function stakeTokens(
  connection: Connection,
  wallet: Keypair,
  amount: number // amount in normal units (not lamports)
): Promise<string> {
  // Find user stake info PDA
  const [userStakeInfoPDA] = findUserStakeInfoPDA(wallet.publicKey);
  
  // Find vault PDA
  const [vaultPDA] = findVaultPDA();
  
  // Find vault authority PDA
  const [vaultAuthority] = findVaultAuthorityPDA();
  
  // Get user token account
  const userTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT_ADDRESS,
    wallet.publicKey
  );
  
  // Get vault token account
  const vaultTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT_ADDRESS,
    vaultAuthority,
    true // allowOwnerOffCurve - true for PDAs
  );
  
  // Convert amount to lamports (assuming 9 decimals)
  const amountLamports = amount * Math.pow(10, 9);
  
  // Create instruction data with Anchor discriminator followed by amount
  const discriminator = [206, 176, 202, 18, 200, 209, 179, 108]; // Anchor discriminator for stake
  const stakeData = new Uint8Array(16); // 8 bytes for discriminator + 8 bytes for amount
  
  // Set discriminator bytes
  for (let i = 0; i < discriminator.length; i++) {
    stakeData[i] = discriminator[i];
  }
  
  // Write amount as little-endian 64-bit value
  const view = new DataView(stakeData.buffer);
  view.setBigUint64(8, BigInt(amountLamports), true); // true = little-endian
  
  // Create stake instruction
  const stakeIx = new TransactionInstruction({
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // User and payer
      { pubkey: userStakeInfoPDA, isSigner: false, isWritable: true }, // User stake info account
      { pubkey: vaultPDA, isSigner: false, isWritable: false }, // Vault
      { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // User token account (source)
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // Vault token account (destination)
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from(stakeData)
  });
  
  // Create and send transaction
  const tx = new Transaction().add(stakeIx);
  const signature = await connection.sendTransaction(tx, [wallet]);
  
  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');
  
  return signature;
}

/**
 * Server-side helper to submit a transaction built by the client
 */
export async function submitClientBuiltTransaction(
  connection: Connection,
  serializedTransaction: string,
  adminKeyPair?: Keypair // Optional admin keypair for partial signing
): Promise<string> {
  // Deserialize the transaction
  const transaction = Transaction.from(Buffer.from(serializedTransaction, 'base64'));
  
  // If an admin keypair is provided, partially sign the transaction
  if (adminKeyPair) {
    transaction.partialSign(adminKeyPair);
  }
  
  // Send the transaction
  const signature = await connection.sendRawTransaction(transaction.serialize());
  
  // Return the signature immediately without waiting for confirmation
  // The client will handle confirmation
  return signature;
}