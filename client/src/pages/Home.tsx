import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import TokensSection from '@/components/sections/TokensSection';
import LeaderboardSection from '@/components/sections/LeaderboardSection';
import FaqSection from '@/components/sections/FaqSection';
import SmartContractStakingSection from '@/components/sections/SmartContractStakingSection';
import SmartContractReferralSection from '@/components/sections/SmartContractReferralSection';
import DirectStakingSection from '@/components/sections/DirectStakingSection';
import { useEffect } from 'react';

const Home = () => {
  useEffect(() => {
    document.title = 'Hacked ATM | Solana Token with On-Chain Referral & Staking';
  }, []);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <TokensSection />
      
      {/* On-Chain Smart Contract Sections */}
      <div className="bg-card/30 backdrop-blur-sm border-y border-border py-10 my-4">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-display mb-2">On-Chain Smart Contracts</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-sm">
              Our platform operates fully on-chain with Solana smart contracts for staking and referrals,
              providing maximum security, transparency, and decentralization.
            </p>
          </div>
        </div>
      </div>
      
      {/* Direct Blockchain Integration - No Backend */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 py-10 my-4">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-display mb-2">Direct Blockchain Integration</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-sm">
              Our new interface connects directly to the Solana blockchain without a backend,
              allowing for true decentralization and trustless interaction with your staking accounts.
            </p>
          </div>
        </div>
      </div>
      
      <DirectStakingSection />
      
      {/* Legacy Smart Contract Integration */}
      <SmartContractStakingSection />
      <SmartContractReferralSection />
      <LeaderboardSection />
      <FaqSection />
    </>
  );
};

export default Home;
