import React from 'react';
import { Button } from '@/components/ui/button';

export function Web3AuthButton() {
  const openWeb3Auth = () => {
    // Open Web3Auth in a new window
    window.open('https://app.web3auth.io/', '_blank');
  };

  return (
    <Button 
      onClick={openWeb3Auth} 
      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
    >
      Connect with Web3Auth
    </Button>
  );
}