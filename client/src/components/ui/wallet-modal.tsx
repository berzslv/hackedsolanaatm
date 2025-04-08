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
import { PhantomConnector } from '@/components/ui/phantom-connector';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  // Get the full context including internal setter methods 
  const solanaContext = useSolana();
  const { connected, publicKey, balance, connectWallet, disconnectWallet } = solanaContext;
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
    await connectWallet();
    // Don't close modal yet, user will need to confirm in Phantom
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
              
              <div className="flex flex-col gap-3">
                {/* Use our direct connector instead of the contextual one */}
                <div className="mb-4 text-sm text-center text-muted-foreground">
                  Connect directly with Phantom wallet for more reliable connection
                </div>
                
                <PhantomConnector 
                  onConnect={(pubKeyString: string) => {
                    try {
                      // Import the PublicKey class from @solana/web3.js
                      const { PublicKey } = require('@solana/web3.js');
                      
                      // Create a PublicKey object from the string
                      const solanaPublicKey = new PublicKey(pubKeyString);
                      
                      // Get the provider from window.solana or window.phantom.solana
                      let provider = null;
                      if ('phantom' in window) {
                        // @ts-ignore
                        provider = window.phantom?.solana;
                      }
                      if (!provider && 'solana' in window) {
                        // @ts-ignore
                        provider = window.solana;
                      }
                      
                      // Use the connect method from SolanaContext
                      connectWallet('phantom')
                        .then(() => {
                          console.log("Successfully connected via wallet modal direct connector");
                          onClose();
                        })
                        .catch(error => {
                          console.error("Error in connectWallet:", error);
                        });
                    } catch (e) {
                      console.error("Error in PhantomConnector callback:", e);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}