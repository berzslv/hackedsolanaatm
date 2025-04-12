import { GradientText } from "@/components/ui/gradient-text";
import ReferralDashboardSmartContract from "@/components/ReferralDashboardSmartContract";
import { Badge } from "@/components/ui/badge";

const SmartContractReferralSection = () => {
  return (
    <section id="referral-on-chain" className="section section-odd">
      <div className="pattern-wave"></div>
      <div className="pattern-circles">
        <div className="absolute w-64 h-64 rounded-full border border-secondary/10 -top-20 -right-20"></div>
        <div className="absolute w-40 h-40 rounded-full border border-primary/10 -bottom-20 -left-10"></div>
        <div className="absolute w-4 h-4 bg-primary/5 rounded-full bottom-1/4 right-1/4"></div>
        <div className="absolute w-3 h-3 bg-secondary/5 rounded-full top-1/4 left-1/4"></div>
        <div className="absolute w-5 h-5 bg-accent/5 rounded-full top-1/3 right-1/3"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h2 className="text-3xl md:text-4xl font-display text-foreground">
              On-Chain <GradientText className="from-secondary to-accent">Referral Program</GradientText>
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              New
            </Badge>
          </div>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Our new on-chain referral system provides trustless, transparent, and immutable tracking of referrals
            and automatic distribution of rewards, all executed directly on the Solana blockchain.
          </p>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <ReferralDashboardSmartContract />
          </div>
          
          <div className="space-y-6">
            <div className="bg-card/80 backdrop-blur-sm shadow-lg rounded-xl p-6 border border-border overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <h3 className="text-xl font-semibold mb-4 text-foreground">On-Chain Benefits</h3>
              
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-900/20 border border-emerald-600/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Transparent Tracking</h4>
                    <p className="text-xs text-foreground/70">
                      All referrals are tracked directly on-chain, providing complete transparency and auditability
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-900/20 border border-emerald-600/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <path d="M9 9h.01" />
                      <path d="M15 9h.01" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">No Cheating</h4>
                    <p className="text-xs text-foreground/70">
                      One-time referral binding ensures users can't change referrers after their first purchase
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-900/20 border border-emerald-600/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v6.5" />
                      <path d="M8.2 10 12 13l3.8-3" />
                      <path d="M18 9.79c0-.77-.35-1.5-.93-2A3.98 3.98 0 0 0 14 7c-1.62 0-3.2.91-3.2 1.5" />
                      <path d="M12 18v-2" />
                      <rect width="20" height="6" x="2" y="16" rx="2" />
                      <path d="M6 22v-6" />
                      <path d="M18 22v-6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Automatic Rewards</h4>
                    <p className="text-xs text-foreground/70">
                      5% referral rewards are automatically distributed when purchases are made through your code
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-900/20 border border-emerald-600/30 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                      <path d="M22 12A10 10 0 0 0 12 2v10z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Fee Distribution</h4>
                    <p className="text-xs text-foreground/70">
                      5% to referrer, 2% to staking rewards pool, and 1% to marketing - all handled by smart contract
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="bg-card/80 backdrop-blur-sm shadow-lg rounded-xl p-6 border border-border overflow-hidden relative">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              
              <h3 className="text-xl font-semibold mb-4 text-foreground">How It Works</h3>
              
              <ol className="relative border-l border-border space-y-6 pl-6">
                <li className="relative">
                  <div className="absolute -left-[25px] mt-1.5 h-4 w-4 rounded-full border border-border bg-primary"></div>
                  <p className="text-sm font-semibold text-foreground">Register Your Code</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    Create a unique referral code that will be permanently associated with your wallet address
                  </p>
                </li>
                
                <li className="relative">
                  <div className="absolute -left-[25px] mt-1.5 h-4 w-4 rounded-full border border-border bg-primary"></div>
                  <p className="text-sm font-semibold text-foreground">Share Your Link</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    Share your unique referral link with friends, social media, and community
                  </p>
                </li>
                
                <li className="relative">
                  <div className="absolute -left-[25px] mt-1.5 h-4 w-4 rounded-full border border-border bg-primary"></div>
                  <p className="text-sm font-semibold text-foreground">Friends Make Purchases</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    When people use your code to buy tokens, their wallet gets linked to yours on-chain
                  </p>
                </li>
                
                <li className="relative">
                  <div className="absolute -left-[25px] mt-1.5 h-4 w-4 rounded-full border border-border bg-primary"></div>
                  <p className="text-sm font-semibold text-foreground">Earn Rewards Automatically</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    Receive 5% of all purchases made using your referral code directly to your wallet
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmartContractReferralSection;