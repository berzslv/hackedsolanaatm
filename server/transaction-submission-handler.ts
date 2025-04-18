/**
 * Server-Side Transaction Submission Handler
 * 
 * This handler is a fallback for when wallet-based transaction submission fails
 * with "Unexpected error" or similar wallet adapter errors.
 */

import { Request, Response } from 'express';
import { 
  Connection, 
  clusterApiUrl, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction,
  Keypair
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Import token utilities for keypair loading
import * as tokenUtils from './token-utils';

/**
 * Handle server-side transaction submission
 * This is a fallback method for when wallet-based submission fails
 */
export async function handleServerTransactionSubmission(req: Request, res: Response) {
  try {
    const { walletAddress, transactionBase64, amount, type } = req.body;
    
    if (!walletAddress || !transactionBase64) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address and transaction are required'
      });
    }
    
    console.log(`📤 Server-side transaction submission request for ${type} from ${walletAddress}`);
    
    // Create a connection to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Deserialize the transaction from base64
    const transactionBuffer = Buffer.from(transactionBase64, 'base64');
    const transaction = Transaction.from(transactionBuffer);
    
    // Get the authority keypair for signing
    const authorityKeypair = tokenUtils.getMintAuthority(true);
    
    // Add the authority as a signer
    transaction.sign(authorityKeypair);
    
    console.log('Transaction signed by authority, sending to network...');
    
    // Send and confirm the transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [authorityKeypair],
      {
        commitment: 'confirmed',
        skipPreflight: false,
        maxRetries: 5
      }
    );
    
    console.log(`✅ Server-side transaction submitted successfully: ${signature}`);
    
    return res.json({
      success: true,
      signature,
      message: `${type} transaction submitted successfully`
    });
  } catch (error) {
    console.error('Error in server-side transaction submission:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}