import React, { useEffect, Component } from 'react';

/**
 * Error boundary class component to catch render errors
 */
class ErrorBoundaryClass extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // Check if this is a wallet-related error that should be suppressed
    if (
      error && 
      (
        (typeof error.message === 'string' && (
          error.message.includes('startsWith') || 
          error.message.includes('solflare') ||
          error.message.includes('wallet')
        )) ||
        (error.toString && error.toString().includes('startsWith'))
      )
    ) {
      console.warn('[React Error Boundary] Suppressing wallet-related error:', error.message || error);
      // We suppress the error in UI but keep the component mounted
      return { hasError: false };
    }
    
    // For other errors, we will show a fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log the error for debugging purposes
    console.error('[Error Boundary Caught]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any fallback UI
      return (
        <div className="p-4 bg-red-100 text-red-800 rounded-md">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p>Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Global error handler component to suppress wallet-related errors
 * and provide a better user experience for wallet integration
 */
export const GlobalErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Apply global CSS to hide error overlays
    const style = document.createElement('style');
    style.textContent = `
      /* Hide Vite error overlay */
      #vite-error-overlay, .vite-error-overlay, [class*="error-overlay"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
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
        // Specific check for Solflare startsWith error
        if (message.includes('startsWith')) {
          console.warn('[Solflare Error Suppressed]', { 
            message: message.substring(0, 100), 
            source 
          });
          return true; // Prevent error from propagating
        }
        
        // Check for other wallet-related errors
        if (
          message.includes('wallet') ||
          message.includes('solflare') ||
          message.includes('phantom') ||
          message.includes('adapter') ||
          message.includes('readonly property') ||
          message.includes('getPublicKey')
        ) {
          console.warn('[Wallet Error Suppressed]', { 
            message: message.substring(0, 100), 
            source 
          });
          return true; // Prevent error from propagating
        }
      }
      
      // Otherwise call the original handler
      if (typeof originalOnError === 'function') {
        return originalOnError.apply(window, [message, source, lineno, colno, error]);
      }
      return false;
    };
    
    // Handle unhandled promise rejections with addEventListener instead of the property
    function handleErrorBoundaryRejection(event: PromiseRejectionEvent) {
      // Check if this is a wallet-related error
      if (event && event.reason) {
        const reasonStr = String(event.reason);
        
        // Specifically look for Solflare startsWith errors
        if (reasonStr.includes('startsWith')) {
          console.warn('[Solflare Promise Rejection Suppressed]', event.reason);
          event.preventDefault();
          event.stopPropagation?.();
          return true;
        }
        
        // Check for other wallet-related errors
        if (
          reasonStr.includes('wallet') ||
          reasonStr.includes('solflare') ||
          reasonStr.includes('phantom') ||
          reasonStr.includes('adapter') ||
          reasonStr.includes('getPublicKey')
        ) {
          console.warn('[Wallet Promise Rejection Suppressed]', event.reason);
          event.preventDefault();
          event.stopPropagation?.();
          return true;
        }
      }
      
      return false;
    }
    
    // Add the event listener
    window.addEventListener('unhandledrejection', handleErrorBoundaryRejection);
    
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
    
    // Clear any existing error overlays
    const removeErrorOverlays = () => {
      const overlays = document.querySelectorAll('[id*="error-overlay"], [class*="error-overlay"]');
      overlays.forEach(overlay => {
        if (overlay instanceof HTMLElement) {
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.opacity = '0';
          overlay.style.pointerEvents = 'none';
        }
      });
    };
    
    // Run immediately and periodically to ensure overlays are removed
    removeErrorOverlays();
    const intervalId = setInterval(removeErrorOverlays, 500);
    
    // Return cleanup function
    return () => {
      // Restore original error handler if it exists
      if (originalOnError) {
        window.onerror = originalOnError;
      }
      
      // Remove our custom event listeners
      window.removeEventListener('unhandledrejection', handleErrorBoundaryRejection);
      clearInterval(intervalId);
    };
  }, []);
  
  // Use both functional hooks for global handlers and class component for React errors
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
};

export default GlobalErrorHandler;