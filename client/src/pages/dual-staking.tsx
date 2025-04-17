import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EthStakingPanel } from '@/components/EthStakingPanel';
import DirectStakingWidget from '@/components/DirectStakingWidget';

export default function DualStakingPage() {
  const [platform, setPlatform] = useState<'ethereum' | 'solana'>('ethereum');

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Hacked ATM Token Staking</h1>
        <p className="text-xl text-gray-500 mt-2">
          Choose your preferred blockchain platform for staking
        </p>
      </div>

      <Tabs defaultValue="ethereum" className="w-full max-w-4xl mx-auto" onValueChange={(value) => setPlatform(value as 'ethereum' | 'solana')}>
        <div className="flex justify-center">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="ethereum" className="text-lg py-2">
              Ethereum
            </TabsTrigger>
            <TabsTrigger value="solana" className="text-lg py-2">
              Solana
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-8">
          <TabsContent value="ethereum">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <div className="bg-white dark:bg-slate-950 rounded-md p-1">
                <EthStakingPanel />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="solana">
            <div className="p-1 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg">
              <div className="bg-white dark:bg-slate-950 rounded-md p-1">
                <DirectStakingWidget />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="mt-12 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold">About HATM Staking</h2>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          Stake your HATM tokens to earn rewards at a competitive APY. Choose between Ethereum (Sepolia testnet) 
          or Solana (Devnet) depending on your preference. Both platforms offer the same core features:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-left">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h3 className="text-xl font-bold">7-Day Lock Period</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Tokens are locked for 7 days after staking. Early unstaking incurs a 10% fee.
            </p>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h3 className="text-xl font-bold">Referral System</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Earn 3% of the tokens staked by users you refer. Share your wallet address as a referral code.
            </p>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h3 className="text-xl font-bold">12% APY</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Earn rewards at a competitive rate of 12% APY on your staked tokens.
            </p>
          </div>
          
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h3 className="text-xl font-bold">One-Click Buy & Stake</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Buy tokens with ETH/SOL and stake them in a single transaction for convenience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}