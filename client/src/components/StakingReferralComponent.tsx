import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useCombinedSmartContract, ReferralInfo } from '@/lib/combined-smart-contract-client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CopyIcon, GiftIcon, UsersIcon, ArrowRightIcon, Loader2Icon } from 'lucide-react';
import { useParams, useLocation } from 'wouter';

export default function StakingReferralComponent() {
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const {
    registerUser,
    getUserReferralInfo,
    error
  } = useCombinedSmartContract();
  
  // Effect to fetch referral info when connected
  useEffect(() => {
    if (connected && publicKey) {
      fetchReferralInfo();
    } else {
      setReferralInfo(null);
    }
  }, [connected, publicKey]);
  
  // Effect to check for referral code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferrerCode(ref);
    }
  }, []);
  
  const fetchReferralInfo = async () => {
    if (!connected || !publicKey) return;
    
    setLoading(true);
    try {
      const info = await getUserReferralInfo();
      setReferralInfo(info);
      
      if (info?.referralCode) {
        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/?ref=${info.referralCode}`);
      }
    } catch (err) {
      console.error("Error fetching referral info:", err);
      toast({
        title: "Error",
        description: "Failed to fetch referral information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopyLink = () => {
    if (!referralLink) return;
    
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };
  
  const handleRegisterWithReferrer = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    if (!referrerCode) {
      toast({
        title: "Missing referral code",
        description: "Please enter a referral code",
        variant: "destructive",
      });
      return;
    }
    
    setIsRegistering(true);
    try {
      const success = await registerUser(referrerCode);
      
      if (success) {
        toast({
          title: "Success",
          description: "Successfully registered with referrer",
        });
        
        // Refresh data
        await fetchReferralInfo();
      } else {
        toast({
          title: "Error",
          description: error || "Failed to register. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error registering with referrer:", err);
      toast({
        title: "Error",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };
  
  const renderNotConnected = () => (
    <div className="text-center p-6 space-y-4">
      <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground" />
      <div>
        <h3 className="font-medium text-lg">Connect Wallet</h3>
        <p className="text-muted-foreground">Connect your wallet to access the referral program</p>
      </div>
      <WalletMultiButton className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded" />
    </div>
  );
  
  const renderReferralNotRegistered = () => (
    <div className="space-y-4">
      <div className="bg-muted p-4 rounded-md space-y-2">
        <h3 className="font-medium">Register with Referrer</h3>
        <p className="text-sm text-muted-foreground">
          Join using a referral code to earn bonus rewards when you stake
        </p>
        
        <div className="pt-2 space-y-2">
          <div className="flex gap-2">
            <Input 
              placeholder="Enter referral code" 
              value={referrerCode}
              onChange={(e) => setReferrerCode(e.target.value)}
            />
            <Button 
              onClick={handleRegisterWithReferrer}
              disabled={isRegistering || !referrerCode}
            >
              {isRegistering ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRightIcon className="h-4 w-4 mr-2" />}
              Register
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {referrerCode ? 
              "This code will be used when you register." : 
              "Enter a referral code to get started with the program."}
          </p>
        </div>
      </div>
    </div>
  );
  
  const renderReferralInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Your Referrals</div>
          <div className="text-lg font-semibold">{referralInfo?.referralCount || 0}</div>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Rewards</div>
          <div className="text-lg font-semibold">{referralInfo?.totalReferralRewards || 0} HATM</div>
        </div>
      </div>
      
      <div className="bg-muted p-4 rounded-md space-y-3">
        <h3 className="font-medium flex items-center">
          <GiftIcon className="h-4 w-4 mr-2" />
          Your Referral Link
        </h3>
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={handleCopyLink}>
            <CopyIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this link with friends. When they stake HATM tokens, you'll earn rewards!
        </p>
      </div>
      
      {referralInfo?.referrer && (
        <div className="bg-muted/50 p-3 rounded-md text-sm">
          <div className="text-muted-foreground">You were referred by:</div>
          <div className="font-mono text-xs mt-1 truncate">{referralInfo.referrer}</div>
        </div>
      )}
    </div>
  );
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Referral Program</CardTitle>
        <CardDescription>Earn rewards by inviting friends to stake HATM</CardDescription>
      </CardHeader>
      
      <CardContent>
        {!connected ? renderNotConnected() : 
         loading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
         ) : referralInfo?.referralCode ? 
           renderReferralInfo() : 
           renderReferralNotRegistered()
        }
      </CardContent>
      
      <CardFooter className="block border-t pt-4">
        <div className="text-xs text-muted-foreground">
          Earn 5% of all tokens staked by users you refer. Referral rewards are automatically added to your staking rewards.
        </div>
      </CardFooter>
    </Card>
  );
}