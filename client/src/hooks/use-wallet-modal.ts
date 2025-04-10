import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// This hook wraps the wallet adapter's useWalletModal to provide consistent behavior
export function useOpenWalletModal() {
  const { setVisible } = useWalletModal();
  
  // Return a function that safely opens the wallet modal
  return () => {
    try {
      setVisible(true);
    } catch (error) {
      console.error("Error opening wallet modal:", error);
      
      // Alternative approach using direct DOM interaction with the wallet button
      setTimeout(() => {
        const walletButton = document.querySelector('.wallet-adapter-button-trigger');
        if (walletButton && walletButton instanceof HTMLElement) {
          walletButton.click();
        } else {
          console.warn("Could not find wallet button to click");
        }
      }, 100);
    }
  };
}