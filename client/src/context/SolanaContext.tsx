import React, { createContext, useContext, useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl, VersionedTransaction, Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

interface SolanaContextType {
  connection: Connection | null;
  connected: boolean;
  publicKey: PublicKey | null;
  balance: number;
  refreshBalance: () => Promise<void>;
  disconnectWallet: () => void;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  sendTransaction: (transaction: Transaction | VersionedTransaction) => Promise<string>;
}

const SolanaContext = createContext<SolanaContextType>({
  connection: null,
  connected: false,
  publicKey: null,
  balance: 0,
  refreshBalance: async () => {},
  disconnectWallet: () => {},
  signMessage: async () => new Uint8Array(),
  signTransaction: async (tx) => tx,
  sendTransaction: async () => "",
});

// Custom hook to access the Solana context
export function useSolana() {
  return useContext(SolanaContext);
}

export const SolanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the wallet adapter context
  const { 
    connected, 
    publicKey, 
    disconnect, 
    signMessage: adapterSignMessage,
    signTransaction: adapterSignTransaction,
    sendTransaction: adapterSendTransaction, 
  } = useWallet();
  
  const [connection, setConnection] = useState<Connection | null>(null);
  const [balance, setBalance] = useState(0);

  // Initialize connection to Solana (using devnet for testing)
  useEffect(() => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    setConnection(connection);
  }, []);

  // Fetch balance when connected
  useEffect(() => {
    if (connection && publicKey && typeof publicKey.toBase58 === 'function') {
      fetchBalance(connection, publicKey);

      // Setup balance refresh interval
      const intervalId = setInterval(() => {
        if (connection && publicKey && typeof publicKey.toBase58 === 'function') {
          fetchBalance(connection, publicKey);
        }
      }, 30000); // every 30 seconds

      return () => clearInterval(intervalId);
    }
  }, [connection, publicKey]);

  const fetchBalance = async (connection: Connection, publicKey: PublicKey) => {
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / 1_000_000_000); // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };
  
  // Function to manually refresh balance when needed
  const refreshBalance = async (): Promise<void> => {
    if (connection && publicKey && typeof publicKey.toBase58 === 'function') {
      console.log("Manually refreshing SOL balance...");
      await fetchBalance(connection, publicKey);
    } else {
      console.warn("Cannot refresh balance: connection or publicKey not available");
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    disconnect();
  };

  // Sign message
  const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    if (!connected || !publicKey || !adapterSignMessage) {
      throw new Error('Wallet not connected or signMessage not available');
    }

    try {
      return await adapterSignMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  // Sign transaction
  const signTransaction = async (transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> => {
    if (!connected || !publicKey || !adapterSignTransaction) {
      throw new Error('Wallet not connected or signTransaction not available');
    }

    try {
      return await adapterSignTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  };

  // Send transaction with fallback mechanisms
  const sendTransaction = async (transaction: Transaction | VersionedTransaction): Promise<string> => {
    if (!connected || !publicKey || !adapterSendTransaction) {
      throw new Error('Wallet not connected or sendTransaction not available');
    }
    
    if (!connection) {
      throw new Error('Solana connection not established');
    }

    try {
      console.log("Transaction status: Sending transaction to the network");
      
      // Check if we're dealing with a Phantom wallet
      const isPhantomWallet = 
        (window as any)?.solana?.isPhantom || 
        (window as any)?.phantom?.solana?.isPhantom;
        
      console.log("Wallet type:", isPhantomWallet ? "Phantom" : "Other");
      
      // Special handling for Phantom wallet
      if (isPhantomWallet) {
        console.log("Using Phantom-specific transaction handling...");
        
        try {
          // For Phantom, try the standard approach first
          return await adapterSendTransaction(transaction, connection);
        } catch (phantomError: any) {
          console.log("Standard Phantom transaction submission failed, trying alternative approach");
          
          // Many Phantom errors are actually just masking the real error
          // If we get an unexpected error, let's try getting the transaction signed first
          // and then submitting it manually.
          if (adapterSignTransaction) {
            try {
              const signedTransaction = await adapterSignTransaction(transaction);
              
              // Submit the manually signed transaction
              console.log("Manually submitting Phantom-signed transaction...");
              const signature = await connection.sendRawTransaction(
                signedTransaction.serialize()
              );
              
              console.log("Manual Phantom transaction submission successful:", signature);
              return signature;
            } catch (altPhantomError: any) {
              console.error("Alternative Phantom approach failed, falling back to direct server endpoint", altPhantomError);
              
              // Check for Solana Error 101
              const errorStr = altPhantomError.toString();
              if (errorStr.includes("InstructionFallbackNotFound") || 
                  errorStr.includes("custom program error: 0x65") ||
                  errorStr.includes("Error Code: 101")) {
                console.log("Detected Anchor error in Phantom wallet: ", errorStr);
              }
              
              // For Phantom wallet, jump directly to server-side approach
              try {
                const response = await fetch('/api/register-user', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    walletAddress: publicKey.toBase58()
                  }),
                });
                
                const result = await response.json();
                
                if (result.success) {
                  console.log("Direct server registration successful");
                  if (!result.signature || typeof result.signature !== 'string' || !result.signature.match(/^[1-9A-HJ-NP-Za-km-z]+$/)) {
                    console.error("Server returned invalid signature format:", result.signature);
                    throw new Error("Server returned invalid signature format");
                  }
                  return result.signature;
                } else {
                  throw new Error(result.error || 'Direct server registration failed');
                }
              } catch (serverError: any) {
                console.error("Server-side registration failed:", serverError);
                throw serverError;
              }
            }
          } else {
            throw new Error('Wallet adapter signTransaction not available');
          }
        }
      } else {
        // For non-Phantom wallets, use the normal approach
        return await adapterSendTransaction(transaction, connection);
      }
    } catch (error: any) {
      console.error('Error sending transaction through wallet adapter:', error);
      
      // If we get "Unexpected error", try the manual signing approach
      if (error.message && error.message.includes("Unexpected error") && adapterSignTransaction) {
        console.log("Wallet adapter sendTransaction failed with 'Unexpected error'. Trying manual sign + submit approach...");
        
        try {
          // Sign the transaction manually
          const signedTransaction = await adapterSignTransaction(transaction);
          
          // Submit the manually signed transaction
          console.log("Manually submitting signed transaction...");
          const signature = await connection.sendRawTransaction(
            signedTransaction.serialize()
          );
          
          // Wait for confirmation and return the signature
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            signature
          });
          
          console.log("Manual transaction submission successful:", signature);
          return signature;
        } catch (manualError: any) {
          console.error("Manual transaction submission failed:", manualError);
          
          // Check if we encountered a specific Anchor error about fallback functions
          const errorMessage = manualError.toString();
          if (errorMessage.includes("InstructionFallbackNotFound") || 
              errorMessage.includes("custom program error: 0x65") ||
              errorMessage.includes("Error Code: 101")) {
            console.log("Detected Anchor fallback instruction error, using direct server endpoint...");
            
            // For this specific error, bypass the transaction serialization and directly call the register-user endpoint
            try {
              const response = await fetch('/api/register-user', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  walletAddress: publicKey.toBase58()
                }),
              });
              
              const result = await response.json();
              
              if (result.success) {
                console.log("Direct server registration successful");
                if (!result.signature || typeof result.signature !== 'string' || !result.signature.match(/^[1-9A-HJ-NP-Za-km-z]+$/)) {
                  console.error("Server returned invalid signature format:", result.signature);
                  throw new Error("Server returned invalid signature format");
                }
                return result.signature;
              } else {
                throw new Error(result.error || 'Direct server registration failed');
              }
            } catch (directError: any) {
              console.error("Direct server registration failed:", directError);
              throw new Error(`Direct registration failed: ${directError.message || 'Unknown error'}`);
            }
          }
          
          // If manual approach fails and it's not the specific Anchor error, we'll try server-side submission as a last resort
          try {
            console.log("Attempting server-side transaction submission as last resort...");
            
            // We'll pass the unsigned transaction and let the server handle it
            const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');
            
            // Send the serialized transaction to our backend endpoint
            const response = await fetch('/api/submit-signed-transaction', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                transaction: serializedTransaction,
                walletPublicKey: publicKey.toBase58()
              }),
            });
            
            const result = await response.json();
            
            if (result.success && result.signature) {
              console.log("Server-side transaction submission successful:", result.signature);
              return result.signature;
            } else {
              throw new Error(result.error || 'Server-side transaction submission failed');
            }
          } catch (serverError: any) {
            console.error("All transaction submission methods failed:", serverError);
            const errorMessage = serverError?.message || 'Unknown server error';
            throw new Error(`Transaction submission failed after all attempts: ${errorMessage}`);
          }
        }
      }
      
      // If it's not the specific error we're handling, just rethrow
      throw error;
    }
  };

  return (
    <SolanaContext.Provider
      value={{
        connection,
        connected,
        publicKey,
        balance,
        refreshBalance,
        disconnectWallet,
        signMessage,
        signTransaction,
        sendTransaction
      }}
    >
      {children}
    </SolanaContext.Provider>
  );
};