import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

interface MobileConnectProps {
  onClose?: () => void;
}

export function MobileConnect({ onClose }: MobileConnectProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [isSolflareInstalled, setIsSolflareInstalled] = useState(false);
  
  useEffect(() => {
    // Check if wallets are available in window
    const checkWalletInstallation = () => {
      // @ts-ignore - Check if Phantom exists in window
      if (window.phantom) {
        setIsPhantomInstalled(true);
      }
      
      // @ts-ignore - Check if Solflare exists in window
      if (window.solflare) {
        setIsSolflareInstalled(true);
      }
    };
    
    checkWalletInstallation();
  }, []);
  
  // Create a unique session ID for the deep link to track this specific connection attempt
  const sessionId = Math.random().toString(36).substring(2, 15);
  
  // Define the connection parameters for Phantom's deeplink protocol
  const buildPhantomConnectURL = () => {
    // Use a better approach with Phantom's connect protocol 
    // This is the version that works best with redirect back to original browser
    const dappURL = window.location.origin + window.location.pathname;
    const redirectURL = window.location.href; // Include any params or hash
    
    // Build a connect URL that includes cluster and redirect
    return `https://phantom.app/ul/v1/connect?` + 
      `app=${encodeURIComponent('HackedATM Token')}&` +
      `dapp=${encodeURIComponent(dappURL)}&` + 
      `redirect=${encodeURIComponent(redirectURL)}&` +
      `cluster=mainnet-beta`;
  };

  // Open directly on mobile, or show QR code on desktop
  const handleConnectPhantom = () => {
    const connectURL = buildPhantomConnectURL();
    
    // If Phantom is already installed in this browser, prefer that
    // @ts-ignore
    if (window.phantom && isPhantomInstalled) {
      try {
        // @ts-ignore
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
          provider.connect();
          if (onClose) onClose();
          return;
        }
      } catch (err) {
        console.error("Error connecting to Phantom: ", err);
      }
    }
    
    if (isMobile) {
      toast({
        title: "Opening Phantom App",
        description: "Please approve connection in Phantom and return to this app"
      });
      
      // For mobile - try universal links first as they handle return better
      window.location.href = connectURL;
      
      // Fallback to direct protocol if universal link fails after a delay
      setTimeout(() => {
        if (document.hasFocus()) {
          // If document still has focus, the universal link didn't work
          // Try the direct protocol scheme with the same params as the universal link
          const dappURL = window.location.origin + window.location.pathname;
          const redirectURL = window.location.href;
          
          const protocolURL = `phantom://v1/connect?` + 
            `app=${encodeURIComponent('HackedATM Token')}&` +
            `dapp=${encodeURIComponent(dappURL)}&` + 
            `redirect=${encodeURIComponent(redirectURL)}&` +
            `cluster=mainnet-beta`;
            
          window.location.href = protocolURL;
        }
      }, 500);
    } else {
      // For desktop - open instructions to scan
      window.open(connectURL, '_blank');
    }
    
    if (onClose) onClose();
  };
  
  // Handle Solflare connection using their universal link protocol
  const handleConnectSolflare = () => {
    // If Solflare is available in this browser, use it directly
    // @ts-ignore
    if (window.solflare && isSolflareInstalled) {
      try {
        // @ts-ignore
        window.solflare.connect();
        if (onClose) onClose();
        return;
      } catch (err) {
        console.error("Error connecting to Solflare: ", err);
      }
    }
    
    const dappURL = window.location.origin + window.location.pathname;
    const redirectURL = window.location.href;
    
    // Using Solflare's deep link format with consistent parameters
    const solflareURL = `https://solflare.com/ul/v1/connect?` +
      `app=${encodeURIComponent('HackedATM Token')}&` +
      `dapp=${encodeURIComponent(dappURL)}&` + 
      `redirect=${encodeURIComponent(redirectURL)}&` +
      `cluster=mainnet-beta`;
    
    if (isMobile) {
      toast({
        title: "Opening Solflare App",
        description: "Please approve connection in Solflare and return to this app"
      });
      
      // For mobile - open universal link
      window.location.href = solflareURL;
      
      // Fallback to direct protocol after a delay
      setTimeout(() => {
        if (document.hasFocus()) {
          // If document still has focus, try the protocol URL
          const protocolURL = `solflare://ul/v1/connect?` +
            `app=${encodeURIComponent('HackedATM Token')}&` +
            `dapp=${encodeURIComponent(dappURL)}&` + 
            `redirect=${encodeURIComponent(redirectURL)}&` +
            `cluster=mainnet-beta`;
            
          window.location.href = protocolURL;
        }
      }, 500);
    } else {
      // For desktop - open in new tab for QR code
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