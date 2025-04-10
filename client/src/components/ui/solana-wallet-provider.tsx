import React, { FC, ReactNode } from 'react';
import { SolanaWalletProvider } from './wallet-adapter';
import { useReferral } from '@/context/ReferralContext';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Import CSS files for wallet adapter UI (required)
import '@solana/wallet-adapter-react-ui/styles.css';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const ReferralAwareSolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { referralCode, getReferralUrl } = useReferral();
  
  // Set to 'mainnet-beta' for production, 'devnet' for development
  const network = 'mainnet-beta';
  
  // Get connection endpoint for the network
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Get the referral URL to use for deep linking
  const referralUrl = getReferralUrl();
  
  // Initialize wallet adapters with the correct configuration and referral URL
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({
        // Enable deep linking for better mobile experience with referral URL
        appIdentity: { name: "Hacked ATM" },
        // Add deep link customization for referral preservation
        deepLinks: [
          {
            // Use the referral URL for redirects after connecting
            route: "/",
            url: referralUrl
          }
        ]
      }),
      new SolflareWalletAdapter({ 
        network,
        // Set the base URL to include referral code
        baseUrl: referralUrl
      }),
    ],
    [network, referralUrl]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};