import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { EthWalletConnect } from './EthWalletConnect';
import { getStakingInfo, getGlobalStats, getTimeUntilUnlock, stakeTokens, unstakeTokens, claimRewards, buyAndStakeTokens, getTokenBalance, formatAmount, registerUser } from '../lib/ethereum/ethUtils';
import { ethers } from 'ethers';

export function EthStakingPanel() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stakingInfo, setStakingInfo] = useState<any>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch staking data when wallet connects
  useEffect(() => {
    if (walletAddress) {
      fetchStakingData();
    }
  }, [walletAddress]);

  // Refresh data every 30 seconds
  useEffect(() => {
    if (!walletAddress) return;
    
    const interval = setInterval(() => {
      fetchStakingData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [walletAddress]);

  // Update time remaining countdown
  useEffect(() => {
    if (!stakingInfo || !stakingInfo.stakedAt) return;
    
    const updateTimeRemaining = async () => {
      if (!walletAddress) return;
      
      try {
        const secondsRemaining = await getTimeUntilUnlock(walletAddress);
        if (secondsRemaining > 0) {
          const days = Math.floor(secondsRemaining / 86400);
          const hours = Math.floor((secondsRemaining % 86400) / 3600);
          const minutes = Math.floor((secondsRemaining % 3600) / 60);
          setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
        } else {
          setTimeRemaining('Unlocked');
        }
      } catch (error) {
        console.error('Error getting time until unlock:', error);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);
    
    return () => clearInterval(interval);
  }, [stakingInfo, walletAddress]);

  const fetchStakingData = async (isRefresh = false) => {
    if (!walletAddress) return;
    
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      // Fetch user staking info
      const info = await getStakingInfo(walletAddress);
      setStakingInfo(info);
      
      // Fetch global stats
      const stats = await getGlobalStats();
      setGlobalStats(stats);
      
      // Fetch token balance
      const balance = await getTokenBalance(walletAddress);
      setTokenBalance(formatAmount(balance));
      
    } catch (error) {
      console.error('Error fetching staking data:', error);
      toast({
        title: 'Error fetching staking data',
        description: 'Failed to load staking information. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRegister = async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      const validReferrer = ethers.utils.isAddress(referralCode) ? referralCode : ethers.constants.AddressZero;
      
      await registerUser(validReferrer);
      
      toast({
        title: 'Registration successful',
        description: 'You have been registered for staking!',
      });
      
      // Refresh data
      await fetchStakingData();
    } catch (error: any) {
      console.error('Error registering for staking:', error);
      toast({
        title: 'Registration failed',
        description: error?.message || 'Failed to register for staking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStake = async () => {
    if (!walletAddress || !stakeAmount) return;
    
    setIsLoading(true);
    try {
      await stakeTokens(stakeAmount);
      
      toast({
        title: 'Tokens staked!',
        description: `You have successfully staked ${stakeAmount} tokens.`,
      });
      
      // Reset form and refresh data
      setStakeAmount('');
      await fetchStakingData();
    } catch (error: any) {
      console.error('Error staking tokens:', error);
      toast({
        title: 'Staking failed',
        description: error?.message || 'Failed to stake tokens. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!walletAddress || !unstakeAmount) return;
    
    setIsLoading(true);
    try {
      await unstakeTokens(unstakeAmount);
      
      toast({
        title: 'Tokens unstaked!',
        description: `You have successfully unstaked ${unstakeAmount} tokens.`,
      });
      
      // Reset form and refresh data
      setUnstakeAmount('');
      await fetchStakingData();
    } catch (error: any) {
      console.error('Error unstaking tokens:', error);
      toast({
        title: 'Unstaking failed',
        description: error?.message || 'Failed to unstake tokens. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      await claimRewards();
      
      toast({
        title: 'Rewards claimed!',
        description: 'You have successfully claimed your staking rewards.',
      });
      
      // Refresh data
      await fetchStakingData();
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      toast({
        title: 'Claim failed',
        description: error?.message || 'Failed to claim rewards. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyAndStake = async () => {
    if (!walletAddress || !buyAmount) return;
    
    setIsLoading(true);
    try {
      const validReferrer = ethers.utils.isAddress(referralCode) ? referralCode : ethers.constants.AddressZero;
      
      await buyAndStakeTokens(buyAmount, validReferrer);
      
      toast({
        title: 'Buy and stake successful!',
        description: `You have successfully bought and staked tokens with ${buyAmount} ETH.`,
      });
      
      // Reset form and refresh data
      setBuyAmount('');
      await fetchStakingData();
    } catch (error: any) {
      console.error('Error buying and staking tokens:', error);
      toast({
        title: 'Transaction failed',
        description: error?.message || 'Failed to buy and stake tokens. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Registration form
  const renderRegistrationForm = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Register for Staking</CardTitle>
          <CardDescription>Register to start staking your HATM tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="referralCode">Referral Code (Optional)</Label>
              <Input
                id="referralCode"
                placeholder="Enter referrer's wallet address"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setReferralCode('')}>Cancel</Button>
          <Button onClick={handleRegister} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Register'}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Main staking panel
  const renderStakingPanel = () => {
    if (!stakingInfo) return null;
    
    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stake">Stake</TabsTrigger>
          <TabsTrigger value="unstake">Unstake</TabsTrigger>
          <TabsTrigger value="buy">Buy & Stake</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Your Staking Dashboard</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchStakingData()} 
                  disabled={isRefreshing}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </CardTitle>
              <CardDescription>View your staking stats and rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Staked Amount</span>
                    <span className="text-2xl font-bold">{stakingInfo.formattedStakedAmount} HATM</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                    <span className="text-2xl font-bold">{tokenBalance} HATM</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Pending Rewards</span>
                    <span className="text-2xl font-bold text-green-600">{stakingInfo.formattedPendingRewards} HATM</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">APY</span>
                    <span className="text-2xl font-bold">{globalStats?.currentAPY || 12}%</span>
                  </div>
                </div>
                
                {timeRemaining && stakingInfo.amountStaked.gt(0) && (
                  <>
                    <Separator />
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Time Until Unlocked</span>
                      <span className="text-xl font-bold">{timeRemaining}</span>
                    </div>
                  </>
                )}
                
                {stakingInfo.referrer && stakingInfo.referrer !== ethers.constants.AddressZero && (
                  <>
                    <Separator />
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Referred By</span>
                      <span className="text-sm font-medium">{stakingInfo.referrer}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleClaimRewards} 
                disabled={isLoading || stakingInfo.pendingRewards.eq(0)}
              >
                {isLoading ? 'Processing...' : 'Claim Rewards'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="stake">
          <Card>
            <CardHeader>
              <CardTitle>Stake Tokens</CardTitle>
              <CardDescription>Lock your tokens to earn rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="stakeAmount">Amount to Stake</Label>
                  <Input
                    id="stakeAmount"
                    placeholder="Enter amount"
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Available: {tokenBalance} HATM
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStakeAmount('')}>Cancel</Button>
              <Button onClick={handleStake} disabled={isLoading || !stakeAmount || Number(stakeAmount) <= 0}>
                {isLoading ? 'Processing...' : 'Stake Tokens'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="unstake">
          <Card>
            <CardHeader>
              <CardTitle>Unstake Tokens</CardTitle>
              <CardDescription>Withdraw your staked tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <Alert>
                  <AlertTitle>Early Unstaking Penalty</AlertTitle>
                  <AlertDescription>
                    Unstaking before the 7-day lock period will incur a 10% penalty.
                    {timeRemaining && timeRemaining !== 'Unlocked' && (
                      <div className="mt-2">
                        Time until unlocked: <span className="font-medium">{timeRemaining}</span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="unstakeAmount">Amount to Unstake</Label>
                  <Input
                    id="unstakeAmount"
                    placeholder="Enter amount"
                    type="number"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Staked: {stakingInfo.formattedStakedAmount} HATM
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setUnstakeAmount('')}>Cancel</Button>
              <Button 
                onClick={handleUnstake} 
                disabled={isLoading || !unstakeAmount || Number(unstakeAmount) <= 0 || stakingInfo.amountStaked.eq(0)}
              >
                {isLoading ? 'Processing...' : 'Unstake Tokens'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="buy">
          <Card>
            <CardHeader>
              <CardTitle>Buy & Stake</CardTitle>
              <CardDescription>Buy tokens with ETH and automatically stake them</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="buyAmount">ETH Amount</Label>
                  <Input
                    id="buyAmount"
                    placeholder="Enter ETH amount"
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    1 ETH = 1,000 HATM tokens
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="buyReferralCode">Referral Code (Optional)</Label>
                  <Input
                    id="buyReferralCode"
                    placeholder="Enter referrer's wallet address"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => { setBuyAmount(''); setReferralCode(''); }}>Cancel</Button>
              <Button 
                onClick={handleBuyAndStake} 
                disabled={isLoading || !buyAmount || Number(buyAmount) <= 0}
              >
                {isLoading ? 'Processing...' : 'Buy & Stake'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };

  // Global stats card
  const renderGlobalStats = () => {
    if (!globalStats) return null;
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Global Staking Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Staked</span>
              <span className="text-xl font-bold">{globalStats.formattedTotalStaked} HATM</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Number of Stakers</span>
              <span className="text-xl font-bold">{globalStats.stakersCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Current APY</span>
              <span className="text-xl font-bold">{globalStats.currentAPY}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total Referrals</span>
              <span className="text-xl font-bold">{globalStats.totalReferrals}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Main component render
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-center mb-6">
        <EthWalletConnect onConnect={setWalletAddress} />
      </div>

      {walletAddress && (
        <div className="space-y-4">
          {isLoading && !stakingInfo ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-center">
                <div className="mb-2">Loading staking data...</div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            </div>
          ) : stakingInfo?.isRegistered === false ? (
            renderRegistrationForm()
          ) : (
            <>
              {renderStakingPanel()}
              {renderGlobalStats()}
            </>
          )}
        </div>
      )}
    </div>
  );
}