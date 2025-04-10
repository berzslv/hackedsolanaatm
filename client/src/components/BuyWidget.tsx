import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSolana } from '@/context/SolanaContext';
import { useWalletModalOpener } from "@/components/ui/wallet-adapter";
import { useTokenData } from '@/context/TokenDataContext';
import { useReferral } from '@/context/ReferralContext';
import { formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BuyWidgetProps {
  flashRef?: React.RefObject<() => void>;
}

const BuyWidget = ({ flashRef }: BuyWidgetProps) => {
  const { connected, balance } = useSolana();
  const { openWalletModal } = useWalletModalOpener();
  const { tokenPrice } = useTokenData();
  const { toast } = useToast();
  const { referralCode: refFromContext, referralFromLink } = useReferral();
  const [solAmount, setSolAmount] = useState<string>('');
  const [hatchAmount, setHatchAmount] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralValid, setReferralValid] = useState<boolean>(false);
  const [showReferralInput, setShowReferralInput] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Function to trigger flash effect programmatically
  const triggerFlash = useCallback(() => {
    if (connected) {
      setIsFlashing(true);
      setTimeout(() => {
        setIsFlashing(false);
      }, 1500);
    } else {
      openWalletModal(); // This opens the wallet selection modal
    }
  }, [connected, openWalletModal]);

  // Expose the flash function via ref
  useEffect(() => {
    if (flashRef) {
      // @ts-ignore - this is a valid pattern but TypeScript doesn't like it
      flashRef.current = triggerFlash;
    }
  }, [triggerFlash, flashRef]);

  // Show referral code input if user is connected, hide if disconnected
  useEffect(() => {
    setShowReferralInput(connected);
  }, [connected]);

  // Apply referral code from URL if available
  useEffect(() => {
    if (refFromContext && refFromContext.length === 6) {
      setReferralCode(refFromContext);
      setReferralValid(true);
      
      if (referralFromLink && connected) {
        // Only show toast when wallet is connected
        toast({
          title: "Referral code applied",
          description: `Referral code ${refFromContext} has been automatically applied.`,
        });
      }
    }
  }, [refFromContext, referralFromLink, connected, toast]);

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

  const applyReferralCode = async () => {
    if (referralCode.length !== 6) {
      toast({
        title: "Invalid referral code",
        description: "Please enter a valid 6-character referral code.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate the referral code with the API
      const response = await fetch(`/api/validate-referral/${referralCode}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setReferralValid(true);
        toast({
          title: "Referral code applied",
          description: `Valid referral code ${referralCode} applied for this purchase.`,
        });
      } else {
        setReferralValid(false);
        toast({
          title: "Invalid referral code",
          description: "This referral code does not exist. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating referral code:", error);
      toast({
        title: "Validation failed",
        description: "Could not validate the referral code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBuy = async () => {
    if (!connected) {
      openWalletModal(); // Open wallet selector modal
      return;
    }

    // Flash the widget to highlight where to buy
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 1000); // Stop flashing after 1 second

    // Validate the input amount
    const inputAmount = parseFloat(solAmount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid SOL amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough balance
    if (inputAmount > balance) {
      toast({
        title: "Insufficient balance",
        description: `You don't have enough SOL. Your balance: ${formatNumber(balance, {decimals: 4})} SOL`,
        variant: "destructive",
      });
      return;
    }

    // If a referral code is provided, validate it first
    if (referralCode) {
      try {
        const response = await fetch(`/api/referrals/validate?code=${referralCode}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          toast({
            title: "Invalid referral code",
            description: "The referral code you entered does not exist. Please remove it or use a valid code.",
            variant: "destructive",
          });
          return;
        }

        // Valid referral code
        toast({
          title: "Purchasing with referral",
          description: `Buying HATM with valid referral code: ${referralCode}`,
        });
      } catch (error) {
        console.error("Error validating referral code:", error);
        toast({
          title: "Validation failed",
          description: "Could not validate the referral code. Please try again.",
          variant: "destructive",
        });
        return;
      }
    } else {
      toast({
        title: "Purchase initiated",
        description: "No referral code applied. You'll pay 8% fee instead of 6%.",
      });
    }

    // Will be implemented with Solana integration
    // No popup alert, just the flashing effect
  };

  return (
    <div className="relative max-w-md mx-auto" ref={widgetRef}>
      {/* Flash effect when button is clicked while connected */}
      {isFlashing && connected && (
        <div className="absolute inset-0 z-20 overflow-hidden rounded-3xl animate-flash-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-secondary/80 to-accent/80 rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.6)]"></div>
        </div>
      )}

      {/* Normal background glow */}
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
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-foreground font-medium">Buy $HATM</h4>
            {connected && (
              <div className="flex items-center gap-1 text-xs bg-background/50 px-2 py-1 rounded-md">
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-3 h-3" />
                <span className="font-mono">Balance: {formatNumber(balance, { decimals: 4 })} SOL</span>
              </div>
            )}
          </div>
          <div className="bg-muted rounded-lg p-3 mb-4 flex justify-between items-center">
            <div className="relative w-2/3">
              <Input 
                type="number" 
                placeholder="0.0" 
                className="bg-transparent outline-none border-none pr-16"
                value={solAmount}
                onChange={handleSolInputChange}
              />
              {connected && (
                <button 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80 cursor-pointer"
                  onClick={() => {
                    // Leave a small amount for gas fees (0.01 SOL)
                    const maxAmount = Math.max(0, balance - 0.01).toFixed(4);
                    setSolAmount(maxAmount);
                    // Also update HATM amount
                    const hatmAmount = parseFloat(maxAmount) / tokenPrice;
                    setHatchAmount(hatmAmount.toFixed(2));
                  }}
                >
                  MAX
                </button>
              )}
            </div>
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
                  maxLength={6}
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
            {connected ? 'Buy $HATM' : 'Connect Wallet to Buy'}
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