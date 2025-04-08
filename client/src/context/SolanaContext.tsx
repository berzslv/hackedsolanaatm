import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';

interface SolanaContextType {
  connected: boolean;
  publicKey: string | null;
  balance: number;
  walletType: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const SolanaContext = createContext<SolanaContextType>({
  connected: false,
  publicKey: null,
  balance: 0,
  walletType: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

export const useSolana = () => useContext(SolanaContext);

export const SolanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wallet = useWallet();
  const [balance, setBalance] = useState(0);
  const [walletType, setWalletType] = useState<string | null>(null);

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      connection.getBalance(wallet.publicKey).then(bal => {
        setBalance(bal / 1e9);
      });

      // Set wallet type
      if (wallet.wallet) {
        setWalletType(wallet.wallet.adapter.name);
      }
    }
  }, [wallet.connected, wallet.publicKey]);

  const value = {
    connected: wallet.connected,
    publicKey: wallet.publicKey?.toString() || null,
    balance,
    walletType,
    connectWallet: wallet.connect,
    disconnectWallet: wallet.disconnect,
  };

  return (
    <SolanaContext.Provider value={value}>
      {children}
    </SolanaContext.Provider>
  );
};