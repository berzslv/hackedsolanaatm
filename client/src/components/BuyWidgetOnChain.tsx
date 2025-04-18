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
import { Transaction, VersionedTransaction, PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { createAndSubmitStakingTransaction } from '@/lib/CreateStakingTransactionV2';

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
      // Check if it's a valid wallet address
      let isValidWalletAddress = false;
      try {
        // Attempt to create a PublicKey from the input to check format
        new PublicKey(localReferralCode);
        isValidWalletAddress = true;
        console.log("Valid wallet address format for referral code");
      } catch (e) {
        console.log("Not a valid wallet address format");
        isValidWalletAddress = false;
      }
      
      // Accept wallet addresses directly as referral codes
      if (isValidWalletAddress) {
        console.log("Using wallet address as referral code:", localReferralCode);
        setReferralCode(localReferralCode);
        setReferralValid(true);

        toast({
          title: "Wallet address accepted",
          description: "Using wallet address as referral code (6% fee)",
        });
      }
      // For non-wallet addresses, validate with the blockchain or server API
      else {
        console.log("Checking referral code validity on the blockchain");
        // Check if the code exists on the blockchain
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
            description: "The referral code you entered could not be verified on the blockchain.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error validating referral code:", error);
      toast({
        title: "Validation failed",
        description: "Could not validate the referral code. Please try using a valid Solana wallet address.",
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

      // Create connection to Solana
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      // Calculate token amount with appropriate fee
      const feePercentage = referralValid ? 0.06 : 0.08; // 6% with referral, 8% without
      const tokenAmount = Math.floor((inputAmount * (1 - feePercentage)) / 0.01); // Calculate token amount
      
      // Show detailed toast
      toast({
        title: "Preparing transaction",
        description: "Creating a transaction to buy and stake tokens",
      });
      
      // Create a wallet object for the createAndSubmitStakingTransaction function
      const wallet = { 
        sendTransaction, 
        publicKey
      };
      
      // Use our enhanced transaction handling function
      console.log("Using enhanced transaction handling for buy and stake");
      const result = await createAndSubmitStakingTransaction(
        connection,
        publicKey,
        tokenAmount, // We pass the token amount, not SOL amount
        wallet,
        false // false means "buy and stake" instead of "stake existing"
      );
      
      if (!result.success) {
        console.error("Transaction failed:", result.error);
        
        // Show detailed error toast with retry option if available
        if (result.canRetry) {
          toast({
            title: "Transaction failed",
            description: `${result.message}. You can try again with a fresh blockhash.`,
            variant: "destructive",
            action: (
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleBuy()}
                  className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                >
                  Retry
                </button>
              </div>
            )
          });
        } else {
          toast({
            title: "Transaction failed",
            description: `${result.message}. ${result.error || ''}`,
            variant: "destructive"
          });
        }
        
        throw new Error(result.error || result.message);
      }
      
      const signature = result.signature;
      console.log("Transaction successful with signature:", signature);
      
      toast({
        title: "Transaction successful!",
        description: `Your transaction has been confirmed. Finalizing purchase...`
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
          tokenAmount: tokenAmount,
          solTransferSignature: signature,
          referralCode: referralValid ? localReferralCode : undefined
        }),
      });
      
      const purchaseData = await completePurchaseResponse.json();
      
      if (completePurchaseResponse.ok && purchaseData.success) {
        // Success! Token purchase and staking is complete
        const finalTokenAmount = purchaseData.tokenAmount;
        
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
            const tokenMint = "59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk";
            
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
              <p>You purchased and staked {finalTokenAmount} HATM tokens!</p>
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
      console.error("Error processing purchase:", error);
      toast({
        title: "Purchase failed",
        description: error instanceof Error ? error.message : "Failed to complete the token purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Transaction processing modal for showing detailed steps
  const [txStatus, setTxStatus] = useState<string>("");
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  
  // Add transaction status update function
  const updateTxStatus = (status: string, isFallback = false) => {
    setTxStatus(status);
    if (isFallback) setUsingFallback(true);
  };
  
  return (
    <div className="relative max-w-md mx-auto" ref={widgetRef}>
      
      {/* Transaction Processing Modal */}
      {isProcessing && (
        <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <div className="bg-card p-6 rounded-xl shadow-xl max-w-md w-full">
            <div className="flex flex-col items-center text-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">Processing Transaction</h3>
              <p className="text-muted-foreground">
                Please wait while your transaction is being processed{usingFallback ? " using an alternative method" : ""}...
              </p>
              
              <div className="w-full bg-muted rounded-lg p-3 text-xs font-mono text-left overflow-hidden whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                <div className="text-primary">
                  Connecting to wallet... ✓
                </div>
                <div className="text-primary">
                  Building transaction... ✓
                </div>
                <div className="text-primary">
                  {!txStatus ? (
                    <span className="animate-pulse">Requesting signature...</span>
                  ) : (
                    <>Requesting signature... ✓</>
                  )}
                </div>
                
                {txStatus && (
                  <div className={usingFallback ? "text-yellow-500" : "text-green-500"}>
                    {txStatus}
                    {usingFallback && (
                      <div className="text-primary mt-1">
                        Using enhanced transaction handling for reliability
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
                  placeholder="ENTER WALLET ADDRESS AS REFERRAL CODE" 
                  className="bg-background/30 border-border/30"
                  value={localReferralCode}
                  onChange={handleReferralCodeChange}
                  maxLength={44} // Allows full Solana wallet addresses
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
                <span>Processing transaction...</span>
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