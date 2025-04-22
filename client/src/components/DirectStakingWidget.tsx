import React, { useState, useEffect } from 'react';
import { useSolana } from '@/hooks/use-solana';
import { useDirectSolana } from '@/hooks/use-direct-solana';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, Coins, Award, RefreshCcw, Info, Loader2, RefreshCw, UserPlus, CheckCircle } from 'lucide-react';
import { GradientText } from '@/components/ui/gradient-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatNumber, formatTimeRemaining } from '@/lib/utils';
import { Connection, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import { buyAndStakeTokens, stakeExistingTokens } from '@/lib/combined-smart-contract-client';
import { registerUserForStaking, checkAndCreateTokenAccount } from '@/lib/api-client';
import { executeStakingTransaction } from '@/lib/CreateStakingTransactionV3';


// Optional Helius API key - would be set from environment in production
const HELIUS_API_KEY = '';

// Utility function to convert base64 to Uint8Array in browser environment
/**
 * Convert a base64 string to a Uint8Array
 * This is a reliable implementation that properly handles base64 strings
 */
function base64ToUint8Array(base64String: string): Uint8Array {
  try {
    // Standard browser approach - decode base64 to binary string, then to Uint8Array
    const binaryString = window.atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('Error converting base64 to Uint8Array:', error);
    
    // As a fallback, try using a different approach if atob fails
    try {
      // Try using the TextEncoder approach as a fallback
      const base64Decoded = atob(base64String);
      return new TextEncoder().encode(base64Decoded);
    } catch (fallbackError) {
      console.error('Fallback conversion also failed:', fallbackError);
      throw new Error('Failed to convert transaction data to binary format');
    }
  }
}

const DirectStakingWidget: React.FC = () => {
  // Get wallet connection status
  const { connected, publicKey, signTransaction, sendTransaction, balance, refreshBalance } = useSolana();
  
  // Get direct blockchain staking data
  const { stakingInfo, stakingStats, loading, error, refreshAllData } = useDirectSolana(HELIUS_API_KEY);
  
  // Local state for input values
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [isUnstaking, setIsUnstaking] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Function to handle staking in a single transaction
  const handleStake = async () => {
    if (!connected || !publicKey || !signTransaction || !sendTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to stake tokens',
        variant: 'destructive'
      });
      return;
    }
    
    if (!stakeAmount || isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount to stake',
        variant: 'destructive'
      });
      return;
    }
    
    const amount = Number(stakeAmount);
    
    setIsStaking(true);
    
    try {
      // Set up connection to Solana 
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      console.log("🚀 Starting staking process with Anchor client");
      console.log("👛 Wallet public key:", publicKey.toString());
      console.log("🔢 Amount to stake:", amount);
      console.log("🔗 Network:", connection.rpcEndpoint);
      
      toast({
        title: 'Processing Stake Request',
        description: 'Preparing Anchor transaction...',
      });
      
      // Create a wallet object to pass to stakeExistingTokens that's compatible with Anchor
      // Create an ultra-simplified wallet adapter with only the minimal features needed
      const pubKeyStr = publicKey.toString();  // Get string representation
      const stablePubKey = new PublicKey(pubKeyStr);  // Create fresh PublicKey
      
      const wallet = { 
        sendTransaction: async (tx: any) => {
          console.log("Sending transaction with ultra-minimal wallet adapter");
          return sendTransaction(tx);
        }, 
        publicKey: stablePubKey
      };
      
      toast({
        title: 'Creating stake transaction',
        description: 'Building Anchor transaction...',
      });
      
      // Now proceed with staking
      // Check if the user has a token account for the HATM token, and create it if needed
      console.log("🔧 Checking for token account and creating if needed");
      const tokenMint = "59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk"; // HATM token mint
      
      toast({
        title: 'Checking token account',
        description: 'Making sure your wallet can hold HATM tokens...',
      });
      
      const tokenAccountResult = await checkAndCreateTokenAccount(
        publicKey.toString(),
        tokenMint,
        wallet
      );
      
      if (!tokenAccountResult.success) {
        console.error("❌ Failed to check/create token account:", tokenAccountResult.error);
        throw new Error(`Failed to prepare token account: ${tokenAccountResult.error || 'Unknown error'}`);
      }
      
      if (tokenAccountResult.exists === false) {
        // Token account was newly created
        toast({
          title: 'Token account created',
          description: 'Your wallet is now ready to hold HATM tokens',
        });
      }
      
      // Before proceeding, let's directly check the token balance
      try {
        const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
        const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Get token account address
        const userPubkey = new PublicKey(publicKey.toString());
        const mintPubkey = new PublicKey(tokenMint);
        
        // Get all token accounts for this owner
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          userPubkey,
          { mint: mintPubkey }
        );
        
        console.log(`Found ${tokenAccounts.value.length} token accounts for mint`);
        
        let sufficientBalance = false;
        
        if (tokenAccounts.value.length > 0) {
          // Find token account with a balance
          for (const account of tokenAccounts.value) {
            const tokenBalance = account.account.data.parsed.info.tokenAmount.uiAmount;
            console.log(`Token account ${account.pubkey.toString()} has balance: ${tokenBalance}`);
            
            if (tokenBalance >= amount) {
              sufficientBalance = true;
              break;
            }
          }
        }
        
        if (!sufficientBalance) {
          console.error(`❌ No token account has sufficient balance. Required: ${amount} HATM`);
          toast({
            title: 'Insufficient token balance',
            description: `You need ${amount} HATM tokens to stake, but your wallet doesn't have enough. Please buy tokens first.`,
            variant: 'destructive'
          });
          throw new Error(`Insufficient token balance. Required: ${amount} HATM`);
        }
        
        console.log("✅ Sufficient token balance verified");
      } catch (balanceError) {
        console.error("Error checking token balance:", balanceError);
        if (balanceError instanceof Error && balanceError.message.includes("Insufficient token balance")) {
          throw balanceError; // Re-throw specific balance errors
        }
        // Continue anyway even if balance check fails - the smart contract will catch it
      }
      
      console.log("🔧 Calling stakeExistingTokens function with Anchor");
      
      // Try our new direct V3 transaction method first
      toast({
        title: 'Using simplified transaction method',
        description: 'Creating direct transaction to avoid PublicKey issues...'
      });
      
      try {
        console.log("🔄 Trying executeStakingTransaction V3 method");
        
        const directResult = await executeStakingTransaction(
          publicKey.toString(),
          amount,
          wallet
        );
        
        if (directResult.error) {
          console.warn("⚠️ V3 transaction method had an error:", directResult.error);
          // Don't throw here, we'll fall back to the original method
        } else if (directResult.signature) {
          console.log("✅ V3 transaction successful with signature:", directResult.signature);
          
          // Success! Show confirmation
          toast({
            title: 'Staking successful!',
            description: `Successfully staked ${amount} HATM tokens using simplified method.`,
          });
          
          // Clear form and refresh data
          setStakeAmount('');
          setIsStaking(false);
          refreshAllData();
          return;
        }
      } catch (v3Error) {
        console.warn("⚠️ Error with V3 transaction method:", v3Error);
        toast({
          title: 'Simplified method failed',
          description: 'Falling back to regular method...',
        });
        // Fall back to the original method
      }
      
      console.log("🔄 Falling back to original stakeExistingTokens method");
      
      // If V3 method failed, fall back to the original Anchor-based staking function
      const stakeResult = await stakeExistingTokens(
        publicKey.toString(),
        amount,
        wallet
      );
      
      // Check if there was an error in creating the transaction
      if (stakeResult.error) {
        console.error("❌ Error from stakeExistingTokens:", stakeResult.error);
        throw new Error(stakeResult.error);
      }
      
      // If we got a signature directly from the Anchor transaction, we're done
      if (stakeResult.signature) {
        console.log("✅ Anchor transaction successful with signature:", stakeResult.signature);
        
        // Success! Show confirmation
        toast({
          title: 'Staking successful!',
          description: `Successfully staked ${amount} HATM tokens.`,
        });
        
        // Clear form and refresh data
        setStakeAmount('');
        setIsStaking(false);
        refreshAllData();
        return;
      }
      
      // Check if we have the staking transaction - needed if we need to sign it
      if (!stakeResult.stakingTransaction) {
        console.error("❌ No staking transaction returned");
        throw new Error('No staking transaction received');
      }
      
      // Otherwise proceed with the transaction that Anchor created
      const transactionData = stakeResult.stakingTransaction;
      
      toast({
        title: 'Waiting for approval',
        description: 'Please approve the staking transaction in your wallet',
      });
      
      // Log the transaction data structure to debug
      console.log('📦 Transaction data received:', JSON.stringify(transactionData, null, 2));
      
      if (!transactionData.transaction) {
        console.error('❌ Missing transaction field in response data');
        throw new Error('Missing transaction field in server response');
      }
      
      // Decode and deserialize the transaction
      let decodedTransaction: Transaction;
      
      try {
        console.log('🔍 Attempting to deserialize transaction');
        
        // Convert base64 string to Uint8Array
        const transactionBytes = base64ToUint8Array(transactionData.transaction);
        
        // Create Transaction from bytes
        decodedTransaction = Transaction.from(transactionBytes);
        
        console.log('✅ Successfully deserialized transaction');
        
        // Ensure fee payer is set
        if (!decodedTransaction.feePayer) {
          console.log('⚠️ Setting fee payer to current wallet');
          decodedTransaction.feePayer = publicKey;
        }
        
        // Ensure recent blockhash is set
        if (!decodedTransaction.recentBlockhash) {
          console.log('⚠️ Getting fresh blockhash for transaction');
          const { blockhash } = await connection.getLatestBlockhash('finalized');
          decodedTransaction.recentBlockhash = blockhash;
        }
        
        console.log("🧾 Fee payer:", decodedTransaction.feePayer?.toBase58());
        console.log("🔑 Signers:", decodedTransaction.signatures.map(s => s.publicKey.toBase58()));
        
        // Try simulating the transaction before sending
        try {
          console.log("🔬 Simulating transaction before sending");
          const simulation = await connection.simulateTransaction(decodedTransaction);
          console.log("🔍 Simulation result:", simulation);
          
          if (simulation.value.err) {
            console.error("⚠️ Transaction simulation failed:", simulation.value.err);
            // Continue anyway as this is just a preflight check
          }
        } catch (simError: any) {
          console.warn("⚠️ Simulation error (continuing anyway):", simError.message);
        }
        
      } catch (e: any) {
        console.error('❌ Error deserializing transaction:', e);
        
        try {
          // Try direct method as fallback
          decodedTransaction = Transaction.from(transactionData.transaction);
          console.log('✅ Successfully deserialized transaction using direct method');
        } catch (e2: any) {
          console.error('❌ All deserialization methods failed:', e2);
          throw new Error(`Failed to decode transaction: ${e2.message}`);
        }
      }
      
      // Re-use the existing connection created earlier
      
      // Define signature outside the try block so it's accessible throughout
      let signature: string;
      
      try {
        console.log('Sending transaction to the network...');
        
        try {
          // APPROACH 1: Primary approach - use wallet adapter's sendTransaction
          console.log('Attempting primary transaction method: wallet.sendTransaction');
          signature = await sendTransaction(decodedTransaction, connection, {
            skipPreflight: false, // Run preflight checks
            preflightCommitment: 'confirmed', // Use confirmed commitment level for preflight
            maxRetries: 5 // Try a few times if it fails
          });
          console.log('✅ Primary transaction method successful, signature:', signature);
        } catch (primaryError) {
          console.error('❌ Primary transaction method failed:', primaryError);
          
          if (primaryError instanceof Error && 
             (primaryError.message.includes('Unexpected error') || 
              primaryError.message.includes('User rejected'))) {
              
            console.log('🔄 Falling back to alternate transaction method: manual sign + send');
            
            // APPROACH 2: Fallback - manually sign the transaction and send it
            toast({
              title: 'Primary transaction method failed',
              description: 'Trying alternate method...',
            });
            
            try {
              // Get fresh blockhash
              const { blockhash, lastValidBlockHeight } = 
                await connection.getLatestBlockhash('finalized');
              decodedTransaction.recentBlockhash = blockhash;
              decodedTransaction.lastValidBlockHeight = lastValidBlockHeight;
              
              // Manually sign the transaction
              const signedTransaction = await signTransaction(decodedTransaction);
              
              // Send the signed transaction
              signature = await connection.sendRawTransaction(
                signedTransaction.serialize(),
                { 
                  skipPreflight: false,
                  preflightCommitment: 'confirmed',
                  maxRetries: 5
                }
              );
              console.log('✅ Alternate transaction method successful, signature:', signature);
            } catch (fallbackError) {
              console.error('❌ Alternate transaction method failed:', fallbackError);
              
              // APPROACH 3: Server-side fallback
              console.log('🔄 Falling back to server-side transaction submission');
              toast({
                title: 'Local transaction methods failed',
                description: 'Trying server-side submission...',
              });
              
              // Use server-side fallback
              const serverSubmitResponse = await fetch('/api/process-transaction-server-side', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  walletAddress: publicKey.toString(),
                  transactionBase64: transactionData.transaction,
                  amount: amount,
                  transactionType: 'stake',
                  useServerSigning: true
                })
              });
              
              if (!serverSubmitResponse.ok) {
                const serverError = await serverSubmitResponse.json();
                throw new Error(`Server-side submission failed: ${serverError.error || serverSubmitResponse.statusText}`);
              }
              
              const serverResult = await serverSubmitResponse.json();
              signature = serverResult.signature;
              console.log('✅ Server-side transaction method successful, signature:', signature);
            }
          } else {
            // Not an "Unexpected error", rethrow
            throw primaryError;
          }
        }
        
        console.log('Transaction sent with signature:', signature);
        
        toast({
          title: 'Transaction submitted',
          description: 'Waiting for confirmation...',
        });
        
        // Wait for confirmation
        const confirmationResult = await connection.confirmTransaction({
          signature,
          blockhash: decodedTransaction.recentBlockhash!, 
          lastValidBlockHeight: decodedTransaction.lastValidBlockHeight!
        }, 'confirmed');
        
        if (confirmationResult.value.err) {
          console.error('Transaction confirmed but has errors:', confirmationResult.value.err);
          throw new Error(`Transaction confirmed but has errors: ${JSON.stringify(confirmationResult.value.err)}`);
        }
        
        console.log('Transaction confirmed successfully:', confirmationResult);
      } catch (txError) {
        console.error('Transaction send/confirm error:', txError);
        throw new Error(`Transaction error: ${txError instanceof Error ? txError.message : String(txError)}`);
      }
      
      // Ensure we have a signature before proceeding
      if (!signature) {
        throw new Error('Transaction failed: No signature returned');
      }
      
      // Notify server about the completed staking transaction
      const confirmResponse = await fetch('/api/confirm-staking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          amount: amount,
          transactionSignature: signature
        }),
      });
      
      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Failed to confirm staking transaction');
      }
      
      const confirmData = await confirmResponse.json();
      
      if (confirmData.success) {
        toast({
          title: 'Staking successful',
          description: `Successfully staked ${amount} HATM tokens`,
          variant: 'default'
        });
        
        // Update all data
        refreshAllData();
        refreshBalance();
        
        // Clear the input
        setStakeAmount('');
      }
    } catch (error) {
      console.error('Staking error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stake tokens',
        variant: 'destructive'
      });
    } finally {
      setIsStaking(false);
    }
  };
  
  // Function to handle unstaking
  const handleUnstake = async () => {
    if (!connected || !publicKey || !signTransaction || !sendTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to unstake tokens',
        variant: 'destructive'
      });
      return;
    }
    
    if (!unstakeAmount || isNaN(Number(unstakeAmount)) || Number(unstakeAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount to unstake',
        variant: 'destructive'
      });
      return;
    }
    
    const unstakeValue = Number(unstakeAmount);
    const stakedAmount = stakingInfo?.amountStaked || 0;
    
    if (unstakeValue > stakedAmount) {
      toast({
        title: 'Insufficient staked balance',
        description: `You only have ${formatNumber(stakedAmount)} tokens staked`,
        variant: 'destructive'
      });
      return;
    }

    setIsUnstaking(true);
    
    try {
      toast({
        title: 'Processing Unstake Request',
        description: 'Creating unstake transaction...',
      });
      
      // Create unstake transaction
      const unstakeResponse = await fetch('/api/unstake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          amount: unstakeValue
        }),
      });
      
      if (!unstakeResponse.ok) {
        const errorData = await unstakeResponse.json();
        throw new Error(errorData.error || 'Failed to create unstake transaction');
      }
      
      const unstakeData = await unstakeResponse.json();

      // Check if we got a transaction to sign or a direct result (fallback method)
      if (unstakeData.success && unstakeData.transaction) {
        // Smart contract approach - use the transaction
        const transactionBase64 = unstakeData.transaction;
        
        // Use the same base64 decoding method as staking
        let transaction: Transaction;
        
        try {
          console.log('Attempting to deserialize unstake transaction:', transactionBase64);
          
          // Use the shared utility function
          const transactionBytes = base64ToUint8Array(transactionBase64);
          
          // Create Transaction from bytes
          transaction = Transaction.from(transactionBytes);
          console.log('Successfully deserialized unstake transaction');
        } catch (e: any) {
          console.error('Error deserializing unstake transaction:', e);
          try {
            // Try direct method as fallback
            transaction = Transaction.from(transactionBase64);
            console.log('Successfully deserialized unstake transaction using direct method');
          } catch (e2: any) {
            console.error('All unstake deserialization methods failed:', e2);
            throw new Error(`Failed to decode unstake transaction: ${e2.message}`);
          }
        }
        
        toast({
          title: 'Waiting for approval',
          description: 'Please approve the transaction in your wallet',
        });
        
        // Setup Solana connection
        const connection = new Connection(clusterApiUrl('devnet'));
        
        // Send the transaction to the network
        const signature = await sendTransaction(transaction, connection);
        
        toast({
          title: 'Transaction submitted',
          description: 'Waiting for confirmation...',
        });
        
        // Wait for the transaction to confirm
        await connection.confirmTransaction(signature, 'confirmed');
        
        toast({
          title: 'Unstaking successful',
          description: `Successfully unstaked ${unstakeValue} tokens`,
          variant: 'default'
        });
      } else if (unstakeData.transactionSignature) {
        // Fallback method - the server already processed the unstake
        toast({
          title: 'Unstaking successful',
          description: `Successfully unstaked ${unstakeValue} tokens (fallback method)`,
          variant: 'default'
        });
      } else {
        throw new Error('Invalid response from server');
      }
      
      // After successful unstake, update the UI to reflect the change immediately
      // This helps avoid UI lag while waiting for the blockchain data to update
      if (stakingInfo) {
        // Immediate UI update to make it responsive
        const updatedStakedAmount = Math.max(0, stakedAmount - unstakeValue);
        // Update UI directly for immediate feedback
        stakingInfo.amountStaked = updatedStakedAmount;
      }
      
      // Update all data
      refreshAllData();
      refreshBalance();
      
      // Clear the input
      setUnstakeAmount('');
    } catch (error) {
      console.error('Unstaking error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unstake tokens',
        variant: 'destructive'
      });
    } finally {
      setIsUnstaking(false);
    }
  };
  
  // Function to handle claiming rewards
  const handleClaimRewards = async () => {
    if (!connected || !publicKey || !signTransaction || !sendTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to claim rewards',
        variant: 'destructive'
      });
      return;
    }
    
    const pendingRewards = stakingInfo?.pendingRewards || 0;
    
    if (pendingRewards <= 0) {
      toast({
        title: 'No rewards to claim',
        description: 'You don\'t have any pending rewards to claim',
        variant: 'destructive'
      });
      return;
    }
    
    setIsClaiming(true);
    
    try {
      toast({
        title: 'Processing Claim Request',
        description: 'Creating claim rewards transaction...',
      });
      
      // Create claim transaction
      const claimResponse = await fetch('/api/claim-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString()
        }),
      });
      
      if (!claimResponse.ok) {
        const errorData = await claimResponse.json();
        throw new Error(errorData.error || 'Failed to create claim transaction');
      }
      
      const claimData = await claimResponse.json();
      
      if (claimData.success && claimData.transaction) {
        // Get the base64 encoded transaction
        const transactionBase64 = claimData.transaction;
        
        // Use the same base64 decoding method as staking and unstaking
        let transaction: Transaction;
        
        try {
          console.log('Attempting to deserialize claim transaction:', transactionBase64);
          
          // Use the shared utility function
          const transactionBytes = base64ToUint8Array(transactionBase64);
          
          // Create Transaction from bytes
          transaction = Transaction.from(transactionBytes);
          console.log('Successfully deserialized claim transaction');
        } catch (e: any) {
          console.error('Error deserializing claim transaction:', e);
          try {
            // Try direct method as fallback
            transaction = Transaction.from(transactionBase64);
            console.log('Successfully deserialized claim transaction using direct method');
          } catch (e2: any) {
            console.error('All claim deserialization methods failed:', e2);
            throw new Error(`Failed to decode claim transaction: ${e2.message}`);
          }
        }
        
        toast({
          title: 'Waiting for approval',
          description: 'Please approve the transaction in your wallet',
        });
        
        // Setup Solana connection
        const connection = new Connection(clusterApiUrl('devnet'));
        
        // Send the transaction to the network
        const signature = await sendTransaction(transaction, connection);
        
        toast({
          title: 'Transaction submitted',
          description: 'Waiting for confirmation...',
        });
        
        // Wait for the transaction to confirm
        await connection.confirmTransaction(signature, 'confirmed');
        
        toast({
          title: 'Claim successful',
          description: `Successfully claimed ${formatNumber(pendingRewards)} tokens`,
          variant: 'default'
        });
        
        // Update all data
        refreshAllData();
        refreshBalance();
      }
    } catch (error) {
      console.error('Claiming error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to claim rewards',
        variant: 'destructive'
      });
    } finally {
      setIsClaiming(false);
    }
  };
  
  // Handle max button click for staking
  const handleMaxStake = async () => {
    if (!connected || !publicKey) return;
    
    try {
      const connection = new Connection(clusterApiUrl('devnet'));
      
      // Get token balance using utility function
      const response = await fetch(`/api/token-balance/${publicKey.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token balance');
      }
      
      const data = await response.json();
      if (data.success && data.balance !== undefined) {
        // Set 95% of balance to account for transaction fees
        const maxAmount = Math.floor(data.balance * 0.95);
        setStakeAmount(maxAmount.toString());
      } else {
        toast({
          title: 'Balance Error',
          description: 'Could not retrieve token balance',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error getting max stake amount:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate maximum stake amount',
        variant: 'destructive'
      });
    }
  };
  
  // Handle max button click for unstaking
  const handleMaxUnstake = () => {
    const stakedAmount = stakingInfo?.amountStaked || 0;
    setUnstakeAmount(stakedAmount.toString());
  };
  
  // Function to refresh blockchain data
  const refreshBlockchainData = async () => {
    if (!connected || !publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to refresh data',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSyncing(true);
    
    try {
      console.log("🔄 Starting blockchain data refresh for wallet:", publicKey.toString());
      console.log("🌐 Network:", new Connection(clusterApiUrl('devnet')).rpcEndpoint);
      
      toast({
        title: 'Refreshing Data',
        description: 'Fetching latest blockchain data...',
      });
      
      // Try to sync with our server-side API
      try {
        console.log("📡 Sending force-sync request to API");
        const response = await fetch('/api/force-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: publicKey.toString()
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.warn('⚠️ Data refresh warning:', errorData.error || 'API returned error status');
        } else {
          const syncData = await response.json();
          console.log("✅ API force-sync response:", syncData);
          
          if (syncData.success) {
            toast({
              title: 'Data Refresh Complete',
              description: 'Successfully refreshed staking data',
              variant: 'default'
            });
          }
        }
      } catch (apiError) {
        console.warn('⚠️ API refresh error (will still try local refresh):', apiError);
      }
      
      console.log("🔄 Refreshing data from all sources");
      // Refresh our data from all sources
      await Promise.all([
        refreshAllData(),
        refreshBalance()
      ]);
      console.log("✅ Data refresh complete");
      
    } catch (error: any) {
      console.error('🧨 Data refresh error:', error);
      if (error.logs) console.log("📄 Logs:", error.logs);
      if (error.message) console.log("📢 Message:", error.message);
      
      toast({
        title: 'Refresh error',
        description: error instanceof Error ? error.message : 'Failed to refresh data',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Render data source badge
  const renderDataSourceBadge = () => {
    if (!stakingInfo?.dataSource) return null;
    
    return (
      <Badge 
        className="ml-2" 
        variant={stakingInfo.dataSource === 'blockchain' ? 'default' : 'outline'}
      >
        {stakingInfo.dataSource === 'blockchain' ? 'On-chain' : 
         stakingInfo.dataSource === 'helius' ? 'Helius API' : 
         stakingInfo.dataSource}
      </Badge>
    );
  };
  
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stake HATM Tokens</CardTitle>
            <CardDescription>Earn up to {stakingStats?.currentAPY || 0}% APY</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refreshBlockchainData()}
            disabled={loading || isSyncing}
          >
            <RefreshCcw className={`h-4 w-4 ${loading || isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Staking Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-primary/5 rounded-md p-3">
            <div className="text-sm text-muted-foreground">Staked Balance</div>
            <div className="flex items-center mt-1">
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <GradientText className="font-bold text-lg">
                  {formatNumber(stakingInfo?.amountStaked || 0)}
                </GradientText>
              )}
              {renderDataSourceBadge()}
            </div>
          </div>
          
          <div className="bg-primary/5 rounded-md p-3">
            <div className="text-sm text-muted-foreground">Pending Rewards</div>
            <div className="mt-1">
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <GradientText className="font-bold text-lg">
                  {formatNumber(stakingInfo?.pendingRewards || 0)}
                </GradientText>
              )}
            </div>
          </div>
        </div>
        
        {/* APY and Time Until Unlock */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground flex items-center">
              <Award className="h-4 w-4 mr-1" />
              Estimated APY
            </span>
            {loading ? (
              <Skeleton className="h-5 w-16" />
            ) : (
              <span className="font-semibold">{stakingInfo?.estimatedAPY || 0}%</span>
            )}
          </div>
          
          {stakingInfo?.timeUntilUnlock ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Time until unlock
              </span>
              {loading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span className="font-semibold">
                  {formatTimeRemaining(stakingInfo.timeUntilUnlock)}
                </span>
              )}
            </div>
          ) : stakingInfo?.amountStaked && stakingInfo.amountStaked > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center">
                <Info className="h-4 w-4 mr-1" />
                Status
              </span>
              <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-600">
                Unlocked
              </Badge>
            </div>
          ) : null}
        </div>
        
        {/* Staking Actions */}
        <Tabs defaultValue="stake" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stake">Stake</TabsTrigger>
            <TabsTrigger value="unstake">Unstake</TabsTrigger>
            <TabsTrigger value="claim">Claim</TabsTrigger>
          </TabsList>
          
          {/* Stake Tab */}
          <TabsContent value="stake" className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stake-amount">Amount to Stake</Label>
                <div className="flex space-x-2">
                  <Input
                    id="stake-amount"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    type="number"
                    min="0"
                    disabled={isStaking || !connected}
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleMaxStake}
                    disabled={isStaking || !connected}
                  >
                    Max
                  </Button>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleStake}
                disabled={isStaking || !connected || !stakeAmount}
              >
                {isStaking ? 'Staking...' : 'Stake Tokens'}
              </Button>
            </div>
          </TabsContent>
          
          {/* Unstake Tab */}
          <TabsContent value="unstake" className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unstake-amount">Amount to Unstake</Label>
                <div className="flex space-x-2">
                  <Input
                    id="unstake-amount"
                    placeholder="0.00"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    type="number"
                    min="0"
                    max={stakingInfo?.amountStaked?.toString() || "0"}
                    disabled={isUnstaking || !connected}
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleMaxUnstake}
                    disabled={isUnstaking || !connected}
                  >
                    Max
                  </Button>
                </div>
              </div>
              
              {stakingInfo?.timeUntilUnlock && (
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Early withdrawal fee</AlertTitle>
                  <AlertDescription>
                    A 10% fee applies when unstaking before the lock period ends.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                className="w-full" 
                onClick={handleUnstake}
                disabled={isUnstaking || !connected || !unstakeAmount || Number(unstakeAmount) <= 0 || Number(unstakeAmount) > (stakingInfo?.amountStaked || 0)}
              >
                {isUnstaking ? 'Unstaking...' : 'Unstake Tokens'}
              </Button>
            </div>
          </TabsContent>
          
          {/* Claim Tab */}
          <TabsContent value="claim" className="py-4">
            <div className="space-y-4">
              <div className="bg-primary/5 p-4 rounded-md">
                <div className="text-sm text-muted-foreground mb-2">Available Rewards</div>
                <div className="text-xl font-bold">
                  {loading ? (
                    <Skeleton className="h-6 w-28" />
                  ) : (
                    formatNumber(stakingInfo?.pendingRewards || 0)
                  )}
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleClaimRewards}
                disabled={isClaiming || !connected || !(stakingInfo?.pendingRewards && stakingInfo.pendingRewards > 0)}
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Global Staking Statistics */}
        <div className="mt-6 pt-6 border-t">
          <div className="text-sm text-muted-foreground mb-3">Global Staking Statistics</div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Total Staked</div>
              <div className="font-semibold">
                {loading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  formatNumber(stakingStats?.totalStaked || 0)
                )}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground">Total Stakers</div>
              <div className="font-semibold">
                {loading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  formatNumber(stakingStats?.stakersCount || 0)
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectStakingWidget;