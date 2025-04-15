import { GradientText } from "@/components/ui/gradient-text";
import { Badge } from "@/components/ui/badge";
import { Users, Link } from "lucide-react";
import ReferralWidget from "../ReferralWidget";

const ReferralSection = () => {
  return (
    <section className="py-16 px-4 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="container mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary">
            <Users className="h-3.5 w-3.5 mr-1" />
            Share & Earn
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            <GradientText>Refer Friends</GradientText> and Earn 3% Rewards
          </h2>
          <p className="text-muted-foreground mb-8">
            Generate your unique referral link and earn 3% of all tokens staked by friends who use your link.
            Rewards are automatically tracked and distributed on-chain for maximum transparency.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-5 mb-8">
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Referral Reward</div>
              <div className="text-2xl font-bold">3%</div>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Paid In</div>
              <div className="text-2xl font-bold">HATM Tokens</div>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Payment Method</div>
              <div className="text-2xl font-bold">Instant</div>
            </div>
          </div>
        </div>
        
        <div className="relative">
          {/* Background gradient effects */}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <ReferralWidget />
        </div>
      </div>
    </section>
  );
};

export default ReferralSection;