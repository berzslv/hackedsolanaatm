import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSolana } from '@/context/SolanaContext';
import { useTokenData } from '@/context/TokenDataContext';
import { formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const BuyWidget = () => {
  const { connected, connectWallet } = useSolana();
  const { tokenPrice } = useTokenData();
  const { toast } = useToast();
  const [solAmount, setSolAmount] = useState<string>('');
  const [hatchAmount, setHatchAmount] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [showReferralInput, setShowReferralInput] = useState<boolean>(false);
  
  // Show referral code input if user is connected
  useEffect(() => {
    if (connected) {
      setShowReferralInput(true);
    }
  }, [connected]);
  
  const handleSolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSolAmount(value);
    
    // Calculate HATM amount based on SOL input
    if (value && !isNaN(parseFloat(value))) {
      const hatmAmount = parseFloat(value) / tokenPrice;
      setHatchAmount(hatmAmount.toFixed(2));
    } else {
      setHatchAmount('');
    }
  };
  
  const handleHatmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHatchAmount(value);
    
    // Calculate SOL amount based on HATM input
    if (value && !isNaN(parseFloat(value))) {
      const solAmount = parseFloat(value) * tokenPrice;
      setSolAmount(solAmount.toFixed(4));
    } else {
      setSolAmount('');
    }
  };
  
  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert input to uppercase and limit to 6 characters
    const value = e.target.value.toUpperCase().slice(0, 6);
    setReferralCode(value);
  };
  
  const applyReferralCode = () => {
    if (referralCode.length === 6) {
      toast({
        title: "Referral code applied",
        description: `Using referral code ${referralCode} for this purchase.`,
      });
    } else {
      toast({
        title: "Invalid referral code",
        description: "Please enter a valid 6-character referral code.",
        variant: "destructive",
      });
    }
  };
  
  const handleBuy = () => {
    if (!connected) {
      connectWallet();
      return;
    }
    
    // Process buy transaction
    if (referralCode) {
      toast({
        title: "Purchasing with referral",
        description: `Buying HATM with referral code: ${referralCode}`,
      });
    } else {
      toast({
        description: "No referral code applied. You'll pay 8% fee instead of 6%.",
      });
    }
    
    // Alert for now, will be implemented with Solana integration
    alert('Buy functionality will be implemented when connected to Solana blockchain');
  };
  
  return (
    <div className="relative max-w-md mx-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl opacity-30"></div>
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-6 relative z-10 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-display text-foreground">ATM Terminal</h3>
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          </div>
        </div>
        
        <div className="bg-muted rounded-lg p-4 mb-6 font-mono">
          <div className="flex justify-between mb-2">
            <span className="text-foreground/70">Token:</span>
            <span className="text-primary">$HATM</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-foreground/70">Network:</span>
            <span className="text-secondary">Solana</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-foreground/70">Current Price:</span>
            <span className="text-accent">${formatNumber(tokenPrice, { decimals: 4 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">Staking APY:</span>
            <span className="text-primary">{formatNumber(125, { suffix: '%' })}</span>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-4 mb-6 border border-border/50">
          <h4 className="text-foreground mb-3 font-medium">Buy $HATM</h4>
          <div className="bg-muted rounded-lg p-3 mb-4 flex justify-between items-center">
            <Input 
              type="number" 
              placeholder="0.0" 
              className="bg-transparent w-2/3 outline-none border-none"
              value={solAmount}
              onChange={handleSolInputChange}
            />
            <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-lg">
              <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-5 h-5" />
              <span>SOL</span>
            </div>
          </div>
          
          <div className="flex justify-center mb-4">
            <i className="ri-arrow-down-line text-foreground/50"></i>
          </div>
          
          <div className="bg-muted rounded-lg p-3 mb-4 flex justify-between items-center">
            <Input 
              type="number" 
              placeholder="0.0" 
              className="bg-transparent w-2/3 outline-none border-none"
              value={hatchAmount}
              onChange={handleHatmInputChange}
            />
            <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-lg">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-background text-xs">H</div>
              <span>HATM</span>
            </div>
          </div>
          
          {showReferralInput && (
            <div className="bg-muted rounded-lg p-3 mb-4">
              <Label htmlFor="referral-code" className="text-xs text-foreground/70 mb-1 block">
                Have a referral code? Enter it below to get 2% discount:
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="referral-code"
                  placeholder="ENTER REFERRAL CODE" 
                  className="bg-background/30 border-border/30"
                  value={referralCode}
                  onChange={handleReferralCodeChange}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={applyReferralCode}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        
          <Button 
            className="w-full py-3 gradient-button"
            onClick={handleBuy}
          >
            {connected ? 'Buy HATM' : 'Connect Wallet to Buy'}
          </Button>
        </div>
        
        <div className="text-xs text-foreground/70 bg-muted p-2 rounded-lg">
          <p className="flex items-center gap-1">
            <i className="ri-information-line"></i>
            {referralCode ? (
              <>6% fee with referral code: <span className="font-mono text-primary">{referralCode}</span></>
            ) : (
              <>6% referral fee | 8% without referral</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyWidget;
