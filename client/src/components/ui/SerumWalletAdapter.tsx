import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Wallet from '@project-serum/sol-wallet-adapter';
import { Connection } from '@solana/web3.js';

// Network connection
const network = "https://api.mainnet-beta.solana.com";
const connection = new Connection(network);

// Wallet providers
const WALLET_PROVIDERS = [
  { 
    name: 'Phantom', 
    url: 'https://phantom.app', 
    icon: 'ri-ghost-line',
    adapter: () => new Wallet('https://phantom.app', network) 
  },
  { 
    name: 'Solflare', 
    url: 'https://solflare.com',
    icon: 'ri-sun-line', 
    adapter: () => new Wallet('https://solflare.com', network)
  }
];

export function SerumWalletAdapter() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  // Connect wallet
  const connectWallet = useCallback(async (providerName: string) => {
    try {
      setConnecting(true);
      
      // Find provider
      const provider = WALLET_PROVIDERS.find(p => p.name === providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }
      
      // Create wallet adapter
      const walletAdapter = provider.adapter();
      setWallet(walletAdapter);
      
      // Handle connection events
      walletAdapter.on('connect', (publicKey) => {
        console.log('Connected to wallet:', publicKey.toBase58());
        setPublicKey(publicKey.toBase58());
        setConnected(true);
        setShowDialog(false);
        toast({
          title: 'Connected',
          description: `Successfully connected to ${providerName}`,
        });
      });
      
      walletAdapter.on('disconnect', () => {
        console.log('Disconnected from wallet');
        setConnected(false);
        setPublicKey(null);
        toast({
          description: 'Wallet disconnected',
        });
      });
      
      // Connect to wallet
      await walletAdapter.connect();
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        title: 'Connection Failed',
        description: `Could not connect to wallet. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
    }
  }, [toast]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (wallet && connected) {
      await wallet.disconnect();
    }
  }, [wallet, connected]);

  // Clean up event listeners
  useEffect(() => {
    return () => {
      if (wallet) {
        wallet.disconnect();
      }
    };
  }, [wallet]);

  return (
    <>
      {connected ? (
        <Button 
          onClick={disconnectWallet}
          variant="destructive"
          className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
        >
          Disconnect
        </Button>
      ) : (
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
        >
          Connect Wallet
        </Button>
      )}
      
      {/* Wallet selection dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {WALLET_PROVIDERS.map((provider) => (
              <Button
                key={provider.name}
                onClick={() => connectWallet(provider.name)}
                disabled={connecting}
                className="flex justify-start items-center gap-3 h-12"
                variant="outline"
              >
                <i className={`${provider.icon} text-xl`}></i>
                <span>{provider.name}</span>
                {connecting && <span className="ml-auto">Loading...</span>}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}