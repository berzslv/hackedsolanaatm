import { Handler } from "@netlify/functions";
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import * as anchor from '@coral-xyz/anchor';

// Constants from your smart contract
const TOKEN_MINT_ADDRESS = "12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5";
const PROGRAM_ID = "EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm";

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Main handler function
export const handler: Handler = async (event, context) => {
  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Get the path parameter after /staking/
  const path = event.path.replace('/.netlify/functions/staking', '');
  const segments = path.split('/').filter(Boolean);
  const action = segments[0];
  
  try {
    // Route to appropriate function based on the action
    switch (action) {
      case 'info':
        // Get user's staking info with wallet address
        if (segments.length !== 2) {
          throw new Error('Wallet address is required');
        }
        
        const walletAddress = segments[1];
        const stakingInfo = await getUserStakingInfo(walletAddress);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            stakingInfo
          })
        };
        
      case 'stats':
        // Get global staking stats
        const stats = await getStakingVaultInfo();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stats)
        };
        
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'Endpoint not found' 
          })
        };
    }
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error'
      })
    };
  }
};

// Simple implementation of getStakingVaultInfo to generate realistic data
async function getStakingVaultInfo() {
  try {
    // In a real implementation, this would fetch data from the blockchain
    // For now, we'll return realistic simulated values
    return {
      totalStaked: 25000000, // 25 million HATM tokens
      rewardPool: 3750000, // 3.75 million HATM tokens reserved for rewards
      stakersCount: 9542, // Number of active stakers
      currentAPY: 125.4, // Current APY in percentage
      stakingVaultAddress: PROGRAM_ID,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting staking vault info:', error);
    throw error;
  }
}

// Simple implementation of getUserStakingInfo that returns realistic data
async function getUserStakingInfo(walletAddress: string) {
  try {
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);
    
    // Generate deterministic but realistic staking data from wallet address
    const walletSeed = walletPubkey.toBuffer()[0] + walletPubkey.toBuffer()[31];
    const amountStaked = Math.floor(100 + (walletSeed * 50));
    const stakedDays = Math.floor(1 + (walletSeed % 7)); // 1-7 days
    const stakedAt = new Date(Date.now() - (stakedDays * 24 * 60 * 60 * 1000));
    const lastClaimAt = new Date(Date.now() - (Math.floor(1 + (walletSeed % 4)) * 60 * 60 * 1000)); // 1-4 hours ago
    
    // Calculate days left in locking period, if any
    const lockPeriodDays = 7; // 7-day lock period
    const daysPassed = stakedDays;
    const daysLeft = Math.max(0, lockPeriodDays - daysPassed);
    const timeUntilUnlock = daysLeft > 0 ? (daysLeft * 24 * 60 * 60 * 1000) : null;
    
    // Calculate pending rewards using a formula similar to the smart contract
    const baseAPY = 120; // 120% APY
    const timeStaked = Date.now() - stakedAt.getTime();
    const timeStakedDays = timeStaked / (24 * 60 * 60 * 1000);
    const pendingRewards = Math.floor(amountStaked * (baseAPY/100) * (timeStakedDays / 365));
    
    return {
      amountStaked,
      pendingRewards,
      stakedAt,
      lastClaimAt,
      timeUntilUnlock,
      estimatedAPY: baseAPY + (walletSeed % 10), // Small variation in APY
    };
  } catch (error) {
    console.error('Error getting user staking info:', error);
    throw error;
  }
}