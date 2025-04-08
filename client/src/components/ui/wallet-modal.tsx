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
import { Web3AuthButton } from '@/components/Web3AuthButton';

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
              <p className="text-sm text-muted-foreground mb-4">
                To interact with the Hacked ATM Token platform, please connect your Solana wallet.
              </p>
              
              <Tabs defaultValue="wallets" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="wallets">Wallets</TabsTrigger>
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="mobile">QR Codes</TabsTrigger>
                  <TabsTrigger value="web3auth">Web3Auth</TabsTrigger>
                </TabsList>
                
                <TabsContent value="wallets" className="mt-4">
                  <div className="space-y-3">
                    <div className="mb-2 px-1 text-sm text-muted-foreground">
                      Connect with browser extension wallets
                    </div>
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={handleConnect}
                    >
                      Connect with Phantom
                    </Button>
                    <Button 
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      onClick={() => {
                        // First check if Solflare is available and connect
                        // @ts-ignore - Solflare wallet may be injected
                        if (window.solflare && window.solflare.isSolflare) {
                          // @ts-ignore
                          window.solflare.connect();
                        } else {
                          window.open('https://solflare.com/', '_blank');
                        }
                      }}
                    >
                      Connect with Solflare
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="manual" className="mt-4">
                  <div className="space-y-3">
                    <div className="mb-2 px-1 text-sm text-muted-foreground">
                      Enter your Solana wallet address manually
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Enter your Solana address (e.g., 4Zw...7Gn)" 
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      
                      <Button 
                        className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        onClick={() => {
                          alert("This is a demo feature. In a real app, this would validate and import your address for view-only mode.");
                        }}
                      >
                        Continue in View-Only Mode
                      </Button>
                      
                      <p className="mt-2 text-xs text-muted-foreground">
                        Note: View-only mode lets you browse but not transact. For full functionality, use a wallet app.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="mobile" className="mt-2">
                  <Tabs defaultValue="phantom" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="phantom">Phantom</TabsTrigger>
                      <TabsTrigger value="solflare">Solflare</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="phantom" className="mt-2">
                      <SolanaQRCode walletType="phantom" />
                    </TabsContent>
                    
                    <TabsContent value="solflare" className="mt-2">
                      <SolanaQRCode walletType="solflare" />
                    </TabsContent>
                  </Tabs>
                </TabsContent>
                
                <TabsContent value="web3auth" className="mt-4">
                  <div className="mb-2 px-1 text-sm text-muted-foreground">
                    Email/social login with Solana wallet support
                  </div>
                  <Web3AuthButton />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}