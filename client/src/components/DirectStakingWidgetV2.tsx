import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Connection, 
  clusterApiUrl, 
  Transaction, 
  PublicKey 
} from '@solana/web3.js';
import { 
  useConnection, 
  useWallet 
} from '@solana/wallet-adapter-react';
import { stakeExistingTokens } from '@/lib/api-client';
import { formatNumber, formatAsPercent } from '@/lib/utils';
import { createAndSubmitStakingTransaction } from '@/lib/CreateStakingTransactionV2';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { RefreshCw } from 'lucide-react';

// Utility function to convert base64 to Uint8Array (for Transaction)
function base64ToUint8Array(base64String: string): Uint8Array {
  // First, decode base64 to binary string
  const binaryString = atob(base64String);
  // Create a buffer to hold the bytes
  const bytes = new Uint8Array(binaryString.length);
  // Fill the buffer with the bytes of the binary string
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function DirectStakingWidget() {
  const { toast } = useToast();
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet();
  
  // States for input fields
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  
  // States for loading indicators
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [isUnstaking, setIsUnstaking] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Transaction status updates
  const [txStatus, setTxStatus] = useState<string>("");
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  
  // Function to update transaction status with fallback indicator
  const updateTxStatus = (status: string, isFallback = false) => {
    setTxStatus(status);
    if (isFallback) setUsingFallback(true);
  };
  
  // State for staking info and token balance
  const [stakingInfo, setStakingInfo] = useState<any>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  
  // Function to fetch user's staking info
  const fetchStakingInfo = async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`/api/staking-info/${publicKey.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch staking info');
      }
      
      const data = await response.json();
      console.log('Staking info:', data);
      setStakingInfo(data);
    } catch (error) {
      console.error('Error fetching staking info:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch staking information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to fetch user's token balance
  const fetchTokenBalance = async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`/api/token-balance/${publicKey.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token balance');
      }
      
      const data = await response.json();
      console.log('Token balance:', data);
      setTokenBalance(data.balance / Math.pow(10, 9)); // Convert from lamports
    } catch (error) {
      console.error('Error fetching token balance:', error);
    }
  };
  
  // Function to refresh all data
  const refreshAllData = async () => {
    setIsLoading(true);
    await fetchStakingInfo();
    await fetchTokenBalance();
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (publicKey) {
      refreshAllData();
    }
  }, [publicKey]);
  
  // Function to handle manual refresh
  const handleRefresh = async () => {
    setIsSyncing(true);
    await refreshAllData();
    setIsSyncing(false);
  };
  
  // Function to handle staking in a single transaction with enhanced logging and error handling
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
    setTxStatus("");
    setUsingFallback(false);
    
    try {
      // Set up connection to Solana
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      toast({
        title: 'Processing Stake Request',
        description: 'Creating stake transaction...',
      });
      
      // Create a wallet object to pass to stakeExistingTokens
      const wallet = { 
        sendTransaction, 
        publicKey
      };
      
      // Create a status callback function to update UI
      const statusCallback = (status: string, isFallback: boolean) => {
        console.log(`Transaction status: ${status}${isFallback ? " (fallback)" : ""}`);
        updateTxStatus(status, isFallback);
      };
      
      updateTxStatus("Preparing transaction...");
      
      // Use our enhanced transaction function for staking
      const result = await createAndSubmitStakingTransaction(
        connection,
        publicKey,
        amount,
        wallet,
        true, // Use existing tokens (don't buy new ones)
        {
          onStatusUpdate: statusCallback,
          skipPreflight: false,
          maxRetries: 3
        }
      );
      
      if (result.success) {
        toast({
          title: 'Staking successful',
          description: `Successfully staked ${amount} HATM tokens`,
          variant: 'default'
        });
        
        // Update all data
        console.log('🔄 Refreshing data after successful staking...');
        await refreshAllData();
        
        // Clear the input
        setStakeAmount('');
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error: any) {
      console.error('🧨 Staking failed:', error);
      if (error.logs) console.log("📄 Logs:", error.logs);
      if (error.message) console.log("📢 Message:", error.message);
      
      toast({
        title: 'Staking Error',
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
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      console.log("🚀 Starting unstaking process");
      console.log("👛 Wallet public key:", publicKey.toString());
      console.log("🔢 Amount to unstake:", unstakeValue);
      console.log("🔗 Network:", connection.rpcEndpoint);
      
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
        console.error('❌ Unstake request failed:', errorData);
        throw new Error(errorData.error || 'Failed to create unstake transaction');
      }
      
      const unstakeData = await unstakeResponse.json();
      console.log('📦 Unstake response data:', unstakeData);

      // Check if we got a transaction to sign or a direct result (fallback method)
      if (unstakeData.success && unstakeData.transaction) {
        // Smart contract approach - use the transaction
        const transactionBase64 = unstakeData.transaction;
        
        // Use the same base64 decoding method as staking
        let transaction: Transaction;
        
        try {
          console.log('🔍 Attempting to deserialize unstake transaction');
          
          // Use the shared utility function
          const transactionBytes = base64ToUint8Array(transactionBase64);
          
          // Create Transaction from bytes
          transaction = Transaction.from(transactionBytes);
          console.log('✅ Successfully deserialized unstake transaction');
          
          // Ensure fee payer is set
          if (!transaction.feePayer) {
            console.log('⚠️ Setting fee payer to current wallet');
            transaction.feePayer = publicKey;
          }
          
          // Ensure recent blockhash is set
          if (!transaction.recentBlockhash) {
            console.log('⚠️ Getting fresh blockhash for transaction');
            const { blockhash } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = blockhash;
          }
          
        } catch (e: any) {
          console.error('❌ Error deserializing unstake transaction:', e);
          try {
            // Try direct method as fallback
            transaction = Transaction.from(transactionBase64);
            console.log('✅ Successfully deserialized unstake transaction using direct method');
          } catch (e2: any) {
            console.error('❌ All unstake deserialization methods failed:', e2);
            throw new Error(`Failed to decode unstake transaction: ${e2.message}`);
          }
        }
        
        toast({
          title: 'Waiting for approval',
          description: 'Please approve the transaction in your wallet',
        });
        
        // Send the transaction to the network
        console.log('📡 Sending unstake transaction to the network...');
        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });
        
        console.log('✈️ Unstake transaction sent with signature:', signature);
        
        toast({
          title: 'Transaction submitted',
          description: 'Waiting for confirmation...',
        });
        
        // Wait for the transaction to confirm
        console.log('⏳ Waiting for unstake transaction confirmation...');
        const confirmationResult = await connection.confirmTransaction({
          signature,
          blockhash: transaction.recentBlockhash!, 
          lastValidBlockHeight: transaction.lastValidBlockHeight!
        }, 'confirmed');
        
        if (confirmationResult.value.err) {
          console.error('❌ Unstake transaction confirmed but has errors:', confirmationResult.value.err);
          throw new Error(`Unstake transaction confirmed with errors: ${JSON.stringify(confirmationResult.value.err)}`);
        }
        
        console.log('✅ Unstake transaction confirmed successfully');
        
        toast({
          title: 'Unstaking successful',
          description: `Successfully unstaked ${unstakeValue} tokens`,
          variant: 'default'
        });
      } else if (unstakeData.transactionSignature) {
        // Fallback method - the server already processed the unstake
        console.log('✅ Unstake processed by server with signature:', unstakeData.transactionSignature);
        toast({
          title: 'Unstaking successful',
          description: `Successfully unstaked ${unstakeValue} tokens (fallback method)`,
          variant: 'default'
        });
      } else {
        throw new Error('Invalid response from server');
      }
      
      // Update all data after unstaking
      console.log('🔄 Refreshing data after successful unstaking...');
      await refreshAllData();
      
      // Clear the input
      setUnstakeAmount('');
      
    } catch (error: any) {
      console.error('🧨 Unstaking failed:', error);
      if (error.logs) console.log("📄 Logs:", error.logs);
      if (error.message) console.log("📢 Message:", error.message);
      
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
      
      console.log("🚀 Starting reward claim process");
      console.log("👛 Wallet public key:", publicKey.toString());
      console.log("🔢 Pending rewards:", pendingRewards);
      
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
        console.error('❌ Claim request failed:', errorData);
        throw new Error(errorData.error || 'Failed to create claim transaction');
      }
      
      const claimData = await claimResponse.json();
      console.log('📦 Claim response data:', claimData);
      
      if (claimData.success && claimData.transaction) {
        // Get the base64 encoded transaction
        const transactionBase64 = claimData.transaction;
        
        // Use the same base64 decoding method as staking and unstaking
        let transaction: Transaction;
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        try {
          console.log('🔍 Attempting to deserialize claim transaction');
          
          // Use the shared utility function
          const transactionBytes = base64ToUint8Array(transactionBase64);
          
          // Create Transaction from bytes
          transaction = Transaction.from(transactionBytes);
          console.log('✅ Successfully deserialized claim transaction');
          
          // Ensure fee payer is set
          if (!transaction.feePayer) {
            console.log('⚠️ Setting fee payer to current wallet');
            transaction.feePayer = publicKey;
          }
          
          // Ensure recent blockhash is set
          if (!transaction.recentBlockhash) {
            console.log('⚠️ Getting fresh blockhash for transaction');
            const { blockhash } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = blockhash;
          }
          
        } catch (e: any) {
          console.error('❌ Error deserializing claim transaction:', e);
          try {
            // Try direct method as fallback
            transaction = Transaction.from(transactionBase64);
            console.log('✅ Successfully deserialized claim transaction using direct method');
          } catch (e2: any) {
            console.error('❌ All claim deserialization methods failed:', e2);
            throw new Error(`Failed to decode claim transaction: ${e2.message}`);
          }
        }
        
        toast({
          title: 'Waiting for approval',
          description: 'Please approve the transaction in your wallet',
        });
        
        // Send the transaction to the network
        console.log('📡 Sending claim transaction to the network...');
        const signature = await sendTransaction(transaction, connection);
        
        console.log('✈️ Claim transaction sent with signature:', signature);
        
        toast({
          title: 'Transaction submitted',
          description: 'Waiting for confirmation...',
        });
        
        // Wait for the transaction to confirm
        console.log('⏳ Waiting for claim transaction confirmation...');
        await connection.confirmTransaction(signature, 'confirmed');
        
        console.log('✅ Claim transaction confirmed successfully');
        
        toast({
          title: 'Rewards claimed',
          description: `Successfully claimed ${formatNumber(pendingRewards)} tokens`,
          variant: 'default'
        });
      } else if (claimData.transactionSignature) {
        // Fallback method - the server already processed the claim
        console.log('✅ Claim processed by server with signature:', claimData.transactionSignature);
        toast({
          title: 'Rewards claimed',
          description: `Successfully claimed ${formatNumber(pendingRewards)} tokens (fallback method)`,
          variant: 'default'
        });
      } else {
        throw new Error('Invalid response from server');
      }
      
      // Update all data after claiming
      console.log('🔄 Refreshing data after successful claim...');
      await refreshAllData();
      
    } catch (error: any) {
      console.error('🧨 Claiming rewards failed:', error);
      if (error.logs) console.log("📄 Logs:", error.logs);
      if (error.message) console.log("📢 Message:", error.message);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to claim rewards',
        variant: 'destructive'
      });
    } finally {
      setIsClaiming(false);
    }
  };
  
  // Render loading state if data is being loaded
  if (isLoading && publicKey) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Staking</span>
            <Button
              variant="ghost"
              onClick={handleRefresh}
              disabled={isSyncing}
              size="icon"
            >
              {isSyncing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render wallet not connected state
  if (!publicKey) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Staking</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p>Please connect your wallet to view staking options.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate the percentage of staked tokens
  const stakedAmount = stakingInfo?.amountStaked || 0;
  const totalTokens = tokenBalance + stakedAmount;
  const stakedPercentage = totalTokens > 0 ? (stakedAmount / totalTokens) * 100 : 0;
  
  // Format time until unlock
  const formatTimeUntilUnlock = () => {
    if (!stakingInfo?.timeUntilUnlock) return 'Not locked';
    
    const seconds = stakingInfo.timeUntilUnlock;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };
  
  // Main component render
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Staking</span>
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={isSyncing}
            size="icon"
            title="Refresh staking data"
          >
            {isSyncing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm">Total Staked</span>
            <span className="font-medium">{formatNumber(stakedAmount)} HATM</span>
          </div>
          
          <div className="space-y-1">
            <Progress value={stakedPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatAsPercent(stakedPercentage)}% of your tokens</span>
              <span>APY: {stakingInfo?.estimatedAPY || 0}%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Pending Rewards</span>
            <span className="font-medium">{formatNumber(stakingInfo?.pendingRewards || 0)} HATM</span>
          </div>
          
          {stakingInfo?.isLocked && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Unlock Status</span>
              <span className="font-medium">{formatTimeUntilUnlock()}</span>
            </div>
          )}
        </div>
        
        <Tabs defaultValue="stake" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stake">Stake</TabsTrigger>
            <TabsTrigger value="unstake">Unstake</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stake" className="space-y-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Available Balance</span>
              <span className="font-medium">{formatNumber(tokenBalance)} HATM</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Amount to stake"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  disabled={isStaking}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStakeAmount(tokenBalance.toString())}
                  disabled={isStaking || tokenBalance <= 0}
                >
                  Max
                </Button>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleStake} 
                disabled={isStaking || !tokenBalance}
              >
                {isStaking ? <Spinner size="sm" className="mr-2" /> : null}
                {isStaking ? 'Staking...' : 'Stake Tokens'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="unstake" className="space-y-4 mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Staked Balance</span>
              <span className="font-medium">{formatNumber(stakedAmount)} HATM</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Amount to unstake"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  disabled={isUnstaking}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnstakeAmount(stakedAmount.toString())}
                  disabled={isUnstaking || stakedAmount <= 0}
                >
                  Max
                </Button>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleUnstake} 
                disabled={isUnstaking || !stakedAmount}
              >
                {isUnstaking ? <Spinner size="sm" className="mr-2" /> : null}
                {isUnstaking ? 'Unstaking...' : 'Unstake Tokens'}
              </Button>
            </div>
            
            {stakingInfo?.isLocked && (
              <div className="text-sm text-amber-500 mt-2">
                <p>Warning: Early unstaking will incur a 25% penalty.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {(stakingInfo?.pendingRewards || 0) > 0 && (
          <div className="mt-6">
            <Button 
              className="w-full" 
              variant="secondary"
              onClick={handleClaimRewards}
              disabled={isClaiming || (stakingInfo?.pendingRewards || 0) <= 0}
            >
              {isClaiming ? <Spinner size="sm" className="mr-2" /> : null}
              {isClaiming ? 'Claiming...' : `Claim ${formatNumber(stakingInfo?.pendingRewards || 0)} HATM Rewards`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}