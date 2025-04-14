import { GradientText } from "@/components/ui/gradient-text";
import DirectStakingWidget from "@/components/DirectStakingWidget";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Trophy, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DirectStakingSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary">
            <Trophy className="h-3.5 w-3.5 mr-1" />
            Direct Blockchain Staking
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            <GradientText>Stake HATM Tokens</GradientText> Directly On-Chain
          </h2>
          <p className="text-muted-foreground mb-6">
            Stake your HATM tokens to earn rewards and participate in governance decisions.
            All staking operations happen directly on the Solana blockchain with no backend intermediary.
          </p>
          
          <Alert className="max-w-2xl mx-auto bg-primary/5 border-primary/10 mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Direct On-Chain Access</AlertTitle>
            <AlertDescription>
              This component connects directly to the Solana blockchain using Web3.js, 
              with no backend required. All data is fetched and decoded in real-time from the blockchain.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-5 mb-8">
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">APY Up To</div>
              <div className="text-2xl font-bold">125%</div>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Lock Period</div>
              <div className="text-2xl font-bold">7 Days</div>
            </div>
            
            <div className="bg-card p-4 rounded-lg shadow-sm w-full max-w-[200px]">
              <div className="text-sm text-muted-foreground mb-1">Min. Stake</div>
              <div className="text-2xl font-bold">10 HATM</div>
            </div>
          </div>
        </div>
        
        <div className="relative">
          {/* Background gradient effects */}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <DirectStakingWidget />
        </div>
      </div>
    </section>
  );
};

export default DirectStakingSection;