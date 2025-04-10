import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// Modified function with additional safety checks
const openModal = () => {
  try {
    // First try to use the official API if available
    const walletModalElements = document.querySelectorAll('[data-rk][role="dialog"]');
    if (walletModalElements.length === 0) {
      // Use the adapter's built-in button
      const walletButton = document.querySelector('.wallet-adapter-button-trigger');
      if (walletButton && walletButton instanceof HTMLElement) {
        console.log("Triggering wallet adapter button click");
        walletButton.click();
      } else {
        // As a fallback, try to find any wallet connect button
        const anyWalletButton = document.querySelector('[aria-label*="wallet"], [class*="wallet-button"], [id*="wallet-button"]');
        if (anyWalletButton && anyWalletButton instanceof HTMLElement) {
          console.log("Triggering alternative wallet button click");
          anyWalletButton.click();
        } else {
          // Last resort - create and trigger a custom event
          console.log("Using custom wallet connect event");
          window.dispatchEvent(new CustomEvent('wallet-adapter-open-modal'));
          
          // Also attempt to set the wallet modal visible flag directly
          try {
            // @ts-ignore - Access internal state
            if (window.__WALLET_MODAL_STATE_SETTER) {
              // @ts-ignore
              window.__WALLET_MODAL_STATE_SETTER(true);
            }
          } catch (e) {
            console.warn("Failed to set wallet modal state directly");
          }
        }
      }
    } else {
      console.log("Wallet modal already open");
    }
  } catch (error) {
    console.error("Error opening wallet modal:", error);
  }
};

// Directly use the useWalletModal hook to get its state setter
export function useOpenWalletModal() {
  const { setVisible } = useWalletModal();
  
  // Expose the state setter in the window for emergency recovery
  try {
    // @ts-ignore - Adding a debugging helper
    window.__WALLET_MODAL_STATE_SETTER = setVisible;
  } catch (e) {}
  
  // Return a more robust function that tries multiple methods
  return () => {
    try {
      // First try to use the official API
      setVisible(true);
      
      // Also trigger the DOM-based method as a backup
      setTimeout(openModal, 50);
    } catch (e) {
      console.error("Error in useOpenWalletModal:", e);
      // Fall back to DOM method
      openModal();
    }
  };
}

// For direct imports
export const openWalletModal = openModal;