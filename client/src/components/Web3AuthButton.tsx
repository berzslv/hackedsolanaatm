import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info, Mail, Github, Twitter } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Web3AuthButton() {
  const [loading, setLoading] = useState(false);
  
  const connectWithEmail = () => {
    setLoading(true);
    window.open('https://app.web3auth.io/login?network=mainnet&client_id=YOUR_WEB3AUTH_CLIENT_ID&redirect_url=' + encodeURIComponent(window.location.href), '_blank');
    setTimeout(() => setLoading(false), 3000);
  };
  
  const connectWithSocial = (provider: string) => {
    setLoading(true);
    window.open(`https://app.web3auth.io/login?provider=${provider}&network=mainnet&redirect_url=` + encodeURIComponent(window.location.href), '_blank');
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center mb-1 text-sm text-muted-foreground">
        <span>Connect without a wallet extension</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 ml-1 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-80 p-3">
              <p>Web3Auth lets you create a Solana wallet using social accounts or email. No extensions or apps required!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Button 
        onClick={connectWithEmail}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex items-center justify-center"
        disabled={loading}
      >
        <Mail className="mr-2 h-4 w-4" />
        Continue with Email
      </Button>
      
      <Button 
        onClick={() => connectWithSocial('github')}
        className="w-full bg-gray-800 hover:bg-gray-900 flex items-center justify-center"
        disabled={loading}
      >
        <Github className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>
      
      <Button 
        onClick={() => connectWithSocial('twitter')}
        className="w-full bg-gradient-to-r from-[#1DA1F2] to-[#1a94e1] hover:from-[#1a94e1] hover:to-[#1687ce] flex items-center justify-center"
        disabled={loading}
      >
        <Twitter className="mr-2 h-4 w-4" />
        Continue with Twitter
      </Button>
      
      {loading && (
        <div className="text-center text-sm text-muted-foreground animate-pulse">
          Connecting, please wait...
        </div>
      )}
    </div>
  );
}