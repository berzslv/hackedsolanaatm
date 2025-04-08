import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileConnectProps {
  onClose?: () => void;
}

export function MobileConnect({ onClose }: MobileConnectProps) {
  const isMobile = useIsMobile();
  
  // Define the connection parameters for Phantom
  const buildPhantomConnectURL = () => {
    const currentURL = window.location.href;
    const appName = 'HackedATM';
    
    // Build the connection URL using Phantom's deep link format
    // This will open Phantom and request connection with a redirect back
    const connectionParams = new URLSearchParams({
      app: appName,
      redirect: currentURL,
      cluster: 'mainnet-beta'
    }).toString();
    
    return `https://phantom.app/ul/v1/connect?${connectionParams}`;
  };

  // Open directly on mobile, or show QR code on desktop
  const handleConnectPhantom = () => {
    const connectURL = buildPhantomConnectURL();
    
    if (isMobile) {
      // Try both universal link and app URL scheme for best mobile compatibility
      window.location.href = connectURL;
      
      // Fallback to direct protocol if universal link fails 
      setTimeout(() => {
        const deepLink = connectURL.replace('https://phantom.app/ul/v1/connect', 'phantom://v1/connect');
        window.location.href = deepLink;
      }, 1000);
    } else {
      // For desktop - open instructions to scan QR code
      window.open(connectURL, '_blank');
    }
    
    if (onClose) onClose();
  };
  
  // Handle Solflare connection  
  const handleConnectSolflare = () => {
    const currentURL = window.location.href;
    const appName = 'HackedATM';
    
    // Solflare uses a different connection format
    const solflareURL = `https://solflare.com/ul/v1/connect?app=${encodeURIComponent(appName)}&redirect=${encodeURIComponent(currentURL)}`;
    
    if (isMobile) {
      window.location.href = solflareURL;
      
      // Fallback to direct protocol
      setTimeout(() => {
        window.location.href = solflareURL.replace('https://solflare.com/ul', 'solflare://');
      }, 1000);
    } else {
      window.open(solflareURL, '_blank');
    }
    
    if (onClose) onClose();
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-center mb-4">Connect Mobile Wallet</h2>
      
      <p className="text-sm text-muted-foreground mb-4 text-center">
        Connect with your mobile wallet and return to this browser
      </p>
      
      <div className="grid gap-3">
        <Button
          onClick={handleConnectPhantom}
          className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
        >
          <i className="ri-ghost-line mr-2"></i>
          Connect with Phantom
        </Button>
        
        <Button
          onClick={handleConnectSolflare}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
        >
          <i className="ri-sun-line mr-2"></i>
          Connect with Solflare
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground mt-4">
        You'll be redirected to your wallet app to approve the connection,
        then returned to this page.
      </p>
    </div>
  );
}