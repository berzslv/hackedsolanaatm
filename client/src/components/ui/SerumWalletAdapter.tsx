import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Connection } from '@solana/web3.js';
import { useIsMobile } from '@/hooks/use-mobile';
import QRCode from 'qrcode';

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

// Wallet providers configuration with connection methods for different environments
const WALLET_PROVIDERS = [
  { 
    name: 'Phantom', 
    icon: 'ri-ghost-line',
    description: 'Connect to Phantom Wallet',
    url: 'https://phantom.app',
    installUrl: 'https://phantom.app',
    // Direct deep links for mobile app
    mobileLink: 'phantom://browse', 
    // Universal links format for supported browsers
    universalLink: 'https://phantom.app/ul/browse',
    // For desktop detection
    isInstalled: () => !!window.phantom?.solana?.isPhantom,
    // For desktop connection
    connect: async () => {
      if (!window.phantom?.solana) {
        throw new Error('Phantom wallet not installed');
      }
      const resp = await window.phantom.solana.connect();
      return resp.publicKey.toString();
    },
    // For desktop disconnection
    disconnect: async () => {
      if (window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }
    }
  },
  { 
    name: 'Solflare', 
    icon: 'ri-sun-line',
    description: 'Connect to Solflare Wallet',
    url: 'https://solflare.com',
    installUrl: 'https://solflare.com',
    // Direct deep links for mobile app
    mobileLink: 'solflare://browse',
    // Universal links format for supported browsers
    universalLink: 'https://solflare.com/ul/browse',
    // For desktop detection
    isInstalled: () => !!window.solflare,
    // For desktop connection
    connect: async () => {
      if (!window.solflare) {
        throw new Error('Solflare wallet not installed');
      }
      await window.solflare.connect();
      return window.solflare.publicKey?.toString() || 'unknown';
    },
    // For desktop disconnection
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
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Get installed wallets
  const getInstalledWallets = useCallback(() => {
    return WALLET_PROVIDERS.filter(provider => provider.isInstalled());
  }, []);
  
  // Check if any wallets are already installed
  const hasInstalledWallets = getInstalledWallets().length > 0;
  
  // Generate QR code for wallet connection
  const generateQRCode = useCallback(async (data: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        color: {
          dark: '#1a1a1a',
          light: '#ffffff',
        },
        width: 200,
        margin: 1,
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }, []);

  // Connect to a wallet
  const connectWallet = useCallback(async (providerName: string) => {
    try {
      setConnecting(true);
      setSelectedWallet(providerName);
      
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
          const mobileDeepLink = provider.mobileLink || `${provider.name.toLowerCase()}://`;
          // Attempt to open the wallet app
          window.location.href = mobileDeepLink;
          toast({
            description: `Opening ${providerName} app...`,
          });
        } else {
          // For desktop without extension, show QR code for mobile scanning
          const qrCodeUrl = await generateQRCode(provider.universalLink);
          if (qrCodeUrl) {
            setQrCode(qrCodeUrl);
          } else {
            // Fallback to opening installation page in new tab
            window.open(provider.installUrl, '_blank');
            toast({
              description: `Please install ${providerName} to continue`,
            });
          }
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
  }, [toast, isMobile, generateQRCode]);

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

  // Reset QR code and selected wallet when dialog closes
  useEffect(() => {
    if (!showDialog) {
      setQrCode(null);
      setSelectedWallet(null);
    }
  }, [showDialog]);

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
            <DialogDescription>
              {qrCode ? "Scan with your mobile wallet" : "Choose your wallet"}
            </DialogDescription>
          </DialogHeader>
          
          {qrCode ? (
            // QR Code view - shown when a wallet is selected but not installed
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="relative rounded-lg overflow-hidden border border-border p-2 bg-white">
                <img src={qrCode} alt="QR Code" width={200} height={200} />
              </div>
              <div className="text-sm text-center text-muted-foreground">
                Scan this QR code with your {selectedWallet} wallet app
              </div>
              <Button 
                onClick={() => setQrCode(null)} 
                variant="outline"
                className="mt-2"
              >
                Back to wallet selection
              </Button>
            </div>
          ) : (
            // Wallet selection view
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
                        {isMobile ? 'Open App' : 'Scan QR'}
                      </span>
                    )}
                    {connecting && selectedWallet === provider.name && (
                      <span className="ml-2 animate-spin">⟳</span>
                    )}
                  </Button>
                );
              })}
              
              {/* Explainer text for mobile users */}
              {isMobile && (
                <div className="text-xs text-muted-foreground mt-2 p-2 border border-border rounded-md bg-background/50">
                  <p className="font-medium mb-1">Having trouble?</p>
                  <p>Make sure you have the wallet app installed. When you click a wallet, 
                  it will attempt to open the app. You may need to approve connection requests.</p>
                </div>
              )}
              
              {/* Explainer text for desktop users */}
              {!isMobile && !hasInstalledWallets && (
                <div className="text-xs text-muted-foreground mt-2 p-2 border border-border rounded-md bg-background/50">
                  <p className="font-medium mb-1">No wallet extensions detected</p>
                  <p>Select a wallet to see a QR code you can scan with your mobile device, 
                  or install a browser extension.</p>
                </div>
              )}
            </div>
          )}
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