import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { MobileConnect } from '@/components/ui/mobile-qr-connect';
import { SolanaWalletButton } from '@/components/ui/wallet-adapter';
import { useIsMobile } from '@/hooks/use-mobile';

export function WalletConnectOptions() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  
  return (
    <div className="flex">
      {/* The standard wallet adapter button for desktop */}
      <div className="hidden md:block">
        <SolanaWalletButton />
      </div>
      
      {/* For mobile, show our custom dialog with deep linking options */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="md:hidden bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-md">
            {isMobile ? "Connect Wallet" : "Select Wallet"}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[90%] rounded-xl">
          <MobileConnect onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}