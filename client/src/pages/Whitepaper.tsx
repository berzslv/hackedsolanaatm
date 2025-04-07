import { useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { GradientText } from '@/components/ui/gradient-text';

const Whitepaper = () => {
  useEffect(() => {
    document.title = 'Whitepaper | Hacked ATM Token';
  }, []);

  return (
    <div className="pt-28 pb-20 container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Link href="/">
            <Button variant="outline" className="mb-6">
              <i className="ri-arrow-left-line mr-2"></i> Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-display mb-6 text-foreground">
            <GradientText>Hacked ATM</GradientText> Whitepaper
          </h1>
          <p className="text-foreground/70 text-lg">
            A comprehensive guide to the Hacked ATM token ecosystem, staking mechanism, and referral system.
          </p>
        </div>
        
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-8 border border-border shadow-md mb-10">
          <h2 className="text-2xl font-display mb-6 text-foreground">Token Overview</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium mb-3 text-foreground">Token Information</h3>
              <ul className="space-y-2">
                <li className="flex justify-between py-2 border-b border-border">
                  <span className="text-foreground/70">Token Name:</span>
                  <span className="text-primary font-medium">Hacked ATM</span>
                </li>
                <li className="flex justify-between py-2 border-b border-border">
                  <span className="text-foreground/70">Token Symbol:</span>
                  <span className="text-primary font-medium">HATM</span>
                </li>
                <li className="flex justify-between py-2 border-b border-border">
                  <span className="text-foreground/70">Blockchain:</span>
                  <span className="text-primary font-medium">Solana</span>
                </li>
                <li className="flex justify-between py-2 border-b border-border">
                  <span className="text-foreground/70">Token Type:</span>
                  <span className="text-primary font-medium">Solana-based with built-in referral & staking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-8 border border-border shadow-md mb-10">
          <h2 className="text-2xl font-display mb-6 text-foreground">Key Features</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3 text-foreground">Referral System</h3>
              <div className="bg-muted rounded-lg p-4 mb-4">
                <h4 className="text-foreground mb-2">Referral Fee Structure:</h4>
                <ul className="space-y-2 text-foreground/70">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>When users buy or sell Hacked ATM using a referral code or link, a total of 6% fee is applied.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>3% of the 6% fee goes directly to the referrer (the person who shared the referral link).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>1% of the 6% fee goes to a marketing wallet to support the project.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>2% of the 6% fee is collected and used to reward stakers in the staking vault. The 2% is distributed every 30 minutes to users who have staked their tokens, and the rewards are auto-compounded into their staked balance.</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-foreground mb-2">Without Referral:</h4>
                <ul className="space-y-2 text-foreground/70">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-secondary mt-0.5"></i>
                    <span>When users buy or sell Hacked ATM without referral code or link, a total of 8% fee is applied.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-secondary mt-0.5"></i>
                    <span>2% of the 8% fee goes to a marketing wallet to support the project.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-secondary mt-0.5"></i>
                    <span>6% of the 8% fee is collected and used to reward stakers in the staking vault. The 2% is distributed every 30 minutes to users who have staked their tokens, and the rewards are auto-compounded into their staked balance.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-3 text-foreground">Staking Vault</h3>
              <div className="bg-muted rounded-lg p-4 mb-4">
                <h4 className="text-foreground mb-2">Dynamic APY:</h4>
                <ul className="space-y-2 text-foreground/70">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>The APY for stakers will be dynamic, meaning it will adjust based on the transaction volume (2% of every buy and sell) and the total amount of Hacked ATM tokens staked in the vault.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>More transactions = Higher APY.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>More tokens staked = Lower APY.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>The APY will auto-adjust based on the fees collected and vault balance, ensuring a flexible, sustainable reward system.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-primary mt-0.5"></i>
                    <span>Auto-compounding: Staking rewards will automatically be compounded every 30 minutes into the user's staked balance.</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-foreground mb-2">Early Withdrawal Fee:</h4>
                <ul className="space-y-2 text-foreground/70">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-secondary mt-0.5"></i>
                    <span>If users unstake their Hacked ATM tokens within 7 days, a 4% fee of the amount they have staked will be burned automatically, 1% goes to marketing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-secondary mt-0.5"></i>
                    <span>This fee is designed to discourage early unstaking and help with token scarcity.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium mb-3 text-foreground">Leaderboard & Rewards</h3>
              <div className="bg-muted rounded-lg p-4 mb-4">
                <h4 className="text-foreground mb-2">Leaderboard:</h4>
                <ul className="space-y-2 text-foreground/70">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-accent mt-0.5"></i>
                    <span>Weekly and Monthly Leaderboards will track and display the top 3 referrers and top 3 stakers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-accent mt-0.5"></i>
                    <span>Top 3 Referrers: Based on the number of referrals or the transaction volume generated from their referrals.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-accent mt-0.5"></i>
                    <span>Top 3 Stakers: Based on the amount of Hacked ATM tokens staked.</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-foreground mb-2">Rewards for Top Users:</h4>
                <ul className="space-y-2 text-foreground/70">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-accent mt-0.5"></i>
                    <span>Airdrop Coins: The top 3 users (both referrers and stakers) will receive airdropped Hacked ATM tokens at the end of each week and month.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-accent mt-0.5"></i>
                    <span>Extra Staking Rewards: The top 3 stakers will receive additional staking rewards in the form of extra APY (e.g., +1% APY bonus for the top staker).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-accent mt-0.5"></i>
                    <span>Recognition: The top 3 will also be featured prominently on the website and potentially in social media posts, with special badges or titles.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whitepaper;
