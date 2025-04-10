// Global TypeScript declarations for the project

// Add custom properties to the Window interface
interface Window {
  // Wallet compatibility flags
  __isWalletBrowser?: boolean;
  __solflareErrorSuppression?: boolean;
  __walletErrorSuppression?: boolean;
  __lastWalletConnectionAttempt?: number;
  
  // Wallet modal state access
  __WALLET_MODAL_STATE_SETTER?: (visible: boolean) => void;
}

// Solana wallet adapter extensions
declare module '@solana/wallet-adapter-react' {
  interface Wallet {
    // Add any missing wallet properties here if needed
  }
}

// To support wallet-specific types
declare module '@solana/wallet-adapter-base' {
  interface WalletAdapterProps {
    appIdentity?: {
      name: string;
      // Add any other properties used in your configuration
    };
  }
}