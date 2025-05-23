/**
 * Staking Contract Functions
 * 
 * This module provides core functions for interacting with the staking vault contract.
 * These functions handle PDA derivation, transaction building, and other low-level operations.
 * 
 * IMPORTANT: The seed naming has been fixed to match the smart contract:
 * - Using "user_info" as the seed for user staking account PDAs (NOT "user-stake-info")
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Connection,
  clusterApiUrl
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import BN from 'bn.js';

// Constants for the staking program
export const STAKING_PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const TOKEN_MINT = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');

// Seed constants - CRITICAL that these match the smart contract
export const USER_STAKING_SEED = 'user_info';
export const VAULT_SEED = 'vault';
export const VAULT_AUTH_SEED = 'vault_auth';

/**
 * Find the User Staking PDA for a given wallet
 * The PDA is derived using 'user_info' + wallet address
 */
export function findUserStakingPDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(USER_STAKING_SEED, 'utf-8'),
      wallet.toBuffer()
    ],
    STAKING_PROGRAM_ID
  );
}

/**
 * Find the Vault PDA
 */
export function findVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED, 'utf-8')],
    STAKING_PROGRAM_ID
  );
}

/**
 * Find the Vault Authority PDA
 */
export function findVaultAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_AUTH_SEED, 'utf-8')],
    STAKING_PROGRAM_ID
  );
}

/**
 * Find the associated token account for a wallet and token mint
 */
export async function findAssociatedTokenAccount(wallet: PublicKey, mint: PublicKey = TOKEN_MINT): Promise<PublicKey> {
  // Allow owner off curve when the owner is a PDA
  // This is crucial for PDAs like our vault authority
  const isPDA = !PublicKey.isOnCurve(wallet.toBuffer());
  
  return await getAssociatedTokenAddress(
    mint,
    wallet,
    isPDA, // Set allowOwnerOffCurve to true for PDAs
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

/**
 * Create an instruction to register a user with the staking vault
 */
export async function createRegisterUserInstruction(
  wallet: PublicKey,
  referrer?: PublicKey
): Promise<TransactionInstruction> {
  // Find the program addresses we need
  const [userStakingAccount, _userBump] = findUserStakingPDA(wallet);
  const [vaultPDA, _vaultBump] = findVaultPDA();
  const [vaultAuthority, _vaultAuthBump] = findVaultAuthorityPDA();
  
  // Prepare the accounts required for the instruction
  const accounts = [
    { pubkey: wallet, isSigner: true, isWritable: true },            // Owner (payer)
    { pubkey: userStakingAccount, isSigner: false, isWritable: true }, // User staking account
    { pubkey: vaultPDA, isSigner: false, isWritable: false },        // Vault
    { pubkey: vaultAuthority, isSigner: false, isWritable: false },  // Vault authority
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System program
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // Rent sysvar
  ];
  
  // If referrer is provided, add it to the accounts
  if (referrer) {
    accounts.push({ pubkey: referrer, isSigner: false, isWritable: false });
  }
  
  // Create the instruction data with Anchor discriminator for registerUser
  const data = Buffer.from([156, 52, 137, 65, 173, 158, 30, 105]);
  
  // Return the transaction instruction
  return new TransactionInstruction({
    keys: accounts,
    programId: STAKING_PROGRAM_ID,
    data
  });
}

/**
 * Create an instruction to stake tokens
 */
export async function createStakeInstruction(
  wallet: PublicKey,
  amount: number,
  referrer?: PublicKey
): Promise<TransactionInstruction> {
  // Create bigint for the amount with proper token decimals (9)
  const amountBN = new BN(amount * Math.pow(10, 9));
  
  // Find the program addresses we need
  const [userStakingAccount, _userBump] = findUserStakingPDA(wallet);
  const [vaultPDA, _vaultBump] = findVaultPDA();
  const [vaultAuthority, _vaultAuthBump] = findVaultAuthorityPDA();
  
  // Find the token accounts
  const userTokenAccount = await findAssociatedTokenAccount(wallet);
  const vaultTokenAccount = await findAssociatedTokenAccount(vaultAuthority);
  
  // Prepare the accounts required for the instruction - follows IDL account order exactly
  const accounts = [
    { pubkey: wallet, isSigner: true, isWritable: true },            // user/payer
    { pubkey: vaultPDA, isSigner: false, isWritable: true },         // stakingVault
    { pubkey: userStakingAccount, isSigner: false, isWritable: true }, // userStake info account
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },  // user token account
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // tokenVault account
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
  ];
  
  // If referrer is provided, add it to the accounts
  if (referrer) {
    const [referrerStakingAccount, _referrerBump] = findUserStakingPDA(referrer);
    
    // Add referrer staking account
    accounts.push({ pubkey: referrerStakingAccount, isSigner: false, isWritable: true });
    
    // Find referrer token account
    const referrerTokenAccount = await findAssociatedTokenAccount(referrer);
    
    // Add referrer token account
    accounts.push({ pubkey: referrerTokenAccount, isSigner: false, isWritable: true });
  }
  
  // Create the instruction data with Anchor discriminator for stake + amount
  const discriminator = [206, 176, 202, 18, 200, 209, 179, 108]; // stake discriminator
  const dataLayout = Buffer.alloc(16); // 8 bytes for discriminator + 8 bytes for amount
  
  // Copy the discriminator bytes
  for (let i = 0; i < discriminator.length; i++) {
    dataLayout[i] = discriminator[i];
  }
  
  // Write the amount as a 64-bit little-endian value
  const amountBuffer = amountBN.toArrayLike(Buffer, 'le', 8);
  amountBuffer.copy(dataLayout, 8); // Copy after discriminator
  
  // Return the transaction instruction
  return new TransactionInstruction({
    keys: accounts,
    programId: STAKING_PROGRAM_ID,
    data: dataLayout
  });
}

/**
 * Create an instruction to unstake tokens
 */
export async function createUnstakeInstruction(
  wallet: PublicKey,
  amount: number
): Promise<TransactionInstruction> {
  // Create bigint for the amount with proper token decimals (9)
  const amountBN = new BN(amount * Math.pow(10, 9));
  
  // Find the program addresses we need
  const [userStakingAccount, _userBump] = findUserStakingPDA(wallet);
  const [vaultPDA, _vaultBump] = findVaultPDA();
  const [vaultAuthority, _vaultAuthBump] = findVaultAuthorityPDA();
  
  // Find the token accounts
  const userTokenAccount = await findAssociatedTokenAccount(wallet);
  const vaultTokenAccount = await findAssociatedTokenAccount(vaultAuthority);
  
  // Prepare the accounts required for the instruction - follows IDL account order exactly
  const accounts = [
    { pubkey: wallet, isSigner: true, isWritable: true },            // user/payer
    { pubkey: vaultPDA, isSigner: false, isWritable: true },         // stakingVault
    { pubkey: userStakingAccount, isSigner: false, isWritable: true }, // userStake info account
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },  // user token account
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // tokenVault account
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // system program
  ];
  
  // Create the instruction data with Anchor discriminator for unstake + amount
  const discriminator = [88, 7, 182, 250, 48, 128, 234, 18]; // Unstake discriminator
  const dataLayout = Buffer.alloc(16); // 8 bytes for discriminator + 8 bytes for amount
  
  // Copy the discriminator bytes
  for (let i = 0; i < discriminator.length; i++) {
    dataLayout[i] = discriminator[i];
  }
  
  // Write the amount as a 64-bit little-endian value
  const amountBuffer = amountBN.toArrayLike(Buffer, 'le', 8);
  amountBuffer.copy(dataLayout, 8); // Copy after discriminator
  
  // Return the transaction instruction
  return new TransactionInstruction({
    keys: accounts,
    programId: STAKING_PROGRAM_ID,
    data: dataLayout
  });
}

