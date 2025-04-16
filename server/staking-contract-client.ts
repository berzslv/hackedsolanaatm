/**
 * Staking Contract Client
 * This module provides a direct integration with the on-chain staking program
 * using Anchor to interact with the smart contract
 */
import { PublicKey, Connection, clusterApiUrl, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BN } from 'bn.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { getWebsocketConnection } from './utils';
import fs from 'fs';
import path from 'path';

// Load the IDL
const idlPath = path.join(process.cwd(), './idl/staking_vault.json');
let idl: any = null;

try {
  const idlString = fs.readFileSync(idlPath, 'utf8');
  idl = JSON.parse(idlString);
} catch (error) {
  console.error('Failed to load IDL:', error);
}

// Program and vault constants
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx49Swm3H3Nr8A2scNygHS8');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const STAKING_VAULT_ADDRESS = new PublicKey('DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

// Get Connection
export function getConnection(): Connection {
  return new Connection(clusterApiUrl('devnet'), {
    commitment: 'confirmed',
    wsEndpoint: getWebsocketConnection()
  });
}

/**
 * Initialize the staking program client
 * @returns Anchor program client
 */
export function initializeStakingProgram(): anchor.Program | null {
  try {
    if (!idl) {
      console.error('IDL not loaded');
      return null;
    }

    const connection = getConnection();
    
    // Create a dummy provider for read-only operations
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
    
    // Create program
    return new anchor.Program(idl, PROGRAM_ID, provider);
  } catch (error) {
    console.error('Failed to initialize staking program:', error);
    return null;
  }
}

/**
 * Find the PDA for a user's stake account
 * @param program Anchor program
 * @param userWallet User wallet public key
 * @returns User stake account PDA
 */
export async function findUserStakeAccountPDA(program: anchor.Program, userWallet: PublicKey): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [
      Buffer.from('user-stake'),
      STAKING_VAULT_ADDRESS.toBuffer(),
      userWallet.toBuffer()
    ],
    program.programId
  );
}

/**
 * Find the vault authority PDA
 * @param program Anchor program
 * @returns Vault authority PDA
 */
export async function findVaultAuthorityPDA(program: anchor.Program): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(
    [STAKING_VAULT_ADDRESS.toBuffer()],
    program.programId
  );
}

/**
 * Create a transaction to stake tokens
 * @param userWallet User wallet public key
 * @param amount Amount to stake (in tokens)
 * @returns Transaction to be signed
 */
export async function createStakeTransaction(userWallet: PublicKey, amount: number): Promise<Transaction> {
  const program = initializeStakingProgram();
  if (!program) {
    throw new Error('Failed to initialize staking program');
  }
  
  // Convert amount to lamports (token has 9 decimals)
  const amountLamports = new BN(amount * 1e9);
  
  // Get user token account address
  const userTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT_ADDRESS,
    userWallet
  );
  
  // Get user stake account PDA
  const [userStakeAccount] = await findUserStakeAccountPDA(program, userWallet);
  
  // Create transaction
  const tx = new Transaction();
  
  try {
    // Create the instruction for staking
    const instruction = program.instruction.stake(
      amountLamports,
      {
        accounts: {
          user: userWallet,
          stakingVault: STAKING_VAULT_ADDRESS,
          userStakeInfo: userStakeAccount,
          tokenMint: TOKEN_MINT_ADDRESS,
          tokenVault: VAULT_TOKEN_ACCOUNT,
          userTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
        }
      }
    );
    
    tx.add(instruction);
    
    // Get recent blockhash
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userWallet;
    
    return tx;
  } catch (error) {
    console.error('Error creating stake transaction:', error);
    throw error;
  }
}

/**
 * Create a transaction to unstake tokens
 * @param userWallet User wallet public key
 * @param amount Amount to unstake (in tokens)
 * @returns Transaction to be signed
 */
