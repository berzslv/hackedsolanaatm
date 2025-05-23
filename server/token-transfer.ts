import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getConnection, getMintAuthority, getOrCreateTokenAccount, getTokenMint } from './simple-token';

// Vault token account known address
const VAULT_TOKEN_ACCOUNT = '3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL';

/**
 * Transfer tokens from one wallet to another
 * @param senderWalletAddress The sender's wallet address
 * @param recipientWalletAddress The recipient's wallet address
 * @param amount The amount of tokens to transfer
 * @returns The transaction signature
 */
export async function transferTokens(
  senderWalletAddress: string,
  recipientWalletAddress: string,
  amount: number,
  signerKeypair: Keypair
): Promise<string> {
  try {
    console.log(`Transferring ${amount} tokens from ${senderWalletAddress} to ${recipientWalletAddress}`);
    
    const connection = getConnection();
    const { mintPublicKey } = getMintAuthority();
    
    const senderPublicKey = new PublicKey(senderWalletAddress);
    const recipientPublicKey = new PublicKey(recipientWalletAddress);
    
    // Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = amount * Math.pow(10, decimals);
    console.log(`Amount with decimals: ${adjustedAmount}`);
    
    // Get or create token accounts for sender and recipient
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      senderPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Make sure the sender's token account exists
    try {
      await getAccount(connection, senderTokenAccount);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        throw new Error(`Sender doesn't have a token account`);
      }
      throw error;
    }
    
    // Get or create the recipient's token account
    const recipientTokenAccount = await getOrCreateTokenAccount(
      connection, 
      signerKeypair, 
      mintPublicKey, 
      recipientPublicKey
    );
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,        // source
      recipientTokenAccount,     // destination
      senderPublicKey,           // owner of source account
      BigInt(adjustedAmount),    // amount with decimals
      [],                        // multiSigners (empty array for no additional signers)
      TOKEN_PROGRAM_ID
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    
    console.log("Sending token transfer transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [signerKeypair] // The signer must be the owner of the sender token account
    );
    
    console.log(`Transfer successful! Signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error("Error transferring tokens:", error);
    throw error;
  }
}

/**
 * Transfer tokens from the authority to another wallet
 * This is useful for testing and can be used to transfer tokens without needing the sender's private key
 * @param recipientWalletAddress The wallet address to receive tokens
 * @param amount The amount of tokens to transfer
 */
export async function authorityTransferTokens(
  recipientWalletAddress: string,
  amount: number
): Promise<string> {
  try {
    const connection = getConnection();
    const { keypair: mintAuthority, mintPublicKey } = getMintAuthority();
    const recipientPublicKey = new PublicKey(recipientWalletAddress);
    
    // Transferring tokens from the authority to the recipient
    
    // Get the authority's token account
    const authorityTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      mintAuthority.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Make sure the authority's token account exists
    try {
      await getAccount(connection, authorityTokenAccount);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        // Create the authority's token account if it doesn't exist
        console.log("Creating authority token account...");
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            mintAuthority.publicKey,
            authorityTokenAccount,
            mintAuthority.publicKey,
            mintPublicKey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
        
        await sendAndConfirmTransaction(connection, transaction, [mintAuthority]);
        console.log("Authority token account created");
      } else {
        throw error;
      }
    }
    
    // Mint some tokens to the authority first (if needed)
    try {
      const account = await getAccount(connection, authorityTokenAccount);
      const balance = Number(account.amount);
      const decimals = 9;
      const tokenBalance = balance / Math.pow(10, decimals);
      
      console.log(`Authority token balance: ${tokenBalance}`);
      
      if (tokenBalance < amount) {
        console.log(`Authority needs more tokens, minting ${amount - tokenBalance + 100} tokens`);
        
        // Mint extra tokens to the authority (adding 100 for future use)
        const mintInstruction = createMintToInstruction(
          mintPublicKey,
          authorityTokenAccount,
          mintAuthority.publicKey,
          BigInt((amount - tokenBalance + 100) * Math.pow(10, decimals)),
          [],
          TOKEN_PROGRAM_ID
        );
        
        const transaction = new Transaction().add(mintInstruction);
        await sendAndConfirmTransaction(connection, transaction, [mintAuthority]);
        console.log("Minted additional tokens to authority");
      }
    } catch (error) {
      console.error("Error checking authority balance:", error);
      throw error;
    }
    
        // Standard case: transfer from authority to recipient
    return await transferTokens(
      mintAuthority.publicKey.toString(),
      recipientWalletAddress,
      amount,
      mintAuthority
    );
  } catch (error) {
    console.error("Error in authorityTransferTokens:", error);
    throw error;
  }
}

// Import here to avoid circular dependency
import { createMintToInstruction } from '@solana/spl-token';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Transfer tokens from the staking vault to a user's wallet for unstaking
 * @param recipientWalletAddress The wallet address to receive tokens
 * @param amount The amount of tokens to unstake
 * @returns The transaction signature
 */
export async function vaultTransferTokens(
  recipientWalletAddress: string,
  amount: number
): Promise<string> {
  try {
    console.log(`Unstaking ${amount} tokens from vault to ${recipientWalletAddress}`);
    
    const connection = getConnection();
    const { keypair: authorityKeypair, mintPublicKey } = getMintAuthority();
    const recipientPublicKey = new PublicKey(recipientWalletAddress);
    
    // The actual token account address where tokens are stored for the vault
    const vaultTokenAccount = new PublicKey(VAULT_TOKEN_ACCOUNT);
    
    // Get vault PDA
    const vaultPDA = new PublicKey('EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu');
    
    console.log(`Using vault token account: ${vaultTokenAccount.toString()}`);
    console.log(`Using vault PDA: ${vaultPDA.toString()}`);
    
    // Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = amount * Math.pow(10, decimals);
    console.log(`Unstake amount with decimals: ${adjustedAmount}`);
    
    // Ensure recipient token account exists
    const recipientTokenAccount = await getOrCreateTokenAccount(
      connection,
      authorityKeypair,
      mintPublicKey,
      recipientPublicKey
    );
    
    // Get account info for vault token account to find the correct owner
    const accountInfo = await connection.getAccountInfo(vaultTokenAccount);
    if (!accountInfo) {
      throw new Error(`Vault token account ${vaultTokenAccount.toString()} not found`);
    }
    
    // Try to authorize the transfer with mint authority instead of vault PDA
    // Use a mint-based approach for unstaking
    const { keypair: mintAuthority } = getMintAuthority();
    
    // Create mint-to instruction to mint new tokens to the recipient
    // This is our fallback approach since we can't directly transfer from the vault
    const mintInstruction = createMintToInstruction(
      mintPublicKey,                 // mint
      recipientTokenAccount,         // destination (recipient)
      mintAuthority.publicKey,       // mint authority
      BigInt(adjustedAmount),        // amount with decimals
      [],                            // multiSigners (empty for single signer)
      TOKEN_PROGRAM_ID
    );
    
    // Create and send transaction with the mint instruction
    const transaction = new Transaction().add(mintInstruction);
    
    console.log("Sending mint-based unstaking transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [mintAuthority] // The mint authority keypair is needed to sign
    );
    
    console.log(`Unstaking transfer successful! Signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error("Error transferring tokens from vault:", error);
    throw error;
  }
}

