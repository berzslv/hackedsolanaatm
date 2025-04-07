import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSolana, WalletType } from '@/context/SolanaContext';

const walletInfo = {
  phantom: {
    name: 'Phantom',
    icon: 'ri-ghost-line',
    color: 'bg-indigo-500',
  },
  solflare: {
    name: 'Solflare',
    icon: 'ri-sun-line',
    color: 'bg-orange-500',
  },
  slope: {
    name: 'Slope',
    icon: 'ri-bar-chart-line',
    color: 'bg-green-500',
  },
  sollet: {
    name: 'Sollet',
    icon: 'ri-wallet-3-line',
    color: 'bg-blue-500',
  },
  math: {
    name: 'Math Wallet',
    icon: 'ri-calculator-line',
    color: 'bg-purple-500',
  },
  coin98: {
    name: 'Coin98',
    icon: 'ri-coin-line',
    color: 'bg-yellow-500',
  },
};

export function WalletSelector() {
  const { showWalletSelector, setShowWalletSelector, connectWallet } = useSolana();

  const handleWalletClick = (type: WalletType) => {
    connectWallet(type);
  };

  return (
    <Dialog open={showWalletSelector} onOpenChange={setShowWalletSelector}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Connect a Wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {(Object.keys(walletInfo) as WalletType[]).map((wallet) => (
            <Button
              key={wallet}
              variant="outline"
              className="flex justify-between items-center p-4 hover:bg-muted"
              onClick={() => handleWalletClick(wallet)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${walletInfo[wallet].color} flex items-center justify-center text-white`}>
                  <i className={walletInfo[wallet].icon}></i>
                </div>
                <span className="font-medium">{walletInfo[wallet].name}</span>
              </div>
              <i className="ri-arrow-right-line"></i>
            </Button>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By connecting a wallet, you agree to the Terms of Service and acknowledge that you have read and understand the protocol disclaimer.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}