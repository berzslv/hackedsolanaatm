import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  EnhancedStakingData, 
  ReferralData, 
  LeaderboardEntry, 
  GlobalStats,
  formatDuration,
  getEnhancedStakingData,
  getReferralData,
  getLeaderboard,
  getGlobalStats,
  addWalletToMonitor
} from '../lib/railway-client';
import { ClipboardCopy, Copy, LockIcon, UnlockIcon, Share2, Trophy } from 'lucide-react';

export function StakingReferralWidget() {
  const { publicKey, connected } = useWallet();
  const { toast } = useToast();
  
  const [stakingData, setStakingData] = useState<EnhancedStakingData | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Generate a referral code based on wallet address
  useEffect(() => {
    if (publicKey) {
      // Use the first 6 characters of the wallet address
      const code = publicKey.toString().substring(0, 6);
      setReferralCode(code);
    }
  }, [publicKey]);
  
  // Fetch staking data
  useEffect(() => {
    if (publicKey) {
      const walletAddress = publicKey.toString();
      
      // Add this wallet to monitoring
      addWalletToMonitor(walletAddress)
        .then(() => console.log('Wallet added to monitoring'))
        .catch(error => console.error('Error adding wallet to monitoring:', error));
      
      // Fetch data
      setIsLoading(true);
      Promise.all([
        getEnhancedStakingData(walletAddress),
        getReferralData(walletAddress),
        getLeaderboard(),
        getGlobalStats()
      ]).then(([stakingData, referralData, leaderboard, globalStats]) => {
        setStakingData(stakingData);
        setReferralData(referralData);
        setLeaderboard(leaderboard);
        setGlobalStats(globalStats);
        setIsLoading(false);
      }).catch(error => {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      });
    }
  }, [publicKey]);
  
  // Copy referral code to clipboard
  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast({
        title: "Referral code copied!",
        description: "Your referral code has been copied to clipboard."
      });
    }
  };
  
  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Staking & Referrals</CardTitle>
          <CardDescription>Connect your wallet to view staking data and referral stats</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>Fetching your staking and referral data</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Progress value={80} className="w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Staking & Referrals</CardTitle>
        <CardDescription>Stake your HATM tokens and earn rewards</CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="staking">
        <TabsList className="grid grid-cols-2 mx-6">
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>
        
        {/* Staking Tab */}
        <TabsContent value="staking">
          <CardContent>
            <div className="space-y-4">
              {/* Staking Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Amount Staked</p>
                  <p className="text-2xl font-bold">{stakingData?.amountStaked || 0} HATM</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Pending Rewards</p>
                  <p className="text-2xl font-bold">{stakingData?.pendingRewards || 0} HATM</p>
                </div>
              </div>
              
              {/* Lock Status */}
              <div className="bg-muted rounded-md p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {stakingData?.isLocked ? (
                    <>
                      <LockIcon className="text-yellow-500" />
                      <span>Locked for {formatDuration(stakingData.timeUntilUnlock)}</span>
                    </>
                  ) : (
                    <>
                      <UnlockIcon className="text-green-500" />
                      <span>Unlocked - No early unstake fee</span>
                    </>
                  )}
                </div>
                <Badge variant={stakingData?.isLocked ? "destructive" : "default"} className={stakingData?.isLocked ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-500 hover:bg-green-600"}>
                  {stakingData?.isLocked ? "7-day Lock" : "Ready"}
                </Badge>
              </div>
              
              {/* APY Info */}
              <div className="bg-muted rounded-md p-4">
                <p className="text-sm text-muted-foreground">Current APY</p>
                <p className="text-xl font-bold text-green-500">{stakingData?.estimatedAPY || globalStats?.currentAPY || 0}%</p>
                {globalStats?.early_unstake_penalty && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Early unstake fee: {globalStats.early_unstake_penalty / 100}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline">Unstake</Button>
            <Button>Stake More</Button>
          </CardFooter>
        </TabsContent>
        
        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <CardContent>
            <div className="space-y-6">
              {/* Referral Code */}
              <div className="bg-muted rounded-md p-4">
                <p className="text-sm text-muted-foreground mb-2">Your Referral Code</p>
                <div className="flex justify-between items-center">
                  <p className="text-xl font-mono font-bold">{referralCode}</p>
                  <Button variant="ghost" size="sm" onClick={copyReferralCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with friends. You'll earn {(globalStats?.referral_reward_rate || 300) / 100}% of their staking amount!
                </p>
              </div>
              
              {/* Referral Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold">{referralData?.totalReferrals || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold">{referralData?.totalEarnings || 0} HATM</p>
                </div>
              </div>
              
              {/* Leaderboard Rank */}
              {referralData?.weeklyRank && (
                <div className="bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 rounded-md p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="text-yellow-500" />
                    <div>
                      <p className="font-bold">Your Leaderboard Rank</p>
                      <p className="text-sm">Keep referring to climb the ranks!</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                    #{referralData.weeklyRank}
                  </Badge>
                </div>
              )}
              
              {/* Recent Referral Activity */}
              {referralData?.recentActivity && referralData.recentActivity.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Recent Activity</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Reward</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralData.recentActivity.slice(0, 3).map((activity, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {new Date(activity.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{activity.referredUser.substring(0, 6)}...</TableCell>
                          <TableCell className="text-right">{activity.amount} HATM</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter>
            <Button className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Share Referral Link
            </Button>
          </CardFooter>
        </TabsContent>
      </Tabs>
      
      {/* Global Stats */}
      {globalStats && (
        <>
          <Separator className="my-4" />
          <div className="px-6 pb-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Staked</p>
              <p className="font-bold">{globalStats.totalStaked.toLocaleString()} HATM</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Stakers</p>
              <p className="font-bold">{globalStats.stakersCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="font-bold">{globalStats.totalReferrals}</p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default StakingReferralWidget;