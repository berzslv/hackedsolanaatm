import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Users, Award, Trophy, TrendingUp } from "lucide-react";
import { useWallet } from '@solana/wallet-adapter-react';

// Sample data - would come from the real referral API
type ReferralStats = {
  walletAddress: string;
  referralCode: string | null;
  totalReferrals: number;
  totalEarnings: number;
  weeklyRank: number | null;
  referredCount: number;
  totalReferred: number;
  claimableRewards: number;
  recentActivity: {
    date: string;
    transaction: string;
    amount: number;
    reward: number;
  }[];
};

type LeaderboardEntry = {
  rank: number;
  walletAddress: string;
  username: string | null;
  amount: number;
  period: string;
};

export default function ReferralSystem() {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState('referrers');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly');

  // Get wallet address or placeholder
  const walletAddress = publicKey?.toString() || '9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX';

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Fetch referral data
  const fetchReferralData = async () => {
    try {
      setLoading(true);
      
      // Fetch referral stats
      const statsResponse = await fetch(`/api/referrals/${walletAddress}`);
      if (!statsResponse.ok) throw new Error('Failed to fetch referral stats');
      const stats = await statsResponse.json();
      setReferralStats(stats);
      
      // Fetch leaderboard data
      await fetchLeaderboard();
      
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast({
        title: "Error fetching data",
        description: "Could not load your referral information. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const leaderboardResponse = await fetch(`/api/leaderboard/${leaderboardType}/${leaderboardPeriod}`);
      if (!leaderboardResponse.ok) throw new Error('Failed to fetch leaderboard');
      const data = await leaderboardResponse.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Could not load leaderboard data.",
        variant: "destructive"
      });
    }
  };

  // Generate new referral code
  const generateReferralCode = async () => {
    try {
      setGenerating(true);
      
      // Call API to generate a new code
      const response = await fetch('/api/referrals/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      if (!response.ok) throw new Error('Failed to generate code');
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Your new referral code has been generated!",
      });
      
      // Refresh data to see the new code
      fetchReferralData();
      
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast({
        title: "Error",
        description: "Could not generate a new referral code. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  // Claim referral rewards
  const claimRewards = async () => {
    if (!referralStats?.claimableRewards || referralStats.claimableRewards <= 0) {
      toast({
        title: "No rewards to claim",
        description: "You don't have any rewards available to claim right now.",
        variant: "default"
      });
      return;
    }
    
    try {
      setClaiming(true);
      
      // Call API to claim rewards
      const response = await fetch('/api/referrals/claim-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      
      if (!response.ok) throw new Error('Failed to claim rewards');
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: `You have successfully claimed ${formatNumber(data.amount)} HATM tokens.`,
      });
      
      // Refresh data
      fetchReferralData();
      
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast({
        title: "Error",
        description: "Could not claim your rewards. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setClaiming(false);
    }
  };

  // Copy referral code to clipboard
  const copyReferralCode = () => {
    if (referralStats?.referralCode) {
      navigator.clipboard.writeText(referralStats.referralCode)
        .then(() => {
          toast({
            title: "Copied!",
            description: "Referral code copied to clipboard.",
          });
        })
        .catch((err) => {
          console.error('Failed to copy:', err);
          toast({
            title: "Error",
            description: "Could not copy the referral code.",
            variant: "destructive"
          });
        });
    }
  };

  // Effect to change leaderboard when type or period changes
  useEffect(() => {
    if (!loading) {
      fetchLeaderboard();
    }
  }, [leaderboardType, leaderboardPeriod]);

  // Initial data fetch
  useEffect(() => {
    fetchReferralData();
  }, [walletAddress]);

  // Get referral link
  const getReferralLink = () => {
    if (!referralStats?.referralCode) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}?ref=${referralStats.referralCode}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Referral System</h2>
        <Button 
          variant="outline" 
          onClick={fetchReferralData}
        >
          Refresh Data
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-4 text-lg">Loading your referral data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral Stats Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Referral Stats</CardTitle>
              <CardDescription>Invite others and earn rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    <span className="text-sm">Total Referrals</span>
                  </div>
                  <div className="text-2xl font-bold">{referralStats?.totalReferrals || 0}</div>
                </div>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Award className="h-5 w-5 mr-2 text-primary" />
                    <span className="text-sm">Total Earnings</span>
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(referralStats?.totalEarnings || 0)}</div>
                </div>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Trophy className="h-5 w-5 mr-2 text-primary" />
                    <span className="text-sm">Weekly Rank</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {referralStats?.weeklyRank ? `#${referralStats.weeklyRank}` : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <Label htmlFor="referral-code" className="text-sm mb-2 block">Your Referral Code</Label>
                <div className="flex gap-2">
                  <Input 
                    id="referral-code" 
                    value={referralStats?.referralCode || 'No referral code yet'} 
                    readOnly 
                    className="font-mono"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyReferralCode}
                    disabled={!referralStats?.referralCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {referralStats?.referralCode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Share this code or your referral link:
                    <span className="block text-primary mt-1 truncate">{getReferralLink()}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={generateReferralCode} 
                  disabled={generating}
                  className="flex-1"
                >
                  {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {referralStats?.referralCode ? 'Generate New Code' : 'Get Referral Code'}
                </Button>
                <Button 
                  onClick={claimRewards} 
                  disabled={claiming || !referralStats?.claimableRewards || referralStats.claimableRewards <= 0}
                  variant="outline"
                  className="flex-1"
                >
                  {claiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Claim {formatNumber(referralStats?.claimableRewards || 0)} Tokens
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle>Leaderboard</CardTitle>
              <Tabs defaultValue="referrers" onValueChange={val => setLeaderboardType(val)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="referrers">Referrers</TabsTrigger>
                  <TabsTrigger value="stakers">Stakers</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex mt-2">
                <Button 
                  variant={leaderboardPeriod === 'weekly' ? 'default' : 'outline'} 
                  size="sm" 
                  className="text-xs mr-2"
                  onClick={() => setLeaderboardPeriod('weekly')}
                >
                  Weekly
                </Button>
                <Button 
                  variant={leaderboardPeriod === 'monthly' ? 'default' : 'outline'} 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setLeaderboardPeriod('monthly')}
                >
                  Monthly
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No data available
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">{leaderboardType === 'referrers' ? 'Refs' : 'Staked'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.slice(0, 5).map((entry) => (
                        <TableRow key={entry.rank}>
                          <TableCell className="font-medium">
                            {entry.rank === 1 ? (
                              <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">{entry.rank}</Badge>
                            ) : entry.rank === 2 ? (
                              <Badge variant="secondary" className="bg-gray-400 hover:bg-gray-500">{entry.rank}</Badge>
                            ) : entry.rank === 3 ? (
                              <Badge variant="outline" className="bg-amber-700 hover:bg-amber-800 text-white">{entry.rank}</Badge>
                            ) : (
                              <Badge variant="outline">{entry.rank}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.username || entry.walletAddress.slice(0, 4) + '...' + entry.walletAddress.slice(-4)}
                            {entry.walletAddress === walletAddress && (
                              <span className="ml-1 text-xs text-primary">(You)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(entry.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View Full Leaderboard
              </Button>
            </CardFooter>
          </Card>

          {/* Recent Activity Card */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Referral Activity</CardTitle>
              <CardDescription>History of your referral earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {!referralStats?.recentActivity || referralStats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity to display
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Reward</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralStats.recentActivity.map((activity, i) => (
                        <TableRow key={i}>
                          <TableCell>{new Date(activity.date).toLocaleString()}</TableCell>
                          <TableCell>
                            <a 
                              href={`https://explorer.solana.com/tx/${activity.transaction}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer" 
                              className="text-primary hover:underline"
                            >
                              {activity.transaction.slice(0, 8)}...
                            </a>
                          </TableCell>
                          <TableCell>{formatNumber(activity.amount)}</TableCell>
                          <TableCell className="text-right font-medium text-green-500">
                            +{formatNumber(activity.reward)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}