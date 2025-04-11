import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSolana } from '@/context/SolanaContext';
import { useTokenData } from '@/context/TokenDataContext';
import { useWalletModalOpener } from '@/components/ui/wallet-adapter';
import { shortenAddress, formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Define types for staking info
interface StakingInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: string;
  lastCompoundAt: string;
  estimatedAPY: number;
  timeUntilUnlock: number | null;
}

const StakingWidget = () => {
  const { connected, publicKey } = useSolana();
  const { openWalletModal } = useWalletModalOpener();
  const { userStakedBalance, userPendingRewards, userTokenBalance } = useTokenData();
  const { toast } = useToast();
  
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch staking info when connected
  useEffect(() => {
    if (connected && publicKey) {
      fetchStakingInfo();
    }
  }, [connected, publicKey]);
  
  const fetchStakingInfo = async () => {
    if (!connected || !publicKey) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/staking-info/${publicKey.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStakingInfo(data.stakingInfo);
      } else {
        console.error('Error fetching staking info:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch staking info:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMaxClick = () => {
    setStakeAmount(userTokenBalance.toString());
  };
  
  const handleStake = async () => {
    if (!connected) {
      openWalletModal();
      return;
    }
    
    try {
      const amountToStake = parseInt(stakeAmount, 10);
      if (isNaN(amountToStake) || amountToStake <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid amount to stake",
          variant: "destructive"
        });
        return;
      }
      
      if (amountToStake > userTokenBalance) {
        toast({
          title: "Insufficient balance",
          description: `You only have ${userTokenBalance} HATM tokens available`,
          variant: "destructive"
        });
        return;
      }
      
      // Show staking in progress
      setIsStaking(true);
      toast({
        title: "Staking in progress",
        description: `Staking ${amountToStake} HATM tokens...`,
      });
      
      // Call API to stake tokens
      const response = await fetch('/api/stake-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey?.toString(),
          amount: amountToStake
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Show success message
        toast({
          title: "Staking successful",
          description: data.message,
        });
        
        // Update staking info
        setStakingInfo(data.stakingInfo);
        
        // Reset input
        setStakeAmount('');
      } else {
        // Show error message
        toast({
          title: "Staking failed",
          description: data.error || "Failed to stake tokens",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Staking error:', error);
      toast({
        title: "Staking error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsStaking(false);
    }
  };
  
  const handleUnstake = async () => {
    if (!connected) {
      openWalletModal();
      return;
    }
    
    if (!stakingInfo || stakingInfo.amountStaked <= 0) {
      toast({
        title: "No staked tokens",
        description: "You don't have any tokens staked",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show unstaking in progress
      setIsUnstaking(true);
      toast({
        title: "Unstaking in progress",
        description: `Unstaking tokens...`,
      });
      
      // Call API to unstake tokens
      const response = await fetch('/api/unstake-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey?.toString(),
          amount: stakingInfo.amountStaked // Unstake all for simplicity
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Show success message with fee details if applicable
        const { unstakeResult } = data;
        if (unstakeResult.fee > 0) {
          toast({
            title: "Unstaking successful with fees",
            description: `Unstaked ${unstakeResult.amountUnstaked} tokens. Early withdrawal fee: ${unstakeResult.fee} HATM (${unstakeResult.burnAmount} burned, ${unstakeResult.marketingAmount} to marketing)`,
            duration: 6000
          });
        } else {
          toast({
            title: "Unstaking successful",
            description: `Unstaked ${unstakeResult.amountUnstaked} tokens with no fees`,
          });
        }
        
        // Update staking info
        setStakingInfo(data.stakingInfo);
      } else {
        // Show error message
        toast({
          title: "Unstaking failed",
          description: data.error || "Failed to unstake tokens",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Unstaking error:', error);
      toast({
        title: "Unstaking error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUnstaking(false);
    }
  };
  
  const handleClaimRewards = async () => {
    if (!connected) {
      openWalletModal();
      return;
    }
    
    if (!stakingInfo || stakingInfo.pendingRewards <= 0) {
      toast({
        title: "No pending rewards",
        description: "You don't have any rewards to claim",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show claiming in progress
      setIsClaiming(true);
      toast({
        title: "Claiming rewards",
        description: `Claiming ${stakingInfo.pendingRewards} HATM tokens...`,
      });
      
      // Call API to claim rewards
      const response = await fetch('/api/claim-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey?.toString()
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Show success message
        toast({
          title: "Rewards claimed",
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
          duration: 8000
        });
        
        // Update staking info
        setStakingInfo(data.stakingInfo);
      } else {
        // Show error message
        toast({
          title: "Claiming failed",
          description: data.error || "Failed to claim rewards",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Claim rewards error:', error);
      toast({
        title: "Claiming error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsClaiming(false);
    }
  };
  
  return (
    <div className="p-6 relative z-10">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-foreground">Your Staking</h3>
        <div className="px-3 py-1 bg-muted rounded-full text-sm text-foreground/70">
          {connected && publicKey 
            ? shortenAddress(publicKey.toString())
            : 'Wallet Not Connected'
          }
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-muted rounded-lg p-4 border border-border/50">
              <p className="text-sm text-foreground/70 mb-1">Your Staked Balance</p>
              <p className="text-2xl font-semibold text-foreground">
                {connected ? `${stakingInfo?.amountStaked || 0} HATM` : '0 HATM'}
              </p>
              <div className="mt-2 text-xs text-foreground/70 flex items-center gap-1">
                <i className="ri-information-line"></i>
                {connected 
                  ? stakingInfo?.amountStaked 
                    ? `Staked ${new Date(stakingInfo.stakedAt).toLocaleDateString()}`
                    : 'No tokens staked yet'
                  : 'Connect wallet to view balance'
                }
              </div>
            </div>
            
            <div className="bg-muted rounded-lg p-4 border border-border/50">
              <p className="text-sm text-foreground/70 mb-1">Pending Rewards</p>
              <p className="text-2xl font-semibold text-primary">
                {connected ? `${stakingInfo?.pendingRewards || 0} HATM` : '0 HATM'}
              </p>
              <div className="mt-2 text-xs text-foreground/70 flex items-center gap-1">
                <i className="ri-information-line"></i>
                <span>APY: {stakingInfo?.estimatedAPY || 0}%</span>
              </div>
              
              {stakingInfo && stakingInfo.timeUntilUnlock !== null && stakingInfo.timeUntilUnlock > 0 && (
                <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                  <i className="ri-time-line"></i>
                  <span>
                    {Math.ceil(stakingInfo.timeUntilUnlock / (24 * 60 * 60 * 1000))} days until penalty-free unstaking
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-4 mb-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-foreground font-medium">Stake Your Tokens</h4>
              <div className="text-xs text-foreground/70 bg-muted px-2 py-1 rounded">
                <span>Balance: </span>
                <span>{connected ? `${userTokenBalance} HATM` : '0 HATM'}</span>
              </div>
            </div>
            
            <div className="bg-muted rounded-lg p-3 mb-4 flex justify-between items-center">
              <Input 
                type="number" 
                placeholder="0.0" 
                className="bg-transparent w-2/3 outline-none border-none"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={!connected || isStaking}
              />
              <div className="flex items-center gap-2">
                <button 
                  className="text-xs bg-background/50 px-2 py-1 rounded hover:bg-background/80"
                  onClick={handleMaxClick}
                  disabled={!connected || isStaking}
                >
                  MAX
                </button>
                <div className="text-foreground/70">HATM</div>
              </div>
            </div>
            
            <Button 
              className="w-full py-3 gradient-button"
              onClick={handleStake}
              disabled={isStaking || (!connected || parseInt(stakeAmount, 10) <= 0)}
            >
              {isStaking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Staking...
                </span>
              ) : connected ? 'Stake Tokens' : 'Connect Wallet to Stake'}
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Button 
              variant="outline"
              className="py-3 border-primary/30 text-primary hover:bg-card/80 transition-colors flex items-center justify-center gap-2"
              disabled={isUnstaking || !connected || !stakingInfo || !(stakingInfo.amountStaked > 0)}
              onClick={handleUnstake}
            >
              {isUnstaking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Unstaking...
                </span>
              ) : (
                <>
                  <i className="ri-wallet-3-line"></i>
                  Unstake Tokens
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              className="py-3 border-primary/30 text-primary hover:bg-card/80 transition-colors flex items-center justify-center gap-2"
              disabled={isClaiming || !connected || !stakingInfo || !(stakingInfo.pendingRewards > 0)}
              onClick={handleClaimRewards}
            >
              {isClaiming ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Claiming...
                </span>
              ) : (
                <>
                  <i className="ri-coin-line"></i>
                  Claim Rewards
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-4 text-xs text-foreground/70 bg-muted p-2 rounded-lg">
            <p className="flex items-center gap-1">
              <i className="ri-alert-line text-yellow-400"></i>
              Early withdrawal (within 7 days) incurs a 5% fee (4% burned, 1% marketing)
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default StakingWidget;
