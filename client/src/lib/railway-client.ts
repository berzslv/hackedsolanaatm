/**
 * Railway Solana Transaction Monitor Client
 * 
 * This client provides functions to interact with the Railway-hosted transaction monitoring service.
 * It allows you to:
 * - Add/remove wallets to monitor
 * - Get token transfers
 * - Get staking events
 * - Get wallet token balances
 * 
 * No Anchor or BN.js dependencies required!
 */

import { apiRequest } from './queryClient';

// Your actual Railway service URL
const RAILWAY_SERVICE_URL = 'https://hackedpolling-production.up.railway.app';

// ----- Types ----- //

export interface WalletsData {
  wallets: string[];
}

export interface TokenTransfer {
  signature: string;
  fromWallet: string;
  toWallet: string;
  amount: number;
  timestamp: string;
  blockTime: string | null;
}

export interface TokenTransfersData {
  transfers: TokenTransfer[];
}

export interface StakingEvent {
  signature: string;
  type: 'stake' | 'unstake' | 'claim' | 'reward' | 'unknown';
  walletAddress: string;
  amount: number;
  timestamp: string;
  blockTime: string | null;
}

export interface StakingData {
  stakingData: Record<string, {
    amountStaked: number;
    pendingRewards: number;
    lastUpdateTime: string;
    eventCount: number;
  }>;
  events: StakingEvent[];
  globalStats: {
    totalStaked: number;
    stakersCount: number;
    currentAPY: number;
    lastUpdated: string;
  };
}

export interface WalletStakingData {
  walletAddress: string;
  events: StakingEvent[];
}

export interface TokenBalance {
  walletAddress: string;
  balance: number;
}

// ----- API Functions ----- //

/**
 * Get the current list of monitored wallets
 */
export async function getMonitoredWallets(): Promise<WalletsData> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/monitored-wallets`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching monitored wallets:', error);
    return { wallets: [] };
  }
}

/**
 * Add a wallet to be monitored
 */
export async function addWalletToMonitor(walletAddress: string): Promise<WalletsData> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/add-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error adding wallet ${walletAddress} to monitoring:`, error);
    throw error;
  }
}

/**
 * Remove a wallet from monitoring
 */
export async function removeWalletFromMonitoring(walletAddress: string): Promise<WalletsData> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/remove-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error removing wallet ${walletAddress} from monitoring:`, error);
    throw error;
  }
}

/**
 * Get all token transfers
 */
export async function getTokenTransfers(): Promise<TokenTransfersData> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/token-transfers`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    return { transfers: [] };
  }
}

/**
 * Get all staking data
 */
export async function getStakingData(): Promise<StakingData> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/staking-data`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching staking data:', error);
    return { 
      stakingData: {}, 
      events: [],
      globalStats: {
        totalStaked: 0,
        stakersCount: 0,
        currentAPY: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * Get staking data for a specific wallet
 */
export async function getWalletStakingData(walletAddress: string): Promise<WalletStakingData> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/staking-data/${walletAddress}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching staking data for wallet ${walletAddress}:`, error);
    return { walletAddress, events: [] };
  }
}

/**
 * Get token balance for a specific wallet
 */
export async function getWalletTokenBalance(walletAddress: string): Promise<TokenBalance> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/token-balance/${walletAddress}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching token balance for wallet ${walletAddress}:`, error);
    return { walletAddress, balance: 0 };
  }
}

/**
 * Get transactions for a wallet, combining transfers and staking events
 */
export async function getWalletTransactionHistory(walletAddress: string) {
  try {
    // Get token transfers and staking events
    const [transfersData, stakingData] = await Promise.all([
      getTokenTransfers(),
      getWalletStakingData(walletAddress),
    ]);
    
    // Filter transfers for this wallet
    const walletTransfers = transfersData.transfers.filter(transfer => 
      transfer.fromWallet === walletAddress || transfer.toWallet === walletAddress
    );
    
    // Combine into a single transaction array
    const allTransactions = [
      ...walletTransfers.map(transfer => ({
        type: 'transfer',
        direction: transfer.fromWallet === walletAddress ? 'outgoing' : 'incoming',
        signature: transfer.signature,
        timestamp: transfer.timestamp,
        amount: transfer.amount,
        otherWallet: transfer.fromWallet === walletAddress ? transfer.toWallet : transfer.fromWallet,
        blockTime: transfer.blockTime
      })),
      ...stakingData.events.map(event => ({
        type: 'staking',
        operation: event.type,
        signature: event.signature,
        timestamp: event.timestamp,
        amount: event.amount,
        blockTime: event.blockTime
      }))
    ];
    
    // Sort by timestamp, newest first
    allTransactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return allTransactions;
  } catch (error) {
    console.error(`Error getting transaction history for wallet ${walletAddress}:`, error);
    return [];
  }
}

/**
 * Force polling for new transactions (requires admin key)
 */
export async function forcePollNow(adminKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/poll-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': adminKey
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error forcing poll:', error);
    return false;
  }
}