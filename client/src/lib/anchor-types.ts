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
 * Utility to safely cast a provider to avoid PublicKey errors with appropriate error handling
 */
export function safeProvider(provider: any): any {
  // Make sure the provider's publicKey does not get used in place of a PublicKey
  if (provider && typeof provider === 'object') {
    // Create a deep copy to avoid reference issues
    const safeCopy = { ...provider };
    
    // Properly handle publicKey to ensure it's a valid PublicKey object
    if (provider.publicKey) {
      // Handle the case when it's a string
      if (typeof provider.publicKey === 'string') {
        safeCopy.publicKey = new PublicKey(provider.publicKey);
      } 
      // Handle when it's already a PublicKey but might have internal issues
      else if (provider.publicKey instanceof PublicKey) {
        // If the publicKey object exists but might have internal _bn issues
        // recreate it from its string representation to ensure it's valid
        try {
          const pubkeyStr = provider.publicKey.toString();
          safeCopy.publicKey = new PublicKey(pubkeyStr);
        } catch (e) {
          console.warn("Error recreating PublicKey in safeProvider:", e);
          // If that fails, try to use it as is with a fallback
          safeCopy.publicKey = provider.publicKey;
        }
      }
      // Otherwise just use as is
      else {
        safeCopy.publicKey = provider.publicKey;
      }
    }
    
    return safeCopy;
  }
  return provider;
}