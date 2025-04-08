import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface PhantomConnectorProps {
  onConnect: (publicKey: string) => void;
  className?: string;
}

export function PhantomConnector({ onConnect, className = '' }: PhantomConnectorProps) {
  const [connecting, setConnecting] = useState(false);
  const [phantomAvailable, setPhantomAvailable] = useState(false);

  useEffect(() => {
    // Check if Phantom is available
    const checkPhantomAvailability = () => {
      let hasPhantom = false;
      
      // Check multiple ways that Phantom might be available in the window
      if ('phantom' in window) {
        // @ts-ignore - Phantom is not typed in window
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
          console.log("✅ Phantom detected in window.phantom.solana");
          hasPhantom = true;
        }
      }

      // Also check if window.solana exists and is Phantom (Chrome extension)
      if ('solana' in window) {
        try {
          // @ts-ignore - Solana is not typed in window
          const solanaProvider = window.solana;
          if (solanaProvider && typeof solanaProvider === 'object') {
            // @ts-ignore - Check if it's Phantom
            if (solanaProvider.isPhantom) {
              console.log("✅ Phantom detected in window.solana");
              hasPhantom = true;
            }
          }
        } catch (error) {
          console.error("Error checking window.solana", error);
        }
      }

      if (!hasPhantom) {
        console.log("❌ Phantom not detected");
      }
      
      setPhantomAvailable(hasPhantom);
      return hasPhantom;
    };

    checkPhantomAvailability();

    // Re-check availability when window is focused (in case user installed it)
    const handleFocus = () => {
      checkPhantomAvailability();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const connectWithExtension = async () => {
    setConnecting(true);
    
    try {
      let provider = null;
      
      // Try getting provider from window.phantom first
      if ('phantom' in window) {
        // @ts-ignore
        provider = window.phantom?.solana;
      }
      
      // If not found, try window.solana
      if (!provider && 'solana' in window) {
        try {
          // @ts-ignore
          const solanaProvider = window.solana;
          // @ts-ignore
          if (solanaProvider && solanaProvider.isPhantom) {
            provider = solanaProvider;
          }
        } catch (error) {
          console.error("Error accessing window.solana", error);
        }
      }
      
      if (!provider) {
        console.error("Phantom provider not found");
        window.open('https://phantom.app/download', '_blank');
        setConnecting(false);
        return;
      }
      
      console.log("🔌 Connecting to Phantom wallet extension...");
      // Request connection
      const resp = await provider.connect();
      console.log("🎉 Connected to Phantom!", resp);
      
      // Call onConnect with the public key
      if (resp.publicKey) {
        onConnect(resp.publicKey.toString());
      }
    } catch (error) {
      console.error("Error connecting to Phantom:", error);
    } finally {
      setConnecting(false);
    }
  };

  const connectWithMobileQR = () => {
    setConnecting(true);
    
    try {
      // Generate a QR code URL for Phantom's direct connection approach
      const currentUrl = window.location.href;
      const appName = 'HackedATM';
      
      // If on mobile, open connection URL directly
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        // For phones, open the Phantom app with the connection URL
        const phantomConnectLink = `https://phantom.app/ul/v1/connect?app=${encodeURIComponent(appName)}&redirect=${encodeURIComponent(window.location.href)}&cluster=mainnet-beta`;
        
        console.log("Opening direct Phantom mobile link:", phantomConnectLink);
        window.location.href = phantomConnectLink;
      } else {
        // For desktop, open Phantom's dashboard which shows a QR code
        window.open('https://phantom.app/dashboard', '_blank');
      }
    } catch (error) {
      console.error("Error with mobile connection attempt:", error);
    } finally {
      setConnecting(false);
    }
  };

  const handleInstallPhantom = () => {
    window.open('https://phantom.app/download', '_blank');
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {phantomAvailable ? (
        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          onClick={connectWithExtension}
          disabled={connecting}
        >
          {connecting ? 'Connecting...' : 'Connect with Browser Extension'}
        </Button>
      ) : (
        <Button 
          className="w-full"
          variant="outline"
          onClick={handleInstallPhantom}
        >
          Install Phantom Wallet
        </Button>
      )}
      
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      
      <Button 
        className="w-full"
        variant="outline"
        onClick={connectWithMobileQR}
        disabled={connecting}
      >
        Connect with Mobile App
      </Button>
    </div>
  );
}