import React, { useEffect } from 'react';

/**
 * Global error boundary component to suppress wallet-related errors
 * and provide a better user experience for wallet integration
 */
export const GlobalErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Apply global CSS to hide error overlays
    const style = document.createElement('style');
    style.textContent = `
      /* Hide Vite error overlay */
      #vite-error-overlay {
        display: none !important;
      }
      
      /* Ensure wallet modal is visible */
      .wallet-adapter-modal {
        z-index: 100000 !important;
      }
    `;
    document.head.appendChild(style);
    
    // Enhanced error handling for all wallet-related errors
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Only suppress wallet-related errors
      if (message && typeof message === 'string') {
        if (
          message.includes('startsWith') || 
          message.includes('wallet') ||
          message.includes('solflare') ||
          message.includes('phantom') ||
          message.includes('adapter') ||
          message.includes('readonly property')
        ) {
          console.warn('[Error Suppressed]', { 
            message: message.substring(0, 100), 
            source 
          });
          return true; // Prevent error from propagating
        }
      }
      
      // Otherwise call the original handler
      if (typeof originalOnError === 'function') {
        return originalOnError.apply(this, arguments as any);
      }
      return false;
    };
    
    // Also handle unhandled promise rejections
    const originalUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event: PromiseRejectionEvent) {
      if (event.reason && (
        event.reason.toString().includes('wallet') ||
        event.reason.toString().includes('solflare') ||
        event.reason.toString().includes('phantom') ||
        event.reason.toString().includes('adapter') ||
        event.reason.toString().includes('startsWith')
      )) {
        console.warn('[Promise Rejection Suppressed]', event.reason);
        event.preventDefault();
        return true;
      }
      
      if (typeof originalUnhandledRejection === 'function') {
        return originalUnhandledRejection(event);
      }
    };
    
    // Check if we need to reattach referral code
    const checkForReferralCode = () => {
      // Always check first if we have a ref in the URL
      const params = new URLSearchParams(window.location.search);
      if (params.has('ref')) {
        // Save it for later use
        const refCode = params.get('ref');
        if (refCode) {
          localStorage.setItem('walletReferralCode', refCode);
          localStorage.setItem('referralCode', refCode);
          sessionStorage.setItem('referralCode', refCode);
        }
      } else {
        // If not in URL, try to restore from storage
        const storedCode = localStorage.getItem('walletReferralCode') || 
                          localStorage.getItem('referralCode') || 
                          sessionStorage.getItem('referralCode');
                          
        if (storedCode) {
          // Add it to the URL
          const url = new URL(window.location.href);
          url.searchParams.set('ref', storedCode);
          window.history.replaceState({}, '', url.toString());
          console.log('[ErrorBoundary] Reattached referral code to URL:', storedCode);
        }
      }
    };
    
    // Run the check when component mounts
    checkForReferralCode();
    
    // Return cleanup function
    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalUnhandledRejection;
    };
  }, []);
  
  return <>{children}</>;
};

export default GlobalErrorHandler;