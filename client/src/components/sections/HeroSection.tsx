import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { StatsCard } from "@/components/ui/stats-card";
import BuyWidget from "@/components/BuyWidget";
import { Link } from "wouter";
import { useWalletContext } from "@/context/WalletContext";

const HeroSection = () => {
  const { setShowWalletModal } = useWalletContext();
  
  return (
    <section className="section section-hero">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display leading-tight mb-6">
              <span className="text-foreground">The Next Gen</span>
              <br />
              <GradientText>Solana Token</GradientText>
            </h1>
            <p className="text-foreground/80 text-lg mb-8 max-w-lg">
              Hacked ATM combines powerful staking rewards with a lucrative referral system on Solana's lightning-fast network.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                className="px-6 py-3 gradient-button flex items-center gap-2"
                onClick={() => setShowWalletModal(true)}
              >
                <i className="ri-coins-line"></i>
                Buy $HATM
              </Button>
              <Link href="/whitepaper">
                <Button
                  variant="outline"
                  className="px-6 py-3 border-primary/30 text-foreground hover:bg-card/80 transition-colors flex items-center gap-2"
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
      <div className="glow-blob glow-blob-primary w-96 h-96 -left-48 top-20"></div>
      <div className="glow-blob glow-blob-secondary w-96 h-96 -right-48 bottom-20"></div>
      <div className="glow-blob glow-blob-primary w-64 h-64 left-1/4 bottom-0 opacity-10"></div>
      <div className="glow-blob glow-blob-secondary w-64 h-64 right-1/4 top-0 opacity-10"></div>
    </section>
  );
};

export default HeroSection;
