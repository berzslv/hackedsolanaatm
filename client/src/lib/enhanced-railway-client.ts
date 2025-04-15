import axios from 'axios';

// Base URL for Railway API
const RAILWAY_API_URL = import.meta.env.VITE_RAILWAY_API_URL || 'https://your-railway-app.railway.app';

// Types
export interface TokenTransfer {
  signature: string;
  fromWallet: string;
  toWallet: string;
  amount: number;
  timestamp: string;
  blockTime: string | null;
}

export interface StakingData {
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

export interface ReferralData {
  totalReferrals: number;
  totalEarnings: number;
  referredUsers: string[];
  recentActivity: ReferralActivity[];
  weeklyRank: number | null;
}

export interface ReferralActivity {
  date: string;
  referredUser: string;
  amount: number;
}

export interface LeaderboardEntry {
  walletAddress: string;
  totalReferrals: number;
  totalEarnings: number;
  weeklyRank: number;
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

// Railway API functions
export const railwayClient = {
  // Add a wallet to monitoring
  async addWalletToMonitoring(walletAddress: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`${RAILWAY_API_URL}/api/add-wallet`, { walletAddress });
      return response.data;
    } catch (error) {
      console.error('Error adding wallet to monitoring:', error);
      throw error;
    }
  },

  // Get token transfers for a wallet
  async getTokenTransfers(walletAddress?: string): Promise<TokenTransfer[]> {
    try {
      const url = walletAddress 
        ? `${RAILWAY_API_URL}/api/token-transfers?wallet=${walletAddress}` 
        : `${RAILWAY_API_URL}/api/token-transfers`;
        
      const response = await axios.get(url);
      return response.data.transfers || [];
    } catch (error) {
      console.error('Error getting token transfers:', error);
      return [];
    }
  },

  // Get staking data for a wallet
  async getStakingData(walletAddress: string): Promise<StakingData> {
    try {
      const response = await axios.get(`${RAILWAY_API_URL}/api/staking-data?wallet=${walletAddress}`);
      return response.data;
    } catch (error) {
      console.error('Error getting staking data:', error);
      // Return default empty data
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
  },

  // Get referral data for a wallet
  async getReferralData(walletAddress: string): Promise<ReferralData> {
    try {
      const response = await axios.get(`${RAILWAY_API_URL}/api/referral-data?wallet=${walletAddress}`);
      return response.data;
    } catch (error) {
      console.error('Error getting referral data:', error);
      // Return default empty data
      return {
        totalReferrals: 0,
        totalEarnings: 0,
        referredUsers: [],
        recentActivity: [],
        weeklyRank: null
      };
    }
  },

  // Get leaderboard data
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await axios.get(`${RAILWAY_API_URL}/api/leaderboard`);
      return response.data.leaderboard || [];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  },

  // Get global statistics
  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const response = await axios.get(`${RAILWAY_API_URL}/api/global-stats`);
      return response.data;
    } catch (error) {
      console.error('Error getting global stats:', error);
      // Return default empty data
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
  },

  // Format duration in a human-readable format
  formatDuration(milliseconds: number | null): string {
    if (!milliseconds) return 'Unlocked';
    
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
};

export default railwayClient;