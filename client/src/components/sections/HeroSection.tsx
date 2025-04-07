import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { StatsCard } from "@/components/ui/stats-card";
import BuyWidget from "@/components/BuyWidget";
import { Link } from "wouter";
import { useWalletContext } from "@/context/WalletContext";

const HeroSection = () => {
  const { setShowWalletModal } = useWalletContext();
  
  return (
    <section className="pt-28 pb-20 lg:pt-40 lg:pb-32 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display leading-tight mb-6">
              <span className="text-white">The Next Gen</span>
              <br />
              <GradientText>Solana Token</GradientText>
            </h1>
            <p className="text-light-300 text-lg mb-8 max-w-lg">
              Hacked ATM combines powerful staking rewards with a lucrative referral system on Solana's lightning-fast network.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 rounded-lg font-medium text-dark-900 hover:opacity-90 transition-opacity flex items-center gap-2"
                onClick={() => setShowWalletModal(true)}
              >
                <i className="ri-coins-line"></i>
                Buy $HATM
              </Button>
              <Link href="/whitepaper">
                <Button
                  variant="outline"
                  className="px-6 py-3 bg-dark-700 border border-primary/30 rounded-lg font-medium text-primary hover:bg-dark-600 transition-colors flex items-center gap-2"
                >
                  <i className="ri-file-paper-2-line"></i>
                  Whitepaper
                </Button>
              </Link>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-4">
              <StatsCard title="Referral Fee" value="6%" color="primary" />
              <StatsCard title="Auto-Compound" value="30m" color="secondary" />
              <StatsCard title="Blockchain" value="Solana" color="accent" />
            </div>
          </div>
          
          <div className="order-1 lg:order-2 relative">
            <BuyWidget />
          </div>
        </div>
      </div>
      
      {/* Background Elements */}
      <div className="absolute top-1/3 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute top-2/3 -right-16 w-32 h-32 bg-secondary/10 rounded-full blur-3xl"></div>
    </section>
  );
};

export default HeroSection;
