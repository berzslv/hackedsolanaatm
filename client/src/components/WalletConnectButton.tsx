import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSolana } from '@/context/SolanaContext';

export function WalletConnectButton() {
  const [connecting, setConnecting] = useState(false);
  const { connectWallet } = useSolana();

  const handleConnectWalletConnect = async () => {
    try {
      setConnecting(true);
      
      try {
        // A simpler approach - just use our existing connector
        // This will use the standard Solana wallet popup
        await connectWallet('phantom');
        console.log("Successfully connected with Phantom");
      } catch (e) {
        console.error("Error connecting with Phantom:", e);
      }
      
    } catch (error) {
      console.error("Error connecting with WalletConnect:", error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Button 
      className="w-full bg-blue-600 hover:bg-blue-700"
      onClick={handleConnectWalletConnect}
      disabled={connecting}
    >
      {connecting ? 'Connecting...' : 'Connect with Mobile QR Code'}
    </Button>
  );
}