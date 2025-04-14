import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Lock, Unlock, Coins, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useWallet } from '@solana/wallet-adapter-react';
import { getWalletTokenBalance, getWalletStakingData, getWalletTransactionHistory } from '@/lib/railway-client';
import { TokenTransfer, StakingEvent } from '@/lib/railway-client';

const RAILWAY_URL = 'https://hackedpolling-production.up.railway.app';

interface StakingInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: string;
  lastCompoundAt: string;
  estimatedAPY: number;
  timeUntilUnlock: number | null;
}

interface TokenBalanceInfo {
  walletAddress: string;
  balance: number;
}

interface Transaction {
  type: string;
  signature: string;
  timestamp: string;
  direction?: string;
  operation?: string;
  amount: number;
  blockTime?: string | null;
  otherWallet?: string;
}

export default function StakingDashboard() {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<TokenBalanceInfo | null>(null);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Get wallet address or placeholder
  const walletAddress = publicKey?.toString() || '9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX';

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Format date 
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Calculate time until unlock in readable format
  const getUnlockTimeRemaining = (): string => {
    if (!stakingInfo?.timeUntilUnlock) return 'Unlocked';
    
    const ms = stakingInfo.timeUntilUnlock;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${minutes}m remaining`;
  };

  // Fetch data from Railway service
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch token balance
      const balanceResponse = await fetch(`${RAILWAY_URL}/api/token-balance/${walletAddress}`);
      const balance = await balanceResponse.json();
      setTokenBalance(balance);

      // Fetch staking info
      // First try from Railway
      const stakingResponse = await fetch(`${RAILWAY_URL}/api/staking-data/${walletAddress}`);
      const stakingData = await stakingResponse.json();
      
      // If no staking data found, fall back to getting data from server API
      if (!stakingData || !stakingData.events || stakingData.events.length === 0) {
        const apiResponse = await fetch(`/api/staking-info/${walletAddress}`);
        const apiData = await apiResponse.json();
        setStakingInfo(apiData);
      } else {
        // Process Railway staking data
        // This is simplified - in a real implementation you'd process events to calculate the current state
        const data = {
          amountStaked: 0,
          pendingRewards: 0,
          stakedAt: new Date().toISOString(),
          lastCompoundAt: new Date().toISOString(),
          estimatedAPY: 120,
          timeUntilUnlock: null
        };
        setStakingInfo(data);
      }

      // Fetch transaction history
      const txResponse = await fetch(`${RAILWAY_URL}/api/token-transfers?wallet=${walletAddress}`);
      const txData = await txResponse.json();
      
      if (txData && txData.transfers) {
        const formattedTxs = txData.transfers.map((tx: TokenTransfer) => ({
          type: 'transfer',
          signature: tx.signature,
          timestamp: tx.timestamp,
          direction: tx.fromWallet === walletAddress ? 'outgoing' : 'incoming',
          amount: tx.amount,
          blockTime: tx.blockTime,
          otherWallet: tx.fromWallet === walletAddress ? tx.toWallet : tx.fromWallet
        }));
        setTransactions(formattedTxs);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error fetching data",
        description: "Could not load your staking information. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
    
    // Also poll for new transactions on Railway
    fetch(`${RAILWAY_URL}/api/poll-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': 'admin' // This is for demo - you would want proper auth in production
      }
    }).catch(err => console.error('Error triggering poll:', err));
  };

  // Fetch data on component mount and when wallet changes
  useEffect(() => {
    fetchData();
  }, [walletAddress]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Staking Dashboard</h2>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh Data
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-4 text-lg">Loading your staking data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Token Balance Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Token Balance</CardTitle>
              <CardDescription>Your available HATM tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{formatNumber(tokenBalance?.balance || 0)}</div>
                  <div className="text-sm text-muted-foreground">HATM Tokens</div>
                </div>
                <Coins className="h-10 w-10 text-primary opacity-80" />
              </div>
            </CardContent>
            <CardFooter className="pt-1">
              <div className="text-sm text-muted-foreground w-full">
                <div className="flex items-center justify-between">
                  <span>Wallet Address:</span>
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                  </code>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Staking Status Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Staking Status</CardTitle>
              <CardDescription>Your staked tokens and rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm">Staked Amount</div>
                    <div className="font-medium">{formatNumber(stakingInfo?.amountStaked || 0)}</div>
                  </div>
                  <Progress 
                    value={stakingInfo?.amountStaked ? (stakingInfo.amountStaked / (stakingInfo.amountStaked + (tokenBalance?.balance || 0))) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Pending Rewards</div>
                    <div className="font-semibold">{formatNumber(stakingInfo?.pendingRewards || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated APY</div>
                    <div className="font-semibold text-green-500">{stakingInfo?.estimatedAPY || 0}%</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-1 flex justify-between">
              <div className="text-xs flex items-center">
                {stakingInfo?.timeUntilUnlock ? (
                  <><Lock className="h-3 w-3 mr-1" /> {getUnlockTimeRemaining()}</>
                ) : (
                  <><Unlock className="h-3 w-3 mr-1" /> Unlocked</>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Staked since: {stakingInfo?.stakedAt ? formatDate(stakingInfo.stakedAt) : 'N/A'}
              </div>
            </CardFooter>
          </Card>

          {/* Transaction History Card */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
              <CardDescription>Your token activity</CardDescription>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx, i) => (
                    <div key={i} className="flex items-start justify-between border-b pb-2">
                      <div className="flex items-start space-x-3">
                        {tx.type === 'transfer' ? (
                          tx.direction === 'incoming' ? (
                            <ArrowDownRight className="h-5 w-5 text-green-500 mt-1" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 text-red-500 mt-1" />
                          )
                        ) : (
                          <CreditCard className="h-5 w-5 text-amber-500 mt-1" />
                        )}
                        <div>
                          <div className="font-medium">
                            {tx.type === 'transfer' 
                              ? tx.direction === 'incoming' ? 'Received' : 'Sent' 
                              : tx.operation || 'Staking Operation'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          tx.type === 'transfer' && tx.direction === 'incoming' ? 'text-green-500' : 
                          tx.type === 'transfer' && tx.direction === 'outgoing' ? 'text-red-500' : ''
                        }`}>
                          {tx.type === 'transfer' && tx.direction === 'incoming' ? '+' : ''}
                          {tx.type === 'transfer' && tx.direction === 'outgoing' ? '-' : ''}
                          {formatNumber(tx.amount)}
                        </div>
                        <a 
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer" 
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-1">
              <Button variant="ghost" size="sm" className="text-xs w-full">
                View All Transactions
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}