export async function createUnstakeTransaction(userWallet: PublicKey, amount: number): Promise<Transaction> {
  const program = initializeStakingProgram();
  if (!program) {
    throw new Error('Failed to initialize staking program');
  }
  
  // Convert amount to lamports (token has 9 decimals)
  const amountLamports = new BN(amount * 1e9);
  
  // Get user token account address
  const userTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT_ADDRESS,
    userWallet
  );
  
  // Get user stake account PDA
  const [userStakeAccount] = await findUserStakeAccountPDA(program, userWallet);
  
  // Get vault authority PDA
  const [vaultAuthority, vaultAuthorityBump] = await findVaultAuthorityPDA(program);
  
  // Create transaction
  const tx = new Transaction();
  
  try {
    // Create the instruction for unstaking
    const instruction = program.instruction.unstake(
      amountLamports,
      {
        accounts: {
          user: userWallet,
          stakingVault: STAKING_VAULT_ADDRESS,
          userStakeInfo: userStakeAccount,
          tokenMint: TOKEN_MINT_ADDRESS,
          tokenVault: VAULT_TOKEN_ACCOUNT,
          userTokenAccount: userTokenAccount,
          vaultAuthority: vaultAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId
        }
      }
    );
    
    tx.add(instruction);
    
    // Get recent blockhash
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userWallet;
    
    return tx;
  } catch (error) {
    console.error('Error creating unstake transaction:', error);
    throw error;
  }
}

/**
 * Get the staking info for a user
 * @param userWallet User wallet public key
 * @returns User staking info
 */
export async function getUserStakingInfo(userWallet: PublicKey): Promise<any> {
  const program = initializeStakingProgram();
  if (!program) {
    throw new Error('Failed to initialize staking program');
  }
  
  try {
    // Get user stake account PDA
    const [userStakeAccount] = await findUserStakeAccountPDA(program, userWallet);
    
    // Check if account exists
    const connection = getConnection();
    const accountInfo = await connection.getAccountInfo(userStakeAccount);
    
    if (!accountInfo) {
      return {
        exists: false,
        amountStaked: 0,
        stakeStartTime: null,
        lastClaimTime: null
      };
    }
    
    // Fetch account data
    const userStakeInfo = await program.account.userStakeInfo.fetch(userStakeAccount);
    
    // Convert BN values to numbers
    const amountStaked = userStakeInfo.amount ? (userStakeInfo.amount as BN).toNumber() / 1e9 : 0;
    const stakeStartTime = userStakeInfo.stakeStartTime ? new Date((userStakeInfo.stakeStartTime as BN).toNumber() * 1000) : null;
    const lastClaimTime = userStakeInfo.lastClaimTime ? new Date((userStakeInfo.lastClaimTime as BN).toNumber() * 1000) : null;
    
    return {
      exists: true,
      amountStaked,
      stakeStartTime,
      lastClaimTime
    };
  } catch (error) {
    console.error('Error getting user staking info:', error);
    return {
      exists: false,
      amountStaked: 0,
      stakeStartTime: null,
      lastClaimTime: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get the staking vault info
 * @returns Staking vault info
 */
export async function getStakingVaultInfo(): Promise<any> {
  const program = initializeStakingProgram();
  if (!program) {
    throw new Error('Failed to initialize staking program');
  }
  
  try {
    // Fetch staking vault account data
    const stakingVaultInfo = await program.account.stakingVault.fetch(STAKING_VAULT_ADDRESS);
    
    // Convert BN values to numbers
    const totalStaked = stakingVaultInfo.totalStaked ? (stakingVaultInfo.totalStaked as BN).toNumber() / 1e9 : 0;
    const rewardPool = stakingVaultInfo.rewardPool ? (stakingVaultInfo.rewardPool as BN).toNumber() / 1e9 : 0;
    const stakersCount = stakingVaultInfo.stakersCount ? (stakingVaultInfo.stakersCount as BN).toNumber() : 0;
    const currentApyBasisPoints = stakingVaultInfo.currentApyBasisPoints ? (stakingVaultInfo.currentApyBasisPoints as BN).toNumber() : 0;
    const lastCompoundTime = stakingVaultInfo.lastCompoundTime ? new Date((stakingVaultInfo.lastCompoundTime as BN).toNumber() * 1000) : null;
    
    return {
      totalStaked,
      rewardPool,
      stakersCount,
      currentAPY: currentApyBasisPoints / 100, // Convert basis points to percentage
      lastCompoundTime,
      stakingVaultAddress: STAKING_VAULT_ADDRESS.toString(),
      tokenMint: TOKEN_MINT_ADDRESS.toString(),
      tokenVault: VAULT_TOKEN_ACCOUNT.toString()
    };
  } catch (error) {
    console.error('Error getting staking vault info:', error);
    return {
      totalStaked: 0,
      rewardPool: 0,
      stakersCount: 0,
      currentAPY: 12, // Default 12% APY
      lastCompoundTime: new Date(),
      stakingVaultAddress: STAKING_VAULT_ADDRESS.toString(),
      tokenMint: TOKEN_MINT_ADDRESS.toString(),
      tokenVault: VAULT_TOKEN_ACCOUNT.toString(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}