import { useCallback, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useSolana } from '@/context/SolanaContext';

/**
 * A direct wallet connect button that bypasses the modal system
 * for more reliable connection/disconnection in wallet browsers
 */
export function DirectWalletConnectButton() {
  const { connected, disconnectWallet } = useSolana();
  const [isWalletBrowser, setIsWalletBrowser] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if we're in a wallet browser
  useEffect(() => {
    const inWalletBrowser = 
      navigator.userAgent.includes('SolflareWallet') || 
      navigator.userAgent.includes('Phantom') ||
      document.referrer.includes('phantom') ||
      document.referrer.includes('solflare');
    
    setIsWalletBrowser(inWalletBrowser);
  }, []);

  // Determine the current browser wallet if we're in a wallet browser
  const currentWalletKey = useCallback(() => {
    if (navigator.userAgent.includes('SolflareWallet')) return 'Solflare';
    if (navigator.userAgent.includes('Phantom')) return 'Phantom';
    if (document.referrer.includes('phantom')) return 'Phantom';
    if (document.referrer.includes('solflare')) return 'Solflare';
    return null;
  }, []);

  // Handle direct connection
  const handleConnect = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // For direct browser connection, we'll use the browser's wallet
      const solana = (window as any).solana;
      if (typeof solana !== 'undefined' && typeof solana.connect === 'function') {
        console.log('Directly connecting to Phantom wallet');
        await solana.connect();
      }
      
      // For Solflare
      const solflare = (window as any).solflare;
      if (typeof solflare !== 'undefined' && typeof solflare.connect === 'function') {
        console.log('Directly connecting to Solflare wallet');
        await solflare.connect();
      }
      
      // Force a reload after 2 seconds if something goes wrong
      setTimeout(() => {
        if (!connected) {
          console.log("Connection taking too long, refreshing page");
          window.location.reload();
        }
      }, 2000);
    } catch (error) {
      console.error("Direct wallet connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [connected]);

  // Handle direct disconnection with a full page reload
  const handleDisconnect = useCallback(async () => {
    try {
      disconnectWallet();
      
      // Additional disconnection for reliability
      const solana = (window as any).solana;
      if (typeof solana !== 'undefined' && typeof solana.disconnect === 'function') {
        solana.disconnect();
      }
      
      const solflare = (window as any).solflare;
      if (typeof solflare !== 'undefined' && typeof solflare.disconnect === 'function') {
        solflare.disconnect();
      }
      
      // Always force a page reload when disconnecting in wallet browsers
      // This is the most reliable approach
      setTimeout(() => {
        console.log("Reloading page after wallet disconnect");
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Direct wallet disconnection error:", error);
      // Always reload on error as a fallback
      window.location.reload();
    }
  }, [disconnectWallet]);

  // Auto-connect on initial load in wallet browsers
  useEffect(() => {
    if (isWalletBrowser && !connected && !isConnecting) {
      // Auto-connect after a small delay to ensure wallet is ready
      const timer = setTimeout(() => {
        handleConnect();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isWalletBrowser, connected, isConnecting, handleConnect]);

  // Only show this special button in wallet browsers
  if (!isWalletBrowser) return null;

  return (
    <div className="wallet-direct-connect">
      {connected ? (
        <Button 
          onClick={handleDisconnect}
          className="bg-red-600 hover:bg-red-700"
        >
          Disconnect Wallet
        </Button>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isConnecting ? 'Connecting...' : `Connect ${currentWalletKey() || 'Wallet'}`}
        </Button>
      )}
    </div>
  );
}