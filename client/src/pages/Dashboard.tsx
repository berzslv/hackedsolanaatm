import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StakingDashboard from "@/components/StakingDashboard";
import ReferralSystem from "@/components/ReferralSystem";
import { Button } from "@/components/ui/button";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState("staking");
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
        Hacked ATM Dashboard
      </h1>

      {!connected && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connect your wallet</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Please connect your wallet to access all dashboard features.</span>
            <WalletMultiButton className="bg-primary hover:bg-primary/90 text-white rounded-md px-4 py-2" />
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="staking" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-6">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="staking">Staking</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <WalletMultiButton />
          </div>
        </div>
        
        <TabsContent value="staking" className="mt-0">
          <StakingDashboard />
        </TabsContent>
        
        <TabsContent value="referrals" className="mt-0">
          <ReferralSystem />
        </TabsContent>
      </Tabs>
    </div>
  );
}