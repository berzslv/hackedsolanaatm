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
import AirdropButton from './AirdropButton';
import { Loader2, AlertCircle } from "lucide-react";
import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';

export interface BuyWidgetProps {
  flashRef?: React.MutableRefObject<(() => void) | null>;
}

const BuyWidgetOnChain = ({ flashRef }: BuyWidgetProps) => {
  const { connected, balance, publicKey, sendTransaction, refreshBalance } = useSolana();
  const { openWalletModal } = useWalletModalOpener();
  const { tokenPrice, refreshTokenBalance } = useTokenData();
  const { toast } = useToast();
  const { referralCode, setReferralCode, validateReferralCode } = useReferral();
  const [solAmount, setSolAmount] = useState<string>('');
  const [hatchAmount, setHatchAmount] = useState<string>('');
  const [referralValid, setReferralValid] = useState<boolean>(false);
  const [localReferralCode, setLocalReferralCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isValidatingReferral, setIsValidatingReferral] = useState<boolean>(false);

  // Initialize localReferralCode from context referralCode
  useEffect(() => {
    if (referralCode) {
      setLocalReferralCode(referralCode);
    }
  }, [referralCode]);
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
      openWalletModal();
    }
  }, [connected, openWalletModal]);

  // Expose the triggerFlash function to parent components
  useEffect(() => {
    if (flashRef) {
      // Type assertion to allow assignment
      (flashRef as any).current = triggerFlash;
    }
  }, [flashRef, triggerFlash]);

  const handleSolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSolAmount(value);

    // Calculate HATM amount (1 SOL = 100 HATM, minus fee)
    if (value && !isNaN(parseFloat(value))) {
      const feePercentage = referralValid ? 0.06 : 0.08; // 6% with referral, 8% without
      const effectiveSolAmount = parseFloat(value) * (1 - feePercentage);
      const estimatedTokens = Math.floor(effectiveSolAmount / 0.01); // 0.01 SOL per HATM
      setHatchAmount(estimatedTokens.toString());
    } else {
      setHatchAmount('');
    }
  };

  const handleHatmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHatchAmount(value);

    // Calculate SOL amount needed (100 HATM = 1 SOL, plus fee)
    if (value && !isNaN(parseFloat(value))) {
      const feePercentage = referralValid ? 0.06 : 0.08; // 6% with referral, 8% without
      const baseSolAmount = parseFloat(value) * 0.01; // 0.01 SOL per HATM
      const totalSolAmount = baseSolAmount / (1 - feePercentage);
      setSolAmount(totalSolAmount.toFixed(4));
    } else {
      setSolAmount('');
    }
  };

  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalReferralCode(e.target.value.toUpperCase());
  };

  const applyReferralCode = async () => {
    if (!localReferralCode || localReferralCode.trim().length === 0) {
      toast({
        title: "No referral code",
        description: "Please enter a referral code first.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingReferral(true);
    try {
      // Accept "TEST" as a special code without validation
      if (localReferralCode === "TEST") {
        console.log("Using TEST referral code");
        setReferralCode("TEST");
        setReferralValid(true);

        toast({
          title: "Test referral code applied",
          description: "Using TEST referral code (6% fee)",
        });
      }
      // Accept predefined codes without validation
      else if (localReferralCode === "AKIPB0" || localReferralCode === "123456") {
        console.log(`Using predefined code: ${localReferralCode}`);
        setReferralCode(localReferralCode);
        setReferralValid(true);

        toast({
          title: "Referral code valid",
          description: `Using referral code: ${localReferralCode} (6% fee)`,
        });
      }
      else {
        // For other codes, validate with the server
        const isValid = await validateReferralCode(localReferralCode);

        if (isValid) {
          setReferralCode(localReferralCode);
          setReferralValid(true);

          toast({
            title: "Referral code valid",
            description: `Using referral code: ${localReferralCode} (6% fee)`,
          });

          // Recalculate token amount with 6% fee instead of 8%
          if (solAmount && !isNaN(parseFloat(solAmount))) {
            const feePercentage = 0.06; // 6% with referral
            const effectiveSolAmount = parseFloat(solAmount) * (1 - feePercentage);
            const estimatedTokens = Math.floor(effectiveSolAmount / 0.01); // 0.01 SOL per HATM
            setHatchAmount(estimatedTokens.toString());
          }
        } else {
          toast({
            title: "Invalid referral code",
            description: "The referral code you entered does not exist. Try AKIPB0 or 123456.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error validating referral code:", error);
      toast({
        title: "Validation failed",
        description: "Could not validate the referral code. Try AKIPB0 or 123456.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const toggleReferralInput = () => {
    setShowReferralInput(prev => !prev);
  };

  const handleBuy = async () => {
    if (!connected) {
      openWalletModal(); // Open wallet selector modal
      return;
    }

    // Prevent multiple submission
    if (isProcessing) return;
    setIsProcessing(true);

    // Flash the widget to highlight where to buy
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 1000); // Stop flashing after 1 second

    try {
      // Validate the input amount
      const inputAmount = parseFloat(solAmount);
      if (isNaN(inputAmount) || inputAmount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid SOL amount greater than 0.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Check if user has enough balance
      if (inputAmount > balance) {
        toast({
          title: "Insufficient balance",
          description: `You don't have enough SOL. Your balance: ${formatNumber(balance, {decimals: 4})} SOL`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Show purchasing toast
      toast({
        title: "Processing purchase",
        description: `Buying and auto-staking HATM tokens with ${inputAmount} SOL...`,
      });

      // Create a new web3 connection for our on-chain transaction
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }

      // Initialize staking vault client for on-chain purchase and stake
      const { Connection, clusterApiUrl } = await import('@solana/web3.js');
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      // Initialize our StakingVaultClient
      const { StakingVaultClient } = await import('@/lib/staking-vault-client');
      
      // Use token mint from config (this would come from a central config in production)
      const tokenMint = "12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5";
      
      const stakingClient = new StakingVaultClient(connection, publicKey, tokenMint);
      await stakingClient.initialize();
      
      try {
        // Create a purchase and stake transaction using the client
        const transaction = await stakingClient.createPurchaseAndStakeTransaction(
          inputAmount,
          referralValid ? localReferralCode : undefined
        );
        
        // Show detailed toast
        toast({
          title: "Sign transaction",
          description: "Please confirm the transaction in your wallet to purchase and stake tokens",
        });
        
        console.log("Transaction received from StakingVaultClient:", transaction);
        
        // Make sure we have all the required imports
        const { VersionedTransaction } = await import('@solana/web3.js');
        
        // Create a versioned transaction from the legacy transaction
        console.log("Creating versioned transaction");
        const message = transaction.compileMessage();
        const versionedTx = new VersionedTransaction(message);
        console.log("Successfully created versioned transaction");
        
        // Send transaction using wallet adapter
        const signature = await sendTransaction(versionedTx as any);
        
        toast({
          title: "Transaction sent!",
          description: `Your transaction has been sent to the network. Finalizing purchase...`
        });
        
        // Complete the purchase and staking process
        const completePurchaseResponse = await fetch('/api/complete-purchase-and-stake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            solAmount: inputAmount,
            tokenAmount: Math.floor((inputAmount * (1 - (referralValid ? 0.06 : 0.08))) / 0.01), // Calculate token amount
            solTransferSignature: signature,
            referralCode: referralValid ? localReferralCode : undefined
          }),
        });
        
        const purchaseData = await completePurchaseResponse.json();
        
        if (completePurchaseResponse.ok && purchaseData.success) {
          // Success! Token purchase and staking is complete
          const tokenAmount = purchaseData.tokenAmount;
          
          // Refresh SOL balance
          await refreshBalance();
          
          // Refresh token and staking data from on-chain
          await refreshTokenBalance();
          
          // Additional direct refresh of staking data via client
          // This is better than page reload
          setTimeout(async () => {
            try {
              // Initialize staking vault client
              const { Connection, clusterApiUrl } = await import('@solana/web3.js');
              const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
              
              // Initialize StakingVaultClient
              const { StakingVaultClient } = await import('@/lib/staking-vault-client');
              const tokenMint = "12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5";
              
              if (publicKey) {
                const stakingClient = new StakingVaultClient(connection, publicKey, tokenMint);
                await stakingClient.initialize();
                const userInfo = await stakingClient.getUserStakingInfo();
                console.log("Updated staking info after purchase:", userInfo);
              }
            } catch (e) {
              console.error("Error updating staking info:", e);
              // Fallback to page reload if the update fails
              window.location.reload();
            }
          }, 2000);
          
          // Show success message with staking details
          toast({
            title: "Purchase and stake successful!",
            description: (
              <div className="flex flex-col gap-1">
                <p>You purchased and staked {tokenAmount} HATM tokens!</p>
                <p className="text-xs text-green-500">Tokens are now staking in the vault for 7 days.</p>
                {purchaseData.explorerUrl && (
                  <a 
                    href={purchaseData.explorerUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline text-xs"
                  >
                    View transaction on Solana Explorer
                  </a>
                )}
              </div>
            ),
            duration: 10000
          });
          
          // Clear input fields
          setSolAmount('');
          setHatchAmount('');
        } else {
          // Handle errors from the server
          if (purchaseData.error && purchaseData.error.includes("still processing")) {
            toast({
              title: "Transaction still processing",
              description: "Your transaction is still being confirmed on the blockchain. Please check back in a moment.",
              variant: "default",
              duration: 8000
            });
          } else {
            // Other errors
            throw new Error(purchaseData.error || "Failed to complete on-chain purchase and stake");
          }
        }
      } catch (error) {
        // Handle transaction errors
        console.error("Error in on-chain purchase and stake transaction:", error);
        
        toast({
          title: "Transaction failed",
          description: error instanceof Error ? error.message : "Failed to complete the purchase and stake transaction",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing purchase:", error);
      toast({
        title: "Purchase failed",
        description: "Failed to complete the token purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
            <span className="text-secondary">Solana (Devnet)</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-foreground/70">Current Price:</span>
            <span className="text-accent">${formatNumber(tokenPrice, { decimals: 4 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">Staking APY:</span>
            <span className="text-primary">{formatNumber(125, { suffix: '%' })}</span>
          </div>
          {connected && (
            <div className="flex justify-center mt-2 border-t border-border/30 pt-2">
              <AirdropButton />
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg p-4 mb-6 border border-border/50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-foreground font-medium">Buy & Stake $HATM</h4>
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
                    const feePercentage = referralCode ? 0.06 : 0.08;
                    const effectiveSolAmount = parseFloat(maxAmount) * (1 - feePercentage);
                    const estimatedTokens = Math.floor(effectiveSolAmount / 0.01); // 0.01 SOL per HATM
                    setHatchAmount(estimatedTokens.toString());
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
                  value={localReferralCode}
                  onChange={handleReferralCodeChange}
                  maxLength={6}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={applyReferralCode}
                  disabled={isValidatingReferral}
                >
                  {isValidatingReferral ? (
                    <div className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Validating...</span>
                    </div>
                  ) : "Apply"}
                </Button>
              </div>
            </div>
          )}

          <Button 
            className="w-full py-3 gradient-button"
            onClick={handleBuy}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              connected ? 'Buy & Stake HATM' : 'Connect Wallet to Buy'
            )}
          </Button>

          {/* Network fee info */}
          {connected && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>Network fee: {referralValid ? '6%' : '8%'} {referralValid && '(with referral)'}</span>
              {!showReferralInput && (
                <button 
                  onClick={toggleReferralInput} 
                  className="ml-1 text-primary text-xs hover:underline"
                >
                  Add referral code
                </button>
              )}
            </div>
          )}

          {/* Token auto-staking info */}
          <div className="mt-2 p-2 bg-primary/10 rounded-lg text-xs">
            <p className="text-center text-foreground/80">
              <span className="font-semibold text-primary">Auto-Staking:</span> Tokens are automatically staked for 7 days earning 125% APY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyWidgetOnChain;