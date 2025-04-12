import { GradientText } from "@/components/ui/gradient-text";
import StakingWidgetSmartContract from "@/components/StakingWidgetSmartContract";
import { useTokenData } from "@/context/TokenDataContext";
import { Progress } from "@/components/ui/progress";
import { formatNumber, formatTimeRemaining, getTimeUntilNextDistribution } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import StakedBalance from "@/components/StakedBalance";
import { useSolana } from "@/context/SolanaContext";

const SmartContractStakingSection = () => {
  const { currentAPY, totalStaked, rewardPool, stakersCount, nextReward } = useTokenData();
  const { connected } = useSolana();
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
    <section id="staking-on-chain" className="section section-even">
      <div className="pattern-grid"></div>
      <div className="pattern-circles">
        <div className="absolute w-48 h-48 rounded-full border border-secondary/10 -bottom-24 -left-24"></div>
        <div className="absolute w-32 h-32 rounded-full border border-primary/10 top-20 right-10"></div>
        <div className="absolute w-4 h-4 bg-secondary/5 rounded-full top-1/3 left-1/3"></div>
        <div className="absolute w-6 h-6 bg-primary/5 rounded-full bottom-1/3 right-1/4"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl font-display text-foreground">
              On-Chain <GradientText className="from-secondary to-accent">Staking Vault</GradientText>
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              New
            </Badge>
          </div>
          
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Our new on-chain staking system provides true decentralization and immutable staking rules,
            with all transactions processed transparently on the Solana blockchain
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
              
              <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4">
                <h4 className="text-emerald-500 text-sm font-medium flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 16v-8h-8" />
                    <path d="M8 8v8h8" />
                  </svg>
                  On-Chain Benefits
                </h4>
                <ul className="text-xs space-y-1 text-foreground/70">
                  <li className="flex items-start gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Immutable staking rules enforced by code
                  </li>
                  <li className="flex items-start gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Automatic rewards distribution
                  </li>
                  <li className="flex items-start gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Full transparency & auditability
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-card/80 backdrop-blur-sm shadow-lg rounded-xl border border-border order-1 lg:order-2 col-span-1 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <StakingWidgetSmartContract />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmartContractStakingSection;