import React, { createContext, useContext, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

// Simple interface for wallet connections 
interface WalletConnection {
  name: string;
  icon: string;
  connect: () => Promise<{ publicKey: string } | null>;
}

// Connection result interface
interface ConnectionResult {
  publicKey: string;
}

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  walletName: string | null;
  connect: (walletName: string) => Promise<void>;
  disconnect: () => void;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
}

// Create context with default values
const WalletContext = createContext<WalletContextType>({
  connected: false,
  connecting: false,
  publicKey: null,
  walletName: null,
  connect: async () => {},
  disconnect: () => {},
  showDialog: false,
  setShowDialog: () => {}
});

// Hook for using wallet context
export const useWallet = () => useContext(WalletContext);

// Phantom wallet connection
const connectPhantom = async (): Promise<{ publicKey: string } | null> => {
  try {
    // Check if Phantom is installed
    const phantom = window.phantom?.solana;
    
    if (!phantom) {
      window.open('https://phantom.app/', '_blank');
      return null;
    }
    
    // Connect to Phantom
    const { publicKey } = await phantom.connect();
    return { publicKey: publicKey.toString() };
  } catch (error) {
    console.error('Phantom connection error:', error);
    return null;
  }
};

// Solflare wallet connection
const connectSolflare = async (): Promise<{ publicKey: string } | null> => {
  try {
    // Check if Solflare is installed
    const solflare = window.solflare;
    
    if (!solflare) {
      window.open('https://solflare.com/', '_blank');
      return null;
    }
    
    // Connect to Solflare
    await solflare.connect();
    
    if (solflare.publicKey) {
      return { publicKey: solflare.publicKey.toString() };
    }
    return null;
  } catch (error) {
    console.error('Solflare connection error:', error);
    return null;
  }
};

// Available wallets
const wallets: WalletConnection[] = [
  {
    name: 'Phantom',
    icon: 'ri-ghost-line',
    connect: async () => {
      const result = await connectPhantom();
      if (!result) throw new Error('Failed to connect to Phantom');
      return result;
    }
  },
  {
    name: 'Solflare',
    icon: 'ri-sun-line',
    connect: async () => {
      const result = await connectSolflare();
      if (!result) throw new Error('Failed to connect to Solflare');
      return result;
    }
  }
];

// Wallet Provider component
export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  // Connect to a wallet
  const connect = async (name: string) => {
    try {
      setConnecting(true);
      const wallet = wallets.find(w => w.name === name);
      
      if (!wallet) {
        throw new Error(`Wallet ${name} not found`);
      }
      
      const connection = await wallet.connect();
      
      if (connection) {
        setPublicKey(connection.publicKey);
        setWalletName(name);
        setConnected(true);
        toast({
          title: 'Connected',
          description: `Successfully connected to ${name}`,
        });
      }
    } catch (error) {
      console.error(`Error connecting to ${name}:`, error);
      toast({
        title: 'Connection Failed',
        description: `Could not connect to ${name}. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
      setShowDialog(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setConnected(false);
    setPublicKey(null);
    setWalletName(null);
    toast({
      description: 'Wallet disconnected',
    });
  };

  // Context value
  const value = {
    connected,
    connecting,
    publicKey,
    walletName,
    connect,
    disconnect,
    showDialog,
    setShowDialog
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Wallet Connect Button component
export const WalletConnectButton: React.FC = () => {
  const { connected, disconnect, showDialog, setShowDialog } = useWallet();
  const isMobile = useIsMobile();

  if (connected) {
    return (
      <Button 
        onClick={disconnect} 
        variant="destructive"
        className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
      >
        Disconnect
      </Button>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setShowDialog(true)}
        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
      >
        Connect Wallet
      </Button>
      
      <WalletSelectDialog />
    </>
  );
};

// Wallet Selection Dialog
const WalletSelectDialog: React.FC = () => {
  const { showDialog, setShowDialog, connect, connecting } = useWallet();
  
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {wallets.map((wallet) => (
            <Button
              key={wallet.name}
              onClick={() => connect(wallet.name)}
              disabled={connecting}
              className="flex justify-start items-center gap-3 h-12"
              variant="outline"
            >
              <i className={`${wallet.icon} text-xl`}></i>
              <span>{wallet.name}</span>
              {connecting && <span className="loading loading-spinner loading-xs ml-auto"></span>}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Type augmentation for global window object
declare global {
  interface Window {
    phantom?: {
      solana?: {
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
      };
    };
    solflare?: {
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
    };
  }
}