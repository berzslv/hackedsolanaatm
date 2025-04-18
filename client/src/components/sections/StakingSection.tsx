import { GradientText } from "@/components/ui/gradient-text";
import StakingWidget from "@/components/StakingWidget";
import { useTokenData } from "@/context/TokenDataContext";
import { Progress } from "@/components/ui/progress";
import { formatNumber, formatTimeRemaining, getTimeUntilNextDistribution } from "@/lib/utils";
import { useState, useEffect } from "react";

const StakingSection = () => {
  const { currentAPY, totalStaked, rewardPool, stakersCount, nextReward } = useTokenData();
  const [timeToNextReward, setTimeToNextReward] = useState<string>("");
  
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const ms = getTimeUntilNextDistribution();
      setTimeToNextReward(formatTimeRemaining(ms));
    };
    
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <section id="staking" className="section section-even">
      <div className="pattern-grid"></div>
      <div className="pattern-circles">
        <div className="absolute w-48 h-48 rounded-full border border-secondary/10 -bottom-24 -left-24"></div>
        <div className="absolute w-32 h-32 rounded-full border border-primary/10 top-20 right-10"></div>
        <div className="absolute w-4 h-4 bg-secondary/5 rounded-full top-1/3 left-1/3"></div>
        <div className="absolute w-6 h-6 bg-primary/5 rounded-full bottom-1/3 right-1/4"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-foreground">
            Staking <GradientText>Vault</GradientText>
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Stake your Hacked ATM tokens to earn passive income with our dynamic APY system
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="bg-card/80 backdrop-blur-sm shadow-lg rounded-xl p-6 border border-border col-span-1 lg:col-span-1 order-2 lg:order-1">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Staking Stats</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground/70">Current APY</span>
                  <span className="text-primary font-semibold">{formatNumber(currentAPY, { suffix: '%' })}</span>
                </div>
                <Progress value={Math.min(currentAPY / 2, 100)} className="h-2 bg-muted">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary"></div>
                </Progress>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground/70">Total Staked</span>
                  <span className="text-primary font-semibold">{formatNumber(totalStaked, { suffix: ' HATM' })}</span>
                </div>
                <Progress value={Math.min(totalStaked / 10000000 * 100, 100)} className="h-2 bg-muted">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary"></div>
                </Progress>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground/70">Reward Pool</span>
                  <span className="text-primary font-semibold">{formatNumber(rewardPool, { suffix: ' HATM' })}</span>
                </div>
                <Progress value={Math.min(rewardPool / 250000 * 100, 100)} className="h-2 bg-muted">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary"></div>
                </Progress>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground/70">Stakers</span>
                  <span className="text-primary font-semibold">{formatNumber(stakersCount, { decimals: 0 })}</span>
                </div>
                <Progress value={Math.min(stakersCount / 5000 * 100, 100)} className="h-2 bg-muted">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary"></div>
                </Progress>
              </div>
              
              <div className="bg-muted rounded-lg p-4 border border-border/50">
                <h4 className="text-foreground text-sm font-medium mb-2">Next Reward Distribution</h4>
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <i className="ri-time-line text-secondary"></i>
                    <span className="text-foreground/70">{timeToNextReward}</span>
                  </div>
                  <span className="text-primary">{formatNumber(nextReward, { suffix: ' HATM' })}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card/80 backdrop-blur-sm shadow-lg rounded-xl border border-border order-1 lg:order-2 col-span-1 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <StakingWidget />
          </div>
        </div>
      </div>
    </section>
  );
};

export default StakingSection;
