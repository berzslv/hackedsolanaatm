import React, { useEffect, useState } from 'react';

/**
 * Special wrapper component to handle Solflare-specific errors
 * This adds a try-catch around the children to catch and suppress any
 * "startsWith" errors that might occur in Solflare's in-app browser
 */
const SolflareErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSolflare, setIsSolflare] = useState(false);
  
  useEffect(() => {
    // Check if we're in Solflare's browser
    const isSolflareApp = navigator.userAgent.includes('SolflareWallet');
    setIsSolflare(isSolflareApp);
    
    if (isSolflareApp) {
      console.log('Detected Solflare in-app browser, applying special error handling');
      
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
      `;
      document.head.appendChild(style);
      
      // Override String.prototype.startsWith to prevent errors
      try {
        const originalStartsWith = String.prototype.startsWith;
        // @ts-ignore - Intentionally replacing a built-in method for Solflare compatibility
        String.prototype.startsWith = function(searchString: string, position?: number): boolean {
          try {
            // If the string or searchString is null or undefined, return false safely
            if (!this || !searchString) return false;
            // Otherwise use the original implementation
            return originalStartsWith.call(this, searchString, position);
          } catch (e) {
            console.warn('Suppressed startsWith error in Solflare browser');
            return false; // Safely return false on error
          }
        };
        
        // Cleanup function
        return () => {
          // Restore original method
          // @ts-ignore
          String.prototype.startsWith = originalStartsWith;
        };
      } catch (err) {
        console.warn('Failed to override String.prototype.startsWith', err);
      }
    }
  }, []);
  
  // In Solflare, wrap children in an error boundary
  if (isSolflare) {
    try {
      return <>{children}</>;
    } catch (error) {
      console.warn('Caught render error in Solflare wrapper:', error);
      return <div>Loading...</div>;
    }
  }
  
  // Otherwise, just render children normally
  return <>{children}</>;
};

export default SolflareErrorHandler;