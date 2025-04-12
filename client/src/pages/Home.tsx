import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import TokensSection from '@/components/sections/TokensSection';
import StakingSection from '@/components/sections/StakingSection';
import ReferralSection from '@/components/sections/ReferralSection';
import LeaderboardSection from '@/components/sections/LeaderboardSection';
import FaqSection from '@/components/sections/FaqSection';
import SmartContractStakingSection from '@/components/sections/SmartContractStakingSection';
import SmartContractReferralSection from '@/components/sections/SmartContractReferralSection';
import { useEffect } from 'react';
import { Separator } from '@/components/ui/separator';

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
            <h2 className="text-2xl md:text-3xl font-display mb-2">Smart Contract Upgrades</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-sm">
              We've upgraded our platform with true on-chain functionality for staking and referrals,
              providing increased security, transparency, and decentralization.
            </p>
          </div>
        </div>
      </div>
      
      <SmartContractStakingSection />
      <SmartContractReferralSection />
      
      {/* Legacy Sections */}
      <div className="bg-card/30 backdrop-blur-sm border-y border-border py-10 my-4">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-display mb-2">Legacy Platform</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-sm">
              Our previous staking and referral system will remain available during the transition period.
            </p>
          </div>
        </div>
      </div>
      
      <StakingSection />
      <ReferralSection />
      <LeaderboardSection />
      <FaqSection />
    </>
  );
};

export default Home;
