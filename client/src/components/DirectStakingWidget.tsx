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
import { AlertCircle, Clock, Coins, Award, RefreshCcw, Info } from 'lucide-react';
import { GradientText } from '@/components/ui/gradient-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatNumber, formatTimeRemaining } from '@/lib/utils';
import { Connection, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import { buyAndStakeTokens, stakeExistingTokens } from '@/lib/direct-solana-client';

// Optional Helius API key - would be set from environment in production
const HELIUS_API_KEY = '';

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
      // Get referral code from URL if present
      const searchParams = new URLSearchParams(window.location.search);
      const referralCode = searchParams.get('ref');
      
      toast({
        title: 'Processing Stake Request',
        description: 'Creating buy and stake transaction...',
      });
      
      // Step 1: Use our direct-solana-client to get the transaction
      const buyStakeResult = await buyAndStakeTokens(
        publicKey.toString(),
        amount,
        referralCode || undefined
      );
      
      // Check if there was an error in creating the transaction
      if (buyStakeResult.error) {
        throw new Error(buyStakeResult.error);
      }
      
      // Check if we have transaction details
      if (!buyStakeResult.transactionDetails) {
        throw new Error('No transaction details received');
      }
      
      const txDetails = buyStakeResult.transactionDetails;
      
      // If the transaction needs to be signed by the user
      if (txDetails.solTransferTransaction) {
        toast({
          title: 'Waiting for approval',
          description: 'Please approve the SOL transfer transaction in your wallet',
        });
        
        // Decode the transaction
        const txBuffer = Uint8Array.from(atob(txDetails.solTransferTransaction), c => c.charCodeAt(0));
        const transaction = Transaction.from(txBuffer);
        
        // Setup Solana connection
        const connection = new Connection(clusterApiUrl('devnet'));
        
        // Sign and send the transaction
        const signature = await sendTransaction(transaction, connection);
        
        toast({
          title: 'Transaction submitted',
          description: 'Waiting for confirmation...',
        });
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        
        // Step 2: After SOL transfer, call confirm-purchase endpoint
        const confirmResponse = await fetch('/api/complete-purchase-and-stake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            tokenAmount: txDetails.tokenAmount,
            solAmount: txDetails.solAmount,
            solTransferSignature: signature,
            referralCode
          }),
        });
        
        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          throw new Error(errorData.error || 'Failed to complete purchase and stake');
        }
        
        const confirmData = await confirmResponse.json();
        
        if (confirmData.success) {
          const referralMessage = referralCode 
            ? ` using referral code ${referralCode}`
            : '';
          
          toast({
            title: 'Staking successful',
            description: `Successfully purchased and staked ${txDetails.tokenAmount} tokens${referralMessage}`,
            variant: 'default'
          });
          
          // Update all data
          refreshAllData();
          refreshBalance();
          
          // Clear the input
          setStakeAmount('');
        }
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
      
      if (unstakeData.success && unstakeData.transaction) {
        // Deserialize and sign the transaction
        const txBuffer = Uint8Array.from(atob(unstakeData.transaction), c => c.charCodeAt(0));
        const transaction = Transaction.from(txBuffer);
        
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
        
        // Update all data
        refreshAllData();
        refreshBalance();
        
        // Clear the input
        setUnstakeAmount('');
      }
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
        // Deserialize and sign the transaction
        const txBuffer = Uint8Array.from(atob(claimData.transaction), c => c.charCodeAt(0));
        const transaction = Transaction.from(txBuffer);
        
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
            onClick={() => refreshAllData()}
            disabled={loading}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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