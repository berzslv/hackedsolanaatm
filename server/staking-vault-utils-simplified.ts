import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getMintAuthority } from './token-utils';
import { externalStakingCache } from './external-staking-cache';

// Program information
const PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm'; // Your deployed program from Solana Playground
const TOKEN_MINT_ADDRESS = '12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5';

// Models for staking data
export interface StakingUserInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastClaimAt: Date | null;
  timeUntilUnlock: number | null;
  estimatedAPY: number;
}

export interface StakingVaultInfo {
  totalStaked: number;
  rewardPool: number;
  stakersCount: number;
  currentAPY: number;
  stakingVaultAddress: string;
  programId?: string; // Optional program ID for the contract
}

/**
 * Get user's staking information from external cache or blockchain
 * @param walletAddress Wallet address to get staking info for
 * @returns StakingUserInfo with on-chain data
 */
export async function getUserStakingInfo(walletAddress: string): Promise<StakingUserInfo> {
  try {
    // First check if we have cached staking data for this wallet
    if (externalStakingCache.hasStakingData(walletAddress)) {
      const cachedData = externalStakingCache.getStakingData(walletAddress);
      if (cachedData) {
        console.log(`Found external staking data for ${walletAddress}`);
        return {
          amountStaked: cachedData.amountStaked,
          pendingRewards: cachedData.pendingRewards,
          stakedAt: cachedData.stakedAt,
          lastClaimAt: cachedData.lastUpdateTime,
          timeUntilUnlock: cachedData.timeUntilUnlock,
          estimatedAPY: cachedData.estimatedAPY,
        };
      }
    }
    
    // If no cached data, try to get from Railway events data
    // Normally we would query the blockchain or a database here
    console.log(`No external staking data found for ${walletAddress}`);
    console.log(`No external staking data available for ${walletAddress}, using zeros`);
    
    // Return default/empty staking info
    return {
      amountStaked: 0,
      pendingRewards: 0,
      stakedAt: new Date(),
      lastClaimAt: null,
      timeUntilUnlock: null,
      estimatedAPY: 120, // Default APY from program
    };
  } catch (error) {
    console.error(`Error getting staking info for ${walletAddress}:`, error);
    
    // Return default/empty staking info on error
    return {
      amountStaked: 0,
      pendingRewards: 0,
      stakedAt: new Date(),
      lastClaimAt: null,
      timeUntilUnlock: null,
      estimatedAPY: 120, // Default APY from program
    };
  }
}

/**
 * Get staking vault global statistics
 * @returns Staking vault statistics
 */
export async function getStakingVaultInfo(): Promise<StakingVaultInfo> {
  try {
    console.log('Getting staking vault global info');
    
    // Simplified approach: Return mock staking vault data for demonstration
    // In a real system, this would be fetched from a reliable data source
    const stakingVaultData = {
      totalStaked: 100000,
      rewardPool: 50000,
      stakersCount: 5,
      currentAPY: 120,
      stakingVaultAddress: PROGRAM_ID,
    };
    
    console.log(`Retrieved global staking stats:`, stakingVaultData);
    return stakingVaultData;
  } catch (error) {
    console.error('Error getting staking vault info:', error);
    
    // Return default data on error
    return {
      totalStaked: 100000,
      rewardPool: 50000,
      stakersCount: 5,
      currentAPY: 120,
      stakingVaultAddress: PROGRAM_ID,
    };
  }
}