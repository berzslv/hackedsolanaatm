import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GradientText } from "@/components/ui/gradient-text";
import { WalletNativePopup } from "@/components/ui/wallet-native-popup";

interface WhitepaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A wallet-friendly whitepaper dialog that uses different techniques
 * based on the browser environment
 */
const WalletWhitepaperDialog = ({ open, onOpenChange }: WhitepaperDialogProps) => {
  const [isWalletBrowser, setIsWalletBrowser] = useState(false);
  
  // Check if we're in a wallet browser
  useEffect(() => {
    const inWalletBrowser = 
      window.navigator.userAgent.includes('SolflareWallet') || 
      window.navigator.userAgent.includes('Phantom') ||
      document.referrer.includes('phantom') ||
      document.referrer.includes('solflare');
    
    setIsWalletBrowser(inWalletBrowser);
  }, []);
  
  // Simplified HTML content for the wallet browsers
  const whitepaperContent = `
    <h1>Hacked ATM Whitepaper</h1>
    <p class="muted">A comprehensive guide to the Hacked ATM token ecosystem, staking mechanism, and referral system.</p>
    
    <div class="card">
      <h2>Token Overview</h2>
      <p>
        <strong>Token Name:</strong> Hacked ATM<br>
        <strong>Token Symbol:</strong> HATM<br>
        <strong>Blockchain:</strong> Solana<br>
        <strong>Token Type:</strong> Solana-based with built-in referral & staking
      </p>
    </div>
    
    <div class="card">
      <h2>Key Features</h2>
      
      <h3>Referral System</h3>
      <p class="muted">When users buy or sell Hacked ATM using a referral code or link, a total of 6% fee is applied:</p>
      <ul class="muted">
        <li>3% of the fee goes directly to the referrer</li>
        <li>1% goes to a marketing wallet</li>
        <li>2% is collected for staking rewards</li>
      </ul>
      
      <p class="muted">Without a referral code, an 8% fee is applied:</p>
      <ul class="muted">
        <li>2% goes to marketing</li>
        <li>6% for staking rewards</li>
      </ul>
      
      <h3>Staking Vault</h3>
      <p class="muted">Dynamic APY that adjusts based on:</p>
      <ul class="muted">
        <li>Transaction volume (higher volume = higher APY)</li>
        <li>Total amount staked (more tokens staked = lower APY)</li>
        <li>Auto-compounding rewards every 30 minutes</li>
      </ul>
      
      <p class="muted">Early Withdrawal Fee:</p>
      <ul class="muted">
        <li>4% fee burned if tokens unstaked within 7 days</li>
        <li>1% to marketing</li>
      </ul>
      
      <h3>Leaderboard & Rewards</h3>
      <p class="muted">Weekly and Monthly Leaderboards for:</p>
      <ul class="muted">
        <li>Top 3 Referrers - based on referral volume</li>
        <li>Top 3 Stakers - based on amount staked</li>
        <li>Rewards include token airdrops and APY bonuses</li>
      </ul>
    </div>
    
    <div class="card">
      <h2>Tokenomics</h2>
      <ul class="muted">
        <li>6% transaction fee with referral (3% referrer, 1% marketing, 2% staking)</li>
        <li>8% transaction fee without referral (2% marketing, 6% staking)</li>
        <li>4% burn + 1% marketing fee for early unstaking</li>
      </ul>
    </div>
  `;
  
  return (
    <>
      {/* For wallet browsers, use the native popup */}
      {isWalletBrowser && (
        <WalletNativePopup 
          open={open}
          onOpenChange={onOpenChange}
          title="Hacked ATM Whitepaper"
          content={whitepaperContent}
        />
      )}
      
      {/* For regular browsers, use the Dialog component */}
      {!isWalletBrowser && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl h-[90vh]">
            <ScrollArea className="h-full pr-4">
              <h1 className="text-4xl md:text-5xl font-display mb-6 text-foreground">
                <GradientText>Hacked ATM</GradientText> Whitepaper
              </h1>
              <p className="text-foreground/70 text-lg mb-8">
                A comprehensive guide to the Hacked ATM token ecosystem, staking mechanism, and referral system.
              </p>
              
              <div className="space-y-8">
                <div className="bg-card/80 backdrop-blur-sm rounded-xl p-8 border border-border shadow-md">
                  <h2 className="text-2xl font-display mb-6 text-foreground">Token Overview</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-medium mb-3 text-foreground">Token Information</h3>
                      <ul className="space-y-2">
                        <li className="flex justify-between py-2 border-b border-border">
                          <span className="text-foreground/70">Token Name:</span>
                          <span className="text-primary font-medium">Hacked ATM</span>
                        </li>
                        <li className="flex justify-between py-2 border-b border-border">
                          <span className="text-foreground/70">Token Symbol:</span>
                          <span className="text-primary font-medium">HATM</span>
                        </li>
                        <li className="flex justify-between py-2 border-b border-border">
                          <span className="text-foreground/70">Blockchain:</span>
                          <span className="text-primary font-medium">Solana</span>
                        </li>
                        <li className="flex justify-between py-2 border-b border-border">
                          <span className="text-foreground/70">Token Type:</span>
                          <span className="text-primary font-medium">Solana-based with built-in referral & staking</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Additional content sections with same structure as the original whitepaper dialog */}
                <div className="bg-card/80 backdrop-blur-sm rounded-xl p-8 border border-border shadow-md">
                  <h2 className="text-2xl font-display mb-6 text-foreground">Key Features</h2>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-medium mb-3 text-foreground">Referral System</h3>
                      <div className="bg-muted rounded-lg p-4 mb-4">
                        <h4 className="text-foreground mb-2">Referral Fee Structure:</h4>
                        <ul className="space-y-2 text-foreground/70">
                          <li className="flex items-start gap-2">
                            <i className="ri-check-line text-primary mt-0.5"></i>
                            <span>When users buy or sell Hacked ATM using a referral code or link, a total of 6% fee is applied.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <i className="ri-check-line text-primary mt-0.5"></i>
                            <span>3% of the 6% fee goes directly to the referrer (the person who shared the referral link).</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <i className="ri-check-line text-primary mt-0.5"></i>
                            <span>1% of the 6% fee goes to a marketing wallet to support the project.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <i className="ri-check-line text-primary mt-0.5"></i>
                            <span>2% of the 6% fee is collected and used to reward stakers in the staking vault.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-medium mb-3 text-foreground">Staking</h3>
                      <div className="bg-muted rounded-lg p-4 mb-4">
                        <h4 className="text-foreground mb-2">Dynamic APY:</h4>
                        <ul className="space-y-2 text-foreground/70">
                          <li className="flex items-start gap-2">
                            <i className="ri-check-line text-primary mt-0.5"></i>
                            <span>The APY adjusts based on transaction volume and total tokens staked.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <i className="ri-check-line text-primary mt-0.5"></i>
                            <span>Auto-compounding rewards every 30 minutes.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card/80 backdrop-blur-sm rounded-xl p-8 border border-border shadow-md">
                  <h2 className="text-2xl font-display mb-6 text-foreground">Tokenomics</h2>
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="text-foreground mb-2">Transaction Fees:</h4>
                      <ul className="space-y-2 text-foreground/70">
                        <li className="flex items-start gap-2">
                          <i className="ri-currency-line text-primary mt-0.5"></i>
                          <span>6% total transaction fee with referral (3% for referrer, 1% for marketing, and 2% for staking rewards).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <i className="ri-currency-line text-primary mt-0.5"></i>
                          <span>8% total transaction fee without referral (2% for marketing, and 6% for staking rewards).</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default WalletWhitepaperDialog;