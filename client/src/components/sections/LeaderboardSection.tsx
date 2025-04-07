import { GradientText } from "@/components/ui/gradient-text";
import Leaderboard from "@/components/Leaderboard";

const LeaderboardSection = () => {
  return (
    <section id="leaderboard" className="py-16 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-white">
            Community <GradientText className="from-accent to-secondary">Leaderboard</GradientText>
          </h2>
          <p className="text-light-300 max-w-2xl mx-auto">
            Top performers receive special rewards and recognition
          </p>
        </div>
        
        <Leaderboard />
      </div>
    </section>
  );
};

export default LeaderboardSection;
