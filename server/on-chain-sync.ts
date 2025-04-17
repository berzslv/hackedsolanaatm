/**
 * On-Chain Synchronization Module
 * 
 * This module provides utilities to synchronize on-chain staking data
 * with our Railway database/API.
 * 
 * It uses the correct PDA seed ("user_info") to query staking information.
 */

import {
  Connection,
  PublicKey,
  clusterApiUrl
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { getStakingInfo, isUserRegistered } from './staking-contract-functions';

// Path to data storage
const RAILWAY_DATA_PATH = path.join(process.cwd(), 'railway', 'data.json');

/**
 * Synchronize on-chain staking data for a wallet
 * 
 * @param walletAddress The wallet address to synchronize
 * @returns The updated staking data
 */
export async function syncOnChainStakingData(walletAddress: string): Promise<any> {
  console.log(`Synchronizing on-chain staking data for wallet: ${walletAddress}`);
  
  try {
    // Get the connection
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load data from Railway
    const railwayData = loadRailwayData();
    
    // Get wallet's staking data from Railway
    const stakingData = railwayData.wallets[walletAddress] || {
      amountStaked: 0,
      pendingRewards: 0,
      lastUpdateTime: new Date().toISOString(),
      stakedAt: null,
      eventCount: 0,
      referrer: null,
      timeUntilUnlock: null,
      isLocked: false,
      estimatedAPY: 12
    };
    
    // Get token balance from Railway
    const tokenData = railwayData.tokenBalances[walletAddress] || {
      walletAddress: walletAddress,
      balance: 0
    };
    
    // Get on-chain staking data
    const walletPublicKey = new PublicKey(walletAddress);
    
    // Check if user is registered on-chain
    const isRegistered = await isUserRegistered(walletPublicKey);
    
    let onChainData;
    if (isRegistered) {
      // User is registered, fetch their staking data
      onChainData = await getStakingInfo(walletPublicKey);
    } else {
      // User is not registered, use default values
      onChainData = {
        isRegistered: false,
        amountStaked: 0,
        pendingRewards: 0,
        lastStakeTime: null,
        lastClaimTime: null,
        referrer: null
      };
    }
    
    console.log('On-chain staking data:', onChainData);
    
    // Create the merged object with both on-chain and Railway data
    // We prefer the on-chain data for staking amount and rewards
    // but keep the Railway timeouts and other metadata
    const mergedData = {
      amountStaked: onChainData.amountStaked,
      pendingRewards: onChainData.pendingRewards,
      stakedAt: new Date(),
      lastClaimAt: stakingData.lastUpdateTime ? new Date(stakingData.lastUpdateTime) : new Date(),
      lastCompoundAt: stakingData.lastUpdateTime ? new Date(stakingData.lastUpdateTime) : new Date(),
      timeUntilUnlock: stakingData.timeUntilUnlock || null,
      estimatedAPY: railwayData.globalStats.currentAPY || 12,
      isLocked: stakingData.isLocked || false,
      referrer: onChainData.referrer || stakingData.referrer || null,
      walletTokenBalance: tokenData.balance,
      stakingVaultAddress: 'DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8',
      dataSource: 'blockchain',
      onChainVerified: true,
      isRegistered: isRegistered
    };
    
    console.log(`On-chain data synchronized for ${walletAddress}:`, mergedData);
    
    // Update the Railway data
    railwayData.wallets[walletAddress] = {
      amountStaked: onChainData.amountStaked,
      pendingRewards: onChainData.pendingRewards,
      lastUpdateTime: new Date().toISOString(),
      stakedAt: mergedData.stakedAt.toISOString(),
      eventCount: (stakingData.eventCount || 0) + 1,
      referrer: onChainData.referrer || stakingData.referrer || null,
      timeUntilUnlock: stakingData.timeUntilUnlock || null,
      isLocked: stakingData.isLocked || false,
      estimatedAPY: railwayData.globalStats.currentAPY || 12,
      isRegistered: isRegistered
    };
    
    // Update the global stats
    updateGlobalStats(railwayData);
    
    // Save the data
    saveRailwayData(railwayData);
    
    return mergedData;
  } catch (error) {
    console.error(`Error synchronizing on-chain data for ${walletAddress}:`, error);
    
    // Return a default response on error so the application can continue
    return {
      amountStaked: 0,
      pendingRewards: 0,
      stakedAt: new Date(),
      lastClaimAt: new Date(),
      lastCompoundAt: new Date(),
      timeUntilUnlock: null,
      estimatedAPY: 12,
      isLocked: false,
      referrer: null,
      walletTokenBalance: 0,
      stakingVaultAddress: 'DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8',
      dataSource: 'error',
      onChainVerified: false,
      isRegistered: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Synchronize on-chain staking data for all tracked wallets
 */
export async function syncAllStakingData(): Promise<void> {
  try {
    // Load Railway data
    const railwayData = loadRailwayData();
    
    // Get all wallet addresses
    const walletAddresses = Object.keys(railwayData.wallets);
    
    console.log(`Synchronizing on-chain data for ${walletAddresses.length} wallets`);
    
    // Process each wallet
    for (const walletAddress of walletAddresses) {
      try {
        await syncOnChainStakingData(walletAddress);
      } catch (error) {
        console.error(`Error synchronizing wallet ${walletAddress}:`, error);
      }
    }
    
    console.log('On-chain synchronization completed');
  } catch (error) {
    console.error('Error in syncAllStakingData:', error);
  }
}

/**
 * Update global staking statistics
 * 
 * @param railwayData The Railway data object
 */
function updateGlobalStats(railwayData: any): void {
  // Calculate total staked amount
  let totalStaked = 0;
  let stakersCount = 0;
  
  for (const walletAddress in railwayData.wallets) {
    const wallet = railwayData.wallets[walletAddress];
    
    if (wallet.amountStaked > 0) {
      totalStaked += wallet.amountStaked;
      stakersCount++;
    }
  }
  
  // Update the global stats
  railwayData.globalStats.totalStaked = totalStaked;
  railwayData.globalStats.stakersCount = stakersCount;
  railwayData.globalStats.lastUpdated = new Date().toISOString();
}

/**
 * Load Railway data from file
 * 
 * @returns The Railway data
 */
function loadRailwayData(): any {
  try {
    if (fs.existsSync(RAILWAY_DATA_PATH)) {
      const data = fs.readFileSync(RAILWAY_DATA_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading Railway data:', error);
  }
  
  // Return a default structure if the file doesn't exist or there's an error
  return {
    wallets: {},
    tokenBalances: {},
    referrals: {},
    globalStats: {
      totalStaked: 0,
      stakersCount: 0,
      currentAPY: 12,
      lastUpdated: new Date().toISOString(),
      totalReferrals: 0,
      unlock_duration: 7 * 24 * 60 * 60, // 7 days in seconds
      early_unstake_penalty: 1000, // 10.00% penalty (multiplied by 100)
      referral_reward_rate: 300 // 3.00% reward rate (multiplied by 100)
    },
    leaderboards: {
      stakers: {
        weekly: [],
        monthly: []
      },
      referrers: {
        weekly: [],
        monthly: []
      }
    }
  };
}

/**
 * Save Railway data to file
 * 
 * @param data The Railway data to save
 */
function saveRailwayData(data: any): void {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(RAILWAY_DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(RAILWAY_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving Railway data:', error);
  }
}