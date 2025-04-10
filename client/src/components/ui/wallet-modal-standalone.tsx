import React from 'react';
import { WalletModal } from './wallet-modal';
import { useOpenWalletModal } from '@/hooks/use-wallet-modal';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

/**
 * A standalone version of the WalletModal that manages its own open state
 * This is a convenient wrapper to use in the Layout without needing to pass props
 */
export const WalletModalStandalone: React.FC = () => {
  // Get the wallet adapter modal state directly to avoid any issues
  const { visible: isOpen, setVisible } = useWalletModal();
  
  // Create a handler to close the modal
  const handleClose = () => {
    setVisible(false);
  };
  
  return (
    <WalletModal 
      isOpen={isOpen} 
      onClose={handleClose} 
    />
  );
};

export default WalletModalStandalone;