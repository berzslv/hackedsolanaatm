import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Simple wallet button with dialog
export function WalletButton() {
  const [connected, setConnected] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  // Connect to Phantom
  const connectPhantom = async () => {
    try {
      setConnecting(true);
      // Check if Phantom is installed
      if (!window.phantom?.solana) {
        window.open('https://phantom.app/', '_blank');
        return;
      }
      
      // Connect to wallet
      const { publicKey } = await window.phantom.solana.connect();
      console.log('Connected to Phantom wallet:', publicKey.toString());
      setConnected(true);
      setShowDialog(false);
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
    } finally {
      setConnecting(false);
    }
  };
  
  // Connect to Solflare
  const connectSolflare = async () => {
    try {
      setConnecting(true);
      // Check if Solflare is installed
      if (!window.solflare) {
        window.open('https://solflare.com/', '_blank');
        return;
      }
      
      // Connect to wallet
      await window.solflare.connect();
      if (window.solflare.publicKey) {
        console.log('Connected to Solflare wallet:', window.solflare.publicKey.toString());
        setConnected(true);
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error connecting to Solflare:', error);
    } finally {
      setConnecting(false);
    }
  };
  
  // Disconnect wallet
  const disconnect = () => {
    setConnected(false);
  };
  
  // Main button
  return (
    <>
      {connected ? (
        <Button 
          onClick={disconnect}
          variant="destructive"
          className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
        >
          Disconnect
        </Button>
      ) : (
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
        >
          Connect Wallet
        </Button>
      )}
      
      {/* Wallet selection dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Button
              onClick={connectPhantom}
              disabled={connecting}
              className="flex justify-start items-center gap-3 h-12"
              variant="outline"
            >
              <i className="ri-ghost-line text-xl"></i>
              <span>Phantom</span>
              {connecting && <span className="ml-auto">Loading...</span>}
            </Button>
            
            <Button
              onClick={connectSolflare}
              disabled={connecting}
              className="flex justify-start items-center gap-3 h-12"
              variant="outline"
            >
              <i className="ri-sun-line text-xl"></i>
              <span>Solflare</span>
              {connecting && <span className="ml-auto">Loading...</span>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Type augmentation for global window object
declare global {
  interface Window {
    phantom?: {
      solana?: {
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
      };
    };
    solflare?: {
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
    };
  }
}