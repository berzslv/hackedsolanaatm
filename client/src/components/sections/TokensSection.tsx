import { useState, useEffect } from "react";
import { GradientText } from "@/components/ui/gradient-text";
import { useToast } from "@/hooks/use-toast";
import { useSolana } from "@/context/SolanaContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

const TokensSection = () => {
  const { toast } = useToast();
  const { connected, publicKey } = useSolana();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchTokenBalance = async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/token-balance/${publicKey.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTokenBalance(data.balance);
      } else {
        console.error("Failed to fetch token balance:", data.error);
        setTokenBalance(0);
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
      setTokenBalance(0);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch balance when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      fetchTokenBalance();
    } else {
      setTokenBalance(null);
    }
  }, [connected, publicKey]);
  
  const handleRefreshBalance = () => {
    fetchTokenBalance();
    toast({
      title: "Refreshing balance",
      description: "Fetching your latest token balance...",
    });
  };
  
  return (
    <section id="tokens" className="section section-odd">
      <div className="pattern-grid"></div>
      <div className="pattern-circles">
        <div className="absolute w-48 h-48 rounded-full border border-secondary/10 -top-24 -right-24"></div>
        <div className="absolute w-32 h-32 rounded-full border border-primary/10 bottom-20 left-10"></div>
        <div className="absolute w-4 h-4 bg-secondary/5 rounded-full bottom-1/3 right-1/3"></div>
        <div className="absolute w-6 h-6 bg-primary/5 rounded-full top-1/3 left-1/4"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display mb-4 text-foreground">
            Hacked ATM <GradientText>Tokens</GradientText>
          </h2>
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Buy, transfer, and manage your HATM tokens with ease
          </p>
        </div>
        
        <div className="mb-12">
          <div className="bg-card/80 backdrop-blur-sm shadow-lg rounded-xl p-6 border border-border max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Your HATM Balance</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshBalance}
                disabled={!connected || isLoading}
              >
                <i className="ri-refresh-line mr-1"></i> Refresh
              </Button>
            </div>
            
            {!connected ? (
              <div className="text-center py-4 text-foreground/70">
                Connect your wallet to view your token balance
              </div>
            ) : isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {tokenBalance !== null ? formatNumber(tokenBalance, { decimals: 2 }) : '—'} 
                  <span className="text-foreground/70 text-xl ml-1">HATM</span>
                </div>
                <div className="text-xs text-foreground/60">
                  On Solana Devnet
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-foreground/70">
            Token management features are currently being upgraded for better user experience.
          </p>
          <Button
            variant="default"
            className="mt-4"
            onClick={() => window.open("https://solfaucet.com", "_blank")}
          >
            Get Devnet SOL
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TokensSection;