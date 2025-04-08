import React, { useState, useEffect } from 'react';

interface SolanaQRCodeProps {
  walletType?: 'phantom' | 'solflare';
}

export function SolanaQRCode({ walletType = 'phantom' }: SolanaQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        
        // Get current page URL
        const currentUrl = window.location.href;
        // Get app name
        const appName = 'HackedATM';
        
        // Generate connection-specific deep link for wallet
        let deepLink = '';
        if (walletType === 'phantom') {
          // Using Phantom's v1 connection protocol
          // Format: https://phantom.app/ul/v1/connect?app=YourAppName&redirect=YourAppURL&cluster=mainnet-beta
          deepLink = `https://phantom.app/ul/v1/connect?app=${encodeURIComponent(appName)}&redirect=${encodeURIComponent(currentUrl)}&cluster=mainnet-beta`;
          
          console.log("Generated Phantom QR code link:", deepLink);
        } else if (walletType === 'solflare') {
          // Using Solflare's dapp connection protocol
          deepLink = `https://solflare.com/ul/v1/connect?dapp=${encodeURIComponent(appName)}&redirect=${encodeURIComponent(currentUrl)}`;
          
          console.log("Generated Solflare QR code link:", deepLink);
        }
        
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
      <h3 className="text-lg font-medium mb-2">Scan with {walletType === 'phantom' ? 'Phantom' : 'Solflare'}</h3>
      
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
      
      <p className="text-sm text-center text-muted-foreground px-4">
        Open the {walletType === 'phantom' ? 'Phantom' : 'Solflare'} app and scan this QR code to connect
      </p>
    </div>
  );
}