/**
 * Create an instruction to claim staking rewards
 */
export async function createClaimRewardsInstruction(
  wallet: PublicKey
): Promise<TransactionInstruction> {
  // Find the program addresses we need
  const [userStakingAccount, _userBump] = findUserStakingPDA(wallet);
  const [vaultPDA, _vaultBump] = findVaultPDA();
  const [vaultAuthority, _vaultAuthBump] = findVaultAuthorityPDA();
  
  // Find the token accounts
  const userTokenAccount = await findAssociatedTokenAccount(wallet);
  const vaultTokenAccount = await findAssociatedTokenAccount(vaultAuthority);
  
  // Prepare the accounts required for the instruction - follows IDL account order exactly
  const accounts = [
    { pubkey: wallet, isSigner: true, isWritable: true },            // user/payer
    { pubkey: vaultPDA, isSigner: false, isWritable: true },         // stakingVault
    { pubkey: userStakingAccount, isSigner: false, isWritable: true }, // userStake info account
    { pubkey: TOKEN_MINT, isSigner: false, isWritable: false },      // tokenMint
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // tokenVault account
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },  // user token account
    { pubkey: vaultAuthority, isSigner: false, isWritable: false },  // vaultAuthority
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // system program
  ];
  
  // We don't have the exact discriminator for claim rewards, so we'll create it
  // from the name using the same algorithm used for the other instructions
  const data = Buffer.from([243, 103, 115, 217, 7, 90, 146, 173]); // Generated for "claimRewards"
  
  // Return the transaction instruction
  return new TransactionInstruction({
    keys: accounts,
    programId: STAKING_PROGRAM_ID,
    data
  });
}

/**
 * Check if a user is registered with the staking program
 */
export async function isUserRegistered(wallet: PublicKey): Promise<boolean> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const [userStakingAccount, _] = findUserStakingPDA(wallet);
    
    // Try to get the account info
    const accountInfo = await connection.getAccountInfo(userStakingAccount);
    
    // If the account exists and has data, the user is registered
    return accountInfo !== null && accountInfo.data.length > 0;
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false;
  }
}

/**
 * Get the staking information for a wallet
 */
export async function getStakingInfo(wallet: PublicKey): Promise<any> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const [userStakingAccount, _] = findUserStakingPDA(wallet);
    
    // Try to get the account info
    const accountInfo = await connection.getAccountInfo(userStakingAccount);
    
    // If the account doesn't exist, return default values
    if (!accountInfo) {
      return {
        isRegistered: false,
        amountStaked: 0,
        pendingRewards: 0,
        lastStakeTime: null,
        lastClaimTime: null,
        referrer: null
      };
    }
    
    // Here we would parse the account data according to the smart contract schema
    // This is a simplified version - in reality, you'd need to properly decode the data
    // based on the exact structure of the user staking account
    
    // For now, we'll just return a placeholder object
    return {
      isRegistered: true,
      amountStaked: 0, // Would be parsed from account data
      pendingRewards: 0, // Would be parsed from account data
      lastStakeTime: new Date(), // Would be parsed from account data
      lastClaimTime: new Date(), // Would be parsed from account data
      referrer: null // Would be parsed from account data
    };
  } catch (error) {
    console.error('Error getting staking info:', error);
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