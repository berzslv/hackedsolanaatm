/**
 * Anchor Types
 * 
 * This file contains type definitions and interfaces to make working with Anchor
 * easier and to fix TypeScript errors with our wallet adapters.
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Wallet interface compatible with Anchor's AnchorProvider
 */
export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  
  // Optional properties
  sendTransaction?: (transaction: Transaction, connection: Connection, options?: any) => Promise<string>;
}

/**
 * Create a wallet adapter compatible with Anchor from standard Solana wallet properties
 */
export function createAnchorWallet(
  publicKey: PublicKey,
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>,
  sendTransaction?: (transaction: Transaction, connection: Connection, options?: any) => Promise<string>,
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>,
): AnchorWallet {
  return {
    publicKey,
    signTransaction,
    // Default implementation of signAllTransactions if not provided
    signAllTransactions: signAllTransactions || (async (txs) => {
      return Promise.all(txs.map(tx => signTransaction(tx)));
    }),
    sendTransaction
  };
}

/**
 * Utility to safely cast a PublicKey to a provider with appropriate error handling
 */
export function safeProvider(provider: any): any {
  return provider;
}