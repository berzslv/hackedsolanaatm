import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getConnection, getMintAuthority, getOrCreateTokenAccount } from './simple-token';

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
 * @param sourceWalletAddress Optional source wallet address. If not provided, tokens will be sent from the mint authority
 */
export async function authorityTransferTokens(
  recipientWalletAddress: string,
  amount: number,
  sourceWalletAddress?: string
): Promise<string> {
  try {
    const connection = getConnection();
    const { keypair: mintAuthority, mintPublicKey } = getMintAuthority();
    const recipientPublicKey = new PublicKey(recipientWalletAddress);
    
    // If source wallet is provided, we'll transfer from that wallet to the recipient using the authority
    // This is useful for staking operations where we take tokens from the user
    const isTransferFromSpecificSource = !!sourceWalletAddress;
    
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
    
    // Now transfer tokens
    if (isTransferFromSpecificSource) {
      // For staking: we're taking tokens from the user (source) and sending to the authority (recipient)
      const sourcePublicKey = new PublicKey(sourceWalletAddress!);
      
      // Get source token account
      const sourceTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        sourcePublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      try {
        await getAccount(connection, sourceTokenAccount);
      } catch (error) {
        console.error("Source account doesn't exist or has no tokens:", error);
        throw new Error(`Source wallet ${sourceWalletAddress} has no token account or insufficient balance`);
      }
      
      // Get or create recipient token account (which is the authority in case of staking)
      const recipientTokenAccount = authorityTokenAccount;
      
      // Calculate token amount with decimals
      const decimals = 9;
      const adjustedAmount = BigInt(amount * Math.pow(10, decimals));
      
      // Create transfer instruction - we're using the authority to move tokens from the source to the vault
      const transferInstruction = createTransferInstruction(
        sourceTokenAccount,       // from
        recipientTokenAccount,    // to (authority wallet in case of staking)
        sourcePublicKey,          // owner of source account
        adjustedAmount,           // amount to transfer
        [],                       // multiSigners (we're not using these)
        TOKEN_PROGRAM_ID
      );
      
      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [mintAuthority] // The authority is the signer
      );
      
      console.log(`Transfer from ${sourceWalletAddress} to ${recipientWalletAddress} successful! Signature: ${signature}`);
      return signature;
    } else {
      // Standard case: transfer from authority to recipient
      return await transferTokens(
        mintAuthority.publicKey.toString(),
        recipientWalletAddress,
        amount,
        mintAuthority
      );
    }
  } catch (error) {
    console.error("Error in authorityTransferTokens:", error);
    throw error;
  }
}

// Import here to avoid circular dependency
import { createMintToInstruction } from '@solana/spl-token';
import { SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

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