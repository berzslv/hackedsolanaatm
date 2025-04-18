/**
 * Staking Vault Utilities - Exact implementation
 * 
 * This module provides utility functions for interacting with the staking vault
 * with exact seeds and account structures as expected by the smart contract.
 */
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { IDL } from '../idl/staking_vault.js';

// Constants from the deployed program
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const VAULT_ADDRESS = new PublicKey('EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');

// The exact seed used by the smart contract
const USER_STAKE_INFO_SEED = 'user_info';

/**
 * Find the user's staking account PDA
 * @param userPubkey User's wallet public key
 * @returns The PDA public key and bump seed
 */
export function findUserStakeInfoPDA(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(USER_STAKE_INFO_SEED), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Check if a user is already registered with the staking program
 * @param userPubkey User's wallet public key
 * @returns True if registered, false otherwise
 */
export async function isUserRegistered(userPubkey: PublicKey): Promise<boolean> {
  try {
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Find user staking account PDA
    const [userStakingPDA] = findUserStakeInfoPDA(userPubkey);
    
    // Try to fetch the account
    const account = await connection.getAccountInfo(userStakingPDA);
    
    // If account exists and is owned by the staking program, user is registered
    return !!account && account.owner.equals(PROGRAM_ID);
  } catch (error) {
    console.error("Error checking if user is registered:", error);
    return false;
  }
}

/**
 * Get staking information for a user
 * @param userPubkey User's wallet public key
 * @returns Staking information
 */
export async function getUserStakingInfo(userPubkey: PublicKey): Promise<{
  isRegistered: boolean;
  amountStaked: number;
  pendingRewards: number;
  lastStakeTime: Date | null;
  lastClaimTime: Date | null;
  referrer: PublicKey | null;
}> {
  try {
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Find user staking account PDA
    const [userStakingPDA] = findUserStakeInfoPDA(userPubkey);
    
    // Try to fetch the account
    const account = await connection.getAccountInfo(userStakingPDA);
    
    // Default values if not registered
    const defaultInfo = {
      isRegistered: false,
      amountStaked: 0,
      pendingRewards: 0,
      lastStakeTime: null,
      lastClaimTime: null,
      referrer: null
    };
    
    // If account doesn't exist, user is not registered
    if (!account || !account.owner.equals(PROGRAM_ID)) {
      return defaultInfo;
    }
    
    // User is registered, try to decode the account data
    try {
      // Create provider and program
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: userPubkey,
          signTransaction: async () => { throw new Error('Not implemented'); },
          signAllTransactions: async () => { throw new Error('Not implemented'); }
        },
        { commitment: 'confirmed' }
      );
      
      const program = new anchor.Program(IDL, PROGRAM_ID, provider);
      
      // Decode the account data using anchor
      const userStakeInfo = await program.account.userStakeInfo.fetch(userStakingPDA);
      
      // Extract and convert the data
      return {
        isRegistered: true,
        amountStaked: Number(userStakeInfo.amountStaked?.toString() || '0'),
        pendingRewards: Number(userStakeInfo.pendingRewards?.toString() || '0'),
        lastStakeTime: userStakeInfo.lastStakeTime ? new Date(Number(userStakeInfo.lastStakeTime) * 1000) : null,
        lastClaimTime: userStakeInfo.lastClaimTime ? new Date(Number(userStakeInfo.lastClaimTime) * 1000) : null,
        referrer: userStakeInfo.referrer || null
      };
    } catch (decodeError) {
      console.error("Error decoding user staking account data:", decodeError);
      
      // User is registered but we couldn't decode the data
      return {
        ...defaultInfo,
        isRegistered: true
      };
    }
  } catch (error) {
    console.error("Error getting user staking info:", error);
    return {
      isRegistered: false,
      amountStaked: 0,
      pendingRewards: 0,
      lastStakeTime: null,
      lastClaimTime: null,
      referrer: null
    };
  }
}