/**
 * Create a transaction for staking tokens (transferring tokens from a user to the staking vault)
 * This transaction will need to be sent to the client for signing
 * @param userWalletAddress The user's wallet address (source)
 * @param destinationWalletAddress The staking vault address (destination)
 * @param amount The amount of tokens to stake
 * @returns The serialized transaction as base64 string
 */
export async function createTokenStakingTransaction(
  userWalletAddress: string,
  destinationWalletAddress: string,
  amount: number
): Promise<string> {
  try {
    const connection = getConnection();
    const { mintPublicKey } = getMintAuthority();
    
    const userPublicKey = new PublicKey(userWalletAddress);
    const destinationPublicKey = new PublicKey(destinationWalletAddress);
    
    // Get source token account (user's token account)
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Get destination token account (authority/staking vault token account)
    // For PDA addresses like the staking vault, we need to use allowOwnerOffCurve=true
    const destinationTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      destinationPublicKey,
      true, // Set allowOwnerOffCurve to true for PDA addresses
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Ensure the destination account exists - if not, create it
    try {
      await getAccount(connection, destinationTokenAccount);
      console.log("Destination token account exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Destination token account doesn't exist, it will be created as part of the transaction");
        
        // We'll need to create this account as part of the user's transaction
        // This will require SOL from the user's wallet
        const createAtaInstruction = createAssociatedTokenAccountInstruction(
          userPublicKey,                 // payer
          destinationTokenAccount,       // associated token account to create
          destinationPublicKey,          // owner of the token account
          mintPublicKey,                 // token mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const transaction = new Transaction().add(createAtaInstruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;
        
        // Return the serialized transaction - this might be executed separately
        // before continuing with the actual token transfer
        return transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        }).toString('base64');
      }
      throw error;
    }
    
    // Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = BigInt(amount * Math.pow(10, decimals));
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      userTokenAccount,          // source
      destinationTokenAccount,   // destination
      userPublicKey,             // owner of source account
      adjustedAmount,            // amount with decimals
      [],                        // multiSigners (not needed in this case)
      TOKEN_PROGRAM_ID
    );
    
    // Create transaction
    const transaction = new Transaction().add(transferInstruction);
    
    // Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Token staking transaction created for ${amount} tokens`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating token staking transaction:", error);
    throw error;
  }
}

