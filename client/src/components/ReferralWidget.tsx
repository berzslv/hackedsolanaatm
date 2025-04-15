import React, { useState, useEffect } from 'react';
import { useSolana } from '@/hooks/use-solana';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle, AlertCircle, RefreshCcw, Award } from 'lucide-react';
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
  const [newReferralCode, setNewReferralCode] = useState<string>('');

  // Function to generate a referral code
  const generateReferralCode = () => {
    // Generate a random string for the referral code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewReferralCode(code);
  };

  // Function to fetch referral data
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

  // Function to copy referral link to clipboard
  const copyReferralLink = () => {
    if (!referralStats?.referralCode) return;
    
    const referralLink = `${window.location.origin}?ref=${referralStats.referralCode}`;
    
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        setCopied(true);
        toast({
          title: 'Copied!',
          description: 'Referral link copied to clipboard',
        });
        
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({
          title: 'Error',
          description: 'Failed to copy link',
          variant: 'destructive',
        });
      });
  };

  // Function to register a new referral code
  const registerReferralCode = async () => {
    if (!connected || !publicKey || !newReferralCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/register-referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          referralCode: newReferralCode,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register referral code');
      }
      
      toast({
        title: 'Success!',
        description: 'Your referral code has been registered',
      });
      
      // Refresh referral data
      fetchReferralData();
    } catch (err: any) {
      console.error('Error registering referral code:', err);
      setError(err.message || 'Failed to register referral code');
      
      toast({
        title: 'Error',
        description: err.message || 'Failed to register referral code',
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
        
        {/* Referral Code Section */}
        <Tabs defaultValue={referralStats?.referralCode ? "share" : "create"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share" disabled={!referralStats?.referralCode}>Share</TabsTrigger>
            <TabsTrigger value="create" disabled={!!referralStats?.referralCode}>Create</TabsTrigger>
          </TabsList>
          
          <TabsContent value="share" className="space-y-4 pt-4">
            {referralStats?.referralCode ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Referral Link</label>
                  <div className="flex space-x-2">
                    <Input 
                      readOnly 
                      value={`${window.location.origin}?ref=${referralStats.referralCode}`} 
                    />
                    <Button 
                      variant="outline" 
                      onClick={copyReferralLink}
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link with friends and earn 3% on their staking amount
                  </p>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-md">
                  <div className="flex items-center mb-2">
                    <Award className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm font-medium">Your Referral Code</span>
                  </div>
                  <div className="font-mono text-xl font-bold">{referralStats.referralCode}</div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">You don't have a referral code yet</p>
                <Button 
                  variant="link" 
                  onClick={() => document.querySelector('[value="create"]')?.dispatchEvent(new Event('click'))}
                >
                  Create one now
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="create" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Create Your Referral Code</label>
              <div className="flex space-x-2">
                <Input 
                  placeholder="YOURCODE"
                  value={newReferralCode}
                  onChange={(e) => setNewReferralCode(e.target.value.toUpperCase())}
                  maxLength={12}
                />
                <Button 
                  variant="outline" 
                  onClick={generateReferralCode}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a memorable code or use the generate button for a random one
              </p>
            </div>
            
            <Button 
              className="w-full" 
              onClick={registerReferralCode}
              disabled={loading || !newReferralCode}
            >
              {loading ? 'Creating...' : 'Create Referral Code'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="bg-primary/5 flex flex-col items-start p-4">
        <h4 className="text-sm font-medium mb-2">How It Works</h4>
        <ol className="text-xs text-muted-foreground space-y-1">
          <li>1. Create your unique referral code</li>
          <li>2. Share your code or link with friends</li>
          <li>3. When they stake HATM tokens, you earn 3% instantly</li>
          <li>4. All rewards are tracked on-chain for transparency</li>
        </ol>
      </CardFooter>
    </Card>
  );
};

export default ReferralWidget;