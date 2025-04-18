/**
 * Simple Staking Utilities
 * 
 * This module provides utility functions for interacting with the simple staking program
 */
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Constants for the simple staking program
// Using a valid Pubkey for testing - we would replace this with the actual ID after deployment
export const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');

// These will be populated after the program is deployed
export let VAULT_ADDRESS: PublicKey;
export let VAULT_AUTHORITY: PublicKey;
export let VAULT_TOKEN_ACCOUNT: PublicKey; 

// The IDL for the simple staking program
export const IDL = {
  "version": "0.1.0",
  "name": "simple_staking",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenVault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "registerUser",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "stake",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unstake",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "userInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "vaultTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "StakingVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "tokenMint",
            "type": "publicKey"
          },
          {
            "name": "tokenVault",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "UserStakeInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "amountStaked",
            "type": "u64"
          },
          {
            "name": "rewardsEarned",
            "type": "u64"
          },
          {
            "name": "lastStakeTimestamp",
            "type": "i64"
          },
          {
            "name": "lastClaimTimestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InsufficientStake",
      "msg": "Insufficient staked tokens"
    }
  ]
};

/**
 * Calculate the vault PDA
 * @returns The vault PDA
 */
export function findVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault')], 
    PROGRAM_ID
  );
}

/**
 * Calculate the vault authority PDA
 * @returns The vault authority PDA
 */
export function findVaultAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault_auth')], 
    PROGRAM_ID
  );
}

/**
 * Find the user's staking account PDA
 * @param userPubkey User's wallet public key
 * @returns The PDA public key and bump seed
 */
export function findUserStakeInfoPDA(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_info'), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Check if user is registered with the staking program
 * @param userPubkey User's wallet public key
 * @returns True if registered, false otherwise
 */
export async function isUserRegistered(userPubkey: PublicKey): Promise<boolean> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const [userStakingPDA] = findUserStakeInfoPDA(userPubkey);
    const account = await connection.getAccountInfo(userStakingPDA);
    return !!account && account.owner.equals(PROGRAM_ID);
  } catch (error) {
    console.error("Error checking if user is registered:", error);
    return false;
  }
}

/**
 * Initialize the simple staking vault (must be called after deploy)
 * @param provider Anchor provider with admin wallet
 * @returns The vault address and token account
 */
export async function initializeVault(
  connection: Connection, 
  adminKeypair: Keypair
): Promise<{ vault: PublicKey, vaultAuthority: PublicKey, vaultTokenAccount: PublicKey }> {
  try {
    // Create provider with admin wallet
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: adminKeypair.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(adminKeypair);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs.map(tx => {
            tx.partialSign(adminKeypair);
            return tx;
          });
        },
      },
      { commitment: 'confirmed' }
    );

    // Create program instance
    const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);

    // Find the vault PDA
    const [vaultPDA, _] = findVaultPDA();
    
    // Find the vault authority PDA
    const [vaultAuthority, __] = findVaultAuthorityPDA();
    
    // Get the token account for the vault authority
    const vaultTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT_ADDRESS,
      vaultAuthority,
      true // allowOwnerOffCurve - true for PDAs
    );

    // Store these globally
    VAULT_ADDRESS = vaultPDA;
    VAULT_AUTHORITY = vaultAuthority;
    VAULT_TOKEN_ACCOUNT = vaultTokenAccount;

    // Check if the vault already exists
    const vaultAccount = await connection.getAccountInfo(vaultPDA);
    
    if (vaultAccount) {
      console.log("Vault already exists, not re-initializing");
      return { vault: vaultPDA, vaultAuthority, vaultTokenAccount };
    }
    
    console.log("Initializing new vault...");
    
    // Initialize the vault
    await program.methods
      .initialize()
      .accounts({
        authority: adminKeypair.publicKey,
        vault: vaultPDA,
        vaultAuthority,
        tokenMint: TOKEN_MINT_ADDRESS,
        tokenVault: vaultTokenAccount,
      })
      .rpc();
    
    console.log("Staking vault initialized successfully");
    
    return { vault: vaultPDA, vaultAuthority, vaultTokenAccount };
  } catch (error) {
    console.error("Error initializing vault:", error);
    throw error;
  }
}

/**
 * Get user staking information
 */
export async function getUserStakingInfo(userPubkey: PublicKey): Promise<{
  isRegistered: boolean;
  amountStaked: number;
  pendingRewards: number;
  lastStakeTime: Date | null;
  lastClaimTime: Date | null;
}> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Find user staking account PDA
    const [userStakingPDA] = findUserStakeInfoPDA(userPubkey);
    
    // Default values if not registered
    const defaultInfo = {
      isRegistered: false,
      amountStaked: 0,
      pendingRewards: 0,
      lastStakeTime: null,
      lastClaimTime: null
    };
    
    // Check if the account exists
    const account = await connection.getAccountInfo(userStakingPDA);
    if (!account || !account.owner.equals(PROGRAM_ID)) {
      return defaultInfo;
    }
    
    // Create a read-only provider
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: userPubkey,
        signTransaction: async () => { throw new Error('Not implemented'); },
        signAllTransactions: async () => { throw new Error('Not implemented'); }
      },
      { commitment: 'confirmed' }
    );
    
    // Create program instance
    const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
    
    // Fetch the user staking account data
    try {
      const userStakeInfo = await program.account.userStakeInfo.fetch(userStakingPDA);
      
      return {
        isRegistered: true,
        amountStaked: Number(userStakeInfo.amountStaked),
        pendingRewards: Number(userStakeInfo.rewardsEarned),
        lastStakeTime: userStakeInfo.lastStakeTimestamp ? new Date(Number(userStakeInfo.lastStakeTimestamp) * 1000) : null,
        lastClaimTime: userStakeInfo.lastClaimTimestamp ? new Date(Number(userStakeInfo.lastClaimTimestamp) * 1000) : null
      };
    } catch (decodeError) {
      console.error("Error decoding user staking account data:", decodeError);
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
      lastClaimTime: null
    };
  }
}