import React, { useMemo } from 'react';
import { 
  WalletDisconnectButton, 
  WalletMultiButton 
} from '@solana/wallet-adapter-react-ui';
import { 
  ConnectionProvider,
  WalletProvider,
  useWallet 
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { ExodusWalletAdapter } from '@solana/wallet-adapter-exodus';
import { clusterApiUrl } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

// Default styles that can be overridden
import '@solana/wallet-adapter-react-ui/styles.css';

// Wallet provider for the application
export const SolanaWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;
  
  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // @solana/wallet-adapter-wallets imports all the adapters but supports tree shaking
  // so only the wallets you configure here will be compiled into your application
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new ExodusWalletAdapter(),
    ],
    [network]
  );
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Custom button that works with Solana wallet adapter
export function SolanaWalletButton() {
  const { connected } = useWallet();
  const isMobile = useIsMobile();
  
  // Simple styling wrapper around the wallet adapter button
  if (connected) {
    return (
      <div className="wallet-adapter-wrapper">
        <WalletDisconnectButton className="wallet-adapter-button bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600" />
      </div>
    );
  }
  
  return (
    <div className="wallet-adapter-wrapper">
      <WalletMultiButton className="wallet-adapter-button bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600" />
    </div>
  );
}