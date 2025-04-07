import { GradientText } from "@/components/ui/gradient-text";
import ReferralDashboard from "@/components/ReferralDashboard";

const ReferralSection = () => {
  return (
    <section id="referral" className="section section-odd">
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
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-foreground">
            Referral <GradientText className="from-secondary to-accent">Program</GradientText>
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Share your unique referral link and earn 3% on every transaction
          </p>
        </div>
        
        <ReferralDashboard />
      </div>
    </section>
  );
};

export default ReferralSection;
