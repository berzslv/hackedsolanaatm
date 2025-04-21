import { useState, useEffect } from "react";
import { GradientText } from "@/components/ui/gradient-text";
import { Badge } from "@/components/ui/badge";
import { Trophy, Info } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DirectStakingWidget from "@/components/DirectStakingWidget";
import AnchorStakingWidget from "@/components/AnchorStakingWidget";
import SimpleStakingWidget from "@/components/SimpleStakingWidget";
import { useWallet } from "@solana/wallet-adapter-react";

const StakingSection = () => {
  const { publicKey } = useWallet();
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [stakingInfo, setStakingInfo] = useState<any>({
    amountStaked: 0,
    pendingRewards: 0,
    estimatedAPY: 12,
    isLocked: false
  });
  
  // Fetch token balance and staking info when wallet changes
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!publicKey) {
        setTokenBalance(0);
        return;
      }
      
      try {
        // Fetch token balance
        const balanceResponse = await fetch(`/api/token-balance/${publicKey.toString()}`);
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          
          // Check if this is the raw or formatted balance
          let formattedBalance;
          if (balanceData.balance > 1000000000) {
            // This is raw balance with 9 decimals
            formattedBalance = balanceData.balance / 1e9;
          } else {
            // This is already formatted (less than 1 billion)
            formattedBalance = balanceData.balance;
          }
          
          setTokenBalance(formattedBalance);
          console.log("Token balance updated:", formattedBalance);
        }
        
        // Fetch staking info
        const stakingResponse = await fetch(`/api/staking-info/${publicKey.toString()}`);
        if (stakingResponse.ok) {
          const stakingData = await stakingResponse.json();
          setStakingInfo(stakingData);
        }
      } catch (error) {
        console.error("Error fetching wallet data:", error);
      }
    };
    
    fetchWalletData();
  }, [publicKey]);
  
  // Refresh data after successful staking
  const handleStakingSuccess = async () => {
    if (!publicKey) return;
    
    try {
      // Fetch updated staking info
      const stakingResponse = await fetch(`/api/staking-info/${publicKey.toString()}`);
      if (stakingResponse.ok) {
        const stakingData = await stakingResponse.json();
        setStakingInfo(stakingData);
      }
      
      // Fetch updated token balance
      const balanceResponse = await fetch(`/api/token-balance/${publicKey.toString()}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        
        // Check if this is the raw or formatted balance
        let formattedBalance;
        if (balanceData.balance > 1000000000) {
          // This is raw balance with 9 decimals
          formattedBalance = balanceData.balance / 1e9;
        } else {
          // This is already formatted (less than 1 billion)
          formattedBalance = balanceData.balance;
        }
        
        setTokenBalance(formattedBalance);
        console.log("Token balance updated after stake:", formattedBalance);
      }
    } catch (error) {
      console.error("Error refreshing data after staking:", error);
    }
  };
  
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary">
            <Trophy className="h-3.5 w-3.5 mr-1" />
            Stake & Earn
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            <GradientText>Stake HATM Tokens</GradientText> to Earn Rewards
          </h2>
          <p className="text-muted-foreground mb-6">
            Stake your HATM tokens to earn rewards and participate in governance decisions.
            All staking operations happen directly on the Solana blockchain.
          </p>
          
          <Alert className="max-w-2xl mx-auto bg-primary/5 border-primary/10 mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>7-Day Lock Period</AlertTitle>
            <AlertDescription>
              When you stake tokens, they are locked for 7 days. Unstaking before this period 
              ends will incur a 25% early withdrawal fee.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-5 mb-8">
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Current APY</div>
              <div className="text-2xl font-bold">{stakingInfo?.estimatedAPY || 12}%</div>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Lock Period</div>
              <div className="text-2xl font-bold">7 Days</div>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Your Balance</div>
              <div className="text-2xl font-bold">{tokenBalance.toLocaleString()} HATM</div>
            </div>
          </div>
        </div>
        
        <div className="relative">
          {/* Background gradient effects */}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="w-full max-w-2xl mx-auto">
            <Tabs defaultValue="anchor">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="anchor">Anchor Staking</TabsTrigger>
                <TabsTrigger value="direct">Direct Staking</TabsTrigger>
                <TabsTrigger value="simple">Simple Staking</TabsTrigger>
              </TabsList>
              <TabsContent value="anchor">
                <AnchorStakingWidget 
                  tokenBalance={tokenBalance} 
                  stakingInfo={stakingInfo}
                  onSuccess={handleStakingSuccess}
                />
              </TabsContent>
              <TabsContent value="direct">
                <DirectStakingWidget />
              </TabsContent>
              <TabsContent value="simple">
                <SimpleStakingWidget />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StakingSection;