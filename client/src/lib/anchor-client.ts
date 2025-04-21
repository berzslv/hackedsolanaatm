/**
 * Anchor Client
 * 
 * This module provides a proper Anchor client setup for our contract interactions.
 * It ensures we use the correct instruction discriminators by relying on Anchor's
 * Program class instead of manually creating transactions.
 */
import { 
  AnchorProvider,
  BN,
  Program, 
  web3
} from '@coral-xyz/anchor';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
// Import the IDL
// We'll define it inline here to avoid path issues
const IDL = {
  "version": "0.1.0",
  "name": "staking_vault",
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
          "name": "tokenMint",
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
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "unlockDuration",
          "type": "u64"
        },
        {
          "name": "earlyUnstakePenaltyBps",
          "type": "u16"
        },
        {
          "name": "referralRewardRateBps",
          "type": "u16"
        }
      ]
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
      "name": "stakeWithReferral",
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
          "name": "referrer",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "referrerInfo",
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
          "name": "feeCollector",
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
      "name": "claimRewards",
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
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Vault",
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
            "name": "vaultAuthority",
            "type": "publicKey"
          },
          {
            "name": "vaultTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "unlockDuration",
            "type": "u64"
          },
          {
            "name": "earlyUnstakePenaltyBps",
            "type": "u16"
          },
          {
            "name": "referralRewardRateBps",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultAuthBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "UserInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "vault",
            "type": "publicKey"
          },
          {
            "name": "amountStaked",
            "type": "u64"
          },
          {
            "name": "lastStakeTime",
            "type": "i64"
          },
          {
            "name": "lastClaimTime",
            "type": "i64"
          },
          {
            "name": "pendingRewards",
            "type": "u64"
          },
          {
            "name": "referrer",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};

// Constants
const STAKING_PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Create a wallet that can be used with Anchor
export function createAnchorWallet(pubkey: PublicKey, sendTransaction: any) {
  // Create a wallet adapter that works with Anchor
  return {
    publicKey: pubkey,
    // Anchor needs signTransaction but our SolanaContext provides sendTransaction
    // This wrapper handles the conversion
    signTransaction: async (tx: Transaction): Promise<Transaction> => {
      // Sign the transaction (sendTransaction will handle this)
      // But we need to return the signed transaction for Anchor's Program
      // This is just for Anchor's API - the actual signing is done elsewhere
      await sendTransaction(tx);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      // Just return the transactions - actual signing happens in sendTransaction
      return txs;
    },
  };
}

// Create an Anchor provider from connection and wallet
export function createAnchorProvider(connection: Connection, wallet: any) {
  return new AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: 'confirmed' }
  );
}

// Get the Anchor program instance
export function getStakingProgram(provider: AnchorProvider) {
  try {
    // Cast IDL to any to address TypeScript typing issues
    // The IDL is structurally correct but may not match exactly the expected type
    return new Program(IDL as any, STAKING_PROGRAM_ID, provider);
  } catch (error) {
    console.error("Error creating staking program:", error);
    throw error;
  }
}

// Get PDA for user staking account
export async function findUserStakingAccountPDA(program: any, walletAddress: PublicKey) {
  try {
    // Get the program ID from the program instance
    const programId = program.programId;
    
    // Find the PDA for user staking account
    const [pda, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("user_info"), walletAddress.toBuffer()],
      programId
    );
    
    return { pda, bump };
  } catch (error) {
    console.error("Error finding user staking account PDA:", error);
    throw error;
  }
}

// Get PDA for the vault
export async function findVaultPDA(program: any) {
  const [pda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("vault")],
    program.programId
  );
  
  return { pda, bump };
}

// Get PDA for the vault authority
export async function findVaultAuthorityPDA(program: any) {
  const [pda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("vault_auth")],
    program.programId
  );
  
  return { pda, bump };
}

// Create a registration transaction using Anchor
export async function createRegisterUserTransaction(
  program: any,
  userWallet: PublicKey
) {
  try {
    // Find PDAs
    const { pda: userStakingAccountPDA } = await findUserStakingAccountPDA(program, userWallet);
    const { pda: vaultPDA } = await findVaultPDA(program);
    
    // Use Anchor's method builder to create the transaction
    return program.methods
      .registerUser()
      .accounts({
        user: userWallet,
        userInfo: userStakingAccountPDA,
        vault: vaultPDA,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();
    
  } catch (error) {
    console.error("Error creating register user transaction:", error);
    throw error;
  }
}

// Create a stake transaction using Anchor
export async function createStakeTransaction(
  program: any,
  userWallet: PublicKey,
  tokenMint: PublicKey,
  amount: number
) {
  try {
    // Find PDAs
    const { pda: userStakingAccountPDA } = await findUserStakingAccountPDA(program, userWallet);
    const { pda: vaultPDA } = await findVaultPDA(program);
    const { pda: vaultAuthorityPDA } = await findVaultAuthorityPDA(program);
    
    // Calculate lamports amount
    const amountLamports = new BN(Math.floor(amount * Math.pow(10, 9)));
    
    // Get token accounts
    const userTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      userWallet,
      false,
      TOKEN_PROGRAM_ID
    );
    
    // Find vault token account
    const vaultTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      vaultAuthorityPDA,
      true,
      TOKEN_PROGRAM_ID
    );
    
    console.log('Creating stake transaction with Anchor client');
    console.log('Amount:', amountLamports.toString());
    console.log('User wallet:', userWallet.toString());
    console.log('User staking account PDA:', userStakingAccountPDA.toString());
    console.log('Vault PDA:', vaultPDA.toString());
    console.log('User token account:', userTokenAccount.toString());
    console.log('Vault token account:', vaultTokenAccount.toString());
    
    // Use Anchor's method builder to create the transaction
    return program.methods
      .stake(amountLamports)
      .accounts({
        user: userWallet,
        userInfo: userStakingAccountPDA,
        vault: vaultPDA,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction();
    
  } catch (error) {
    console.error("Error creating stake transaction:", error);
    throw error;
  }
}