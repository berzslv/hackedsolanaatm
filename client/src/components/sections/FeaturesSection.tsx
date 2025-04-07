import { GradientText } from "@/components/ui/gradient-text";

const FeaturesSection = () => {
  return (
    <section id="about" className="section section-odd">
      <div className="pattern-dots"></div>
      <div className="pattern-circles">
        <div className="absolute w-36 h-36 rounded-full border border-secondary/10 top-20 right-20"></div>
        <div className="absolute w-24 h-24 rounded-full border border-primary/10 bottom-10 left-10"></div>
        <div className="absolute w-5 h-5 bg-primary/5 rounded-full top-1/3 right-1/4"></div>
        <div className="absolute w-3 h-3 bg-secondary/5 rounded-full bottom-1/4 left-1/3"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-foreground">
            Key <GradientText>Features</GradientText>
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Hacked ATM token combines innovative features to reward holders and create a sustainable ecosystem
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Referral System */}
          <div className="bg-card/90 backdrop-blur-sm rounded-xl p-6 border border-border shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <i className="ri-share-forward-line text-primary text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">Referral System</h3>
            <p className="text-foreground/70 mb-4">
              Earn 3% on every transaction made with your referral code. Share and grow together.
            </p>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-primary mt-0.5"></i>
                <span>6% fee with referral (3% to referrer)</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-primary mt-0.5"></i>
                <span>8% fee without referral</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-primary mt-0.5"></i>
                <span>On-chain tracking for security</span>
              </li>
            </ul>
          </div>
          
          {/* Staking Vault */}
          <div className="bg-card/90 backdrop-blur-sm rounded-xl p-6 border border-border shadow-md hover:shadow-lg hover:border-secondary/30 transition-all duration-300">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
              <i className="ri-safe-2-line text-secondary text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">Staking Vault</h3>
            <p className="text-foreground/70 mb-4">
              Stake your tokens to earn passive income with dynamic APY based on transaction volume.
            </p>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-secondary mt-0.5"></i>
                <span>Dynamic APY that adjusts with volume</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-secondary mt-0.5"></i>
                <span>Auto-compounding every 30 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-secondary mt-0.5"></i>
                <span>Early withdrawal fee of 5%</span>
              </li>
            </ul>
          </div>
          
          {/* Leaderboard Rewards */}
          <div className="bg-card/90 backdrop-blur-sm rounded-xl p-6 border border-border shadow-md hover:shadow-lg hover:border-accent/30 transition-all duration-300">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
              <i className="ri-trophy-line text-accent text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">Leaderboard Rewards</h3>
            <p className="text-foreground/70 mb-4">
              Top referrers and stakers get rewarded with airdrops and special recognition.
            </p>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-accent mt-0.5"></i>
                <span>Weekly and monthly competitions</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-accent mt-0.5"></i>
                <span>Token airdrops for top performers</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="ri-check-line text-accent mt-0.5"></i>
                <span>Extra APY bonuses for top stakers</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
