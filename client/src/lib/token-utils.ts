import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_CONFIG } from './token-config';
import {
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TokenAccountNotFoundError,
  createTransferInstruction,
} from '@solana/spl-token';

// Get the associated token address for a wallet
export async function getTokenAccount(
  connection: Connection,
  walletAddress: PublicKey
): Promise<{ exists: boolean; address: PublicKey }> {
  try {
    const tokenMintPublicKey = new PublicKey(TOKEN_CONFIG.mint);
    const associatedTokenAddress = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      walletAddress
    );

    try {
      // Check if the account exists
      await getAccount(connection, associatedTokenAddress);
      return { exists: true, address: associatedTokenAddress };
    } catch (error: any) {
      if (error instanceof TokenAccountNotFoundError) {
        return { exists: false, address: associatedTokenAddress };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting token account:', error);
    throw error;
  }
}

// Get token balance for a wallet
export async function getTokenBalance(
  connection: Connection,
  walletAddress: PublicKey
): Promise<number> {
  try {
    const { exists, address } = await getTokenAccount(connection, walletAddress);
    
    if (!exists) {
      return 0;
    }

    const tokenAccount = await getAccount(connection, address);
    return Number(tokenAccount.amount) / Math.pow(10, TOKEN_CONFIG.decimals);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

// Create instructions for token transfer
export async function prepareTokenTransfer(
  connection: Connection,
  senderWallet: PublicKey,
  recipientWallet: PublicKey,
  amount: number
) {
  try {
    const tokenMintPublicKey = new PublicKey(TOKEN_CONFIG.mint);
    const instructions = [];
    
    // Get sender token account
    const { exists: senderExists, address: senderTokenAccount } = 
      await getTokenAccount(connection, senderWallet);
    
    if (!senderExists) {
      throw new Error('Sender does not have a token account');
    }
    
    // Get or create recipient token account
    const { exists: recipientExists, address: recipientTokenAccount } = 
      await getTokenAccount(connection, recipientWallet);
    
    if (!recipientExists) {
      // Create associated token account for recipient
      instructions.push(
        createAssociatedTokenAccountInstruction(
          senderWallet, // payer
          recipientTokenAccount, // associated token account
          recipientWallet, // owner
          tokenMintPublicKey // mint
        )
      );
    }
    
    // Convert amount to token units
    const tokenAmount = amount * Math.pow(10, TOKEN_CONFIG.decimals);
    
    // Create transfer instruction
    instructions.push(
      createTransferInstruction(
        senderTokenAccount, // source
        recipientTokenAccount, // destination
        senderWallet, // owner
        BigInt(tokenAmount) // amount
      )
    );
    
    return {
      instructions,
      fromTokenAccount: senderTokenAccount,
      toTokenAccount: recipientTokenAccount
    };
  } catch (error) {
    console.error('Error preparing token transfer:', error);
    throw error;
  }
}