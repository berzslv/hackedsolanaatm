/**
 * Buy And Stake - Exact Implementation for the Staking Vault Contract
 * 
 * This creates a transaction that buys and stakes tokens in one step
 * using the exact account structure required by the staking vault contract,
 * with the correct PDA seed ("user_info").
 */

import { Request, Response } from 'express';
import {
  PublicKey,
  Transaction,
  Connection,
  clusterApiUrl,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import {
  findUserStakingPDA,
  findVaultPDA,
  findVaultAuthorityPDA,
  findAssociatedTokenAccount,
  createRegisterUserInstruction,
  createStakeInstruction,
  TOKEN_MINT
} from './staking-contract-functions';

// Import token buy utilities
import { getMintAuthority, getTokenMint } from './token-utils';

/**
 * Handler for the buy-and-stake endpoint
 * This creates a transaction that buys and stakes tokens in one step
 * using the proper staking vault program
 */
export async function handleBuyAndStake(req: Request, res: Response) {
  try {
    const { walletAddress, amount, referrer } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    console.log(`Creating buy-and-stake transaction for wallet: ${walletAddress}, amount: ${amount} SOL`);
    
    // Parse the amount as a number
    const parsedAmount = parseFloat(amount);
    
    // Convert wallet address to PublicKey
    const userPublicKey = new PublicKey(walletAddress);
    
    // Convert referrer to PublicKey if provided
    let referrerPublicKey: PublicKey | undefined;
    if (referrer) {
      try {
        referrerPublicKey = new PublicKey(referrer);
        console.log(`Using referrer: ${referrer}`);
      } catch (error) {
        console.warn(`Invalid referrer public key: ${referrer}. Proceeding without referrer.`);
      }
    }
    
    // Create the transaction
    const transaction = await createCombinedBuyAndStakeTransaction(
      userPublicKey,
      parsedAmount,
      referrerPublicKey
    );
    
    console.log('Buy-and-stake transaction created successfully');
    
    // Serialize and return the transaction
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');
    
    return res.json({
      success: true,
      message: "Buy-and-stake transaction created",
      transaction: serializedTransaction
    });
  } catch (error) {
    console.error('Error creating buy-and-stake transaction:', error);
    return res.status(500).json({
      error: "Failed to create buy-and-stake transaction",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a combined transaction for buying and staking tokens in one step
 * that exactly matches the account structure required by the staking vault contract
 * 
 * @param userWalletAddress The user's wallet address
 * @param amount The amount of tokens to buy and stake
 * @param referrer Optional referral public key
 * @returns The serialized transaction as base64 string
 */
export async function createCombinedBuyAndStakeTransaction(
  userWalletAddress: PublicKey,
  solAmount: number,
  referrer?: PublicKey
): Promise<Transaction> {
  // Get a connection to the Solana cluster
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Get token mint and authority for the purchase part
  const mintAuthority = getMintAuthority();
  const mintPubkey = getTokenMint();
  
  // Calculate token amount based on conversion rate (1 SOL = 1000 tokens)
  const tokenAmount = solAmount * 1000;
  
  // Get the token account addresses
  const userTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    userWalletAddress,
    false,
    TOKEN_PROGRAM_ID
  );
  
  // Get the recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  // Create a new transaction
  const transaction = new Transaction({
    feePayer: userWalletAddress,
    blockhash,
    lastValidBlockHeight
  });
  
  // Check if user token account exists
  try {
    const tokenAccount = await connection.getAccountInfo(userTokenAccount);
    if (!tokenAccount) {
      // If the token account doesn't exist, create it
      const createTokenAccountIx = createAssociatedTokenAccountInstruction(
        userWalletAddress,  // Payer
        userTokenAccount,   // Associated token account address
        userWalletAddress,  // Owner
        mintPubkey,         // Mint
        TOKEN_PROGRAM_ID
      );
      transaction.add(createTokenAccountIx);
    }
  } catch (error) {
    console.log("Error checking token account, adding creation instruction:", error);
    // If there's an error, assume we need to create the token account
    const createTokenAccountIx = createAssociatedTokenAccountInstruction(
      userWalletAddress,  // Payer
      userTokenAccount,   // Associated token account address
      userWalletAddress,  // Owner
      mintPubkey,         // Mint
      TOKEN_PROGRAM_ID
    );
    transaction.add(createTokenAccountIx);
  }
  
  // Add payment instruction (SOL transfer to mint authority)
  const transferSolIx = SystemProgram.transfer({
    fromPubkey: userWalletAddress,
    toPubkey: mintAuthority.publicKey,
    lamports: solAmount * LAMPORTS_PER_SOL
  });
  transaction.add(transferSolIx);
  
  // Check if the user is already registered with the staking vault
  const [userStakingAccount, _userBump] = findUserStakingPDA(userWalletAddress);
  const userStakingAccountInfo = await connection.getAccountInfo(userStakingAccount);
  
  // If the user isn't registered, add a registration instruction
  if (!userStakingAccountInfo) {
    const registerInstruction = await createRegisterUserInstruction(userWalletAddress, referrer);
    transaction.add(registerInstruction);
  }
  
  // Add the staking instruction
  const stakeInstruction = await createStakeInstruction(userWalletAddress, tokenAmount, referrer);
  transaction.add(stakeInstruction);
  
  return transaction;
}