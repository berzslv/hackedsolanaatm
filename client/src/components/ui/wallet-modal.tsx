import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSolana } from '@/context/SolanaContext';
import { Copy } from 'lucide-react';
import { shortenAddress } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SolanaQRCode } from '@/components/ui/solana-qr-code';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  // Get the wallet context 
  const solanaContext = useSolana();
  const { connected, publicKey, balance, disconnectWallet } = solanaContext;
  
  // Access the wallet connection function
  const connectWallet = async () => {
    try {
      // This is just a stub since we're using a different approach
      console.log("Initiating wallet connection process");
      return true;
    } catch (e) {
      console.error("Connection error:", e);
      return false;
    }
  };
  const [copied, setCopied] = useState(false);
  
  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
    onClose();
  };
  
  const handleConnect = async () => {
    // Set a global flag to help with reconnection tracking
    // @ts-ignore - Adding a custom property to window
    window.__lastWalletConnectionAttempt = Date.now();
    
    try {
      // Close and reopen any existing wallet modal first
      const existingModal = document.querySelector('.wallet-adapter-modal');
      if (existingModal && existingModal instanceof HTMLElement) {
        // Find and click the close button if present
        const closeButton = existingModal.querySelector('.wallet-adapter-modal-button-close');
        if (closeButton && closeButton instanceof HTMLElement) {
          closeButton.click();
          // Small delay before reconnecting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Create and click a temporary button to force wallet reconnection
      const tempButton = document.createElement('button');
      tempButton.style.display = 'none';
      tempButton.setAttribute('data-rk', 'wallet-connect-button');
      document.body.appendChild(tempButton);
      tempButton.click();
      document.body.removeChild(tempButton);
      
      // Attempt the regular connect function after a small delay
      setTimeout(async () => {
        try {
          await connectWallet();
          console.log('Secondary connect attempt completed');
        } catch (err) {
          console.warn('Error in delayed connect:', err);
        }
      }, 300);
      
      console.log('Triggered multi-level wallet connection');
    } catch (err) {
      console.error('Error in connection process:', err);
      // Fallback to standard connection
      try {
        await connectWallet();
      } catch (innerErr) {
        console.error('Fallback connection also failed:', innerErr);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {connected ? 'Wallet Connected' : 'Connect Wallet'}
          </DialogTitle>
          <DialogDescription>
            {connected
              ? 'Your Solana wallet is connected to Hacked ATM Token'
              : 'Connect your Solana wallet to interact with Hacked ATM Token'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {connected && publicKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Wallet Address</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2" 
                    onClick={handleCopyAddress}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="font-mono text-sm break-all">{publicKey.toString()}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  (or {shortenAddress(publicKey.toString())})
                </p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SOL Balance</span>
                </div>
                <p className="text-xl font-semibold">{balance.toFixed(4)} SOL</p>
                <p className="mt-1 text-sm text-muted-foreground">on Solana Mainnet</p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To interact with the Hacked ATM Token platform, please connect your Solana wallet.
                If you don't have a wallet yet, we recommend using Phantom.
              </p>
              
              <Tabs defaultValue="browser" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="browser">Browser</TabsTrigger>
                  <TabsTrigger value="mobile">Mobile QR</TabsTrigger>
                </TabsList>
                
                <TabsContent value="browser" className="mt-4">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleConnect}
                  >
                    Connect with Phantom
                  </Button>
                </TabsContent>
                
                <TabsContent value="mobile" className="mt-2">
                  <SolanaQRCode walletType="phantom" />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}