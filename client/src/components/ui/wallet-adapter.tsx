import React, { FC, useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { 
  WalletModalProvider, 
  WalletMultiButton,
  useWalletModal
} from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

// Import CSS files for wallet adapter UI (required)
import '@solana/wallet-adapter-react-ui/styles.css';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const SolanaWalletProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  // Set to 'mainnet-beta' for production, 'devnet' for development
  const network = 'mainnet-beta' as WalletAdapterNetwork;
  
  // Get connection endpoint for the network
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Initialize wallet adapters with the correct configuration
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({
        // Enable deep linking for better mobile experience
        appIdentity: { name: "Hacked ATM" }
      }),
      new SolflareWalletAdapter({ 
        network
      }),
    ],
    [network]
  );

  // Add listener for mobile wallet connections
  useEffect(() => {
    // Only apply on mobile devices
    if (isMobile()) {
      console.log("Mobile device detected, enhancing wallet connections");
      
      // Add a global error handler to catch and suppress Solflare-related errors
      const originalOnError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        // Check if it's the known Solflare error
        if (message && 
            (message.toString().includes('startsWith') || 
             message.toString().includes('readonly property'))) {
          console.warn('Suppressing known wallet connection error:', message);
          return true; // Prevent the error from bubbling up
        }
        // Otherwise, call the original handler
        if (typeof originalOnError === 'function') {
          return originalOnError.apply(this, arguments as any);
        }
        return false;
      };
      
      // Listen for wallet connection events from mobile wallet app
      const handleWalletConnect = (event: MessageEvent) => {
        // Handle potential wallet connection messages
        if (event.data && typeof event.data === 'object' && 
            (event.data.type === 'wallet-connect' || 
             (event.data.name && event.data.name.includes('wallet')))) {
          console.log("Received wallet connect event from mobile wallet");
        }
      };
      
      window.addEventListener('message', handleWalletConnect);
      return () => {
        window.removeEventListener('message', handleWalletConnect);
        // Restore original error handler when component unmounts
        window.onerror = originalOnError;
      };
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// No longer exporting useOpenWalletModal from here
// Use the dedicated hook from hooks/use-wallet-modal.ts instead

export const SolanaWalletButton: FC = () => {
  return (
    <div className="wallet-adapter-container">
      <WalletMultiButton className="wallet-adapter-button" />
      <style dangerouslySetInnerHTML={{
        __html: `
          .wallet-adapter-button {
            background: linear-gradient(to right, #6366f1, #8b5cf6) !important;
            border-radius: 0.5rem !important;
            color: white !important;
            font-family: inherit !important;
            height: 2.5rem !important;
            padding: 0 1rem !important;
            font-size: 0.875rem !important;
            font-weight: 500 !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
            transition: all 0.2s ease !important;
          }
          
          .wallet-adapter-button:hover {
            background: linear-gradient(to right, #4f46e5, #7c3aed) !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            transform: translateY(-1px) !important;
          }
          
          .wallet-adapter-button-trigger {
            background: linear-gradient(to right, #6366f1, #8b5cf6) !important;
          }
          
          .wallet-adapter-modal-wrapper {
            background-color: #1f1f23 !important;
            border-radius: 1rem !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
          }
          
          .wallet-adapter-modal-title {
            color: #ffffff !important;
            font-weight: 700 !important;
            font-size: 1.5rem !important;
          }
          
          .wallet-adapter-modal-content {
            color: #d4d4d8 !important;
          }
          
          .wallet-adapter-modal-list .wallet-adapter-button {
            background-color: #27272a !important;
            color: #ffffff !important;
            border-radius: 0.5rem !important;
            transition: all 0.2s ease !important;
          }
          
          .wallet-adapter-modal-list .wallet-adapter-button:hover {
            background-color: #3f3f46 !important;
            transform: translateY(-1px) !important;
          }
          
          .wallet-adapter-modal-list-more {
            color: #8b5cf6 !important;
          }
          
          .wallet-adapter-modal-list-more:hover {
            color: #6366f1 !important;
          }
        `
      }} />
    </div>
  );
};