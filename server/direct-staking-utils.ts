/**
 * Direct Staking Utilities
 * This module provides direct access to the staking program using Anchor
 * It bypasses the standard staking-contract-client.ts to simplify integration
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

// Load the IDL directly
let idl: any = null;
try {
  const idlPath = path.join(process.cwd(), './idl/staking_vault.json');
  const idlString = fs.readFileSync(idlPath, 'utf8');
  idl = JSON.parse(idlString);
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
    // Create a fake wallet instance that satisfies the Wallet interface
    const dummyWallet: anchor.Wallet = {
      publicKey: STAKING_VAULT_ADDRESS,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    };
    
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
 * Find the user stake account PDA address
 * @param userWalletAddress The user's wallet address
 * @returns The PDA address for the user's stake account
 */
export function findUserStakeAccount(userWalletAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user-stake-info'), userWalletAddress.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Create a staking instruction that will properly register the stake with the staking program
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
    
    // Find the user stake account PDA
    const [userStakeAccount] = findUserStakeAccount(userWallet);
    
    // The instruction data for the stake instruction
    const data = program.coder.instruction.encode('stake', { amount: new BN(amount.toString()) });
    
    // The accounts required for the stake instruction
    const keys = [
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: STAKING_VAULT_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: userStakeAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    
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