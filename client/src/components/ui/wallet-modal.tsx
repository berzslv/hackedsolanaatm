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