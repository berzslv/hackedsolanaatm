import { ethers } from 'ethers';

// Extend Window interface to include Ethereum provider
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, callback: (...args: any[]) => void) => void;
      removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// Define Ethereum-related types
export interface EthereumProvider {
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
}

export interface StakingInfo {
  amountStaked: ethers.BigNumber;
  pendingRewards: ethers.BigNumber;
  stakedAt: Date;
  lastClaimAt: Date;
  referrer: string;
  isRegistered: boolean;
  formattedStakedAmount: string;
  formattedPendingRewards: string;
}

export interface GlobalStats {
  totalStaked: ethers.BigNumber;
  totalReferrals: number;
  stakersCount: number;
  currentAPY: number;
  formattedTotalStaked: string;
}

export interface ReferralInfo {
  referrer: string;
  referrals: string[];
  referralCount: number;
}

// Transaction status types
export enum TransactionStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface TransactionState {
  status: TransactionStatus;
  hash?: string;
  error?: Error;
}