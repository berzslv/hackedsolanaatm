import React, { FC, useMemo, useEffect, useState } from 'react';
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
import SolflareErrorHandler from './SolflareErrorHandler';

// Import CSS files for wallet adapter UI (required)
import '@solana/wallet-adapter-react-ui/styles.css';

// Enhanced mobile and wallet-browser detection utility
const detectBrowserEnvironment = () => {
  const userAgent = navigator.userAgent;
  const referrer = document.referrer;
  
  // Check if mobile device
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Check specific wallet in-app browsers
  const isPhantomBrowser = userAgent.includes('PhantomBrowser') || 
                          referrer.includes('phantom') || 
                          /Phantom/i.test(userAgent);
                          
  const isSolflareBrowser = userAgent.includes('SolflareWallet') || 
                           referrer.includes('solflare') || 
                           /Solflare/i.test(userAgent);
  
  // General wallet browser detection
  const isWalletBrowser = isPhantomBrowser || 
                         isSolflareBrowser || 
                         referrer.includes('wallet') ||
                         (isMobileDevice && window.parent !== window);
  
  return {
    isMobileDevice,
    isPhantomBrowser,
    isSolflareBrowser,
    isWalletBrowser,
    userAgent,
    referrer
  };
};

export const SolanaWalletProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  // Set to 'mainnet-beta' for production, 'devnet' for development
  const network = 'mainnet-beta' as WalletAdapterNetwork;
  
  // Define a fixed endpoint for Solana mainnet-beta
  const endpoint = useMemo(() => 'https://api.mainnet-beta.solana.com', []);
  
  // Track the environment for special handling
  const [environment, setEnvironment] = useState({
    isWalletBrowser: false,
    isPhantomBrowser: false,
    isSolflareBrowser: false,
    isMobileDevice: false
  });
  
  // Initialize wallet adapters with the correct configuration
  const wallets = useMemo(
    () => {
      // Check for referral code in URL or storage using multiple methods
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      // Try getting code from various storage mechanisms
      const localStorageCode = localStorage.getItem('walletReferralCode') || 
                              localStorage.getItem('referralCode');
      const sessionStorageCode = sessionStorage.getItem('referralCode') || 
                               sessionStorage.getItem('walletReferralCode');
      const walletDataCode = localStorage.getItem('wallet_referral_data');
      
      // If we have a referral code in the URL, save it everywhere
      if (refCode) {
        try {
          localStorage.setItem('walletReferralCode', refCode);
          localStorage.setItem('referralCode', refCode);
          sessionStorage.setItem('referralCode', refCode);
          sessionStorage.setItem('walletReferralCode', refCode);
          localStorage.setItem('wallet_referral_data', refCode);
          
          // Also save it as a cookie for 30 days
          const d = new Date();
          d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
          const expires = "expires=" + d.toUTCString();
          document.cookie = "referralCode=" + refCode + ";" + expires + ";path=/";
        } catch (e) {
          console.warn('Failed to save referral code to storage:', e);
        }
      }
      
      // Final code to use (prioritize URL, then stored values)
      const referralCode = refCode || 
                         localStorageCode || 
                         sessionStorageCode || 
                         walletDataCode;
      
      // Attempt to extract referral code from cookie as fallback
      if (!referralCode) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith('referralCode=')) {
            const cookieCode = cookie.substring('referralCode='.length, cookie.length);
            if (cookieCode) {
              localStorage.setItem('walletReferralCode', cookieCode);
              localStorage.setItem('referralCode', cookieCode);
              break;
            }
          }
        }
      }
      
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
        // Create Solflare adapter with improved config
        new SolflareWalletAdapter({
          network: network
        }),
      ];
    },
    []
  );

  // Add error handling and message listening for wallet connections
  useEffect(() => {
    console.log("Setting up enhanced wallet connection error handlers");
    
    // Add a global error handler to catch and suppress wallet-related errors
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Detect Solflare and other wallet errors with advanced pattern matching
      if (message) {
        const messageStr = message.toString();
        // Check for common wallet error patterns
        if (messageStr.includes('startsWith') || 
            messageStr.includes('readonly property') ||
            messageStr.includes('solflare') ||
            messageStr.includes('wallet adapter') ||
            messageStr.includes('blockhash') ||
            // Additional Solflare-specific error patterns
            (source && source.toString().includes('solflare'))) {
          
          console.warn('Suppressing wallet connection error:', { 
            message: messageStr.substring(0, 100), // Trim long messages
            source: source?.toString().substring(0, 50) 
          });
          return true; // Prevent the error from bubbling up
        }
      }
      
      // Otherwise, call the original handler
      if (typeof originalOnError === 'function') {
        return originalOnError.apply(this, arguments as any);
      }
      return false;
    };
    
    // Add a global unhandled promise rejection handler without using the window handler
    // which avoids TypeScript issues with 'this' binding
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      
      // Check if it's a wallet-related error
      if (reason && 
         (reason.toString().includes('wallet') || 
          reason.toString().includes('solflare') || 
          reason.toString().includes('phantom') ||
          reason.toString().includes('startsWith'))) {
        
        console.warn('Suppressing wallet-related unhandled rejection:', reason);
        event.preventDefault(); // Prevent default error handling
        event.stopPropagation(); // Stop propagation
        return true; // Prevent the error from bubbling up
      }
      
      // For other errors, let them propagate
      return false;
    }
    
    // Add event listener directly instead of using the onunhandledrejection property
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Listen for wallet connection events from wallet apps
    const handleWalletConnect = (event: MessageEvent) => {
      // Handle potential wallet connection messages
      if (event.data && typeof event.data === 'object') {
        // Check various wallet message patterns
        if (event.data.type === 'wallet-connect' || 
            (typeof event.data.name === 'string' && event.data.name?.includes('wallet')) ||
            event.data.method === 'connect' ||
            event.data.type === 'connect') {
          
          console.log("Received wallet connect event:", 
            event.data.type || event.data.name || event.data.method);
            
          // Try to restore referral code after wallet connection
          const walletReferralCode = localStorage.getItem('walletReferralCode');
          const localStorageCode = localStorage.getItem('referralCode');
          const sessionStorageCode = sessionStorage.getItem('referralCode');
          const finalCode = walletReferralCode || localStorageCode || sessionStorageCode;
          
          if (finalCode) {
            // Add referral code to URL if not present
            const currentUrl = new URL(window.location.href);
            if (!currentUrl.searchParams.has('ref')) {
              currentUrl.searchParams.set('ref', finalCode);
              window.history.replaceState({}, '', currentUrl.toString());
              console.log('Added referral code to URL after wallet connection:', finalCode);
              
              // Force a refresh of the page with the new URL to ensure code is applied
              // But add a flag to prevent infinite refresh loop
              if (!sessionStorage.getItem('wallet_connected_with_ref')) {
                sessionStorage.setItem('wallet_connected_with_ref', 'true');
                console.log('Triggering page refresh to apply referral code');
                
                // Use a small timeout to allow the message log to be seen
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              }
            }
          }
        }
      }
    };
    
    window.addEventListener('message', handleWalletConnect);
    
    // Special handling for Solflare and other in-app browsers
    const isSolflareInApp = window.navigator.userAgent.includes('SolflareWallet');
    const isPhantomInApp = window.navigator.userAgent.includes('PhantomBrowser') || 
                         window.navigator.userAgent.includes('Phantom/');
    const isAnyWalletApp = isSolflareInApp || isPhantomInApp || 
                         document.referrer.includes('solflare') ||
                         document.referrer.includes('phantom');

    if (isAnyWalletApp) {
      console.log("Wallet in-app browser detected, applying comprehensive error handling");
      
      // Apply a global error suppression 
      try {
        // @ts-ignore - For applying custom properties to window
        window.__walletErrorSuppression = true;
        
        // Add extensive CSS rules to hide error overlays and fix display issues
        const style = document.createElement('style');
        style.textContent = `
          /* Hide ONLY error overlays, but allow our own dialogs to display */
          #vite-error-overlay, 
          .vite-error-overlay, 
          div[role="dialog"][aria-label*="error"]:not(.wallet-adapter-modal):not(.custom-dialog),
          [class*="error-overlay"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          
          /* Force wallet modal to be visible when needed */
          .wallet-adapter-modal.wallet-adapter-modal-fade-in {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 1000 !important;
          }
          
          /* Ensure connect button is fully interactive */
          .wallet-adapter-button-trigger {
            pointer-events: auto !important;
            cursor: pointer !important;
            opacity: 1 !important;
          }
        `;
        document.head.appendChild(style);
        
        // Add special patch for wallet reconnection
        // Monitor and fix wallet connection state
        const walletConnectionInterval = setInterval(() => {
          try {
            // Check for any connect buttons in the DOM
            const connectButtons = document.querySelectorAll('.wallet-adapter-button-trigger, [aria-label*="Connect"], [class*="connect-button"]');
            
            // If the connect button exists but is disabled, enable it
            connectButtons.forEach(button => {
              if (button instanceof HTMLElement && button.hasAttribute('disabled')) {
                button.removeAttribute('disabled');
                console.log('Fixed disabled wallet connect button');
              }
            });
            
            // Check if we have a wallet modal that might be stuck
            const stuckModal = document.querySelector('.wallet-adapter-modal.wallet-adapter-modal-fade-in');
            if (stuckModal) {
              // If we haven't clicked in a while, try to close and reopen
              if ((window as any).__lastWalletConnectionAttempt && 
                  Date.now() - (window as any).__lastWalletConnectionAttempt > 10000) {
                // Try to reset wallet modal state
                console.log('Attempting to reset stuck wallet modal');
                const closeButton = document.querySelector('.wallet-adapter-modal-button-close');
                if (closeButton && closeButton instanceof HTMLElement) {
                  closeButton.click();
                }
                
                // Reset the timestamp
                (window as any).__lastWalletConnectionAttempt = 0;
              }
            }
          } catch (e) {
            console.warn('Error in wallet connection monitor:', e);
          }
        }, 2000);
        
        return () => {
          clearInterval(walletConnectionInterval);
        };
      } catch (e) {
        console.warn('Failed to apply wallet browser error suppression:', e);
      }
    } else {
      // For non-wallet browsers, add any mobile-specific enhancements
      const env = detectBrowserEnvironment();
      if (env.isMobileDevice) {
        console.log("Mobile device detected, adding extra wallet connection support");
        
        // Add any additional mobile-specific code here if needed
      }
    }
    
    return () => {
      window.removeEventListener('message', handleWalletConnect);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.onerror = originalOnError;
      // We're no longer using originalUnhandledRejection since we use addEventListener
    };
  }, []);

  // Update the environment detection when the component mounts
  useEffect(() => {
    const env = detectBrowserEnvironment();
    console.log("Current browser environment:", env);
    setEnvironment({
      isWalletBrowser: env.isWalletBrowser,
      isPhantomBrowser: env.isPhantomBrowser,
      isSolflareBrowser: env.isSolflareBrowser,
      isMobileDevice: env.isMobileDevice
    });
    
    // Check for referral code and restore it if needed
    const checkReferralCode = () => {
      // Try to get code from various sources
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      const walletReferralCode = localStorage.getItem('walletReferralCode');
      const localStorageCode = localStorage.getItem('referralCode');
      const sessionStorageCode = sessionStorage.getItem('referralCode');
      
      console.log("Attempting to restore referral code from storage:", {
        walletReferralCode,
        localStorageCode,
        sessionStorageCode,
        finalCode: refCode || walletReferralCode || localStorageCode || sessionStorageCode
      });
      
      // If we have a stored code but not in URL, add it to URL
      const finalCode = refCode || walletReferralCode || localStorageCode || sessionStorageCode;
      if (finalCode && !refCode) {
        // Add it to the URL without reloading
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('ref', finalCode);
        window.history.replaceState({}, '', currentUrl.toString());
        console.log('Restored referral code to URL:', finalCode);
      }
    };
    
    // Run immediately
    checkReferralCode();
    
    // For wallet browsers, do a delayed check to catch cases where the browser
    // might have loaded partially
    if (env.isWalletBrowser || env.isMobileDevice) {
      setTimeout(() => {
        console.log("Running delayed referral code check for wallet browser");
        // Re-run environment detection in case it changed
        const updatedEnv = detectBrowserEnvironment();
        console.log("Current browser environment:", updatedEnv);
        checkReferralCode();
      }, 1000);
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* Use the SolflareErrorHandler to catch and suppress startsWith errors */}
          <SolflareErrorHandler>
            {children}
          </SolflareErrorHandler>
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