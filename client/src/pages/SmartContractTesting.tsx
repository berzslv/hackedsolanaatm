import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StakingWidgetSmartContract from '@/components/StakingWidgetSmartContract';
import StakingReferralComponent from '@/components/StakingReferralComponent';
import StakingReferralWidget from '@/components/StakingReferralWidget';
import LeaderboardComponent from '@/components/LeaderboardComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export default function SmartContractTesting() {
  const [activeTab, setActiveTab] = useState<string>('new-ui');
  
  return (
    <div className="container mx-auto max-w-6xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">HATM Smart Contract Testing</h1>
        <p className="text-muted-foreground max-w-2xl">
          This page allows you to test the new combined staking and referral smart contract for HATM tokens.
          The contract implements secure staking with a 7-day lock period and an integrated referral system.
        </p>
      </div>
      
      <Alert className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-900 dark:text-yellow-300">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Testing Mode</AlertTitle>
        <AlertDescription>
          This is a development version of the contract running on Solana Devnet. Any tokens staked or earned here are for testing purposes only.
        </AlertDescription>
      </Alert>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-ui">Enhanced UI</TabsTrigger>
          <TabsTrigger value="original-ui">Original UI</TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-ui" className="mt-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <StakingReferralWidget />
            </div>
            
            <div className="space-y-8">
              <LeaderboardComponent />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="original-ui" className="mt-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <StakingWidgetSmartContract />
            </div>
            
            <div>
              <StakingReferralComponent />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Smart Contract Details</CardTitle>
            <CardDescription>Technical information about the implementation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Program ID</h3>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Token Mint</h3>
                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                  59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Features</h3>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Combined staking and referral tracking in a single contract</li>
                  <li>7-day token locking period with penalties for early withdrawal</li>
                  <li>Automatic reward calculation based on staking time</li>
                  <li>Referral rewards (3% of referred staking amount)</li>
                  <li>Reward compounding option</li>
                  <li>Railway.com integration for event tracking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}