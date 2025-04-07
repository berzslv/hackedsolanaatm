import React, { createContext, useContext, useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl, VersionedTransaction } from '@solana/web3.js';

// Define available wallet types
export type WalletType = 'phantom' | 'solflare' | 'slope' | 'sollet' | 'math' | 'coin98';

interface SolanaContextType {
  connection: Connection | null;
  connected: boolean;
  publicKey: PublicKey | null;
  balance: number;
  walletType: WalletType | null;
  connectWallet: (walletType?: WalletType) => Promise<void>;
  disconnectWallet: () => void;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
  sendTransaction: (transaction: VersionedTransaction) => Promise<string>;
  openWalletSelector: () => void;
  showWalletSelector: boolean;
  setShowWalletSelector: (show: boolean) => void;
}

const SolanaContext = createContext<SolanaContextType>({
  connection: null,
  connected: false,
  publicKey: null,
  balance: 0,
  walletType: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  signMessage: async () => new Uint8Array(),
  signTransaction: async (tx) => tx,
  sendTransaction: async () => "",
  openWalletSelector: () => {},
  showWalletSelector: false,
  setShowWalletSelector: () => {},
});

export const useSolana = () => useContext(SolanaContext);

// Deep linking URLs for mobile wallets
const WALLET_DEEP_LINKS = {
  phantom: {
    mobile: 'phantom://browse/',
    universalLink: 'https://phantom.app/ul/browse/',
    fallback: 'https://phantom.app/download',
  },
  solflare: {
    mobile: 'solflare://',
    universalLink: 'https://solflare.com/ul/v1/',
    fallback: 'https://solflare.com/download',
  },
  slope: {
    mobile: 'slope://',
    universalLink: 'https://slope.finance/app/',
    fallback: 'https://slope.finance/download',
  },
  coin98: {
    mobile: 'coin98://',
    universalLink: 'https://coin98.com/wallet/',
    fallback: 'https://coin98.com/wallet',
  }
};

// Helper to check if device is mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Generic wallet provider interface
interface WalletProvider {
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
  const [provider, setProvider] = useState<WalletProvider | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Store the last connected wallet in local storage
  const saveWalletPreference = (walletType: WalletType) => {
    localStorage.setItem('preferredWallet', walletType);
  };

  // Get the preferred wallet from local storage
  const getWalletPreference = (): WalletType | null => {
    return localStorage.getItem('preferredWallet') as WalletType | null;
  };

  // Initialize connection to Solana devnet
  useEffect(() => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    setConnection(connection);

    // Try to reconnect to the previously used wallet
    const preferredWallet = getWalletPreference();
    if (preferredWallet) {
      const provider = getWalletProvider(preferredWallet);
      if (provider && provider.isConnected && provider.publicKey) {
        setProvider(provider);
        setWalletType(preferredWallet);
        setConnected(true);
        setPublicKey(provider.publicKey);
        fetchBalance(connection, provider.publicKey);
      }
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

  // Check if a wallet provider is available in the browser
  const getWalletProvider = (walletType: WalletType): WalletProvider | null => {
    // Handle mobile deep linking
    if (isMobileDevice() && WALLET_DEEP_LINKS[walletType]) {
      const currentUrl = window.location.href;
      const deepLink = WALLET_DEEP_LINKS[walletType].mobile + encodeURIComponent(currentUrl);

      // Create and trigger an invisible iframe to check if app is installed
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      try {
        iframe.contentWindow?.location.href = deepLink;
      } catch (e) {
        // If error, app is not installed
        window.location.href = WALLET_DEEP_LINKS[walletType].fallback;
      } finally {
        // Clean up iframe after attempt
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 100);
      }

      return null;
    }

    switch (walletType) {
      case 'phantom':
        if ('phantom' in window) {
          // @ts-ignore
          const provider = window.phantom?.solana;
          if (provider?.isPhantom) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'solflare':
        if ('solflare' in window) {
          // @ts-ignore
          const provider = window.solflare;
          if (provider?.isSolflare) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'slope':
        if ('slope' in window) {
          // @ts-ignore
          const provider = window.slope;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'sollet':
        if ('sollet' in window) {
          // @ts-ignore
          const provider = window.sollet;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'math':
        if ('solana' in window && 'isMathWallet' in window) {
          // @ts-ignore
          const provider = window.solana;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'coin98':
        if ('coin98' in window) {
          // @ts-ignore
          const provider = window.coin98?.sol;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
    }
    return null;
  };

  // Function to open the wallet selector modal
  const openWalletSelector = () => {
    setShowWalletSelector(true);
  };

  // Function to connect to a wallet
  const connectWallet = async (type?: WalletType) => {
    try {
      // If no type is specified but a wallet selector is open, just return 
      // (the user will select a wallet from the modal)
      if (!type && showWalletSelector) {
        return;
      }

      // If no type is specified and no wallet selector is open, 
      // either use the last used wallet or open the selector
      if (!type) {
        const preferredWallet = getWalletPreference();
        if (preferredWallet) {
          type = preferredWallet;
        } else {
          openWalletSelector();
          return;
        }
      }

      // Get the wallet provider based on the wallet type
      const walletProvider = getWalletProvider(type);

      if (!walletProvider) {
        // If wallet is not installed, open the website for installation
        const walletWebsites = {
          phantom: 'https://phantom.app/',
          solflare: 'https://solflare.com/',
          slope: 'https://slope.finance/',
          sollet: 'https://www.sollet.io/',
          math: 'https://mathwallet.org/',
          coin98: 'https://coin98.com/'
        };

        window.open(walletWebsites[type], '_blank');
        return;
      }

      // Set wallet type
      setWalletType(type);

      // Connect to the wallet
      const { publicKey } = await walletProvider.connect();

      // Save the connected wallet info
      setProvider(walletProvider);
      setConnected(true);
      setPublicKey(publicKey);
      setShowWalletSelector(false); // Close wallet selector if open

      // Save preference for next time
      saveWalletPreference(type);

      // Fetch balance
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
    setProvider(null);
    setWalletType(null);
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
        walletType,
        connectWallet,
        disconnectWallet,
        signMessage,
        signTransaction,
        sendTransaction,
        openWalletSelector,
        showWalletSelector,
        setShowWalletSelector
      }}
    >
      {children}
    </SolanaContext.Provider>
  );
};