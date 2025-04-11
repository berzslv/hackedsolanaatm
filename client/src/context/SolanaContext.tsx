import React, { createContext, useContext, useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl, VersionedTransaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

interface SolanaContextType {
  connection: Connection | null;
  connected: boolean;
  publicKey: PublicKey | null;
  balance: number;
  refreshBalance: () => Promise<void>;
  disconnectWallet: () => void;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
  sendTransaction: (transaction: VersionedTransaction) => Promise<string>;
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

export const useSolana = () => useContext(SolanaContext);

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
  const signTransaction = async (transaction: VersionedTransaction): Promise<VersionedTransaction> => {
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

  // Send transaction
  const sendTransaction = async (transaction: VersionedTransaction): Promise<string> => {
    if (!connected || !publicKey || !adapterSendTransaction) {
      throw new Error('Wallet not connected or sendTransaction not available');
    }
    
    if (!connection) {
      throw new Error('Solana connection not established');
    }

    try {
      return await adapterSendTransaction(transaction, connection);
    } catch (error) {
      console.error('Error sending transaction:', error);
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