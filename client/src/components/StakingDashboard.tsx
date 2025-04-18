import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DirectStakingWidget } from './DirectStakingWidgetV2';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useWallet } from '@solana/wallet-adapter-react';

export default function StakingDashboard() {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Fetch global staking statistics
  const fetchGlobalStats = async () => {
    try {
      const response = await fetch('/api/staking-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch global staking statistics');
      }
      
      const data = await response.json();
      setGlobalStats(data);
    } catch (error) {
      console.error('Error fetching global stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch global staking statistics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchGlobalStats();
  }, []);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGlobalStats();
    setIsRefreshing(false);
  };
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Total Staked</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Current APY</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Stakers</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
        
        <div className="col-span-1 md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Your Staking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Staking Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Staking Dashboard</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? <Spinner size="sm" className="mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Total Staked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatNumber(globalStats?.totalStaked || 0)} HATM
            </p>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Current APY</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-500">
              {globalStats?.currentAPY || 0}%
            </p>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Total Stakers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {globalStats?.stakersCount || 0}
            </p>
          </CardContent>
        </Card>
        
        <div className="col-span-1 md:col-span-2">
          <DirectStakingWidget />
        </div>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Staking Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Lock Period</span>
              <span className="font-medium">7 days</span>
            </div>
            <div className="flex justify-between">
              <span>Early Withdrawal Fee</span>
              <span className="font-medium">25%</span>
            </div>
            <div className="flex justify-between">
              <span>Referral Reward</span>
              <span className="font-medium">3% of stake</span>
            </div>
            <div className="flex justify-between">
              <span>Min Stake</span>
              <span className="font-medium">1 HATM</span>
            </div>
            <div className="flex justify-between">
              <span>Reward Distribution</span>
              <span className="font-medium">Automatic</span>
            </div>
            
            <div className="pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={() => window.open('https://explorer.solana.com/address/EnGhdovdYhHk4nsHEJr6gmV3cYfrx53ky19RD56eRRGm?cluster=devnet', '_blank')}
              >
                View Contract on Explorer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}