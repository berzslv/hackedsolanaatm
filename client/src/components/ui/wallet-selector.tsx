import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSolana, WalletType } from '@/context/SolanaContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

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

// QR Code component for mobile wallet connections
const PhantomQRCode = () => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const appName = 'HackedATM';
  const redirectUrl = window.location.origin;
  
  useEffect(() => {
    const generateQR = async () => {
      try {
        // Using the official Phantom deep link format from docs
        const baseUrl = 'https://phantom.app/ul/v1/connect';
        const params = new URLSearchParams({
          app: appName,
          redirect: redirectUrl,
          cluster: 'testnet' // Explicitly using testnet
        });
        const phantomUrl = `${baseUrl}?${params.toString()}`;
        
        // Dynamic import of QRCode to avoid SSR issues
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(phantomUrl, {
          color: {
            dark: '#ffffff', // White QR code
            light: '#111111'  // Dark background
          },
          width: 240,
          margin: 1
        });
        
        setQrDataUrl(dataUrl);
        setLoading(false);
      } catch (err) {
        console.error("Error generating QR code:", err);
        setLoading(false);
      }
    };
    
    generateQR();
  }, []);
  
  return (
    <div className="flex flex-col items-center my-4">
      <h3 className="text-lg font-semibold mb-4">Scan with Phantom App</h3>
      
      <div className="bg-card rounded-lg p-4 mb-4 border border-border">
        {loading ? (
          <div className="w-[240px] h-[240px] flex items-center justify-center">
            <p>Generating QR code...</p>
          </div>
        ) : (
          qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="Phantom connection QR code" 
              className="w-[240px] h-[240px]"
            />
          ) : (
            <div className="w-[240px] h-[240px] flex items-center justify-center">
              <p>Failed to generate QR code</p>
            </div>
          )
        )}
      </div>
      
      <p className="text-sm text-center mb-3 text-muted-foreground">
        Open the Phantom app, tap the scan button, and scan this QR code to connect
      </p>
    </div>
  );
};

export function WalletSelector() {
  const { showWalletSelector, setShowWalletSelector, connectWallet } = useSolana();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(isMobile ? 'direct' : 'direct');

  const handleWalletClick = (type: WalletType) => {
    connectWallet(type);
  };

  return (
    <Dialog open={showWalletSelector} onOpenChange={setShowWalletSelector}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Connect a Wallet</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Choose how you want to connect
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Direct Connect</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct" className="mt-2">
            <div className="grid gap-4 py-2">
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
          </TabsContent>
          
          <TabsContent value="qr" className="mt-2">
            <PhantomQRCode />
          </TabsContent>
        </Tabs>
        
        <div className="text-center text-xs text-muted-foreground">
          <p>
            By connecting a wallet, you agree to the Terms of Service and acknowledge that you have read and understand the protocol disclaimer.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}