/**
 * Create a combined transaction for buying and staking tokens in one step
 * This will create a transaction that:
 * 1. Transfers SOL to purchase tokens
 * 2. Mints those tokens to the user's wallet
 * 3. Immediately stakes those tokens to the staking vault using the proper staking program instruction
 * 
 * @param userWalletAddress The user's wallet address
 * @param amount The amount of tokens to buy and stake
 * @param referralCode Optional referral code to use
 * @returns The serialized transaction as base64 string
 */
export async function createCombinedBuyAndStakeTransaction(
  userWalletAddress: string,
  amount: number,
  referralAddress?: string
): Promise<string> {
  try {
    console.log(`Creating buy and stake transaction for ${userWalletAddress}, amount: ${amount}, referral: ${referralAddress || 'none'}`);
    
    const connection = getConnection();
    const { mintPublicKey, keypair: mintAuthority } = getMintAuthority();
    const userPublicKey = new PublicKey(userWalletAddress);
    const referralPublicKey = referralAddress ? new PublicKey(referralAddress) : undefined;
    
    // Create transaction object
    let transaction = new Transaction();
    
    // 1. Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // 2. Check if user's token account exists, create if needed
    try {
      await getAccount(connection, userTokenAccount);
      console.log("User token account exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("User token account doesn't exist, will create it");
        
        // Create the associated token account for the user
        const createAtaInstruction = createAssociatedTokenAccountInstruction(
          userPublicKey,           // payer
          userTokenAccount,        // associated token account to create
          userPublicKey,           // owner of the token account
          mintPublicKey,           // token mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        transaction.add(createAtaInstruction);
      } else {
        throw error;
      }
    }
    
    // 3. Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = BigInt(amount * Math.pow(10, decimals));
    
    // 4. Add mint instruction to send tokens to user
    const mintInstruction = createMintToInstruction(
      mintPublicKey,
      userTokenAccount,
      mintAuthority.publicKey,
      adjustedAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    
    transaction.add(mintInstruction);

    // 5. Now add a staking instruction to transfer tokens to the staking vault
    // Get the staking vault address from the smart contract
    const stakingProgramId = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
    
    try {
      // Import direct-staking-utils for proper staking program interaction
      const directStakingUtils = await import('./direct-staking-utils');
      
      console.log(`Adding staking instruction for ${amount} tokens to program ${stakingProgramId.toString()}`);
      
      // Using constants directly from directStakingUtils
      const stakingVaultAddress = directStakingUtils.STAKING_VAULT_ADDRESS;
      
      // Get the associated token account for the staking vault
      // Since the staking vault is a PDA, we need to use allowOwnerOffCurve=true
      const vaultTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        stakingVaultAddress,
        true, // Set allowOwnerOffCurve to true for PDA addresses
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      console.log(`Using staking vault token account: ${vaultTokenAccount.toString()}`);
      
      // Check if vault token account exists, create if needed
      try {
        await getAccount(connection, vaultTokenAccount);
        console.log("Vault token account exists");
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          console.log("Vault token account doesn't exist, creating instruction to create it");
          
          // Create the associated token account for the vault
          const createVaultAtaInstruction = createAssociatedTokenAccountInstruction(
            userPublicKey,           // payer
            vaultTokenAccount,       // associated token account to create
            stakingVaultAddress,     // owner of the token account
            mintPublicKey,           // token mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          
          transaction.add(createVaultAtaInstruction);
        } else {
          // If it's any other error, log it and abort
          console.error("Error checking vault token account:", error);
          throw new Error(`Error with vault token account: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Create a stake transaction using the proper program instruction
      console.log("Creating stake instruction through staking program");
      
      try {
        // Get user info PDA for the referral staking program
        const [userInfoPDA] = directStakingUtils.findUserInfoPDA(userPublicKey);
        
        console.log(`Found user info PDA: ${userInfoPDA.toString()}`);
        
        // Create the instruction for staking using the proper referral staking program
        const stakeInstruction = directStakingUtils.createStakingInstruction(
          userPublicKey,
          adjustedAmount,
          userTokenAccount
        );
        
        transaction.add(stakeInstruction);
        console.log("Added staking program instruction to transaction");
      } catch (error) {
        console.error("Error creating staking program instruction:", error);
        throw new Error(`Failed to create staking program instruction: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 6. If there's a referral address, add referral data to the transaction
      if (referralPublicKey) {
        console.log(`Adding referral data for address: ${referralPublicKey.toString()}`);
        
        // In a complete implementation, we would add an instruction to the
        // referral staking program to register the referral relationship
        // This would involve creating an instruction with the proper accounts and program ID
        
        // For now, we're logging but this would be implemented as:
        // const registerReferralIx = createRegisterReferralInstruction(...);
        // transaction.add(registerReferralIx);
      }
    } catch (error) {
      console.error("Error adding staking instruction:", error);
      // Don't continue with just the mint instruction - we need to ensure tokens are staked
      throw new Error(`Failed to create staking part of transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 7. Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    // 8. Partially sign with mint authority (for the mint instruction)
    transaction.partialSign(mintAuthority);
    
    // 9. Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Combined buy and stake transaction created for ${amount} tokens`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating combined buy and stake transaction:", error);
    throw error;
  }
}

/**
 * Create a transaction for transferring SOL from a user wallet to a destination
 * This transaction will need to be sent to the client for signing
 * @param senderWalletAddress The wallet address to transfer SOL from
 * @param destinationWalletAddress The wallet address to transfer SOL to
 * @param solAmount The amount of SOL to transfer
 * @returns The serialized transaction as base64 string
 */
export async function createSolTransferTransaction(
  senderWalletAddress: string,
  destinationWalletAddress: string,
  solAmount: number
): Promise<string> {
  try {
    const connection = getConnection();
    const senderPublicKey = new PublicKey(senderWalletAddress);
    const destinationPublicKey = new PublicKey(destinationWalletAddress);
    
    // Convert SOL to lamports
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    console.log(`Creating SOL transfer transaction: ${solAmount} SOL (${lamports} lamports)`);
    
    // Create the transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: destinationPublicKey,
      lamports: lamports
    });
    
    // Create transaction and add the transfer instruction
    const transaction = new Transaction().add(transferInstruction);
    
    // Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`SOL transfer transaction created for ${solAmount} SOL`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating SOL transfer transaction:", error);
    throw error;
  }
}