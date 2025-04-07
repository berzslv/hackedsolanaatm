import { GradientText } from "@/components/ui/gradient-text";
import Leaderboard from "@/components/Leaderboard";

const LeaderboardSection = () => {
  return (
    <section id="leaderboard" className="section section-even">
      <div className="pattern-dots"></div>
      <div className="pattern-circles">
        <div className="absolute w-52 h-52 rounded-full border border-primary/10 -bottom-20 -right-20"></div>
        <div className="absolute w-28 h-28 rounded-full border border-secondary/10 top-10 left-20"></div>
        <div className="absolute w-6 h-6 bg-accent/5 rounded-full bottom-1/3 left-1/3"></div>
        <div className="absolute w-4 h-4 bg-primary/5 rounded-full top-1/2 right-1/3"></div>
        <div className="absolute w-8 h-8 rounded-full border border-accent/10 top-1/4 right-1/4"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-foreground">
            Community <GradientText className="from-accent to-secondary">Leaderboard</GradientText>
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Top performers receive special rewards and recognition
          </p>
        </div>
        
        <Leaderboard />
      </div>
    </section>
  );
};

export default LeaderboardSection;
