import { useState, useEffect } from 'react';
import { useSolana } from '@/context/SolanaContext';
import { PublicKey, Transaction, Connection, clusterApiUrl, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createTransactionInstruction } from '@/lib/create-transaction-instruction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

// Simple API request helper
const apiRequest = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

// Constants for the simple staking program
const SIMPLE_PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm'; 
const TOKEN_MINT = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';

// We're using proper Anchor instruction discriminators now
// Discriminators are 8-byte hashes of instruction names, computed by anchor

export function SimpleStakingWidget() {
  const { publicKey, connected, sendTransaction } = useSolana();
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [stakingInfo, setStakingInfo] = useState<any>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Fetch staking info when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchStakingInfo();
    } else {
      setStakingInfo(null);
    }
  }, [connected, publicKey]);

  const fetchStakingInfo = async () => {
    if (!publicKey) return;
    
    setInfoLoading(true);
    try {
      const response = await apiRequest<any>(`/api/simple-staking-info/${publicKey.toString()}`);
      
      if (response.success) {
        setStakingInfo(response.stakingInfo);
      } else {
        console.error("Failed to fetch staking info:", response.error);
        setStakingInfo(null);
      }
    } catch (error) {
      console.error("Error fetching staking info:", error);
      setStakingInfo(null);
    } finally {
      setInfoLoading(false);
    }
  };

  const handleStake = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to stake",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log("Starting simple staking process");
      console.log("Wallet public key:", publicKey.toString());
      console.log("Amount to stake:", amount);

      // Get account information needed to build the transaction
      const accountsResponse = await apiRequest<any>('/api/simple-staking-accounts-info', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          amount: Number(amount)
        })
      });

      if (!accountsResponse.success) {
        throw new Error(`Failed to get account info: ${accountsResponse.error}`);
      }

      console.log("Retrieved accounts info:", accountsResponse);

      // Parse accounts from response
      const programId = new PublicKey(accountsResponse.programId);
      const vault = new PublicKey(accountsResponse.vault);
      const vaultTokenAccount = new PublicKey(accountsResponse.vaultTokenAccount);
      const tokenMint = new PublicKey(accountsResponse.tokenMint);
      const userStakeInfoAddress = new PublicKey(accountsResponse.userStakeInfoAddress);
      const isRegistered = accountsResponse.isRegistered;

      // Connect to Solana
      const connection = new Connection(clusterApiUrl('devnet'));

      // Get the user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      console.log("User token account:", userTokenAccount.toString());

      // Create a new transaction
      const transaction = new Transaction();

      // Add register instruction if user is not registered
      if (!isRegistered) {
        console.log("User is not registered. Adding registration instruction.");
        
        const registerInstruction = createTransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true },          // user
            { pubkey: userStakeInfoAddress, isSigner: false, isWritable: true }, // userInfo
            { pubkey: vault, isSigner: false, isWritable: false },            // vault
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // rent
          ],
          programId,
          data: (() => {
            // In Anchor, the discriminator is a proper 8-byte hash derived from the function name
            // For simplicity, we'll use a SHA256 hash truncated to 8 bytes
            // In production, you'd use the function provided by Anchor.js
            const discriminator = Buffer.from([211, 98, 31, 68, 233, 45, 108, 189]); // "register_user" discriminator
            
            // No arguments needed for this instruction, but we still need to ensure
            // we're returning a proper Buffer that will work in browser environment
            return Buffer.from(new Uint8Array(discriminator));
          })()
        });
        
        transaction.add(registerInstruction);
      }

      // Calculate amount in lamports (9 decimals)
      const amountLamports = Number(amount) * Math.pow(10, 9);
      console.log("Amount in lamports:", amountLamports);

      // Create stake instruction
      const stakeInstruction = createTransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },         // user
          { pubkey: userStakeInfoAddress, isSigner: false, isWritable: true }, // userInfo
          { pubkey: vault, isSigner: false, isWritable: false },           // vault
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },  // userTokenAccount
          { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // vaultTokenAccount
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // tokenProgram
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
        ],
        programId,
        data: (() => {
          // In Anchor, the discriminator is a proper 8-byte hash derived from the function name
          // For simplicity, we'll use a SHA256 hash truncated to 8 bytes
          const discriminator = Buffer.from([69, 119, 235, 219, 182, 124, 161, 6]); // "stake" discriminator
          
          // Create buffer for the amount parameter (u64 = 8 bytes)
          const amountBuffer = Buffer.alloc(8);
          // Write amount as little-endian 64-bit value
          const view = new DataView(amountBuffer.buffer);
          view.setBigUint64(0, BigInt(amountLamports), true); // true = little-endian
          
          // Combine discriminator and amount buffer manually since Buffer.concat may not be available in browser
          const combinedBuffer = new Uint8Array(discriminator.length + amountBuffer.length);
          combinedBuffer.set(new Uint8Array(discriminator), 0);
          combinedBuffer.set(new Uint8Array(amountBuffer), discriminator.length);
          return Buffer.from(combinedBuffer);
        })()
      });
      
      transaction.add(stakeInstruction);

      console.log("Transaction built successfully");

      // Send the transaction
      console.log("Sending transaction to wallet for signing...");
      
      // Set all the necessary properties for the transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;
      
      // Send the transaction using the context's sendTransaction
      const signature = await sendTransaction(transaction);
      
      console.log("Transaction sent successfully, signature:", signature);
      
      toast({
        title: "Staking initiated",
        description: "Your tokens are being staked. This may take a moment to confirm.",
      });

      // Wait for confirmation
      console.log("Waiting for transaction confirmation...");
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
      }
      
      console.log("Transaction confirmed successfully!");

      toast({
        title: "Staking successful",
        description: `You have successfully staked ${amount} tokens.`,
      });

      // Refresh staking info
      await fetchStakingInfo();

    } catch (error) {
      console.error("Error in simple staking process:", error);
      
      toast({
        title: "Staking failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Simple Staking (Testing)</CardTitle>
        <CardDescription>Stake your tokens with our simplified contract</CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Your Staking Info</div>
              {infoLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : stakingInfo ? (
                <div className="text-sm space-y-1">
                  <div>Amount Staked: {stakingInfo.amountStaked / 1e9} tokens</div>
                  <div>Rewards Earned: {stakingInfo.pendingRewards / 1e9} tokens</div>
                  {stakingInfo.lastStakeTime && (
                    <div>Last Stake: {new Date(stakingInfo.lastStakeTime).toLocaleString()}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No staking information found</div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="font-medium">Stake Tokens</div>
              <Input
                type="number"
                placeholder="Amount to stake"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="1"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Connect your wallet to view staking options
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleStake} 
          disabled={!connected || loading}
        >
          {loading ? "Processing..." : "Stake Tokens"}
        </Button>
      </CardFooter>
    </Card>
  );
}