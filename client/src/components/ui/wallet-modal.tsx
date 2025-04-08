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
import { Copy, ExternalLink } from 'lucide-react';
import { shortenAddress } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SolanaQRCode } from '@/components/ui/solana-qr-code';
import { ManualConnect } from '@/components/ui/manual-connect';
import { Web3AuthButton } from '@/components/Web3AuthButton';

// Direct Connect Component specifically for Phantom using their v1 connection protocol
function PhantomDirectConnect() {
  const connectWithPhantomV1 = () => {
    // Generate a unique session ID and nonce
    const sessionId = Math.random().toString(36).substring(2, 15);
    const nonce = Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Build the correct Phantom connection URL according to their docs
    const PHANTOM_CONNECT_URL = new URL('https://phantom.app/ul/v1/connect');
    PHANTOM_CONNECT_URL.searchParams.append('app_url', window.location.origin);
    PHANTOM_CONNECT_URL.searchParams.append('redirect_link', window.location.href);
    PHANTOM_CONNECT_URL.searchParams.append('dapp_encryption_public_key', 'BFnMU9BXmcfMPr4t9e4NpeNYTmAnKDK3VjMSnFS8vCHReT9FpT2NzGzU4JfMQDleNGER1dyxRUtw1PU8zLYHgxg');
    PHANTOM_CONNECT_URL.searchParams.append('nonce', nonce);
    PHANTOM_CONNECT_URL.searchParams.append('session_id', sessionId);
    PHANTOM_CONNECT_URL.searchParams.append('cluster', 'mainnet-beta');
    
    console.log("Opening Phantom direct connect URL:", PHANTOM_CONNECT_URL.toString());
    window.open(PHANTOM_CONNECT_URL.toString(), '_blank');
  };
  
  return (
    <div className="space-y-2 mt-3">
      <p className="text-sm text-muted-foreground">
        Connect directly using Phantom's official connection protocol:
      </p>
      <Button
        onClick={connectWithPhantomV1}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center justify-center"
      >
        Open Phantom Connect <ExternalLink className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

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
                    
                    <div className="border-t border-border pt-3 mt-4">
                      <PhantomDirectConnect />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="manual" className="mt-4">
                  <ManualConnect />
                </TabsContent>
                
                <TabsContent value="mobile" className="mt-2">
                  <Tabs defaultValue="phantom" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="phantom">Phantom</TabsTrigger>
                      <TabsTrigger value="solflare">Solflare</TabsTrigger>
                      <TabsTrigger value="direct">Direct</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="phantom" className="mt-2">
                      <SolanaQRCode walletType="phantom" />
                    </TabsContent>
                    
                    <TabsContent value="solflare" className="mt-2">
                      <SolanaQRCode walletType="solflare" />
                    </TabsContent>
                    
                    <TabsContent value="direct" className="mt-2">
                      <div className="p-4 border border-border rounded-lg bg-card">
                        <h3 className="text-lg font-medium mb-3">Direct Connect</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Connect directly to your mobile wallet using Phantom's official protocol.
                          This method works on all devices where Phantom is installed.
                        </p>
                        <PhantomDirectConnect />
                      </div>
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