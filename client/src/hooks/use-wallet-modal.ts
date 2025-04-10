import { useWalletModal } from '@solana/wallet-adapter-react-ui';

// This function directly opens the wallet adapter modal
const openModal = () => {
  try {
    // Find and click the wallet connect button
    const walletButton = document.querySelector('.wallet-adapter-button-trigger');
    if (walletButton && walletButton instanceof HTMLElement) {
      walletButton.click();
    } else {
      console.warn("Could not find wallet button to click");
    }
  } catch (error) {
    console.error("Error opening wallet modal:", error);
  }
};

// Main export - for backward compatibility, this is a function that can be called directly
export function useOpenWalletModal() {
  // Return the function for backward compatibility
  return openModal;
}

// For places that try to directly import the open function
export const openWalletModal = openModal;