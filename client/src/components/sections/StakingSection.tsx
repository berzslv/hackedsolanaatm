import { GradientText } from "@/components/ui/gradient-text";
import { Badge } from "@/components/ui/badge";
import { Trophy, Info } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import DirectStakingWidget from "@/components/DirectStakingWidget";
import { SimpleStakingWidget } from "@/components/SimpleStakingWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const StakingSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-4 text-primary">
            <Trophy className="h-3.5 w-3.5 mr-1" />
            Stake & Earn
          </Badge>
          <h2 className="text-3xl font-bold mb-4">
            <GradientText>Stake HATM Tokens</GradientText> to Earn Rewards
          </h2>
          <p className="text-muted-foreground mb-6">
            Stake your HATM tokens to earn rewards and participate in governance decisions.
            All staking operations happen directly on the Solana blockchain.
          </p>
          
          <Alert className="max-w-2xl mx-auto bg-primary/5 border-primary/10 mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>7-Day Lock Period</AlertTitle>
            <AlertDescription>
              When you stake tokens, they are locked for 7 days. Unstaking before this period 
              ends will incur a 10% early withdrawal fee.
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
          
          <Tabs defaultValue="main" className="w-full max-w-2xl mx-auto">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="main">Main Staking</TabsTrigger>
              <TabsTrigger value="simple">Simple Testing</TabsTrigger>
            </TabsList>
            <TabsContent value="main">
              <DirectStakingWidget />
            </TabsContent>
            <TabsContent value="simple">
              <SimpleStakingWidget />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default StakingSection;