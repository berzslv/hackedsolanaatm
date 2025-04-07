import { GradientText } from "@/components/ui/gradient-text";
import ReferralDashboard from "@/components/ReferralDashboard";

const ReferralSection = () => {
  return (
    <section id="referral" className="py-16 bg-dark-800/50 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-white">
            Referral <GradientText className="from-secondary to-accent">Program</GradientText>
          </h2>
          <p className="text-light-300 max-w-2xl mx-auto">
            Share your unique referral link and earn 3% on every transaction
          </p>
        </div>
        
        <ReferralDashboard />
      </div>
    </section>
  );
};

export default ReferralSection;
