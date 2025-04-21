import { useState, useEffect } from 'react';
import { useSolana } from '@/context/SolanaContext';
import { PublicKey, Transaction, Connection, clusterApiUrl, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { createTransactionInstruction } from '@/lib/create-transaction-instruction';
import { SIMPLE_STAKING_DISCRIMINATORS } from '@/lib/anchor-utils';
import { 
  createAnchorWallet, 
  createAnchorProvider, 
  getStakingProgram,
  createRegisterUserTransaction,
  createStakeTransaction
} from '../lib/anchor-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
const TOKEN_MINT = '6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4';

// We're using proper Anchor instruction discriminators now
// Discriminators are 8-byte hashes of instruction names, computed by anchor

export function SimpleStakingWidget() {
  const { publicKey, connected, sendTransaction } = useSolana();
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [stakingInfo, setStakingInfo] = useState<any>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [directMode, setDirectMode] = useState(true); // Default to direct transfer mode
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Fetch staking info when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchStakingInfo();
      fetchTokenBalance();
    } else {
      setStakingInfo(null);
      setTokenBalance(null);
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
  
  // Fetch token balance 
  const fetchTokenBalance = async () => {
    if (!publicKey) return;
    
    setBalanceLoading(true);
    try {
      // Get token mint information
      const accountsResponse = await apiRequest<any>('/api/simple-staking-accounts-info', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: publicKey.toString()
        })
      });
      
      if (!accountsResponse.success) {
        console.error('Failed to get account info:', accountsResponse.error);
        setTokenBalance(0);
        return;
      }
      
      // Connect to Solana
      const connection = new Connection(clusterApiUrl('devnet'));
      const tokenMint = new PublicKey(accountsResponse.tokenMint);
      
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      
      // Check if token account exists
      try {
        const accountInfo = await connection.getAccountInfo(userTokenAccount);
        
        if (accountInfo) {
          // Get token balance
          const balance = await connection.getTokenAccountBalance(userTokenAccount);
          setTokenBalance(Number(balance.value.amount) / 1e9);
          console.log('User token balance:', Number(balance.value.amount) / 1e9);
        } else {
          console.log('Token account does not exist yet');
          setTokenBalance(0);
        }
      } catch (error) {
        console.error('Error fetching token account:', error);
        setTokenBalance(0);
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };
  
  // Direct token transfer (more reliable than contract interaction)
  const handleDirectTransfer = async () => {
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
    
    // Check token balance
    if (tokenBalance === null || Number(amount) > tokenBalance) {
      toast({
        title: "Insufficient balance",
        description: `You only have ${tokenBalance ?? 0} tokens available to stake`,
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Starting direct token transfer for staking");
      console.log("Wallet public key:", publicKey.toString());
      console.log("Amount to transfer:", amount);
      
      // Get account information for token accounts
      const accountsResponse = await apiRequest<any>('/api/simple-staking-accounts-info', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: publicKey.toString()
        })
      });
      
      if (!accountsResponse.success) {
        throw new Error(`Failed to get account info: ${accountsResponse.error}`);
      }
      
      console.log("Retrieved accounts info:", accountsResponse);
      
      // Parse account info
      const tokenMint = new PublicKey(accountsResponse.tokenMint);
      const vaultTokenAccount = new PublicKey(accountsResponse.vaultTokenAccount);
      
      // Connect to Solana
      const connection = new Connection(clusterApiUrl('devnet'));
      
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      
      console.log("User token account:", userTokenAccount.toString());
      console.log("Vault token account:", vaultTokenAccount.toString());
      
      // Calculate amount in lamports (9 decimals)
      const amountLamports = Number(amount) * Math.pow(10, 9);
      console.log("Amount in lamports:", amountLamports);
      
      // Create transaction with transfer instruction
      const transaction = new Transaction();
      
      // Create transfer instruction
      // Try multiple approaches to accommodate different browser environments
      
      // IMPORTANT: Our tests showed that using a simple number works fine in Node.js
      // but browser environments might need BigInt or other approaches
      
      // First attempt: Simple number approach (works in most environments)
      try {
        console.log(`Creating transfer instruction with amount: ${amountLamports}`);
        const transferInstruction = createTransferInstruction(
          userTokenAccount,
          vaultTokenAccount, 
          publicKey,
          amountLamports  // Use plain number first
        );
        
        transaction.add(transferInstruction);
        console.log("Transfer instruction created successfully using regular number");
      } catch (firstError) {
        console.warn("Could not create transfer instruction with regular number:", firstError);
        
        // Second attempt: BigInt approach (for browsers that need explicit BigInt)
        try {
          console.log("Trying BigInt approach...");
          const bigIntAmount = BigInt(Math.floor(amountLamports));
          console.log(`Amount as BigInt: ${bigIntAmount}`);
          
          const transferInstruction = createTransferInstruction(
            userTokenAccount,
            vaultTokenAccount,
            publicKey,
            bigIntAmount
          );
          
          transaction.instructions = []; // Clear any previous attempts
          transaction.add(transferInstruction);
          console.log("Transfer instruction created successfully using BigInt");
        } catch (secondError) {
          console.error("All approaches failed:", secondError);
          throw new Error("Failed to create the transfer instruction. Please try a different amount or try again later.");
        }
      }
      
      // Set transaction properties
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;
      
      // Send transaction
      const signature = await sendTransaction(transaction);
      console.log("Transaction sent successfully, signature:", signature);
      
      toast({
        title: "Transfer initiated",
        description: "Your tokens are being transferred to the staking vault."
      });
      
      // Wait for confirmation
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
        title: "Tokens staked successfully",
        description: `You have successfully transferred ${amount} tokens to the staking vault.`
      });
      
      // Refresh data
      await fetchStakingInfo();
      await fetchTokenBalance();
      
    } catch (error) {
      console.error("Error in direct token transfer:", error);
      
      toast({
        title: "Transfer failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      console.log("Starting simple staking process using Anchor client");
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

      // Parse token mint from response
      const tokenMint = new PublicKey(accountsResponse.tokenMint);
      const isRegistered = accountsResponse.isRegistered;

      // Connect to Solana
      const connection = new Connection(clusterApiUrl('devnet'));

      // Create a wrapper function that adapts our sendTransaction to what Anchor expects
      // Anchor needs a function that returns a Transaction, but our context returns a signature string
      const signTransactionAdapter = async (tx: Transaction): Promise<Transaction> => {
        // We'll use sendTransaction but ignore its output - we just want it to handle signing
        await sendTransaction(tx);
        return tx; // Return the transaction itself (now it's been through sendTransaction)
      };
      
      // Create Anchor wallet adapter
      const anchorWallet = createAnchorWallet(publicKey, signTransactionAdapter);
      
      // Create Anchor provider
      const provider = createAnchorProvider(connection, anchorWallet);
      
      // Get program instance using proper Anchor approach
      // This uses the IDL to generate proper transaction formats with correct instruction discriminators
      const program = getStakingProgram(provider);
      console.log("Provider created successfully, creating program instance");
      
      // Create transaction object
      let transaction: Transaction;
      
      if (!isRegistered) {
        console.log("User is not registered. Creating registration transaction...");
        
        // Create registration transaction
        const registerTx = await createRegisterUserTransaction(program, publicKey);
        
        // Create staking transaction
        const stakeTx = await createStakeTransaction(program, publicKey, tokenMint, Number(amount));
        
        // Combine them - create a new transaction with both instructions
        transaction = new Transaction();
        registerTx.instructions.forEach((ix: any) => transaction.add(ix));
        stakeTx.instructions.forEach((ix: any) => transaction.add(ix));
        
        console.log("Created combined registration + staking transaction");
      } else {
        console.log("User is already registered. Creating staking transaction only...");
        
        // User is already registered, just stake
        transaction = await createStakeTransaction(program, publicKey, tokenMint, Number(amount));
        console.log("Created staking transaction");
      }
      
      // Set transaction properties
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = publicKey;
      
      console.log("Transaction built with Anchor. Sending to wallet for signing...");
      console.log("Transaction has", transaction.instructions.length, "instructions");
      
      // Send the transaction
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
      await fetchTokenBalance();

    } catch (error) {
      console.error("Error in Anchor staking process:", error);
      
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
        <div className="flex justify-between items-center">
          <CardTitle>Simple Staking</CardTitle>
          <Badge variant={directMode ? 'default' : 'outline'}>
            {directMode ? 'Direct Transfer' : 'Contract Mode'}
          </Badge>
        </div>
        <CardDescription>Stake HATM tokens to earn rewards</CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Your Token Balance</div>
              {balanceLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <div className="text-sm flex items-center space-x-2">
                  <span className="font-semibold">{tokenBalance !== null ? `${tokenBalance.toLocaleString()} HATM` : 'Loading...'}</span>
                  {tokenBalance && tokenBalance > 0 && (
                    <Badge variant="outline" className="text-green-500 bg-green-50 border-green-200">Available</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="font-medium">Your Staking Info</div>
              {infoLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : stakingInfo ? (
                <div className="text-sm space-y-1">
                  <div>Amount Staked: {stakingInfo.amountStaked / 1e9} HATM</div>
                  <div>Rewards Earned: {stakingInfo.pendingRewards / 1e9} HATM</div>
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="staking-mode"
                  checked={directMode}
                  onCheckedChange={setDirectMode}
                />
                <Label htmlFor="staking-mode" className="text-xs text-muted-foreground">
                  {directMode 
                    ? "Direct Transfer: Tokens are sent directly to the vault account" 
                    : "Contract Mode: Uses on-chain contract to update staking records"}
                </Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Connect your wallet to view staking options
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button 
          className="w-full" 
          onClick={directMode ? handleDirectTransfer : handleStake} 
          disabled={!connected || loading || tokenBalance === 0}
        >
          {loading ? "Processing..." : `Stake ${directMode ? "(Direct Transfer)" : "(Contract)"}`}
        </Button>
        <div className="text-xs text-center text-muted-foreground">
          Staking locks tokens for 7 days. Early unstaking incurs a 25% fee.
        </div>
      </CardFooter>
    </Card>
  );
}