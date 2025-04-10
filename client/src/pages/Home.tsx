import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import TokensSection from '@/components/sections/TokensSection';
import StakingSection from '@/components/sections/StakingSection';
import ReferralSection from '@/components/sections/ReferralSection';
import LeaderboardSection from '@/components/sections/LeaderboardSection';
import FaqSection from '@/components/sections/FaqSection';
import { useEffect } from 'react';

const Home = () => {
  useEffect(() => {
    document.title = 'Hacked ATM | Solana Token with Referral & Staking';
  }, []);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <TokensSection /> {/* Add the new tokens section */}
      <StakingSection />
      <ReferralSection />
      <LeaderboardSection />
      <FaqSection />
    </>
  );
};

export default Home;
