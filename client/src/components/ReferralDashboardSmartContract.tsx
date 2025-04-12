import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clipboard, Share2, Trophy, TrendingUp, Gift, AlertCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSolana } from "@/context/SolanaContext";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { ReferralTrackerClient } from "@/lib/referral-tracker-client";

interface Activity {
  date: string;
  transaction: string;
  amount: number;
  reward: number;
}

const ReferralDashboardSmartContract: React.FC = () => {
  const { connected, publicKey, signTransaction, sendTransaction } = useSolana();
  const [referralStats, setReferralStats] = useState<{
    referralCode: string;
    totalReferred: number;
    totalEarnings: number;
    claimableRewards: number;
    referredCount: number;
    weeklyRank: number | null;
    recentActivity: Activity[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [newReferralCode, setNewReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralClient, setReferralClient] = useState<ReferralTrackerClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize referral client
  useEffect(() => {
    if (connected && publicKey) {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const client = new ReferralTrackerClient(
        connection, 
        publicKey, 
        "59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk"
      );
      setReferralClient(client);
      
      // Initialize client
      client.initialize().catch(console.error);
    }
  }, [connected, publicKey]);

  // Load referral stats
  // Define a function to refresh stats that can be called from other places
  const refreshStats = async () => {
    if (!connected || !publicKey) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the client to get stats if available, otherwise fallback to API
      if (referralClient) {
        const stats = await referralClient.getReferralStats();
        if (stats) {
          setReferralStats({
            ...stats,
            weeklyRank: null,
            recentActivity: []
          });
        }
      }
      
      // Always fetch from the current backend API for complete data
      const response = await fetch(`/api/referrals/${publicKey.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch referral stats");
      }

      const data = await response.json();
      
      // Get referral code from localStorage if not present in API response
      const storedCode = localStorage.getItem('userReferralCode');
      const finalReferralCode = data.referralCode || storedCode || '';
      
      // If we have a code in localStorage but not in the API, keep it
      if (storedCode && !data.referralCode) {
        console.log("Using referral code from localStorage:", storedCode);
      }
      
      setReferralStats({
        referralCode: finalReferralCode, 
        totalReferred: data.totalReferred || 0,
        totalEarnings: data.totalEarnings || 0,
        claimableRewards: data.claimableRewards || 0,
        referredCount: data.referredCount || 0,
        weeklyRank: data.weeklyRank,
        recentActivity: data.recentActivity || []
      });
      
      // Always make sure localStorage is updated with the current code
      if (finalReferralCode) {
        localStorage.setItem('userReferralCode', finalReferralCode);
        console.log("Saved referral code to localStorage:", finalReferralCode);
      }
    } catch (err) {
      console.error("Failed to fetch referral stats:", err);
      setError("Failed to load referral data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize referral stats on component mount and when dependencies change
  useEffect(() => {
    // Just fetch stats once when component mounts or dependencies change
    refreshStats();
    // No automatic polling - refresh only when needed
  }, [connected, publicKey, referralClient]);

  const copyReferralLink = () => {
    if (!referralStats?.referralCode) return;
    
    // Just copy the code, not the URL
    navigator.clipboard.writeText(referralStats.referralCode);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const handleRegisterReferralCode = async () => {
    if (!referralClient || !signTransaction || !sendTransaction || !newReferralCode) return;
    
    try {
      setLoading(true);
      
      // Validate code format
      if (newReferralCode.length < 3 || newReferralCode.length > 10) {
        setError("Referral code must be between 3-10 characters");
        setLoading(false);
        return;
      }
      
      // First, store in backend database
      try {
        console.log(`Registering referral code ${newReferralCode} for wallet ${publicKey!.toString()}`);
        const response = await fetch('/api/register-referral-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: publicKey!.toString(),
            referralCode: newReferralCode
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to register referral code');
        }
        
        const data = await response.json();
        console.log("Backend registration successful:", data);
      } catch (error) {
        console.error("Backend registration failed:", error);
        setError("Failed to register referral code on server. Try again.");
        setLoading(false);
        return;
      }
      
      // Only proceed with blockchain registration if backend was successful
      try {
        // Now create and sign the blockchain transaction
        const transaction = await referralClient.createRegisterReferralCodeTransaction(newReferralCode);
        const signedTransaction = await signTransaction(transaction);
        
        // Send the transaction
        const signature = await sendTransaction(signedTransaction);
        console.log("Referral code blockchain registration transaction sent:", signature);
        
        // Wait briefly for the transaction to confirm
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (blockchainError) {
        // If blockchain registration fails, we still have the backend registration,
        // so we'll consider this a partial success
        console.warn("Blockchain registration failed, but backend succeeded:", blockchainError);
      }
      
      toast({
        title: "Success!",
        description: `Your referral code ${newReferralCode} has been registered`,
      });
      
      // Update the UI immediately
      setReferralStats(prev => ({
        ...prev!,
        referralCode: newReferralCode
      }));
      
      // Store in localStorage for persistence across refreshes
      localStorage.setItem('userReferralCode', newReferralCode);
      
      // Also update global state if available
      if (window.localStorage) {
        window.localStorage.setItem('referralCode', newReferralCode);
      }
      
      setLoading(false);
      
      // Refresh data after a short delay
      setTimeout(() => {
        refreshStats();
      }, 2000);
    } catch (err: any) {
      console.error("Failed to register referral code:", err);
      setError(err.message || "Failed to register referral code");
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!referralClient || !signTransaction || !sendTransaction || 
        !referralStats || referralStats.claimableRewards <= 0) return;
    
    try {
      setClaiming(true);
      
      // Create and sign the transaction
      const transaction = await referralClient.createClaimRewardsTransaction(
        referralStats.claimableRewards
      );
      const signedTransaction = await signTransaction(transaction);
      
      // Send the transaction
      const signature = await sendTransaction(signedTransaction);
      console.log("Claim rewards transaction sent:", signature);
      
      toast({
        title: "Success!",
        description: `Your rewards of ${referralStats.claimableRewards} HATM have been claimed`,
      });
      
      // Update the stats after a delay to allow blockchain confirmation
      setTimeout(async () => {
        const stats = await referralClient.getReferralStats();
        if (stats) {
          setReferralStats(prev => ({
            ...prev!,
            claimableRewards: 0
          }));
        }
        setClaiming(false);
      }, 5000);
      
    } catch (err: any) {
      console.error("Failed to claim rewards:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to claim rewards",
        variant: "destructive"
      });
      setClaiming(false);
    }
  };

  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Referral Program</CardTitle>
          <CardDescription>Refer friends and earn HATM tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p className="text-center text-muted-foreground">
              Connect your wallet to access the referral program
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Referral Program</CardTitle>
        <CardDescription>Earn 5% on every purchase made with your referral code</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Referral code section */}
        <div className="space-y-4">
          <h3 className="text-md font-medium">Your Referral Code</h3>
          
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : referralStats?.referralCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <Input 
                    readOnly 
                    value={referralStats.referralCode} 
                    className="pr-20"
                  />
                  <Button
                    className="absolute right-0 top-0 h-full rounded-l-none px-3 gap-1"
                    variant="secondary"
                    onClick={copyReferralLink}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Share this code with friends. When they buy HATM tokens, you'll receive 5% of their purchase amount.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  // Generate a random code
                  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                  setNewReferralCode(randomCode);
                  
                  // Register it after a short delay
                  setTimeout(() => {
                    handleRegisterReferralCode();
                  }, 100);
                }}
                disabled={loading}
                className="w-full"
              >
                Generate & Register Referral Code
              </Button>
              <p className="text-xs text-muted-foreground">
                Click the button to automatically generate a unique referral code and start earning HATM tokens.
              </p>
            </div>
          )}
        </div>
        
        {/* Stats section */}
        <div className="space-y-4">
          <h3 className="text-md font-medium">Your Referral Stats</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-1">
                  <Clipboard className="h-5 w-5 text-primary mb-1" />
                  <p className="text-muted-foreground text-xs">Total Referred</p>
                  {loading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <p className="text-xl font-bold">{referralStats?.referredCount || 0}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-1">
                  <TrendingUp className="h-5 w-5 text-primary mb-1" />
                  <p className="text-muted-foreground text-xs">Volume</p>
                  {loading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <p className="text-xl font-bold">{referralStats?.totalReferred || 0} SOL</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-1">
                  <Gift className="h-5 w-5 text-primary mb-1" />
                  <p className="text-muted-foreground text-xs">Total Earned</p>
                  {loading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <p className="text-xl font-bold">{referralStats?.totalEarnings || 0} HATM</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-1">
                  <Trophy className="h-5 w-5 text-primary mb-1" />
                  <p className="text-muted-foreground text-xs">Weekly Rank</p>
                  {loading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <p className="text-xl font-bold">
                      {referralStats?.weeklyRank ? `#${referralStats.weeklyRank}` : 'N/A'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Claimable rewards */}
        {referralStats?.claimableRewards ? (
          <div className="bg-slate-800 rounded-lg p-4 flex justify-between items-center">
            <div>
              <h3 className="text-md font-medium">Claimable Rewards</h3>
              <p className="text-lg font-bold">{referralStats.claimableRewards} HATM</p>
            </div>
            <Button
              onClick={handleClaimRewards}
              disabled={claiming || referralStats.claimableRewards <= 0}
            >
              {claiming ? "Claiming..." : "Claim Rewards"}
            </Button>
          </div>
        ) : null}
        
        {/* Activity section */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="info">How It Works</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : referralStats?.recentActivity?.length ? (
              <div className="space-y-3">
                {referralStats.recentActivity.map((activity, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{activity.date}</p>
                      <p className="text-sm text-green-500">+{activity.reward} HATM</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Purchase: {activity.amount} SOL
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {activity.transaction.substring(0, 8)}...{activity.transaction.substring(activity.transaction.length - 8)}
                    </p>
                    {index < referralStats.recentActivity.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No recent referral activity</p>
                <p className="text-sm mt-1">Share your code to start earning rewards!</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="info">
            <div className="space-y-4 text-muted-foreground text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">How to Earn</h4>
                <p>1. Share your unique referral code with friends</p>
                <p>2. When they buy HATM tokens, you earn 5% of their purchase amount</p>
                <p>3. Rewards are automatically tracked on-chain and cannot be tampered with</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Reward Distribution</h4>
                <p>• 5% of each purchase goes to the referrer</p>
                <p>• 2% goes to the staking rewards pool</p>
                <p>• 1% goes to marketing and development</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Leaderboard Rewards</h4>
                <p>Top referrers each week and month receive additional HATM token rewards!</p>
                <p>Check the Leaderboard tab for current standings.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t border-slate-800 px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Referral rewards are calculated at 5% of purchase amount
        </p>
      </CardFooter>
    </Card>
  );
};

export default ReferralDashboardSmartContract;