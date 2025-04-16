import React, { useEffect } from 'react';
import { X } from "lucide-react";

interface WhitepaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WhitepaperDialog({ open, onOpenChange }: WhitepaperDialogProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="bg-[#0f0b19] w-[95%] sm:w-[90%] max-w-4xl h-[85vh] relative rounded-lg shadow-lg">
        {/* Close button - making it very visible and mobile friendly */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-2 top-2 z-[10000] p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
          style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={24} />
        </button>
        
        <div className="px-6 pt-6 pb-2 sticky top-0 z-10 border-b border-gray-800 bg-[#0f0b19]">
          <h2 className="text-xl font-bold">Hacked ATM Token Whitepaper</h2>
          <p className="text-gray-400 text-sm">Technical overview and tokenomics</p>
        </div>
        
        <div className="p-6 overflow-y-auto h-[calc(85vh-5rem)]">
          <div className="prose prose-invert max-w-none">
            <h1>Hacked ATM Token (HATM)</h1>
            <p className="lead">
              A revolutionary Solana-based token with built-in staking, referral systems, and automatic rewards distribution.
            </p>

            <h2>1. Introduction</h2>
            <p>
              Hacked ATM Token (HATM) is a decentralized finance protocol built on the Solana blockchain, 
              designed to provide a secure, transparent, and rewarding experience for all participants. 
              By leveraging the high-speed, low-cost capabilities of Solana, HATM offers an innovative 
              approach to staking and referral rewards that encourages community growth and participation.
            </p>

            <h2>2. Token Economics</h2>
            <h3>2.1 Token Details</h3>
            <ul>
              <li><strong>Name:</strong> Hacked ATM Token</li>
              <li><strong>Symbol:</strong> HATM</li>
              <li><strong>Blockchain:</strong> Solana</li>
              <li><strong>Standard:</strong> SPL Token</li>
              <li><strong>Total Supply:</strong> 10,000,000 HATM</li>
              <li><strong>Decimals:</strong> 9</li>
            </ul>

            <h3>2.2 Token Distribution</h3>
            <p>The total supply of 10,000,000 HATM tokens will be distributed as follows:</p>
            <ul>
              <li><strong>Public Sale:</strong> 60% (6,000,000 HATM)</li>
              <li><strong>Staking Rewards Pool:</strong> 20% (2,000,000 HATM)</li>
              <li><strong>Development Team:</strong> 10% (1,000,000 HATM) - Locked for 12 months</li>
              <li><strong>Marketing & Partnerships:</strong> 7% (700,000 HATM)</li>
              <li><strong>Ecosystem Growth:</strong> 3% (300,000 HATM)</li>
            </ul>

            <h2>3. Features</h2>
            <h3>3.1 Staking Mechanism</h3>
            <p>
              HATM employs a unique staking mechanism that rewards token holders for their participation and commitment to the ecosystem.
            </p>
            <h4>Key details:</h4>
            <ul>
              <li><strong>Base Annual Percentage Yield (APY):</strong> 120%</li>
              <li><strong>Staking Period:</strong> 7 days minimum lock-up</li>
              <li><strong>Early Withdrawal Fee:</strong> 10% (redistributed to staking pool)</li>
              <li><strong>Rewards Distribution:</strong> Automatic, calculated in real-time</li>
            </ul>

            <h3>3.2 Referral System</h3>
            <p>
              The HATM referral system incentivizes community growth by rewarding users who bring 
              new participants into the ecosystem. All referral transactions are tracked on-chain 
              for complete transparency.
            </p>
            <h4>Key details:</h4>
            <ul>
              <li><strong>Referral Reward:</strong> 3% of referred user's staking amount</li>
              <li><strong>Distribution:</strong> Instantly credited to referrer's account</li>
              <li><strong>Tracking:</strong> Fully on-chain with permanent records</li>
              <li><strong>Leaderboards:</strong> Weekly and monthly recognition for top referrers</li>
            </ul>

            <h2>4. Smart Contract Architecture</h2>
            <p>
              HATM is built on multiple interconnected smart contracts to ensure security, 
              efficiency, and scalability.
            </p>
            <h3>4.1 Core Contracts</h3>
            <ul>
              <li><strong>Staking Vault:</strong> Manages stake deposits, withdrawals, and rewards calculations</li>
              <li><strong>Referral Tracker:</strong> Handles referral code validation and reward distribution</li>
              <li><strong>Token Distributor:</strong> Controls token distribution and vesting schedules</li>
            </ul>

            <h2>5. Security Measures</h2>
            <p>
              The security of user funds and the integrity of the HATM ecosystem are top priorities. 
              The following measures have been implemented to ensure a robust and secure protocol:
            </p>
            <ul>
              <li><strong>Third-party Audits:</strong> Comprehensive security audits by leading blockchain security firms</li>
              <li><strong>Time-lock Mechanisms:</strong> Protocol upgrades subject to timelock delays</li>
              <li><strong>Multi-signature Controls:</strong> Critical protocol functions require multiple approvals</li>
              <li><strong>Bug Bounty Program:</strong> Continuous security improvement through community participation</li>
            </ul>

            <h2>6. Roadmap</h2>
            <h3>Phase 1: Foundation (Q2 2025)</h3>
            <ul>
              <li>Token launch on Solana</li>
              <li>Deployment of core smart contracts</li>
              <li>Basic staking functionality</li>
              <li>Website and dashboard launch</li>
            </ul>

            <h3>Phase 2: Expansion (Q3 2025)</h3>
            <ul>
              <li>Referral system implementation</li>
              <li>Mobile app development</li>
              <li>Enhanced analytics and reporting</li>
              <li>Community governance proposals</li>
            </ul>

            <h3>Phase 3: Ecosystem Growth (Q4 2025)</h3>
            <ul>
              <li>Advanced staking tiers with enhanced rewards</li>
              <li>Cross-chain bridge integrations</li>
              <li>Strategic partnerships</li>
              <li>Expanded utility for HATM tokens</li>
            </ul>

            <h3>Phase 4: Maturity (Q1-Q2 2026)</h3>
            <ul>
              <li>Full decentralized governance</li>
              <li>Ecosystem grants program</li>
              <li>Additional product offerings</li>
              <li>Enterprise partnerships</li>
            </ul>

            <h2>7. Conclusion</h2>
            <p>
              Hacked ATM Token (HATM) represents a new generation of DeFi protocols that prioritize 
              community growth, transparent rewards, and sustainable tokenomics. By combining innovative 
              staking mechanisms with a robust referral system on the high-performance Solana blockchain, 
              HATM creates value for all participants while maintaining the security and decentralization 
              principles core to blockchain technology.
            </p>
            <p>
              Join us in building the future of decentralized finance with HATM.
            </p>

            <div className="disclaimer mt-16 text-sm text-gray-400 border-t border-gray-800 pt-4">
              <p><strong>Disclaimer:</strong> This whitepaper is for informational purposes only and does not constitute 
              financial advice. Please do your own research before making any investment decisions. 
              Cryptocurrency investments are subject to high market risk.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}