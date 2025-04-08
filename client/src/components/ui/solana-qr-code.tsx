import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

interface SolanaQRCodeProps {
  walletType?: 'phantom' | 'solflare';
}

export function SolanaQRCode({ walletType = 'phantom' }: SolanaQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Get wallet download URLs
  const getWalletUrls = (): {download: string, app: string} => {
    if (walletType === 'phantom') {
      return {
        download: 'https://phantom.app/download',
        app: 'https://phantom.app/',
      };
    } else {
      return {
        download: 'https://solflare.com/download',
        app: 'https://solflare.com/',
      };
    }
  };
  
  const urls = getWalletUrls();
  
  const handleCopyAddress = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Mobile deep link for direct app open
  const openDownloadPage = () => {
    window.open(urls.download, '_blank');
  };
  
  const openWalletApp = () => {
    window.open(urls.app, '_blank');
  };
  
  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        
        // Get current page URL - we'll just show this directly
        const currentUrl = window.location.href;
        
        // Generate QR code for the website URL directly
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(currentUrl, {
          color: {
            dark: '#ffffff',  // White foreground
            light: '#111111'  // Dark background
          },
          width: 200,
          margin: 2
        });
        
        setQrDataUrl(dataUrl);
        setLoading(false);
      } catch (err) {
        console.error("Error generating QR code:", err);
        setLoading(false);
      }
    };
    
    generateQR();
  }, [walletType]);
  
  return (
    <div className="flex flex-col items-center py-4">
      <h3 className="text-lg font-medium mb-2">Connect with {walletType === 'phantom' ? 'Phantom' : 'Solflare'}</h3>
      
      <div className="bg-card rounded-lg p-4 mb-2 border border-border">
        {loading ? (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            <p>Generating QR code...</p>
          </div>
        ) : (
          qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt={`QR code for current URL`} 
              className="w-[200px] h-[200px]"
            />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <p>Failed to generate QR code</p>
            </div>
          )
        )}
      </div>
      
      <div className="w-full space-y-3 mb-2">
        <p className="text-sm text-center text-muted-foreground px-4">
          1. Open {walletType === 'phantom' ? 'Phantom' : 'Solflare'} app manually
        </p>
        
        <p className="text-sm text-center text-muted-foreground px-4">
          2. Copy this URL and paste it in your wallet's dApp browser
        </p>
        
        <Button 
          onClick={handleCopyAddress}
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Copied!' : 'Copy URL to Clipboard'}
        </Button>
      </div>
      
      <div className="w-full grid grid-cols-2 gap-2 mt-2">
        <Button 
          onClick={openWalletApp}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          Open {walletType} Website
        </Button>
        
        <Button 
          onClick={openDownloadPage}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          Download {walletType}
        </Button>
      </div>
    </div>
  );
}