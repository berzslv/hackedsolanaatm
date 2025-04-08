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
type WalletDeepLinks = {
  [K in WalletType]?: {
    mobile: string;
    universalLink: string;
    fallback: string;
    connectMobile?: string; // Special URL for connection requests
    connectUniversal?: string; // Special URL for connection requests via universal links
  }
};

const WALLET_DEEP_LINKS: WalletDeepLinks = {
  phantom: {
    mobile: 'phantom://browse/',
    universalLink: 'https://phantom.app/ul/browse/',
    fallback: 'https://phantom.app/download',
    // Using the absolute simplest confirmed standard for Phantom connection
    connectMobile: 'phantom://connect',
    connectUniversal: 'https://phantom.app/ul/connect',
  },
  solflare: {
    mobile: 'solflare://',
    universalLink: 'https://solflare.com/ul/v1/',
    fallback: 'https://solflare.com/download',
    // Solflare uses this specific format for their connection protocol:
    connectMobile: 'solflare://dapp/',
    connectUniversal: 'https://solflare.com/ul/v1/dapp/',
  },
  slope: {
    mobile: 'slope://',
    universalLink: 'https://slope.finance/app/',
    fallback: 'https://slope.finance/download',
    connectMobile: 'slope://wallet/dapp/connect/',
  },
  sollet: {
    mobile: '', // Sollet doesn't have a mobile app
    universalLink: 'https://www.sollet.io',
    fallback: 'https://www.sollet.io',
  },
  math: {
    mobile: 'mathwallet://',
    universalLink: 'https://mathwallet.org',
    fallback: 'https://mathwallet.org/en-us/download/app',
    connectMobile: 'mathwallet://dapp/',
  },
  coin98: {
    mobile: 'coin98://',
    universalLink: 'https://coin98.com/wallet/',
    fallback: 'https://coin98.com/wallet',
    connectMobile: 'coin98://dapp/',
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

  // Initialize connection to Solana testnet
  useEffect(() => {
    const connection = new Connection(clusterApiUrl('testnet'), 'confirmed');
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
    // Check for desktop browser wallet providers first
    let provider = null;
    
    switch (walletType) {
      case 'phantom':
        if ('phantom' in window) {
          // @ts-ignore
          provider = window.phantom?.solana;
          if (provider?.isPhantom) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'solflare':
        if ('solflare' in window) {
          // @ts-ignore
          provider = window.solflare;
          // @ts-ignore
          if (provider && provider.isSolflare) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'slope':
        if ('slope' in window) {
          // @ts-ignore
          provider = window.slope;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'sollet':
        if ('sollet' in window) {
          // @ts-ignore
          provider = window.sollet;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'math':
        if ('solana' in window && 'isMathWallet' in window) {
          // @ts-ignore
          provider = window.solana;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
      case 'coin98':
        if ('coin98' in window) {
          // @ts-ignore
          provider = window.coin98?.sol;
          if (provider) {
            return provider as unknown as WalletProvider;
          }
        }
        break;
    }
    
    // If no desktop provider and on mobile, handle deep linking
    if (!provider && isMobileDevice() && WALLET_DEEP_LINKS[walletType]) {
      handleMobileWalletRedirect(walletType);
      return null;
    }
    
    return null;
  };
  
  // Separate function to handle mobile wallet redirects
  const handleMobileWalletRedirect = (walletType: WalletType) => {
    const appURL = WALLET_DEEP_LINKS[walletType];
    if (!appURL) {
      console.error(`No deep link configuration for wallet type: ${walletType}`);
      return;
    }
    
    // Create a URL with important connection info
    const currentUrl = window.location.href;
    const appName = 'HackedATM'; // Name to display in wallet connection
    const cluster = 'testnet'; // Using Solana testnet
    
    // Base parameters for connection request
    const baseParams = {
      redirect_link: currentUrl, // Return to this app after authorization
      app_url: currentUrl,
      cluster: cluster,
      app_title: appName
    };
    
    // Direct approach - use minimal parameters for cleaner URLs
    let connectionParams = '';
    
    if (walletType === 'phantom') {
      // For Phantom using the latest mobile connection protocol
      connectionParams = new URLSearchParams({
        app: appName,
        redirect: currentUrl,
        // Important: Specify testnet explicitly (default is mainnet)
        cluster: 'testnet'
      }).toString();
    } else if (walletType === 'solflare') {
      // Solflare needs these specific params
      connectionParams = `dapp=${encodeURIComponent(appName)}&url=${encodeURIComponent(currentUrl)}`;
    } else {
      // For other wallets, keep it minimal
      connectionParams = `url=${encodeURIComponent(currentUrl)}`;
    }
    
    // Try connection-specific links first (these trigger connection dialogs)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isIOS && appURL.connectUniversal) {
      // iOS with universal link for connect
      console.log(`Opening iOS universal connection link for ${walletType}`);
      window.location.href = `${appURL.connectUniversal}?${connectionParams}`;
    } 
    else if (appURL.connectMobile) {
      // Direct connect link (works on Android and sometimes iOS)
      console.log(`Opening direct connection link for ${walletType}`);
      const connectLink = `${appURL.connectMobile}?${connectionParams}`;
      
      // Try iframe for iOS
      if (isIOS) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = connectLink;
        document.body.appendChild(iframe);
        
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
      
      // Direct navigation
      window.location.href = connectLink;
      
      // Fallback if not installed
      setTimeout(() => {
        console.log(`Connection attempt timed out, redirecting to fallback for ${walletType}`);
        window.location.href = appURL.fallback;
      }, 2500);
    }
    // Fallback to regular browsing links if no connection links available
    else if (isIOS && appURL.universalLink) {
      console.log(`Opening iOS universal browsing link for ${walletType}`);
      window.location.href = `${appURL.universalLink}${encodeURIComponent(currentUrl)}`;
    } 
    else if (appURL.mobile) {
      // For Android or fallback for iOS using browsing link
      console.log(`Opening mobile browsing link for ${walletType}`);
      const deepLink = `${appURL.mobile}${encodeURIComponent(currentUrl)}`;
      
      // Create an iframe to attempt opening the app
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      
      // Also try direct navigation for Android
      window.location.href = deepLink;
      
      // Set timeout for fallback
      setTimeout(() => {
        // If we're still here, the app isn't installed
        // Remove iframe
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        
        // Redirect to download page
        console.log(`App not detected, redirecting to download page for ${walletType}`);
        window.location.href = appURL.fallback;
      }, 2000);
    } 
    else {
      // No mobile links available, go straight to fallback
      console.log(`No mobile links available for ${walletType}, opening fallback`);
      window.location.href = appURL.fallback;
    }
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

      // Set wallet type immediately to indicate user intent
      setWalletType(type);
      
      // Close wallet selector if open
      setShowWalletSelector(false);

      // For mobile devices, we want to try connecting via deep linking
      if (isMobileDevice() && WALLET_DEEP_LINKS[type]) {
        console.log(`Attempting to connect to ${type} wallet on mobile`);
        handleMobileWalletRedirect(type);
        return; // The page will redirect, so we don't continue
      }

      // For desktop, get the wallet provider
      const walletProvider = getWalletProvider(type);

      if (!walletProvider) {
        console.log(`${type} wallet not detected in browser. Opening website.`);
        // Show a toast message that it's not installed
        // If wallet is not installed, provide info on how to install
        type WalletInfo = {
          [key in WalletType]: {
            name: string;
            url: string;
            message: string;
          }
        };
        
        const walletInfo: WalletInfo = {
          phantom: {
            name: 'Phantom',
            url: 'https://phantom.app/download',
            message: 'Phantom wallet not detected. Install it to connect.'
          },
          solflare: {
            name: 'Solflare',
            url: 'https://solflare.com/download',
            message: 'Solflare wallet not detected. Install it to connect.'
          },
          slope: {
            name: 'Slope',
            url: 'https://slope.finance/download',
            message: 'Slope wallet not detected. Install it to connect.'
          },
          sollet: {
            name: 'Sollet',
            url: 'https://www.sollet.io',
            message: 'Sollet wallet not detected. Use it in browser to connect.'
          },
          math: {
            name: 'MathWallet',
            url: 'https://mathwallet.org/en-us/download/app',
            message: 'MathWallet not detected. Install it to connect.'
          },
          coin98: {
            name: 'Coin98',
            url: 'https://coin98.com/wallet',
            message: 'Coin98 wallet not detected. Install it to connect.'
          }
        };
        
        // We've already checked that type is defined earlier in the function
        const info = walletInfo[type as WalletType];
        console.log(info.message);
        
        // On mobile, we've already tried deep linking, so just open the download page
        if (isMobileDevice()) {
          window.location.href = info.url;
        } else {
          window.open(info.url, '_blank');
        }
        return;
      }

      // Connect to the wallet
      console.log(`Connecting to ${type} wallet on desktop`);
      const { publicKey } = await walletProvider.connect();

      // Save the connected wallet info
      setProvider(walletProvider);
      setConnected(true);
      setPublicKey(publicKey);

      // Save preference for next time
      saveWalletPreference(type);

      // Fetch balance
      if (connection) {
        fetchBalance(connection, publicKey);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setWalletType(null); // Reset wallet type on error
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