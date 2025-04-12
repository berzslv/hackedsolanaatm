import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, ArrowLeftRight, Clock, CheckCircle, Leaf } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useSolana } from "@/context/SolanaContext";
import { useTokenData } from "@/context/TokenDataContext";
import { Connection, VersionedTransaction, Transaction, clusterApiUrl, MessageV0 } from "@solana/web3.js";
import { StakingVaultClient } from "@/lib/staking-vault-client";

interface StakingInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastClaimAt: Date;
  estimatedAPY: number;
  timeUntilUnlock: number | null;
}

interface StakingStats {
  totalStaked: number;
  rewardPool: number;
  stakersCount: number;
  currentAPY: number;
}

// Correct token mint address
const TOKEN_MINT_ADDRESS = "12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5";

const StakingWidgetSmartContract: React.FC = () => {
  const { connected, publicKey, signTransaction, sendTransaction, balance, refreshBalance } = useSolana();
  const { 
    userTokenBalance, 
    userStakedBalance, 
    userPendingRewards,
    currentAPY,
    totalStaked,
    stakersCount,
    rewardPool,
    refreshTokenBalance 
  } = useTokenData();
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [unstakeAmount, setUnstakeAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [unstakeError, setUnstakeError] = useState<string | null>(null);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [stakingStats, setStakingStats] = useState<StakingStats | null>(null);
  const [stakingClient, setStakingClient] = useState<StakingVaultClient | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  
  // Initialize staking client
  useEffect(() => {
    if (connected && publicKey) {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const client = new StakingVaultClient(connection, publicKey, TOKEN_MINT_ADDRESS);
      setStakingClient(client);
      
      // Initialize client
      client.initialize().catch(console.error);
    }
  }, [connected, publicKey]);
  
  // Load user staking info and global stats
  useEffect(() => {
    if (!stakingClient || !connected || !publicKey) return;
    
    setInfoLoading(true);
    
    const loadData = async () => {
      try {
        // Fetch user staking info
        const userInfo = await stakingClient.getUserStakingInfo();
        setStakingInfo(userInfo);
        
        // Fetch global staking stats
        const stats = await stakingClient.getStakingStats();
        setStakingStats(stats);
        
        // Update token balance using TokenDataContext
        await refreshTokenBalance();
      } catch (error: any) {
        console.error("Failed to load staking data", error);
      } finally {
        setInfoLoading(false);
      }
    };
    
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [stakingClient, connected, publicKey]);
  
  const handleMaxStake = () => {
    setStakeAmount(userTokenBalance.toString());
  };
  
  const handleMaxUnstake = () => {
    if (stakingInfo) {
      setUnstakeAmount(stakingInfo.amountStaked.toString());
    }
  };
  
  const handleStake = async () => {
    if (!stakingClient || !sendTransaction || !publicKey) return;
    
    setStakeError(null);
    setLoading(true);
    
    try {
      const amount = parseInt(stakeAmount);
      if (isNaN(amount) || amount <= 0) {
        setStakeError("Please enter a valid amount to stake");
        setLoading(false);
        return;
      }
      
      if (amount > userTokenBalance) {
        setStakeError("Insufficient token balance");
        setLoading(false);
        return;
      }
      
      // Create the transaction
      const transaction = await stakingClient.createStakeTransaction(amount);
      console.log("Created stake transaction:", transaction);
      
      // Convert to VersionedTransaction for wallet
      const message = transaction.compileMessage();
      const versionedTransaction = new VersionedTransaction(message);
      
      // Send the transaction - will automatically be signed by wallet
      const signature = await sendTransaction(versionedTransaction);
      console.log("Stake transaction sent:", signature);

      // Call the confirm-staking endpoint to update database
      try {
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

        const confirmData = await confirmResponse.json();
        if (!confirmResponse.ok) {
          console.warn("Staking confirmation issue:", confirmData);
        } else {
          console.log("Staking confirmed in database:", confirmData);
        }
      } catch (confirmError: any) {
        console.error("Error confirming stake:", confirmError);
      }
      
      // Reset input
      setStakeAmount("");
      
      // Wait for confirmation and refresh data
      setTimeout(async () => {
        // Refresh staking info
        const userInfo = await stakingClient.getUserStakingInfo();
        setStakingInfo(userInfo);
        
        // Refresh token balance using context
        await refreshTokenBalance();
        
        setLoading(false);
      }, 5000);
    } catch (error: any) {
      console.error("Staking failed", error);
      setStakeError("Staking failed: " + (error.message || "Unknown error"));
      setLoading(false);
    }
  };
  
  const handleUnstake = async () => {
    if (!stakingClient || !sendTransaction || !publicKey) return;
    
    setUnstakeError(null);
    setLoading(true);
    
    try {
      const amount = parseInt(unstakeAmount);
      if (isNaN(amount) || amount <= 0) {
        setUnstakeError("Please enter a valid amount to unstake");
        setLoading(false);
        return;
      }
      
      if (!stakingInfo || amount > stakingInfo.amountStaked) {
        setUnstakeError("Insufficient staked balance");
        setLoading(false);
        return;
      }
      
      // Create transaction
      const transaction = await stakingClient.createUnstakeTransaction(amount);
      
      // Convert to VersionedTransaction for wallet
      const message = transaction.compileMessage();
      const versionedTransaction = new VersionedTransaction(message);
      
      // Send transaction
      const signature = await sendTransaction(versionedTransaction);
      console.log("Unstake transaction sent:", signature);
      
      // Reset input
      setUnstakeAmount("");
      
      // Wait for confirmation and refresh data
      setTimeout(async () => {
        // Refresh staking info
        const userInfo = await stakingClient.getUserStakingInfo();
        setStakingInfo(userInfo);
        
        // Refresh token balance using context
        await refreshTokenBalance();
        
        setLoading(false);
      }, 5000);
    } catch (error: any) {
      console.error("Unstaking failed", error);
      setUnstakeError("Unstaking failed: " + (error.message || "Unknown error"));
      setLoading(false);
    }
  };
  
  const handleClaimRewards = async () => {
    if (!stakingClient || !sendTransaction || !publicKey) return;
    
    setLoading(true);
    
    try {
      // Create claim rewards transaction
      const transaction = await stakingClient.createClaimRewardsTransaction();
      
      // Convert to VersionedTransaction for wallet
      const message = transaction.compileMessage();
      const versionedTransaction = new VersionedTransaction(message);
      
      // Send transaction
      const signature = await sendTransaction(versionedTransaction);
      console.log("Claim rewards transaction sent:", signature);
      
      // Wait for confirmation and refresh data
      setTimeout(async () => {
        // Refresh staking info
        const userInfo = await stakingClient.getUserStakingInfo();
        setStakingInfo(userInfo);
        
        // Refresh token balance using context
        await refreshTokenBalance();
        
        setLoading(false);
      }, 5000);
    } catch (error: any) {
      console.error("Claiming rewards failed", error);
      setLoading(false);
    }
  };
  
  const formatTokenAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };
  
  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Token Staking</CardTitle>
          <CardDescription>Stake your tokens to earn rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p className="text-center text-muted-foreground">
              Connect your wallet to access staking features
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">HackATM Token Staking</CardTitle>
        <CardDescription>Stake your tokens to earn up to 125% APY</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Staking Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Staked</p>
            {infoLoading ? (
              <Skeleton className="h-7 w-full mt-1" />
            ) : (
              <p className="font-bold">{formatTokenAmount(stakingStats?.totalStaked || 0)} HATM</p>
            )}
          </div>
          
          <div className="bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">APY</p>
            {infoLoading ? (
              <Skeleton className="h-7 w-full mt-1" />
            ) : (
              <p className="font-bold">{stakingStats?.currentAPY || 125}%</p>
            )}
          </div>
          
          <div className="bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Reward Pool</p>
            {infoLoading ? (
              <Skeleton className="h-7 w-full mt-1" />
            ) : (
              <p className="font-bold">{formatTokenAmount(stakingStats?.rewardPool || 0)} HATM</p>
            )}
          </div>
          
          <div className="bg-slate-900 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Stakers</p>
            {infoLoading ? (
              <Skeleton className="h-7 w-full mt-1" />
            ) : (
              <p className="font-bold">{stakingStats?.stakersCount || 0}</p>
            )}
          </div>
        </div>
        
        {/* User Staking Stats */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-md font-medium mb-3">Your Staking Position</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Staked Balance</p>
              {infoLoading ? (
                <Skeleton className="h-6 w-full" />
              ) : (
                <p className="font-semibold text-lg">{formatTokenAmount(stakingInfo?.amountStaked || 0)} HATM</p>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pending Rewards</p>
              {infoLoading ? (
                <Skeleton className="h-6 w-full" />
              ) : (
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-lg">{formatTokenAmount(stakingInfo?.pendingRewards || 0)} HATM</p>
                  {(stakingInfo?.pendingRewards || 0) > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleClaimRewards} 
                      disabled={loading || (stakingInfo?.pendingRewards || 0) <= 0}
                    >
                      Claim
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Lock Status</p>
              {infoLoading ? (
                <Skeleton className="h-6 w-full" />
              ) : (
                <div className="flex items-center text-lg">
                  {stakingInfo?.timeUntilUnlock ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      <span className="text-yellow-500">
                        {formatDistanceToNow(new Date(Date.now() + (stakingInfo.timeUntilUnlock || 0)), { addSuffix: true })}
                      </span>
                    </>
                  ) : (
                    stakingInfo?.amountStaked ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        <span className="text-green-500">Unlocked</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not staked</span>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          
          {stakingInfo?.amountStaked ? (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Estimated APY</span>
                <span className="font-medium">{stakingInfo?.estimatedAPY || 125}%</span>
              </div>
              <Progress 
                value={stakingInfo?.estimatedAPY || 0} 
                max={125} 
                className="h-2"
              />
            </div>
          ) : null}
        </div>
        
        {/* Stake & Unstake Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stake Form */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Stake Tokens</h3>
            
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className="text-sm font-medium">{formatTokenAmount(userTokenBalance)} HATM</span>
            </div>
            
            <div className="flex space-x-2">
              <div className="relative flex-grow">
                <Input
                  type="number"
                  placeholder="Amount to stake"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="pr-16"
                  min="0"
                  max={userTokenBalance}
                  disabled={loading}
                />
                <Button
                  className="absolute right-0 top-0 h-full rounded-l-none px-3"
                  variant="secondary"
                  onClick={handleMaxStake}
                  disabled={loading}
                >
                  MAX
                </Button>
              </div>
              
              <Button
                onClick={handleStake}
                disabled={loading || !stakeAmount || parseInt(stakeAmount) <= 0 || parseInt(stakeAmount) > userTokenBalance}
                className="w-24"
              >
                {loading ? "Staking..." : "Stake"}
              </Button>
            </div>
            
            {stakeError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {stakeError}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="text-xs text-muted-foreground">
              <p className="flex items-center">
                <Leaf className="mr-1 h-3 w-3" />
                Stake for 7+ days to avoid early withdrawal fees
              </p>
            </div>
          </div>
          
          {/* Unstake Form */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Unstake Tokens</h3>
            
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Staked Balance</span>
              <span className="text-sm font-medium">{formatTokenAmount(stakingInfo?.amountStaked || 0)} HATM</span>
            </div>
            
            <div className="flex space-x-2">
              <div className="relative flex-grow">
                <Input
                  type="number"
                  placeholder="Amount to unstake"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="pr-16"
                  min="0"
                  max={stakingInfo?.amountStaked || 0}
                  disabled={loading}
                />
                <Button
                  className="absolute right-0 top-0 h-full rounded-l-none px-3"
                  variant="secondary"
                  onClick={handleMaxUnstake}
                  disabled={loading}
                >
                  MAX
                </Button>
              </div>
              
              <Button
                onClick={handleUnstake}
                disabled={loading || !unstakeAmount || parseInt(unstakeAmount) <= 0 || parseInt(unstakeAmount) > (stakingInfo?.amountStaked || 0)}
                className="w-24"
                variant="outline"
              >
                {loading ? "Unstaking..." : "Unstake"}
              </Button>
            </div>
            
            {unstakeError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {unstakeError}
                </AlertDescription>
              </Alert>
            )}
            
            {stakingInfo?.timeUntilUnlock ? (
              <Alert className="py-2 bg-amber-800/20 border-amber-600">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-500">
                  Early unstaking will incur a 5% fee (4% burned, 1% to marketing)
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="justify-between px-6 py-4 border-t border-slate-800 flex-col sm:flex-row gap-2">
        <p className="text-sm text-muted-foreground">
          <ArrowLeftRight className="inline mr-1 h-4 w-4" />
          Rewards are auto-compounded every 30 minutes
        </p>
        
        <p className="text-sm">
          <span className="text-muted-foreground mr-1">Current APY:</span>
          <span className="font-medium">{stakingInfo?.estimatedAPY || 125}%</span>
        </p>
      </CardFooter>
    </Card>
  );
};

export default StakingWidgetSmartContract;