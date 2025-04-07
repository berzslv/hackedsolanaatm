import React from 'react';
import { Button } from '@/components/ui/button';
import { useSolana } from '@/context/SolanaContext';
import { shortenAddress } from '@/lib/utils';

interface WalletButtonProps {
  onClick?: () => void;
}

export function WalletButton({ onClick }: WalletButtonProps) {
  const { connected, publicKey, connectWallet, disconnectWallet } = useSolana();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (connected) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  };

  return (
    <Button
      onClick={handleClick}
      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
    >
      {connected && publicKey
        ? `Connected: ${shortenAddress(publicKey.toString())}`
        : 'Connect Wallet'}
    </Button>
  );
}