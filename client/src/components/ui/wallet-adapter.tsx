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
  
  // Define a fixed endpoint for Solana mainnet-beta
  const endpoint = useMemo(() => 'https://api.mainnet-beta.solana.com', []);
  
  // Initialize wallet adapters with the correct configuration
  const wallets = useMemo(
    () => {
      // Check for referral code in URL or storage
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      const storedCode = localStorage.getItem('walletReferralCode') || 
                        sessionStorage.getItem('referralCode');
      
      // If we have a referral code, save it for wallet connection
      if (refCode) {
        localStorage.setItem('walletReferralCode', refCode);
      }
      
      // Final code to use (prioritize URL, then stored values)
      const referralCode = refCode || storedCode;
      
      // Create deep link URL with referral code if available
      const deepLinkUrl = referralCode ? 
        `${window.location.origin}/?ref=${referralCode}` : 
        window.location.origin;
      
      return [
        new PhantomWalletAdapter({
          // Enable deep linking for better mobile experience
          appIdentity: { name: "Hacked ATM" },
          // Add deep link redirect with referral code
          metadata: {
            url: deepLinkUrl
          }
        }),
        // Create Solflare adapter without network parameter to avoid type issues
        new SolflareWalletAdapter(),
      ];
    },
    []
  );

  // Add error handling and message listening for wallet connections
  useEffect(() => {
    console.log("Setting up wallet connection error handlers");
    
    // Add a global error handler to catch and suppress wallet-related errors
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if it's a known wallet connection error
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
    
    // Listen for wallet connection events from wallet apps
    const handleWalletConnect = (event: MessageEvent) => {
      // Handle potential wallet connection messages
      if (event.data && typeof event.data === 'object') {
        // Check various wallet message patterns
        if (event.data.type === 'wallet-connect' || 
            (typeof event.data.name === 'string' && event.data.name.includes('wallet')) ||
            event.data.method === 'connect') {
          console.log("Received wallet connect event:", 
            event.data.type || event.data.name || event.data.method);
            
          // If we're in a wallet browser, check URL parameters
          const storedReferralCode = localStorage.getItem('walletReferralCode') ||
                                   sessionStorage.getItem('referralCode');
                                   
          if (storedReferralCode) {
            // Add referral code to URL if not present
            const currentUrl = new URL(window.location.href);
            if (!currentUrl.searchParams.has('ref')) {
              currentUrl.searchParams.set('ref', storedReferralCode);
              window.history.replaceState({}, '', currentUrl.toString());
              console.log('Added referral code to URL after wallet connection:', storedReferralCode);
            }
          }
        }
      }
    };
    
    window.addEventListener('message', handleWalletConnect);
    
    // Add mobile-specific enhancements
    if (isMobile()) {
      console.log("Mobile device detected, adding extra wallet connection support");
      
      // Add any mobile-specific code here if needed
    }
    
    return () => {
      window.removeEventListener('message', handleWalletConnect);
      window.onerror = originalOnError;
    };
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