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
import { Buffer } from 'buffer';

interface BuyWidgetProps {
  flashRef?: React.RefObject<() => void>;
}

const BuyWidget = ({ flashRef }: BuyWidgetProps) => {
  const { connected, balance, publicKey, sendTransaction } = useSolana();
  const { openWalletModal } = useWalletModalOpener();
  const { tokenPrice } = useTokenData();
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

  // Update referralValid state when a valid referral code is selected
  useEffect(() => {
    if (localReferralCode && localReferralCode.length === 6) {
      setReferralValid(true);
    } else {
      setReferralValid(false);
    }
  }, [localReferralCode]);

  // Helper function to validate number inputs (only allow numbers with up to 4 decimal places)
  const isValidNumberInput = (val: string) => /^(\d+(\.\d{0,4})?)?$/.test(val);

  const handleSolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Validate input format
    if (!isValidNumberInput(value)) return;

    setSolAmount(value);

    // Calculate HATM amount based on SOL input
    if (value && !isNaN(parseFloat(value))) {
      // Calculate estimated HATM tokens (1 HATM = 0.01 SOL)
      const feePercentage = referralCode ? 0.06 : 0.08;
      const effectiveSolAmount = parseFloat(value) * (1 - feePercentage);
      const estimatedTokens = Math.floor(effectiveSolAmount / 0.01); // 0.01 SOL per HATM
      setHatchAmount(estimatedTokens.toString());
    } else {
      setHatchAmount('');
    }
  };

  const handleHatmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Validate input format
    if (!isValidNumberInput(value)) return;

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
    setLocalReferralCode(value);
  };

  const applyReferralCode = async () => {
    if (!localReferralCode || localReferralCode.length !== 6) {
      toast({
        title: "Invalid referral code",
        description: "Please enter a valid 6-character referral code.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple submits
    if (isValidatingReferral) return;
    setIsValidatingReferral(true);

    try {
      // Validate the referral code with the API
      const response = await fetch(`/api/validate-referral/${localReferralCode}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setReferralValid(true);
        // Set the global context referral code when validated
        setReferralCode(localReferralCode);
        toast({
          title: "Referral code applied",
          description: `Valid referral code ${localReferralCode} applied for this purchase.`,
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
    } finally {
      setIsValidatingReferral(false);
    }
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

    try {
      // If a referral code is provided, validate it
      if (localReferralCode && localReferralCode.trim().length > 0) {
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
          // Accept the predefined codes without validation
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
            const response = await fetch(`/api/validate-referral/${localReferralCode}`);
            const data = await response.json();

            if (!response.ok || !data.valid) {
              toast({
                title: "Invalid referral code",
                description: "The referral code you entered does not exist. Try AKIPB0 or 123456.",
                variant: "destructive",
              });
              setIsProcessing(false);
              return;
            }

            // Confirm referral code was successfully applied
            setReferralCode(localReferralCode);
            setReferralValid(true);

            toast({
              title: "Referral code valid",
              description: `Using referral code: ${localReferralCode} (6% fee)`,
            });
          }
        } catch (error) {
          console.error("Error validating referral code:", error);
          toast({
            title: "Validation failed",
            description: "Could not validate the referral code. Try AKIPB0 or 123456.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      // Show purchasing toast
      toast({
        title: "Processing purchase",
        description: `Buying HATM tokens with ${inputAmount} SOL...`,
      });

      // STEP 1: Get the SOL transfer transaction from server
      const buyResponse = await fetch('/api/buy-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey ? publicKey.toString() : '',
          solAmount: inputAmount,
          referralCode: referralValid ? localReferralCode : undefined
        }),
      });

      const buyData = await buyResponse.json();

      if (buyResponse.ok && buyData.success) {
        try {
          // STEP 2: Process the SOL transfer transaction
          if (buyData.solTransferTransaction && publicKey) {
            // Show detailed toast
            toast({
              title: "Sign SOL transfer",
              description: "Please confirm the transaction in your wallet to transfer SOL",
            });
            
            // Decode the serialized transaction
            const buffer = Buffer.from(buyData.solTransferTransaction, 'base64');
            
            try {
              // Create a transaction from the buffer
              const transaction = Transaction.from(buffer);
              
              // Set the current user as fee payer (important!)
              transaction.feePayer = publicKey;
              
              // Serialize it to versioned transaction format
              const message = transaction.compileMessage();
              const versionedTransaction = new VersionedTransaction(message);
              
              // Send the transaction using the wallet adapter
              const solTransferSignature = await sendTransaction(versionedTransaction);
              
              toast({
                title: "SOL transfer successful!",
                description: `${parseFloat(solAmount).toFixed(4)} SOL has been sent. Now finalizing purchase...`
              });
              
              // STEP 3: Complete the purchase by calling the completion endpoint
              const completePurchaseResponse = await fetch('/api/complete-purchase', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  walletAddress: publicKey.toString(),
                  solAmount: inputAmount,
                  tokenAmount: buyData.tokenAmount,
                  solTransferSignature: solTransferSignature,
                  referralCode: referralValid ? localReferralCode : undefined
                }),
              });
              
              const completePurchaseData = await completePurchaseResponse.json();
              
              if (completePurchaseResponse.ok && completePurchaseData.success) {
                // Success! Token purchase is complete.
                toast({
                  title: "SOL transfer verified",
                  description: `${parseFloat(solAmount).toFixed(4)} SOL has been deducted from your wallet`
                });
                
                // Update data for display
                buyData.message = completePurchaseData.message;
                buyData.explorerUrl = completePurchaseData.explorerUrl;
                buyData.currentBalance = completePurchaseData.currentBalance;
              } else {
                // If we get an error but SOL was transferred, show a more helpful message
                console.log("Purchase completion error:", completePurchaseData);
                
                if (completePurchaseData.error && completePurchaseData.error.includes("still processing")) {
                  // Transaction is still being processed
                  toast({
                    title: "Transaction still processing",
                    description: "Your SOL transfer is still being confirmed on the blockchain. Please try again in a moment.",
                    variant: "default",
                    duration: 8000
                  });
                  setIsProcessing(false);
                  return;
                } else if (solTransferSignature) {
                  // SOL transaction was successful, but token minting failed
                  toast({
                    title: "SOL transfer successful",
                    description: "Your SOL was transferred successfully, but there was an issue minting tokens. Please contact support with your transaction ID.",
                    variant: "default",
                    duration: 8000
                  });
                  
                  toast({
                    title: "Transaction ID",
                    description: (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs break-all">{solTransferSignature}</p>
                        <a 
                          href={`https://explorer.solana.com/tx/${solTransferSignature}?cluster=devnet`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline text-xs"
                        >
                          View SOL transaction on Solana Explorer
                        </a>
                      </div>
                    ),
                    duration: 10000
                  });
                  
                  // Since we have the SOL transaction, update with partial success data
                  buyData.message = "SOL transfer was successful. Your tokens will be credited shortly.";
                  buyData.solTransferSignature = solTransferSignature;
                  buyData.explorerUrl = `https://explorer.solana.com/tx/${solTransferSignature}?cluster=devnet`;
                  
                  // Don't throw since we have a partial success
                  setIsProcessing(false);
                  return;
                } else {
                  throw new Error(completePurchaseData.error || "Failed to complete purchase after SOL transfer");
                }
              }
            } catch (error) {
              console.error("Error processing SOL transfer:", error);
              toast({
                title: "SOL transfer failed",
                description: "There was an error processing the SOL transfer. Transaction cancelled.",
                variant: "destructive"
              });
              setIsProcessing(false);
              return;
            }
          } else {
            throw new Error("Missing transaction data from server");
          }
        } catch (error) {
          console.error("Error in purchase process:", error);
          toast({
            title: "Purchase process failed",
            description: "There was an error completing the token purchase",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
        
        toast({
          title: "Purchase successful!",
          description: (
            <div className="flex flex-col gap-1">
              <p>{buyData.message}</p>
              <p className="text-xs">Fee: {buyData.feePercentage}%</p>
              {buyData.referralApplied && <p className="text-xs text-primary">Referral code applied</p>}
              {buyData.explorerUrl && (
                <a 
                  href={buyData.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline text-xs"
                >
                  View transaction on Solana Explorer
                </a>
              )}
            </div>
          ),
          duration: 10000, // Show for 10 seconds so user can click the link
        });

        // Clear input fields
        setSolAmount('');
        setHatchAmount('');
      } else {
        throw new Error(buyData.error || "Failed to purchase tokens");
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
              connected ? 'Buy $HATM' : 'Connect Wallet to Buy'
            )}
          </Button>

          {/* Network fee info */}
          {connected && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>Estimated network fee: ~0.000005 SOL (paid to Solana network)</span>
            </div>
          )}
        </div>

        <div className="text-xs text-foreground/70 bg-muted p-2 rounded-lg">
          <p className="flex items-center gap-1">
            <i className="ri-information-line"></i>
            {localReferralCode ? (
              <>6% fee with referral code: <span className="font-mono text-primary">{localReferralCode}</span></>
            ) : (
              <>8% fee without referral</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyWidget;