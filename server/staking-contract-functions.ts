/**
 * Staking Contract Functions
 * 
 * This module provides essential functions for interacting with
 * the staking smart contract, including creating and handling
 * the required transaction instructions.
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  TransactionInstruction 
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress 
} from '@solana/spl-token';
import BN from 'bn.js';

// Constants from configuration
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const TOKEN_MINT = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const STAKING_VAULT_PDA = new PublicKey('DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

/**
 * Get RPC connection to Solana
 */
export const getConnection = (): Connection => {
  return new Connection('https://api.devnet.solana.com', 'confirmed');
};

/**
 * Find the PDA for the user's staking info
 * @param userPublicKey The user's wallet public key
 * @returns The PDA and bump
 */
export const findUserStakingPDA = (userPublicKey: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_info'), userPublicKey.toBuffer()],
    PROGRAM_ID
  );
};

/**
 * Create a register user instruction
 * @param userPublicKey The user's wallet public key
 * @returns The created instruction
 */
export const createRegisterUserInstruction = (
  userPublicKey: PublicKey,
  referrer?: PublicKey
): TransactionInstruction => {
  // Find the user's staking PDA
  const [userStakingPDA] = findUserStakingPDA(userPublicKey);
  
  // Prepare the account keys
  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true }, // User/payer
    { pubkey: userStakingPDA, isSigner: false, isWritable: true }, // User staking account
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // System program
  ];
  
  // Add referrer if provided
  if (referrer) {
    keys.push({ pubkey: referrer, isSigner: false, isWritable: false }); // Referrer
  }
  
  // Create the instruction data
  // 0 = register user instruction with or without referrer
  const instructionData = Buffer.from([0]);
  
  // Create and return the instruction
  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: instructionData
  });
};

/**
 * Create a staking instruction
 * @param userPublicKey The user's wallet public key
 * @param amount The amount to stake (in normal units, not lamports)
 * @returns The created instruction
 */
export const createStakingInstruction = async (
  userPublicKey: PublicKey,
  amount: number
): Promise<TransactionInstruction> => {
  // Find the user's staking PDA
  const [userStakingPDA] = findUserStakingPDA(userPublicKey);
  
  // Get the user's token account
  const userTokenAccount = await getAssociatedTokenAddress(
    TOKEN_MINT,
    userPublicKey,
    false,
    TOKEN_PROGRAM_ID
  );
  
  // Convert amount to lamports (assuming 9 decimals for the token)
  const amountLamports = new BN(amount * Math.pow(10, 9));
  
  // Create the instruction data
  // 1 = stake instruction
  const instructionCode = Buffer.from([1]);
  const amountBytes = Buffer.from(amountLamports.toArray('le', 8));
  
  // Combine the instruction code and amount
  const data = Buffer.concat([instructionCode, amountBytes]);
  
  // Return the instruction
  return new TransactionInstruction({
    keys: [
      { pubkey: userPublicKey, isSigner: true, isWritable: true }, // User/payer
      { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // User token account
      { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // Vault token account
      { pubkey: STAKING_VAULT_PDA, isSigner: false, isWritable: true }, // Vault PDA
      { pubkey: userStakingPDA, isSigner: false, isWritable: true }, // User staking account
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false } // Token program
    ],
    programId: PROGRAM_ID,
    data
  });
};

/**
 * Create a complete register user transaction
 * @param userPublicKey The user's wallet public key
 * @returns The serialized transaction
 */
export const createRegisterUserTransaction = async (
  userPublicKey: PublicKey,
  referrer?: PublicKey
): Promise<string> => {
  // Get connection
  const connection = getConnection();
  
  // Create a new transaction
  const transaction = new Transaction();
  
  // Get the latest blockhash
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPublicKey;
  
  // Add the registration instruction
  transaction.add(createRegisterUserInstruction(userPublicKey, referrer));
  
  // Serialize the transaction
  return Buffer.from(transaction.serialize()).toString('base64');
};

/**
 * Create a complete staking transaction
 * @param userPublicKey The user's wallet public key
 * @param amount The amount to stake
 * @returns The serialized transaction
 */
export const createStakingTransaction = async (
  userPublicKey: PublicKey,
  amount: number
): Promise<string> => {
  // Get connection
  const connection = getConnection();
  
  // Create a new transaction
  const transaction = new Transaction();
  
  // Get the latest blockhash
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPublicKey;
  
  // Add the staking instruction
  transaction.add(await createStakingInstruction(userPublicKey, amount));
  
  // Serialize the transaction
  return Buffer.from(transaction.serialize()).toString('base64');
};

/**
 * Get on-chain staking information for a wallet
 * @param userPublicKey The user's wallet public key
 * @returns The staking information
 */
export const getOnChainStakingInfo = async (
  userPublicKey: PublicKey
): Promise<{
  isRegistered: boolean;
  amountStaked: number;
  pendingRewards: number;
  lastStakeTime: Date | null;
  lastClaimTime: Date | null;
  referrer: string | null;
}> => {
  // Get connection
  const connection = getConnection();
  
  // Find the user's staking PDA
  const [userStakingPDA] = findUserStakingPDA(userPublicKey);
  
  // Try to get the account info
  const accountInfo = await connection.getAccountInfo(userStakingPDA);
  
  // If no account info, user is not registered
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
  
  // Parse the account data (simplified for now)
  // In reality, you'd use a proper deserialization based on the contract's data layout
  return {
    isRegistered: true,
    amountStaked: 0,  // Would parse from accountInfo.data
    pendingRewards: 0, // Would parse from accountInfo.data
    lastStakeTime: new Date(), // Would parse from accountInfo.data
    lastClaimTime: null, // Would parse from accountInfo.data
    referrer: null // Would parse from accountInfo.data
  };
};