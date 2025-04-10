import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSolana } from '@/context/SolanaContext';
import { useToast } from '@/hooks/use-toast';
import { 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  Transaction 
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { TOKEN_CONFIG } from '@/lib/token-config';

const AirdropButton: React.FC = () => {
  const { connection, publicKey, connected } = useSolana();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAirdrop = async () => {
    if (!connection || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to receive an airdrop",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First make sure the user has SOL for transaction fees
      try {
        const solBalance = await connection.getBalance(publicKey);
        
        if (solBalance < 0.01 * LAMPORTS_PER_SOL) {
          toast({
            title: "Requesting SOL airdrop",
            description: "You need SOL for transaction fees. Requesting an airdrop...",
          });
          
          const signature = await connection.requestAirdrop(
            publicKey,
            0.1 * LAMPORTS_PER_SOL
          );
          await connection.confirmTransaction(signature);
          
          toast({
            title: "SOL Airdrop successful",
            description: "You've received 0.1 SOL for transaction fees",
          });
        }
      } catch (error) {
        console.error("Error requesting SOL airdrop:", error);
        toast({
          title: "SOL Airdrop failed",
          description: "Continuing anyway, but transactions may fail if you don't have SOL",
          variant: "destructive",
        });
      }

      // Request airdrop from our backend
      toast({
        title: "Requesting token airdrop",
        description: "Requesting 1000 HATM tokens from the airdrop service...",
      });
      
      // Call our airdrop endpoint
      const response = await fetch('/api/airdrop-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Airdrop successful!",
          description: (
            <div className="flex flex-col gap-1">
              <p>{data.message}</p>
              {data.explorerUrl && (
                <a 
                  href={data.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline text-xs"
                >
                  View transaction on Solana Explorer
                </a>
              )}
            </div>
          ),
          duration: 10000, // Show for 10 seconds so user can click the link
        });
        
        // For a better UX, we should update the user's token balance here
        // This would normally be done through a context update or refetching
        
      } else {
        throw new Error(data.error || "Failed to airdrop tokens");
      }

    } catch (error) {
      console.error("Error in airdrop process:", error);
      toast({
        title: "Airdrop failed",
        description: "Failed to airdrop tokens. See console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAirdrop}
      disabled={!connected || loading}
      className="bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary text-xs"
    >
      {loading ? "Processing..." : "Get Test Tokens"}
    </Button>
  );
};

export default AirdropButton;