/**
 * Ethereum Routes
 * 
 * These routes handle Ethereum-specific API endpoints
 */

import { Express } from 'express';
import { 
  handleEthStakingInfo,
  handleEthStakingStats,
  handleEthReferrals,
  handleEthLeaderboard,
  handleEthRegisterUser,
  handleEthStakeTokens,
  handleEthUnstakeTokens,
  handleEthClaimRewards,
  handleEthBuyAndStake
} from './ethereum-api';
import { handleEthereumConfig } from './ethereum-config';

export function registerEthereumRoutes(app: Express) {
  // Get Ethereum configuration (API keys and contract addresses)
  app.get('/api/ethereum/config', handleEthereumConfig);
  
  // Get Ethereum staking info for a wallet
  app.get('/api/ethereum/staking-info/:walletAddress', handleEthStakingInfo);
  
  // Get global Ethereum staking stats
  app.get('/api/ethereum/staking-stats', handleEthStakingStats);
  
  // Get referrals for an Ethereum wallet
  app.get('/api/ethereum/referrals/:walletAddress', handleEthReferrals);
  
  // Get Ethereum leaderboard
  app.get('/api/ethereum/leaderboard/:type/:period', handleEthLeaderboard);
  
  // Register user in Ethereum staking contract
  app.post('/api/ethereum/register-user', handleEthRegisterUser);
  
  // Stake tokens in Ethereum staking contract
  app.post('/api/ethereum/stake', handleEthStakeTokens);
  
  // Unstake tokens from Ethereum staking contract
  app.post('/api/ethereum/unstake', handleEthUnstakeTokens);
  
  // Claim rewards from Ethereum staking contract
  app.post('/api/ethereum/claim-rewards', handleEthClaimRewards);
  
  // Buy and stake tokens in one transaction
  app.post('/api/ethereum/buy-and-stake', handleEthBuyAndStake);
  
  console.log("Ethereum routes registered successfully");
}