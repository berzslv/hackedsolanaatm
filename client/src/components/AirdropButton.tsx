import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSolana } from '@/context/SolanaContext';
import { useToast } from '@/hooks/use-toast';
import { 
  clusterApiUrl, 
  Connection, 
  Keypair, 
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

// This is for testing only - in a real app, you would never expose private keys
// The keypair is from the token creation script we ran
const MINT_AUTHORITY_SECRET_KEY = [
  187, 110, 16, 39, 255, 191, 54, 48, 133, 254, 227, 145, 40, 157, 178, 194,
  211, 73, 165, 22, 244, 21, 3, 101, 191, 129, 31, 59, 42, 45, 95, 74,
  17, 116, 182, 80, 233, 115, 212, 110, 171, 44, 211, 231, 27, 82, 161, 99,
  84, 18, 84, 125, 231, 95, 47, 101, 172, 1, 231, 99, 76, 178, 57, 45
];

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

      // Now airdrop the test HATM tokens
      // Create instructions for token airdrop
      const tokenMintPubkey = new PublicKey(TOKEN_CONFIG.mint);
      const mintAuthority = Keypair.fromSecretKey(
        new Uint8Array(MINT_AUTHORITY_SECRET_KEY)
      );
      
      // Get or create recipient associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(
        tokenMintPubkey,
        publicKey
      );
      
      // Check if the token account already exists
      let createAta = false;
      try {
        await getAccount(connection, associatedTokenAddress);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          createAta = true;
        }
      }
      
      // Create the transaction
      const transaction = new Transaction();
      
      // If the token account doesn't exist, add instruction to create it
      if (createAta) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            associatedTokenAddress, // associated token account
            publicKey, // owner
            tokenMintPubkey // mint
          )
        );
      }
      
      // Add instruction to mint tokens to the associated token account
      const amount = 1000 * Math.pow(10, TOKEN_CONFIG.decimals); // 1000 tokens
      
      transaction.add(
        createMintToInstruction(
          tokenMintPubkey, // mint
          associatedTokenAddress, // destination
          mintAuthority.publicKey, // authority
          BigInt(amount) // amount
        )
      );
      
      // Sign the transaction as the mint authority
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      
      // This is where it gets tricky - we need the user and the mint authority to sign
      // This won't work as-is without backend support
      
      toast({
        title: "Feature in Development",
        description: "The token airdrop feature requires a backend service. For testing, use the Solana CLI.",
      });

      // In a real implementation with a backend:
      // 1. Send a request to your backend with user's public key
      // 2. Backend creates and partly signs the transaction
      // 3. Return partly signed transaction to frontend 
      // 4. User signs and submits the transaction

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