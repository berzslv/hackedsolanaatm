import React, { useState, useEffect } from 'react';
import { useSolana } from '@/hooks/use-solana';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle, AlertCircle, RefreshCcw, Award, Info } from 'lucide-react';
import { GradientText } from '@/components/ui/gradient-text';

interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  totalEarnings: number;
  weeklyRank: number | null;
  claimableRewards: number;
  recentActivity: {
    date: string;
    transaction: string;
    amount: number;
    reward: number;
  }[];
}

const ReferralWidget: React.FC = () => {
  const { connected, publicKey } = useSolana();
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Function to fetch referral data from the blockchain
  const fetchReferralData = async () => {
    if (!connected || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/referrals/${publicKey.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }
      
      const data = await response.json();
      setReferralStats(data);
    } catch (err: any) {
      console.error('Error fetching referral data:', err);
      setError(err.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  // Function to copy wallet address as referral code to clipboard
  const copyReferralLink = () => {
    if (!publicKey) return;
    
    // Only copy the wallet address as the referral code - not the full URL
    const referralCode = publicKey.toString();
    
    navigator.clipboard.writeText(referralCode)
      .then(() => {
        setCopied(true);
        toast({
          title: 'Copied!',
          description: 'Referral code copied to clipboard',
        });
        
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({
          title: 'Error',
          description: 'Failed to copy referral code',
          variant: 'destructive',
        });
      });
  };

  // Function to claim referral rewards
  const claimReferralRewards = async () => {
    if (!connected || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claim-referral-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim rewards');
      }
      
      toast({
        title: 'Success!',
        description: 'Your referral rewards have been claimed',
      });
      
      // Refresh referral data
      fetchReferralData();
    } catch (err: any) {
      console.error('Error claiming referral rewards:', err);
      setError(err.message || 'Failed to claim rewards');
      
      toast({
        title: 'Error',
        description: err.message || 'Failed to claim rewards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load referral data on mount and when wallet changes
  useEffect(() => {
    if (connected && publicKey) {
      fetchReferralData();
    } else {
      setReferralStats(null);
    }
  }, [connected, publicKey]);

  // Render a different view based on wallet connection status
  if (!connected) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <CardHeader>
          <CardTitle>Referral Program</CardTitle>
          <CardDescription>Connect your wallet to view your referral details</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p>Please connect your wallet to access the referral program</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardHeader>
        <CardTitle>HATM Referral Program</CardTitle>
        <CardDescription>Share with friends and earn 3% rewards</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Referral Stats */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Your Referral Stats</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchReferralData}
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-primary/5 rounded-md p-3">
              <div className="text-sm text-muted-foreground">Total Referrals</div>
              <div className="mt-1">
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="font-bold text-lg">
                    {referralStats?.totalReferrals || 0}
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-primary/5 rounded-md p-3">
              <div className="text-sm text-muted-foreground">Total Earnings</div>
              <div className="mt-1">
                {loading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="font-bold text-lg">
                    {referralStats?.totalEarnings || 0} HATM
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Claimable Rewards */}
        {(referralStats?.claimableRewards || 0) > 0 && (
          <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-md mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Claimable Rewards</h4>
                <p className="text-lg font-bold">{referralStats?.claimableRewards} HATM</p>
              </div>
              <Button 
                onClick={claimReferralRewards}
                disabled={loading}
                variant="outline"
              >
                Claim
              </Button>
            </div>
          </div>
        )}
        
        {/* Referral Code Section */}
        <div className="space-y-4">
          <div className="bg-primary/5 p-4 rounded-md">
            <div className="flex items-center mb-2">
              <Award className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm font-medium">Your Referral Code</span>
            </div>
            <div className="font-mono text-xs font-medium truncate">{publicKey?.toString()}</div>
            <div className="flex mt-2 space-x-2">
              <Button 
                variant="outline" 
                onClick={copyReferralLink}
                className="w-full"
                size="sm"
              >
                {copied ? 
                  <><CheckCircle className="h-4 w-4 mr-2" /> Code Copied</> : 
                  <><Copy className="h-4 w-4 mr-2" /> Copy Referral Code</>
                }
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Friends need to enter this code when staking to give you 3% rewards
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="flex items-start">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">On-Chain Referral System</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Your wallet address is used as your referral code directly in the smart contract.
                  No URLs or external tracking - everything is handled securely on the blockchain.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Information Section */}
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
            Referrals are tracked directly on-chain. When friends use your code,
            the smart contract automatically records them as your referrals and sends
            you 3% of their staking amount.
          </AlertDescription>
        </Alert>
      </CardContent>
      
      <CardFooter className="bg-primary/5 flex flex-col items-start p-4">
        <h4 className="text-sm font-medium mb-2">How It Works</h4>
        <ol className="text-xs text-muted-foreground space-y-1">
          <li>1. Share your wallet address as a referral code with friends</li>
          <li>2. They enter your code when staking their HATM tokens</li>
          <li>3. You earn 3% of their stake amount instantly</li>
          <li>4. All referrals are tracked on-chain for complete transparency</li>
        </ol>
      </CardFooter>
    </Card>
  );
};

export default ReferralWidget;