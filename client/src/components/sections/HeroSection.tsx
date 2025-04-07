import { Button } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { StatsCard } from "@/components/ui/stats-card";
import BuyWidget from "@/components/BuyWidget";
import { Link } from "wouter";
import { useSolana } from "@/context/SolanaContext";
import React, { useRef } from "react";

const HeroSection = () => {
  const { connectWallet, connected } = useSolana();
  const buyWidgetFlashRef = useRef<() => void>(null);
  
  // Handler for the Buy $HATM button
  const handleBuyClick = () => {
    if (connected) {
      // If connected, flash the buy widget to draw attention to it
      if (buyWidgetFlashRef.current) {
        buyWidgetFlashRef.current();
      }
    } else {
      // If not connected, open wallet selector
      connectWallet();
    }
  };
  
  return (
    <section className="section section-hero">
      <div className="container mx-auto px-4 relative z-10">
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
                onClick={handleBuyClick}
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
            <BuyWidget flashRef={buyWidgetFlashRef} />
          </div>
        </div>
      </div>
      
      {/* Background Elements */}
      <div className="pattern-wave"></div>
      <div className="pattern-circles">
        <div className="absolute w-48 h-48 rounded-full border border-primary/10 -top-12 -left-12"></div>
        <div className="absolute w-64 h-64 rounded-full border border-secondary/10 -bottom-20 -right-20"></div>
        <div className="absolute w-32 h-32 rounded-full border border-accent/10 bottom-40 left-1/4"></div>
        <div className="absolute w-6 h-6 bg-primary/5 rounded-full top-1/4 left-1/3"></div>
        <div className="absolute w-4 h-4 bg-secondary/5 rounded-full bottom-1/3 right-1/4"></div>
        <div className="absolute w-8 h-8 bg-accent/5 rounded-full top-1/2 right-1/3"></div>
      </div>
      <div className="glow-blob glow-blob-primary w-96 h-96 -left-48 top-20"></div>
      <div className="glow-blob glow-blob-secondary w-96 h-96 -right-48 bottom-20"></div>
      <div className="glow-blob glow-blob-primary w-64 h-64 left-1/4 bottom-0 opacity-10"></div>
      <div className="glow-blob glow-blob-secondary w-64 h-64 right-1/4 top-0 opacity-10"></div>
    </section>
  );
};

export default HeroSection;
