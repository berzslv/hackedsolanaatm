import React, { useEffect, useState, ComponentPropsWithoutRef } from 'react';
import { Dialog } from '@/components/ui/dialog';

// Define our own DialogProps since the Dialog component doesn't export it
type DialogProps = ComponentPropsWithoutRef<typeof Dialog>;

/**
 * A wrapper around the Dialog component that ensures it works in wallet browsers
 * This addresses issues where dialogs might not appear in in-app browsers like Phantom/Solflare
 */
export function WalletSafeDialog({
  children,
  open,
  onOpenChange,
  ...props
}: DialogProps) {
  const [isWalletBrowser, setIsWalletBrowser] = useState(false);

  // Detect if we're in a wallet browser
  useEffect(() => {
    const inWalletBrowser = 
      window.navigator.userAgent.includes('SolflareWallet') || 
      window.navigator.userAgent.includes('Phantom') ||
      document.referrer.includes('phantom') ||
      document.referrer.includes('solflare');
    
    setIsWalletBrowser(inWalletBrowser);
  }, []);

  // Apply special styles for wallet browsers
  useEffect(() => {
    if (open) {
      // Add a style tag to ensure our dialog is visible
      const styleId = 'wallet-safe-dialog-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          /* Force dialogs to be visible in wallet browsers */
          .wallet-safe-dialog {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            z-index: 9999 !important;
          }
          
          /* Make sure the dialog content is visible */
          .wallet-safe-dialog-content {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            transform: translate(-50%, -50%) scale(1) !important;
          }
          
          /* Ensure the backdrop works */
          [data-state="open"]::before {
            opacity: 0.7 !important;
            visibility: visible !important;
          }
        `;
        document.head.appendChild(style);
      }
      
      // Force the dialog to be visible after a small delay
      const forceVisibility = () => {
        // Find and force all our dialog elements to be visible
        const dialogs = document.querySelectorAll('[role="dialog"]');
        dialogs.forEach(dialog => {
          dialog.classList.add('wallet-safe-dialog');
          dialog.setAttribute('data-state', 'open');
          
          // Also make the dialog content visible
          const content = dialog.querySelector('[role="dialog"] > div');
          if (content) {
            content.classList.add('wallet-safe-dialog-content');
          }
        });
      };
      
      // Run immediately and after a delay to catch any timing issues
      forceVisibility();
      const timer = setTimeout(forceVisibility, 100);
      const timer2 = setTimeout(forceVisibility, 500);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      {children}
    </Dialog>
  );
}