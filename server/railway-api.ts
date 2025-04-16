/**
 * Railway API Integration
 * This service connects to the Railway API to get staking data
 * and avoids the Solana RPC rate limits
 */
import fetch from 'node-fetch';

// Railway service URL - Using the same URL as defined in client/src/lib/railway-client.ts
const RAILWAY_SERVICE_URL = 'https://hackedpolling-production.up.railway.app';

// Use the correct staking vault address as defined in railway/index.js
export const STAKING_VAULT_ADDRESS = 'H3HzzDFaKW2cdXFmoTLu9ta4CokKu5nSCf3UCbcUTaUp';

// Types for Railway API responses
export interface EnhancedStakingData {
  amountStaked: number;
  pendingRewards: number;
  lastUpdateTime: string;
  stakedAt: string | null;
  eventCount: number;
  timeUntilUnlock: number | null;
  isLocked: boolean;
  estimatedAPY: number;
  referrer?: string;
}

export interface GlobalStats {
  totalStaked: number;
  stakersCount: number;
  currentAPY: number;
  lastUpdated: string;
  totalReferrals: number;
  unlock_duration: number; // in seconds
  early_unstake_penalty: number; // in basis points
  referral_reward_rate: number; // in basis points
}

export interface TokenBalance {
  walletAddress: string;
  balance: number;
}

/**
 * Get enhanced staking data for a wallet address
 * @param walletAddress The wallet address to get staking data for
 * @returns Enhanced staking data from Railway API
 */
export async function getEnhancedStakingData(walletAddress: string): Promise<EnhancedStakingData> {
  try {
    console.log(`Fetching staking data from Railway API for wallet: ${walletAddress}`);
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/staking-data?wallet=${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json() as EnhancedStakingData;
    console.log(`Railway data for ${walletAddress}:`, data);
    return data;
  } catch (error) {
    console.error('Error fetching staking data from Railway:', error);
    // Return empty data on error
    return {
      amountStaked: 0,
      pendingRewards: 0,
      lastUpdateTime: new Date().toISOString(),
      stakedAt: null,
      eventCount: 0,
      timeUntilUnlock: null,
      isLocked: false,
      estimatedAPY: 0
    };
  }
}

/**
 * Get global staking statistics from Railway
 * @returns Global statistics for the staking platform
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  try {
    console.log('Fetching global stats from Railway API');
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/global-stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json() as GlobalStats;
    console.log('Railway global stats:', data);
    return data;
  } catch (error) {
    console.error('Error fetching global stats from Railway:', error);
    // Return empty data on error
    return {
      totalStaked: 0,
      stakersCount: 0,
      currentAPY: 0,
      lastUpdated: new Date().toISOString(),
      totalReferrals: 0,
      unlock_duration: 7 * 24 * 60 * 60, // 7 days in seconds
      early_unstake_penalty: 1000, // 10% in basis points
      referral_reward_rate: 300 // 3% in basis points
    };
  }
}

/**
 * Get token balance for a wallet from Railway
 * @param walletAddress Wallet address to get balance for
 * @returns Token balance data
 */
export async function getWalletTokenBalance(walletAddress: string): Promise<TokenBalance> {
  try {
    console.log(`Fetching token balance from Railway API for wallet: ${walletAddress}`);
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/token-balance/${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json() as TokenBalance;
    console.log(`Railway token balance for ${walletAddress}:`, data);
    return data;
  } catch (error) {
    console.error('Error fetching token balance from Railway:', error);
    // Return empty data on error
    return {
      walletAddress,
      balance: 0
    };
  }
}

/**
 * Force Railway to poll for new data (uses POST request with admin-key)
 * @param adminKey The admin key for Railway API (should be in environment variables)
 * @returns Whether the polling was successful
 */
export async function forcePollNow(adminKey: string): Promise<boolean> {
  try {
    console.log('Forcing Railway to poll for new data');
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/poll-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': adminKey
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error forcing Railway to poll:', error);
    return false;
  }
}

/**
 * Add a wallet to be monitored by Railway
 * @param walletAddress Wallet address to add
 * @returns Whether the operation was successful
 */
export async function addWalletToMonitor(walletAddress: string): Promise<boolean> {
  try {
    console.log(`Adding wallet ${walletAddress} to Railway monitoring`);
    const response = await fetch(`${RAILWAY_SERVICE_URL}/api/add-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });
    
    return response.ok;
  } catch (error) {
    console.error(`Error adding wallet ${walletAddress} to Railway monitoring:`, error);
    return false;
  }
}