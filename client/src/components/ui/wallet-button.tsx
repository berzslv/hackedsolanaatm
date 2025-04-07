import React from 'react';
import { Button } from '@/components/ui/button';
import { useSolana } from '@/context/SolanaContext';
import { shortenAddress } from '@/lib/utils';
import { WalletSelector } from './wallet-selector';

interface WalletButtonProps {
  onClick?: () => void;
  className?: string;
}

export function WalletButton({ onClick, className = '' }: WalletButtonProps) {
  const { connected, publicKey, openWalletSelector, disconnectWallet, walletType } = useSolana();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (connected) {
      disconnectWallet();
    } else {
      openWalletSelector();
    }
  };

  const getWalletIcon = () => {
    if (!walletType) return 'ri-wallet-3-line';
    
    const walletIcons = {
      phantom: 'ri-ghost-line',
      solflare: 'ri-sun-line',
      slope: 'ri-bar-chart-line',
      sollet: 'ri-wallet-3-line',
      math: 'ri-calculator-line',
      coin98: 'ri-coin-line'
    };
    
    return walletIcons[walletType] || 'ri-wallet-3-line';
  };

  return (
    <>
      <Button
        onClick={handleClick}
        className={`bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 ${className}`}
      >
        <i className={getWalletIcon()}></i>
        {connected && publicKey
          ? `${shortenAddress(publicKey.toString())}`
          : 'Connect Wallet'}
      </Button>
      
      <WalletSelector />
    </>
  );
}