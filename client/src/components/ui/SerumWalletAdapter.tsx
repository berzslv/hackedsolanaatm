import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Connection } from '@solana/web3.js';
import { useIsMobile } from '@/hooks/use-mobile';

// Network connection
const network = "https://api.mainnet-beta.solana.com";
const connection = new Connection(network);

// Interface for window with wallet providers
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        on: (event: string, callback: (args: any) => void) => void;
        signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      }
    };
    solflare?: {
      isConnected: boolean;
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      on: (event: string, callback: (args: any) => void) => void;
      signMessage?: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
    };
  }
}

// Wallet providers with detection functions
const WALLET_PROVIDERS = [
  { 
    name: 'Phantom', 
    icon: 'ri-ghost-line',
    url: 'https://phantom.app',
    installUrl: 'https://phantom.app',
    mobileUrl: 'https://phantom.app/ul/browse/',
    isInstalled: () => !!window.phantom?.solana?.isPhantom,
    connect: async () => {
      if (!window.phantom?.solana) {
        throw new Error('Phantom wallet not installed');
      }
      const resp = await window.phantom.solana.connect();
      return resp.publicKey.toString();
    },
    disconnect: async () => {
      if (window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }
    }
  },
  { 
    name: 'Solflare', 
    icon: 'ri-sun-line',
    url: 'https://solflare.com',
    installUrl: 'https://solflare.com',
    mobileUrl: 'https://solflare.com/ul/browse/',
    isInstalled: () => !!window.solflare,
    connect: async () => {
      if (!window.solflare) {
        throw new Error('Solflare wallet not installed');
      }
      await window.solflare.connect();
      // This assumes solflare returns a publicKey property after connection
      return window.solflare.publicKey?.toString() || 'unknown';
    },
    disconnect: async () => {
      if (window.solflare) {
        await window.solflare.disconnect();
      }
    }
  }
];

export function SerumWalletAdapter() {
  const [connected, setConnected] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Get installed wallets
  const getInstalledWallets = useCallback(() => {
    return WALLET_PROVIDERS.filter(provider => provider.isInstalled());
  }, []);
  
  // Check if any wallets are already installed
  const hasInstalledWallets = getInstalledWallets().length > 0;

  // Connect to a wallet
  const connectWallet = useCallback(async (providerName: string) => {
    try {
      setConnecting(true);
      
      // Find provider
      const provider = WALLET_PROVIDERS.find(p => p.name === providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }
      
      if (provider.isInstalled()) {
        // Connect to installed wallet
        const publicKeyStr = await provider.connect();
        setPublicKey(publicKeyStr);
        setConnected(true);
        setCurrentProvider(providerName);
        setShowDialog(false);
        toast({
          title: 'Connected',
          description: `Successfully connected to ${providerName}`,
        });
      } else {
        // Handle case where wallet is not installed
        if (isMobile) {
          // On mobile, try to open wallet app using deep linking
          window.location.href = provider.mobileUrl;
          toast({
            description: `Opening ${providerName} app...`,
          });
        } else {
          // On desktop, open installation page in new tab
          window.open(provider.installUrl, '_blank');
          toast({
            description: `Please install ${providerName} to continue`,
          });
        }
      }
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
  }, [toast, isMobile]);

  // Disconnect from the wallet
  const disconnectWallet = useCallback(async () => {
    if (!currentProvider) return;
    
    try {
      const provider = WALLET_PROVIDERS.find(p => p.name === currentProvider);
      if (provider) {
        await provider.disconnect();
        setConnected(false);
        setPublicKey(null);
        setCurrentProvider(null);
        toast({
          description: 'Wallet disconnected',
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: 'Disconnect Failed',
        description: 'Could not disconnect from wallet',
        variant: 'destructive'
      });
    }
  }, [currentProvider, toast]);

  // Simplified approach: don't auto-connect on load
  // This prevents unwanted popup dialogs on page load
  // User needs to explicitly connect by clicking the Connect Wallet button
  useEffect(() => {
    // Check if any wallets are installed
    const installedWallets = getInstalledWallets();
    console.log('Detected wallets:', installedWallets.map(w => w.name).join(', '));
    
    // We could auto-connect here, but it's generally better UX to let 
    // the user explicitly connect by clicking the button
  }, [getInstalledWallets]);

  return (
    <>
      {connected ? (
        <Button 
          onClick={disconnectWallet}
          variant="destructive"
          className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
        >
          Disconnect {currentProvider && `(${shortenAddress(publicKey || '')})`}
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
            {WALLET_PROVIDERS.map((provider) => {
              const isInstalled = provider.isInstalled();
              return (
                <Button
                  key={provider.name}
                  onClick={() => connectWallet(provider.name)}
                  disabled={connecting}
                  className="flex justify-start items-center gap-3 h-12"
                  variant="outline"
                >
                  <i className={`${provider.icon} text-xl`}></i>
                  <span className="flex-1 text-left">{provider.name}</span>
                  {isInstalled ? (
                    <span className="text-xs text-green-500 ml-auto">Detected</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {isMobile ? 'Open App' : 'Install'}
                    </span>
                  )}
                  {connecting && <span className="ml-2 animate-spin">⟳</span>}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to shorten addresses
function shortenAddress(address: string): string {
  if (!address) return '';
  return address.slice(0, 4) + '...' + address.slice(-4);
}