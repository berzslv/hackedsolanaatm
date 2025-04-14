import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCcw, ClipboardCopy } from "lucide-react";
import { useWallet } from '@solana/wallet-adapter-react';

const RAILWAY_URL = 'https://hackedpolling-production.up.railway.app';

interface StakingInfo {
  walletAddress: string;
  stakeData?: {
    amountStaked: number;
    pendingRewards: number;
    lastUpdateTime: string;
  };
  events?: any[];
}

export default function StakingDataDebugger() {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [stakingData, setStakingData] = useState<StakingInfo | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [localStakingData, setLocalStakingData] = useState<any | null>(null);
  
  useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toString());
    }
  }, [publicKey]);
  
  const fetchStakingData = async () => {
    if (!walletAddress) {
      toast({
        title: "Enter wallet address",
        description: "Please enter a wallet address to check",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      // Get data from Railway service
      const railwayResponse = await fetch(`${RAILWAY_URL}/api/staking-data/${walletAddress}`);
      const railwayData = await railwayResponse.json();
      setStakingData(railwayData);
      
      // Get token balance
      const balanceResponse = await fetch(`${RAILWAY_URL}/api/token-balance/${walletAddress}`);
      const balanceData = await balanceResponse.json();
      setTokenBalance(balanceData.balance);
      
      // Get local API data
      try {
        const localResponse = await fetch(`/api/staking-info/${walletAddress}`);
        const localData = await localResponse.json();
        setLocalStakingData(localData);
      } catch (err) {
        console.error("Error fetching local staking data:", err);
      }
      
    } catch (error) {
      console.error("Error fetching staking data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch staking data. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };
  
  return (
    <div className="container max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Staking Data Debugger</CardTitle>
          <CardDescription>
            Check staking data from various sources to debug issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input 
                id="wallet-address" 
                placeholder="Enter Solana wallet address" 
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>
            <Button 
              onClick={fetchStakingData} 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
              Check Data
            </Button>
          </div>

          {stakingData && (
            <>
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Railway Staking Data</h3>
                <div className="bg-muted p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Wallet Address:</div>
                    <div className="flex items-center">
                      {stakingData.walletAddress || 'N/A'}
                      <Button variant="ghost" size="sm" className="ml-2 h-6 w-6 p-0" onClick={() => handleCopy(stakingData.walletAddress)}>
                        <ClipboardCopy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div>Events Count:</div>
                    <div>{stakingData.events?.length || 0}</div>
                    
                    {stakingData.stakeData && (
                      <>
                        <div>Amount Staked:</div>
                        <div>{stakingData.stakeData.amountStaked || 0}</div>
                        
                        <div>Pending Rewards:</div>
                        <div>{stakingData.stakeData.pendingRewards || 0}</div>
                        
                        <div>Last Update:</div>
                        <div>{new Date(stakingData.stakeData.lastUpdateTime).toLocaleString()}</div>
                      </>
                    )}
                    
                    <div>Token Balance:</div>
                    <div>{tokenBalance !== null ? tokenBalance : 'Unknown'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Local API Staking Data</h3>
                <div className="bg-muted p-4 rounded-md">
                  {localStakingData ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>Success:</div>
                      <div>{localStakingData.success ? 'Yes' : 'No'}</div>
                      
                      {localStakingData.stakingInfo && (
                        <>
                          <div>Amount Staked:</div>
                          <div>{localStakingData.stakingInfo.amountStaked || 0}</div>
                          
                          <div>Pending Rewards:</div>
                          <div>{localStakingData.stakingInfo.pendingRewards || 0}</div>
                          
                          <div>Staked At:</div>
                          <div>{new Date(localStakingData.stakingInfo.stakedAt).toLocaleString()}</div>
                          
                          <div>Data Source:</div>
                          <div>{localStakingData.stakingInfo.dataSource || 'Unknown'}</div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-muted-foreground">
                      No local API data available
                    </div>
                  )}
                </div>
              </div>
              
              {stakingData.events && stakingData.events.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Staking Events</h3>
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-80">
                    <pre className="text-xs">{JSON.stringify(stakingData.events, null, 2)}</pre>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-between">
          <div className="text-sm text-muted-foreground">
            Data from Railway service: {RAILWAY_URL}
          </div>
          <Button variant="outline" size="sm" onClick={() => setStakingData(null)}>
            Clear Data
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}