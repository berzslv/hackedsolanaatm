/**
 * CreateStakingTransactionV2
 * 
 * This module provides a robust implementation for creating and sending 
 * staking transactions with detailed logging, error handling, and preflight checks.
 */

import { 
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { toast } from '@/hooks/use-toast';
import BN from 'bn.js';
import { stakeExistingTokens, buyAndStakeTokens } from './api-client';

// Utility function to convert base64 to Uint8Array (for Transaction)
export function base64ToUint8Array(base64String: string): Uint8Array {
  // First, decode base64 to binary string
  const binaryString = atob(base64String);
  // Create a buffer to hold the bytes
  const bytes = new Uint8Array(binaryString.length);
  // Fill the buffer with the bytes of the binary string
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Enhanced staking transaction creation and submission with full logging
 * 
 * @param connection Solana connection object
 * @param publicKey User's wallet public key
 * @param amount Amount to stake
 * @param wallet Wallet adapter (must have sendTransaction method)
 * @param useExistingTokens Whether to stake existing tokens or buy new ones
 * @returns Result of the staking operation
 */
export async function createAndSubmitStakingTransaction(
  connection: Connection,
  publicKey: PublicKey,
  amount: number,
  wallet: any,
  useExistingTokens: boolean = true // Default to staking existing tokens
): Promise<{ success: boolean; message: string; signature?: string; error?: string }> {
  console.log(`🚀 Starting ${useExistingTokens ? 'direct staking' : 'buy and stake'} process`);
  console.log("👛 Wallet public key:", publicKey.toString());
  console.log("🔢 Amount to stake:", amount);
  console.log("🔗 Network:", connection.rpcEndpoint);
  
  try {
    // Create a wallet object for the operation
    const walletAdapter = { 
      sendTransaction: wallet.sendTransaction, 
      publicKey
    };
    
    // Call the appropriate method based on whether we're using existing tokens
    const stakingFunction = useExistingTokens ? stakeExistingTokens : buyAndStakeTokens;
    console.log(`🔧 Calling ${useExistingTokens ? 'stakeExistingTokens' : 'buyAndStakeTokens'} function`);
    
    const stakeResult = await stakingFunction(
      publicKey.toString(),
      amount,
      walletAdapter
    );
    
    // Check for errors from the API
    if (stakeResult.error) {
      console.error(`❌ Error from ${useExistingTokens ? 'stakeExistingTokens' : 'buyAndStakeTokens'}:`, stakeResult.error);
      return { 
        success: false, 
        message: `Transaction preparation failed: ${stakeResult.error}`, 
        error: stakeResult.error 
      };
    }
    
    // Check if we got back a transaction
    if (!stakeResult.stakingTransaction) {
      console.error("❌ No staking transaction returned");
      return { 
        success: false, 
        message: 'Transaction preparation failed: No transaction returned', 
        error: 'No transaction data received' 
      };
    }
    
    const transactionData = stakeResult.stakingTransaction;
    
    // Log the transaction data structure
    console.log('📦 Transaction data received:', JSON.stringify(transactionData, null, 2));
    
    // Make sure we have the transaction field
    if (!transactionData.transaction) {
      console.error('❌ Missing transaction field in response data');
      return { 
        success: false, 
        message: 'Transaction preparation failed: Invalid response format', 
        error: 'Missing transaction field in server response' 
      };
    }
    
    // Decode and deserialize the transaction
    let decodedTransaction: Transaction;
    
    try {
      console.log('🔍 Attempting to deserialize transaction');
      
      // Convert base64 string to Uint8Array
      const transactionBytes = base64ToUint8Array(transactionData.transaction);
      
      // Create Transaction from bytes
      decodedTransaction = Transaction.from(transactionBytes);
      
      console.log('✅ Successfully deserialized transaction');
      
      // Ensure fee payer is set
      if (!decodedTransaction.feePayer) {
        console.log('⚠️ Setting fee payer to current wallet');
        decodedTransaction.feePayer = publicKey;
      }
      
      // Ensure recent blockhash is set
      if (!decodedTransaction.recentBlockhash) {
        console.log('⚠️ Getting fresh blockhash for transaction');
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        decodedTransaction.recentBlockhash = blockhash;
      }
      
      console.log("🧾 Fee payer:", decodedTransaction.feePayer?.toBase58());
      console.log("🔑 Signers:", decodedTransaction.signatures.map(s => s.publicKey.toBase58()));
      
      // Try simulating the transaction before sending
      try {
        console.log("🔬 Simulating transaction before sending");
        const simulation = await connection.simulateTransaction(decodedTransaction);
        
        if (simulation.value.err) {
          console.error("⚠️ Transaction simulation failed:", simulation.value.err);
          console.log("🔍 Simulation error details:", JSON.stringify(simulation.value, null, 2));
          // We'll continue anyway, as this is just a preflight check
        } else {
          console.log("✅ Transaction simulation successful");
        }
      } catch (simError: any) {
        console.warn("⚠️ Simulation error (continuing anyway):", simError.message);
      }
      
    } catch (e: any) {
      console.error('❌ Error deserializing transaction:', e);
      
      // Try a different approach as fallback
      try {
        decodedTransaction = Transaction.from(transactionData.transaction);
        console.log('✅ Successfully deserialized transaction using direct method');
      } catch (e2: any) {
        console.error('❌ All deserialization methods failed:', e2);
        return { 
          success: false, 
          message: 'Transaction preparation failed: Unable to process', 
          error: `Failed to decode transaction: ${e2.message}` 
        };
      }
    }
    
    // Define signature outside the try block so it's accessible throughout
    let signature: string;
    
    try {
      console.log('📡 Sending transaction to the network...');
      
      // Sign and send the transaction with detailed options
      signature = await wallet.sendTransaction(decodedTransaction, connection, {
        skipPreflight: false, // Run preflight checks
        preflightCommitment: 'confirmed', // Use confirmed commitment level for preflight
        maxRetries: 5 // Try a few times if it fails
      });
      
      console.log('✈️ Transaction sent with signature:', signature);
      
      // Wait for confirmation with more detailed options
      console.log('⏳ Waiting for transaction confirmation...');
      const confirmationResult = await connection.confirmTransaction({
        signature,
        blockhash: decodedTransaction.recentBlockhash!, 
        lastValidBlockHeight: decodedTransaction.lastValidBlockHeight!
      }, 'confirmed');
      
      if (confirmationResult.value.err) {
        console.error('❌ Transaction confirmed but has errors:', confirmationResult.value.err);
        return { 
          success: false, 
          message: 'Transaction confirmed with errors', 
          error: JSON.stringify(confirmationResult.value.err),
          signature 
        };
      }
      
      // Log signatures and account details after confirmation
      console.log(`✅ Transaction confirmed with signature: ${signature}`);
      
      // Notify server about the completed staking transaction
      try {
        console.log('📤 Notifying server about the completed transaction...');
        const confirmResponse = await fetch('/api/confirm-staking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            amount: amount,
            transactionSignature: signature
          }),
        });
        
        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          console.warn('⚠️ Server confirmation failed, but transaction was successful:', errorData);
          // We'll consider this a success since the blockchain transaction succeeded
        } else {
          const confirmData = await confirmResponse.json();
          console.log('✅ Server confirmation successful:', confirmData);
        }
      } catch (confirmError) {
        console.warn('⚠️ Failed to notify server, but transaction was successful:', confirmError);
        // This is not a critical error, so we'll still consider it a success
      }
      
      return {
        success: true,
        message: `Successfully ${useExistingTokens ? 'staked' : 'bought and staked'} ${amount} tokens`,
        signature
      };
      
    } catch (sendError: any) {
      console.error('🧨 Error sending transaction:', sendError);
      
      if (sendError.logs) console.log("📄 Logs:", sendError.logs);
      if (sendError.message) console.log("📢 Message:", sendError.message);
      
      // Check for common wallet errors
      if (sendError.message && sendError.message.includes("User rejected")) {
        return { 
          success: false, 
          message: 'Transaction was rejected by the wallet', 
          error: sendError.message 
        };
      }
      
      return { 
        success: false, 
        message: 'Failed to send transaction', 
        error: sendError.message || "Unknown error" 
      };
    }
  } catch (error: any) {
    console.error('🧨 Staking process failed:', error);
    
    if (error.logs) console.log("📄 Logs:", error.logs);
    if (error.message) console.log("📢 Message:", error.message);
    
    return {
      success: false,
      message: 'Staking process failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}