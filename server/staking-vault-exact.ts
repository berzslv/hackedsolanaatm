/**
 * Staking Vault Exact Utilities
 * 
 * This file contains exact utilities for working with the staking vault contract
 * It provides precise constants and functions without any indirect indirection
 */

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AccountLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Exact constants for the staking contract
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const VAULT_ADDRESS = new PublicKey('EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

/**
 * Get a connection to the blockchain
 */
export const getConnection = (): Connection => {
  return new Connection(clusterApiUrl('devnet'), 'confirmed');
};

/**
 * Find the PDA for a user's stake info account
 * @param userPublicKey - The public key of the user
 * @returns The PDA for the user's stake info account
 */
export const findUserStakeInfoPDA = (userPublicKey: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_info'), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
};

/**
 * Check if a user is registered with the staking contract
 * @param userPublicKey - The public key of the user
 * @returns True if the user is registered, false otherwise
 */
export const isUserRegistered = async (userPublicKey: PublicKey): Promise<boolean> => {
  try {
    const connection = getConnection();
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userPublicKey);
    
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    return accountInfo !== null;
  } catch (error) {
    console.error('Error checking if user is registered:', error);
    return false;
  }
};

/**
 * Get the user's stake info account data
 * @param userPublicKey - The public key of the user
 * @returns The user's stake info
 */
export const getUserStakeInfo = async (userPublicKey: PublicKey): Promise<{
  registered: boolean;
  amountStaked: number;
  stakeStartTime: Date | null;
  lastClaimTime: Date | null;
  userStakeInfoAddress: string;
}> => {
  try {
    const connection = getConnection();
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userPublicKey);
    
    // Check if the user is registered
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    
    // If the user is not registered, return default values
    if (!accountInfo) {
      console.log(`No user stake info found for: ${userPublicKey.toString()}`);
      return {
        registered: false,
        amountStaked: 0,
        stakeStartTime: null,
        lastClaimTime: null,
        userStakeInfoAddress: userStakeInfoPDA.toString()
      };
    }
    
    // User is registered, return the stake info
    // In a real implementation, we would parse the account data here
    // but for now we'll return basic data
    
    return {
      registered: true,
      amountStaked: 0, // We would parse this from the account data
      stakeStartTime: new Date(),
      lastClaimTime: null,
      userStakeInfoAddress: userStakeInfoPDA.toString()
    };
  } catch (error) {
    console.error('Error getting user stake info:', error);
    
    // Return default values on error
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userPublicKey);
    return {
      registered: false,
      amountStaked: 0,
      stakeStartTime: null,
      lastClaimTime: null,
      userStakeInfoAddress: userStakeInfoPDA.toString()
    };
  }
};