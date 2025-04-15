import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import TokensSection from '@/components/sections/TokensSection';
import LeaderboardSection from '@/components/sections/LeaderboardSection';
import FaqSection from '@/components/sections/FaqSection';
import StakingSection from '@/components/sections/StakingSection';
import ReferralSection from '@/components/sections/ReferralSection';
import { useEffect } from 'react';

const Home = () => {
  useEffect(() => {
    document.title = 'Hacked ATM | Solana Token with On-Chain Referral & Staking';
  }, []);

  return (
    <>
      {/* Main sections with appropriate IDs for navigation */}
      <section id="home">
        <HeroSection />
      </section>
      
      <section id="about">
        <FeaturesSection />
      </section>
      
      <section id="tokens">
        <TokensSection />
      </section>
      
      {/* On-Chain Smart Contract Header */}
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
      
      {/* Simplified section layout */}
      <section id="staking">
        <StakingSection />
      </section>
      
      <section id="referral">
        <ReferralSection />
      </section>
      
      <section id="leaderboard">
        <LeaderboardSection />
      </section>
      
      <section id="faq">
        <FaqSection />
      </section>
    </>
  );
};

export default Home;
