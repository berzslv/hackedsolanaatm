/**
 * CreateStakingTransactionV3
 * 
 * This module provides a clean implementation for creating and sending 
 * staking transactions with Anchor support, detailed logging, error handling, and preflight checks.
 */
import { PublicKey, Connection, Transaction, VersionedTransaction, TransactionMessage, VersionedMessage, Message } from '@solana/web3.js';
import { toast } from '@/hooks/use-toast';
import { AnchorWallet } from '@solana/wallet-adapter-react';

/**
 * Converts a base64 string to Uint8Array
 */
export function base64ToUint8Array(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Type guard for VersionedTransaction
 */
function isVersionedTransaction(tx: Transaction | VersionedTransaction): tx is VersionedTransaction {
  return 'version' in tx;
}

/**
 * Type guard for Transaction
 */
function isLegacyTransaction(tx: Transaction | VersionedTransaction): tx is Transaction {
  return !('version' in tx);
}

/**
 * Options for staking transaction
 */
interface StakingTransactionOptions {
  onStatusUpdate?: (status: string, isFallback: boolean) => void;
  skipPreflight?: boolean;
  maxRetries?: number;
  referrer?: PublicKey;  // Optional referrer public key
}

/**
 * Creates and submits a staking transaction with enhanced error handling
 */
export async function createAndSubmitStakingTransaction(
  connection: Connection,
  publicKey: PublicKey,
  wallet: AnchorWallet,
  amount: number,
  stakeResult: any,
  options?: StakingTransactionOptions
) {
  const onStatusUpdate = options?.onStatusUpdate || (() => {});
  
  try {
    // Check if we got a signature directly from the Anchor execution
    if (stakeResult.signature) {
      console.log('✅ Anchor transaction executed successfully with signature:', stakeResult.signature);
      onStatusUpdate("Transaction confirmed!", false);
      
      return {
        success: true,
        message: `Transaction confirmed with signature: ${stakeResult.signature}`,
        signature: stakeResult.signature
      };
    }
    
    // Extract transaction data from different possible result formats
    let transactionData = stakeResult.stakingTransaction || 
                          stakeResult.transactionDetails || 
                          stakeResult.transaction || 
                          stakeResult;
    
    // Log the transaction data structure
    console.log('📦 Anchor transaction data received:', transactionData);
    
    // Initialize transaction variable
    let decodedTransaction: Transaction | VersionedTransaction;
    
    // Handle direct Transaction objects from Anchor
    if (transactionData instanceof Transaction) {
      console.log("🎯 Direct Anchor Transaction object detected");
      decodedTransaction = transactionData;
      
      onStatusUpdate("Processing Anchor transaction...", false);
      
      // Ensure recent blockhash is set
      if (!decodedTransaction.recentBlockhash) {
        console.log('⚠️ Getting fresh blockhash for Anchor transaction');
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        decodedTransaction.recentBlockhash = blockhash;
      }
    } 
    // Handle serialized transaction with transaction field
    else if (typeof transactionData === 'object' && transactionData.transaction) {
      console.log('🔍 Attempting to deserialize transaction from base64');
      
      // Convert base64 string to Uint8Array
      const messageBytes = base64ToUint8Array(transactionData.transaction);
      
      try {
        // First, try to deserialize as a versioned message
        const versionedMessage = VersionedMessage.deserialize(messageBytes);
        console.log('✅ Successfully deserialized versioned message');
        
        // Create new transaction from the versioned message
        decodedTransaction = new VersionedTransaction(versionedMessage);
      } catch (versionedError) {
        console.log('⚙️ Not a versioned message, trying Transaction.populate');
        
        // Try regular transaction
        const message = Message.from(messageBytes);
        decodedTransaction = Transaction.populate(message);
        console.log('✅ Successfully deserialized transaction message');
      }
    }
    // Handle direct base64 string (from server API)
    else if (typeof transactionData === 'string') {
      console.log('📜 Got a direct base64 string transaction');
      const txBytes = base64ToUint8Array(transactionData);
      
      try {
        decodedTransaction = Transaction.from(txBytes);
        console.log('✅ Deserialized transaction from direct base64 string');
      } catch (err) {
        console.error('❌ Failed to deserialize transaction from string:', err);
        return { 
          success: false, 
          message: 'Transaction preparation failed: Invalid format', 
          error: 'Failed to parse transaction' 
        };
      }
    }
    // Invalid format
    else {
      console.error('❌ Invalid transaction data format from Anchor');
      return { 
        success: false, 
        message: 'Transaction preparation failed: Invalid Anchor response', 
        error: 'Missing transaction data in Anchor response' 
      };
    }
    
    // Ensure fee payer is set
    if (decodedTransaction instanceof Transaction && !decodedTransaction.feePayer) {
      console.log('⚠️ Setting fee payer to current wallet');
      decodedTransaction.feePayer = publicKey;
    }
    
    // Ensure recent blockhash is set 
    if (decodedTransaction instanceof Transaction && !decodedTransaction.recentBlockhash) {
      console.log('⚠️ Getting fresh blockhash for transaction');
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      decodedTransaction.recentBlockhash = blockhash;
    }
    
    // Log transaction details
    if (isLegacyTransaction(decodedTransaction)) {
      console.log("🧾 Fee payer:", decodedTransaction.feePayer?.toBase58());
      console.log("🔑 Signers:", decodedTransaction.signatures.map(s => s.publicKey.toBase58()));
    } else {
      console.log("🧾 Using versioned transaction");
      console.log("🔑 Signers:", decodedTransaction.signatures.length);
    }
    
    // Send the transaction
    console.log("📤 Sending transaction to the network");
    onStatusUpdate("Sending transaction to the network...", false);
    
    let signature: string;
    try {
      // For AnchorWallet we need to sign and then send separately
      if (isLegacyTransaction(decodedTransaction)) {
        await wallet.signTransaction(decodedTransaction);
        signature = await connection.sendRawTransaction(decodedTransaction.serialize());
      } else {
        // For versioned transactions
        decodedTransaction = await wallet.signTransaction(decodedTransaction as Transaction);
        signature = await connection.sendRawTransaction(decodedTransaction.serialize());
      }
      
      console.log("🚀 Transaction sent with signature:", signature);
      onStatusUpdate(`Transaction submitted! Signature: ${signature.substring(0, 8)}...`, false);
    } catch (sendError: any) {
      console.error("❌ Error sending transaction:", sendError);
      
      // Handle specific wallet errors
      if (sendError.name === 'WalletSignTransactionError') {
        return { 
          success: false, 
          message: 'Transaction was not signed by user', 
          error: 'User rejected signing' 
        };
      }
      
      // More generic error
      return { 
        success: false, 
        message: 'Error sending transaction', 
        error: sendError.message || 'Unknown wallet error' 
      };
    }
    
    // Wait for confirmation
    console.log("⏳ Waiting for transaction confirmation");
    onStatusUpdate("Confirming transaction...", false);
    
    try {
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        console.error("❌ Transaction confirmed with error:", confirmation.value.err);
        return { 
          success: false, 
          message: 'Transaction confirmed but with errors', 
          error: JSON.stringify(confirmation.value.err),
          signature
        };
      }
      
      console.log("✅ Transaction confirmed successfully!");
      onStatusUpdate("Transaction confirmed!", false);
      
      return {
        success: true,
        message: `Transaction confirmed with signature: ${signature}`,
        signature
      };
    } catch (confirmError: any) {
      console.error("❌ Error confirming transaction:", confirmError);
      
      // Since we have a signature, the transaction might still be successful
      // but we couldn't confirm it due to RPC issues
      return { 
        success: false, 
        message: 'Unable to confirm transaction status', 
        error: confirmError.message || 'Unknown confirmation error',
        signature, // Include the signature so frontend can check manually
        needsManualCheck: true
      };
    }
  } catch (error: any) {
    // Catch-all for any unexpected errors
    console.error("❌ Unexpected error in transaction processing:", error);
    return { 
      success: false, 
      message: 'Unexpected error processing transaction', 
      error: error.message || 'Unknown error'
    };
  }
}