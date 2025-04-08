import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface SolanaQRCodeProps {
  walletType?: 'phantom' | 'solflare';
}

export function SolanaQRCode({ walletType = 'phantom' }: SolanaQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Mobile deep link for direct app open
  const openMobileApp = () => {
    const currentUrl = window.location.href;
    
    // Create a Solana Pay format link that works with all wallets
    const encodedUrl = btoa(currentUrl);
    const solanaPayLink = `solana:${encodedUrl}`;
    
    // Create specific wallet links as fallbacks
    let specificWalletLink = '';
    if (walletType === 'phantom') {
      // Try both direct protocol and universal link for Phantom
      specificWalletLink = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}`;
    } else if (walletType === 'solflare') {
      // Try Solflare universal link
      specificWalletLink = `https://solflare.com/ul/browse/${encodeURIComponent(currentUrl)}`;
    }
    
    // First try the Solana Pay format link
    console.log(`Opening Solana Pay link: ${solanaPayLink}`);
    window.location.href = solanaPayLink;
    
    // Set a timeout to try the specific wallet link if Solana Pay doesn't work
    setTimeout(() => {
      if (specificWalletLink) {
        console.log(`Trying specific wallet link: ${specificWalletLink}`);
        window.location.href = specificWalletLink;
      }
    }, 1000);
  };
  
  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        
        // Get current page URL
        const currentUrl = window.location.href;
        // Get app name
        const appName = 'HackedATM';
        
        // Generate connection-specific deep link for wallet
        // Use Solana Pay format which is recognized by all Solana wallets
        // solana:<BASE64_ENCODED_URL>
        const encodedUrl = btoa(currentUrl);
        const deepLink = `solana:${encodedUrl}`;
        console.log("Generated Solana Pay QR code link:", deepLink);
        
        // Generate QR code for the deep link
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(deepLink, {
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
              alt={`${walletType} wallet QR code`} 
              className="w-[200px] h-[200px]"
            />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <p>Failed to generate QR code</p>
            </div>
          )
        )}
      </div>
      
      <p className="text-sm text-center text-muted-foreground px-4 mb-4">
        Open the {walletType === 'phantom' ? 'Phantom' : 'Solflare'} app and scan this QR code to connect
      </p>
      
      <Button 
        onClick={openMobileApp}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
      >
        Open {walletType === 'phantom' ? 'Phantom' : 'Solflare'} App
      </Button>
    </div>
  );
}