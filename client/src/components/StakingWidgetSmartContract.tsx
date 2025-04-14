import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useCombinedSmartContract, StakingInfo, StakingVaultInfo } from '@/lib/combined-smart-contract-client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw, Info, ArrowUpRight, Wallet, Lock, Receipt, Coins } from 'lucide-react';

export default function StakingWidgetSmartContract() {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('stake');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [stakePercent, setStakePercent] = useState(10);
  const [unstakePercent, setUnstakePercent] = useState(10);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState<StakingInfo | null>(null);
  const [vaultInfo, setVaultInfo] = useState<StakingVaultInfo | null>(null);
  
  const {
    stakeTokens,
    unstakeTokens,
    claimRewards,
    compoundRewards,
    getUserStakingInfo,
    getVaultInfo,
    error
  } = useCombinedSmartContract();
  
  // Effect to fetch user and vault info when connected
  useEffect(() => {
    if (connected && publicKey) {
      fetchUserAndVaultInfo();
    } else {
      setUserInfo(null);
      setVaultInfo(null);
    }
  }, [connected, publicKey]);
  
  const fetchUserAndVaultInfo = async () => {
    if (!connected || !publicKey) return;
    
    setRefreshing(true);
    try {
      const userStakingInfo = await getUserStakingInfo();
      const vaultData = await getVaultInfo();
      
      setUserInfo(userStakingInfo);
      setVaultInfo(vaultData);
    } catch (err) {
      console.error("Error fetching staking data:", err);
      toast({
        title: "Error",
        description: "Failed to fetch staking data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleStakePercentChange = (value: number[]) => {
    const percent = value[0];
    setStakePercent(percent);
    
    // Calculate token amount based on wallet balance 
    // For now we'll use a mock balance of 10,000
    const walletBalance = 10000;
    const amount = (walletBalance * percent) / 100;
    setStakeAmount(amount.toString());
  };
  
  const handleUnstakePercentChange = (value: number[]) => {
    const percent = value[0];
    setUnstakePercent(percent);
    
    if (userInfo) {
      const amount = (userInfo.amountStaked * percent) / 100;
      setUnstakeAmount(amount.toString());
    }
  };
  
  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to stake",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const success = await stakeTokens(parseFloat(stakeAmount));
      
      if (success) {
        toast({
          title: "Success",
          description: `Successfully staked ${stakeAmount} HATM tokens`,
        });
        
        // Refresh data
        await fetchUserAndVaultInfo();
        
        // Reset form
        setStakeAmount('');
        setStakePercent(10);
      } else {
        toast({
          title: "Error",
          description: error || "Failed to stake tokens. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error staking tokens:", err);
      toast({
        title: "Error",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to unstake",
        variant: "destructive",
      });
      return;
    }
    
    if (!userInfo || parseFloat(unstakeAmount) > userInfo.amountStaked) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough staked tokens",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const success = await unstakeTokens(parseFloat(unstakeAmount));
      
      if (success) {
        toast({
          title: "Success",
          description: `Successfully unstaked ${unstakeAmount} HATM tokens`,
        });
        
        // Refresh data
        await fetchUserAndVaultInfo();
        
        // Reset form
        setUnstakeAmount('');
        setUnstakePercent(10);
      } else {
        toast({
          title: "Error",
          description: error || "Failed to unstake tokens. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error unstaking tokens:", err);
      toast({
        title: "Error",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleClaim = async () => {
    if (!userInfo || userInfo.pendingRewards <= 0) {
      toast({
        title: "No rewards",
        description: "You don't have any rewards to claim",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const success = await claimRewards();
      
      if (success) {
        toast({
          title: "Success",
          description: `Successfully claimed ${userInfo.pendingRewards} HATM tokens`,
        });
        
        // Refresh data
        await fetchUserAndVaultInfo();
      } else {
        toast({
          title: "Error",
          description: error || "Failed to claim rewards. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error claiming rewards:", err);
      toast({
        title: "Error",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompound = async () => {
    if (!userInfo || userInfo.pendingRewards <= 0) {
      toast({
        title: "No rewards",
        description: "You don't have any rewards to compound",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const success = await compoundRewards();
      
      if (success) {
        toast({
          title: "Success",
          description: `Successfully compounded ${userInfo.pendingRewards} HATM tokens`,
        });
        
        // Refresh data
        await fetchUserAndVaultInfo();
      } else {
        toast({
          title: "Error",
          description: error || "Failed to compound rewards. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error compounding rewards:", err);
      toast({
        title: "Error",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Format number with commas and 2 decimal places
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  const formatLockTime = (timeInMs: number | null) => {
    if (!timeInMs) return 'Unlocked';
    
    const now = Date.now();
    const unlockTime = now + timeInMs;
    
    return formatDistanceToNow(unlockTime, { addSuffix: true });
  };
  
  const isPenaltyWarning = userInfo?.timeUntilUnlock ? true : false;
  
  // Calculate early withdrawal penalty if applicable
  const calculatePenalty = (amount: number) => {
    if (!vaultInfo || !isPenaltyWarning) return 0;
    
    const penaltyRate = vaultInfo.earlyUnstakePenalty / 10000; // Convert basis points to decimal
    return amount * penaltyRate;
  };
  
  const renderConnectedContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="stake">Stake</TabsTrigger>
        <TabsTrigger value="unstake">Unstake</TabsTrigger>
      </TabsList>
      
      <TabsContent value="stake" className="pt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="stake-amount">Stake Amount</Label>
              <span className="text-xs text-muted-foreground">
                Balance: 10,000 HATM
              </span>
            </div>
            <Input
              id="stake-amount"
              type="number"
              placeholder="Enter amount"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Percentage</Label>
              <span className="text-xs">{stakePercent}%</span>
            </div>
            <Slider
              value={[stakePercent]}
              onValueChange={handleStakePercentChange}
              min={1}
              max={100}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          <Button 
            onClick={handleStake} 
            className="w-full"
            disabled={loading || !stakeAmount || parseFloat(stakeAmount) <= 0}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coins className="mr-2 h-4 w-4" />}
            Stake HATM
          </Button>
          
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span>Staking Period:</span>
              <span className="font-medium">7 days</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Early Unstake Fee:</span>
              <span className="font-medium">{vaultInfo ? (vaultInfo.earlyUnstakePenalty / 100).toFixed(2) : '0'}%</span>
            </div>
            <div className="flex justify-between">
              <span>Annual Yield:</span>
              <span className="font-medium text-primary">{vaultInfo ? vaultInfo.currentAPY.toFixed(2) : '0'}% APY</span>
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="unstake" className="pt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="unstake-amount">Unstake Amount</Label>
              <span className="text-xs text-muted-foreground">
                Staked: {userInfo ? formatNumber(userInfo.amountStaked) : '0'} HATM
              </span>
            </div>
            
            {isPenaltyWarning && (
              <div className="flex items-center mb-2 p-2 text-xs border rounded-md border-yellow-200 bg-yellow-50 text-yellow-800">
                <Info className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>
                  Early unstaking will incur a {vaultInfo ? (vaultInfo.earlyUnstakePenalty / 100).toFixed(2) : '0'}% fee. 
                  Tokens unlock {userInfo?.timeUntilUnlock ? formatLockTime(userInfo.timeUntilUnlock) : ''}
                </span>
              </div>
            )}
            
            <Input
              id="unstake-amount"
              type="number"
              placeholder="Enter amount"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              disabled={!userInfo || userInfo.amountStaked <= 0}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Percentage</Label>
              <span className="text-xs">{unstakePercent}%</span>
            </div>
            <Slider
              value={[unstakePercent]}
              onValueChange={handleUnstakePercentChange}
              min={1}
              max={100}
              step={1}
              disabled={!userInfo || userInfo.amountStaked <= 0}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          {isPenaltyWarning && parseFloat(unstakeAmount) > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Unstake amount:</span>
                <span>{formatNumber(parseFloat(unstakeAmount))} HATM</span>
              </div>
              <div className="flex justify-between text-sm text-destructive">
                <span>Early unstake fee:</span>
                <span>-{formatNumber(calculatePenalty(parseFloat(unstakeAmount)))} HATM</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-medium">
                <span>You will receive:</span>
                <span>{formatNumber(parseFloat(unstakeAmount) - calculatePenalty(parseFloat(unstakeAmount)))} HATM</span>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleUnstake} 
            className="w-full"
            variant={isPenaltyWarning ? "destructive" : "default"}
            disabled={loading || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || !userInfo || parseFloat(unstakeAmount) > userInfo.amountStaked}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-2 h-4 w-4" />}
            Unstake HATM
          </Button>
          
          <div className="space-y-2 pt-4">
            <Label className="text-base font-semibold">Your Rewards</Label>
            <div className="rounded-md bg-muted p-3">
              <div className="flex justify-between mb-2">
                <span>Pending Rewards:</span>
                <span className="font-medium">{userInfo ? formatNumber(userInfo.pendingRewards) : '0'} HATM</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleClaim}
                  disabled={loading || !userInfo || userInfo.pendingRewards <= 0}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Claim
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCompound}
                  disabled={loading || !userInfo || userInfo.pendingRewards <= 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Compound
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold">HATM Staking</CardTitle>
            <CardDescription>Earn rewards by staking your HATM tokens</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={fetchUserAndVaultInfo} disabled={refreshing || !connected}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh staking data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent>
        {!connected ? (
          <div className="text-center p-6 space-y-4">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium text-lg">Connect Wallet</h3>
              <p className="text-muted-foreground">Connect your wallet to start staking</p>
            </div>
            <WalletMultiButton className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Your Staked</div>
                <div className="text-2xl font-bold">
                  {userInfo ? formatNumber(userInfo.amountStaked) : '0'} HATM
                </div>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {userInfo?.timeUntilUnlock ? formatLockTime(userInfo.timeUntilUnlock) : 'Unlocked'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">APY</div>
                <div className="text-lg font-semibold">{vaultInfo ? vaultInfo.currentAPY.toFixed(2) : '0'}%</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Pending Rewards</div>
                <div className="text-lg font-semibold">{userInfo ? formatNumber(userInfo.pendingRewards) : '0'}</div>
              </div>
            </div>
            
            {renderConnectedContent()}
          </>
        )}
      </CardContent>
      
      {vaultInfo && (
        <CardFooter className="block border-t pt-4">
          <div className="text-xs text-muted-foreground mb-1">Total Staked</div>
          <div className="flex justify-between items-center">
            <span className="font-medium">{formatNumber(vaultInfo.totalStaked)} HATM</span>
            <Badge variant="outline" className="text-xs">
              {vaultInfo.stakersCount} Stakers
            </Badge>
          </div>
          <Progress 
            value={vaultInfo.totalStaked > 0 ? Math.min((vaultInfo.totalStaked / 1000000) * 100, 100) : 0} 
            className="h-1 mt-2" 
          />
        </CardFooter>
      )}
    </Card>
  );
}