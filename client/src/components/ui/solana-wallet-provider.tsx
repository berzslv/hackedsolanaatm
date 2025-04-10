import React, { FC, ReactNode, useEffect } from 'react';
import { SolanaWalletProvider } from './wallet-adapter';
import { useReferral } from '@/context/ReferralContext';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Import CSS files for wallet adapter UI (required)
import '@solana/wallet-adapter-react-ui/styles.css';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const ReferralAwareSolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { referralCode, getReferralUrl } = useReferral();
  
  // Use a hardcoded Solana mainnet-beta endpoint to avoid type issues
  const endpoint = useMemo(() => 'https://api.mainnet-beta.solana.com', []);
  
  // Initialize wallet adapters with the correct configuration
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({
        // Enable deep linking for better mobile experience
        appIdentity: { name: "Hacked ATM" }
      }),
      new SolflareWalletAdapter(),
    ],
    []
  );
  
  // Setup a global error handler to suppress wallet-related errors
  useEffect(() => {
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
    
    // Detect if we are inside a wallet's in-app browser
    const isInWalletBrowser = 
      window.navigator.userAgent.includes('SolflareWallet') || 
      window.navigator.userAgent.includes('PhantomWallet') ||
      document.referrer.includes('phantom') ||
      document.referrer.includes('solflare');
    
    // If we are, and we don't already have the ref param but there's a stored referral code
    if (isInWalletBrowser) {
      const currentUrl = new URL(window.location.href);
      if (!currentUrl.searchParams.has('ref') && referralCode) {
        // Add the referral code to the URL and navigate to it
        currentUrl.searchParams.set('ref', referralCode);
        window.history.replaceState({}, '', currentUrl.toString());
        console.log('Added stored referral code to URL in wallet browser:', referralCode);
      }
    }
    
    return () => {
      window.onerror = originalOnError;
    };
  }, [referralCode]);

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