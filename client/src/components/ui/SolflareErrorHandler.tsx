import React, { useEffect, useState, Component, ErrorInfo } from 'react';

/**
 * Error boundary class component to catch render-time errors
 */
class SolflareErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Caught error in Solflare error boundary:', error);
    
    // Hide error overlays that might appear
    const hideErrorOverlays = () => {
      const overlays = document.querySelectorAll('[role="dialog"], .wallet-adapter-modal-container:not(.wallet-adapter-modal), #vite-error-overlay, .vite-error-overlay, [class*="error-overlay"]');
      overlays.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.style.zIndex = '-1';
        }
      });
    };
    
    // Run immediately and on a delay to catch any that appear later
    hideErrorOverlays();
    setTimeout(hideErrorOverlays, 100);
    setTimeout(hideErrorOverlays, 500);
    setTimeout(hideErrorOverlays, 1000);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="wallet-loading-container">
          <div className="wallet-loading">Loading wallet connection...</div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Special wrapper component to handle Solflare-specific errors
 * This adds a try-catch around the children to catch and suppress any
 * "startsWith" errors that might occur in Solflare's in-app browser
 */
const SolflareErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInWalletBrowser, setIsInWalletBrowser] = useState(false);
  
  useEffect(() => {
    // Check if we're in a wallet browser using the global flag or direct detection
    const inWalletBrowser = (window as any).__isWalletBrowser || 
                           navigator.userAgent.includes('SolflareWallet') ||
                           navigator.userAgent.includes('Phantom') ||
                           document.referrer.includes('solflare') ||
                           document.referrer.includes('phantom');
    
    setIsInWalletBrowser(inWalletBrowser);
    
    if (inWalletBrowser) {
      console.log('Detected wallet in-app browser, applying extra protections');
      
      // Add global CSS to hide error overlays
      const style = document.createElement('style');
      style.textContent = `
        #vite-error-overlay, 
        .vite-error-overlay, 
        [class*="error-overlay"],
        div[role="dialog"],
        .wallet-adapter-modal-container:not(.wallet-adapter-modal) {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
        }
        
        .wallet-loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          width: 100vw;
        }
        
        .wallet-loading {
          padding: 1rem;
          background: rgba(0,0,0,0.8);
          color: white;
          border-radius: 8px;
          font-size: 1rem;
        }
      `;
      document.head.appendChild(style);
      
      // Check for referral code in each storage mechanism
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      // Try to restore the referral code
      const checkReferralCode = () => {
        try {
          // Get from any available storage
          const storedCode = localStorage.getItem('walletReferralCode') || 
                            localStorage.getItem('referralCode') || 
                            sessionStorage.getItem('walletReferralCode') || 
                            sessionStorage.getItem('referralCode');
          
          // Get from cookie
          const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
          };
          const cookieCode = getCookie('referralCode');
          
          // Use stored code or code from URL
          const finalCode = refCode || storedCode || cookieCode;
          
          if (finalCode) {
            console.log('Referral code found in wallet browser:', finalCode);
            
            // Store it in all storages
            try { localStorage.setItem('walletReferralCode', finalCode); } catch (e) {}
            try { localStorage.setItem('referralCode', finalCode); } catch (e) {}
            try { sessionStorage.setItem('walletReferralCode', finalCode); } catch (e) {}
            try { sessionStorage.setItem('referralCode', finalCode); } catch (e) {}
            
            // Set URL if needed
            if (!refCode) {
              try {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('ref', finalCode);
                window.history.replaceState({}, '', currentUrl.toString());
                console.log('Added referral code to wallet browser URL:', finalCode);
              } catch (e) {
                console.warn('Failed to update URL with referral code in wallet browser', e);
              }
            }
          }
        } catch (e) {
          console.warn('Error handling referral code in wallet browser', e);
        }
      };
      
      // Run multiple times to ensure it works in wallet browser
      checkReferralCode();
      setTimeout(checkReferralCode, 500);
      setTimeout(checkReferralCode, 1500);
      setTimeout(checkReferralCode, 3000);
      
      // Also run before page unload to ensure code is stored
      window.addEventListener('beforeunload', () => {
        checkReferralCode();
      });
    }
  }, []);
  
  // Always use the error boundary for extra protection
  return (
    <SolflareErrorBoundary>
      {children}
    </SolflareErrorBoundary>
  );
};

export default SolflareErrorHandler;