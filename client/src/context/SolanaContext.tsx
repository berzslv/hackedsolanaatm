import React, { createContext, useContext, useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl, VersionedTransaction } from '@solana/web3.js';

interface SolanaContextType {
  connection: Connection | null;
  connected: boolean;
  publicKey: PublicKey | null;
  balance: number;
  connectWallet: () => Promise<void>;
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
  connectWallet: async () => {},
  disconnectWallet: () => {},
  signMessage: async () => new Uint8Array(),
  signTransaction: async (tx) => tx,
  sendTransaction: async () => "",
});

export const useSolana = () => useContext(SolanaContext);

interface PhantomProvider {
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
  sendTransaction: (transaction: VersionedTransaction) => Promise<{ signature: string }>;
  isConnected: boolean;
  publicKey: PublicKey | null;
}

export const SolanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balance, setBalance] = useState(0);
  const [provider, setProvider] = useState<PhantomProvider | null>(null);

  // Initialize connection to Solana devnet
  useEffect(() => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    setConnection(connection);
    
    // Check if Phantom wallet is available
    const getProvider = (): PhantomProvider | null => {
      if ('phantom' in window) {
        // @ts-ignore
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
          return provider as unknown as PhantomProvider;
        }
      }
      
      return null;
    };
    
    const provider = getProvider();
    setProvider(provider);
    
    // Reconnect if previously connected
    if (provider && provider.isConnected && provider.publicKey) {
      setConnected(true);
      setPublicKey(provider.publicKey);
      fetchBalance(connection, provider.publicKey);
    }
  }, []);
  
  // Fetch balance when connected
  useEffect(() => {
    if (connection && publicKey) {
      fetchBalance(connection, publicKey);
      
      // Setup balance refresh interval
      const intervalId = setInterval(() => {
        fetchBalance(connection, publicKey);
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
  
  const connectWallet = async () => {
    try {
      if (!provider) {
        window.open('https://phantom.app/', '_blank');
        return;
      }
      
      const { publicKey } = await provider.connect();
      setConnected(true);
      setPublicKey(publicKey);
      
      if (connection) {
        fetchBalance(connection, publicKey);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };
  
  const disconnectWallet = () => {
    if (provider) {
      provider.disconnect().catch(console.error);
    }
    setConnected(false);
    setPublicKey(null);
    setBalance(0);
  };
  
  const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
    if (!provider || !publicKey) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const { signature } = await provider.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };
  
  const signTransaction = async (transaction: VersionedTransaction): Promise<VersionedTransaction> => {
    if (!provider || !publicKey) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await provider.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  };
  
  const sendTransaction = async (transaction: VersionedTransaction): Promise<string> => {
    if (!provider || !publicKey) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const { signature } = await provider.sendTransaction(transaction);
      return signature;
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
        connectWallet,
        disconnectWallet,
        signMessage,
        signTransaction,
        sendTransaction,
      }}
    >
      {children}
    </SolanaContext.Provider>
  );
};