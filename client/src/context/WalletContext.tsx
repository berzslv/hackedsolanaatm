import React, { createContext, useState, useContext } from 'react';
import { useToast } from "@/hooks/use-toast";

// Mock PublicKey class to avoid Solana dependency
class MockPublicKey {
  private address: string;
  
  constructor(address: string) {
    this.address = address;
  }
  
  toString(): string {
    return this.address;
  }
}

interface WalletContextType {
  connected: boolean;
  publicKey: MockPublicKey | null;
  setShowWalletModal: (show: boolean) => void;
  showWalletModal: boolean;
  connectWallet: (provider: string) => void;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<MockPublicKey | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { toast } = useToast();

  // Mock wallet connection for demo
  const connectWallet = (provider: string) => {
    // In a real implementation, this would connect to the actual Solana wallet
    setTimeout(() => {
      const mockPublicKey = new MockPublicKey('7nvmCrcJ7SdbPMTiHf6vrnEyAdemUmezL6MhfD2kazn8');
      setPublicKey(mockPublicKey);
      setConnected(true);
      setShowWalletModal(false);
      
      toast({
        title: "Wallet connected!",
        description: `Successfully connected to ${provider}`
      });
    }, 1000);
  };

  const disconnectWallet = () => {
    setPublicKey(null);
    setConnected(false);
    
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected"
    });
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey,
        showWalletModal,
        setShowWalletModal,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletContextProvider');
  }
  return context;
};
