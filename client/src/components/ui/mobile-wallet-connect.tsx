import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

export function MobileWalletConnect() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Handle Phantom connection
  const connectPhantom = () => {
    // Simple implementation focused on mobile deep linking
    const appName = "HackedATM";
    const redirectUrl = window.location.href;
    
    // Create the connection URL for Phantom
    const phantomURL = `https://phantom.app/ul/v1/connect` +
      `?app=${encodeURIComponent(appName)}` +
      `&redirect=${encodeURIComponent(redirectUrl)}` +
      `&cluster=mainnet-beta`;
      
    toast({
      title: "Opening Phantom",
      description: "Approve the connection in Phantom, then return to this app"
    });
    
    // Open the URL - for mobile this will redirect to the app
    window.location.href = phantomURL;
    
    // Close the dialog
    setOpen(false);
  };
  
  // Handle Solflare connection
  const connectSolflare = () => {
    const appName = "HackedATM";
    const redirectUrl = window.location.href;
    
    // Create the connection URL for Solflare
    const solflareURL = `https://solflare.com/ul/v1/connect` +
      `?app=${encodeURIComponent(appName)}` +
      `&redirect=${encodeURIComponent(redirectUrl)}` +
      `&cluster=mainnet-beta`;
    
    toast({
      title: "Opening Solflare",
      description: "Approve the connection in Solflare, then return to this app"
    });
    
    // Open the URL - for mobile this will redirect to the app
    window.location.href = solflareURL;
    
    // Close the dialog
    setOpen(false);
  };
  
  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-md">
            Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[90%] rounded-xl">
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-center mb-4">Connect Mobile Wallet</h2>
            
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Connect with your mobile wallet and return to this browser
            </p>
            
            <div className="grid gap-3">
              <Button
                onClick={connectPhantom}
                className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
              >
                <i className="ri-ghost-line mr-2"></i>
                Connect with Phantom
              </Button>
              
              <Button
                onClick={connectSolflare}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}