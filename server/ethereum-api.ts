/**
 * Ethereum API endpoints for the server
 * These endpoints provide blockchain data from Ethereum
 */

import { Request, Response } from 'express';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import contract ABIs and configuration
// Since we're in the server environment, we can't use the browser imports
const TokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function buyTokens() payable returns (bool)",
  "function burnWithPenalty(uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event TokensBought(address indexed buyer, uint256 amount)",
  "event TokensBurned(address indexed burner, uint256 amount)"
];

const StakingVaultABI = [
  "function stakingToken() view returns (address)",
  "function lockDuration() view returns (uint256)",
  "function earlyWithdrawalPenalty() view returns (uint256)",
  "function referralRewardRate() view returns (uint256)",
  "function rewardRate() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function totalReferrals() view returns (uint256)",
  "function stakersCount() view returns (uint256)",
  "function registeredUsers(address) view returns (bool)",
  "function getStakingInfo(address user) view returns (uint256 amountStaked, uint256 pendingRewards, uint256 stakedAt, uint256 lastClaimAt, address referrer, bool isRegistered)",
  "function getUserReferrals(address user) view returns (address[])",
  "function getReferralCount(address user) view returns (uint256)",
  "function isUnlocked(address user) view returns (bool)",
  "function timeUntilUnlock(address user) view returns (uint256)",
  "function registerUser(address referrer) returns (bool)",
  "function stake(uint256 amount) returns (bool)",
  "function unstake(uint256 amount) returns (bool)",
  "function claimRewards() returns (bool)",
  "event UserRegistered(address indexed user, address indexed referrer)",
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount, uint256 penalty)",
  "event RewardClaimed(address indexed user, uint256 amount)",
  "event ReferralRewardPaid(address indexed referrer, address indexed referred, uint256 amount)"
];

// Contract addresses (update after deployment)
const CONTRACT_ADDRESSES = {
  // Sepolia testnet
  sepolia: {
    token: process.env.ETH_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000",
    stakingVault: process.env.ETH_STAKING_ADDRESS || "0x0000000000000000000000000000000000000000"
  }
};

// RPC endpoint
const RPC_ENDPOINT = process.env.ETHEREUM_TESTNET_URL || "https://sepolia.infura.io/v3/your-infura-key";

// Create provider
let provider: ethers.providers.JsonRpcProvider;
try {
  provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
} catch (error) {
  console.error("Failed to connect to Ethereum RPC:", error);
}

// Get contract instances
const getTokenContract = () => {
  return new ethers.Contract(CONTRACT_ADDRESSES.sepolia.token, TokenABI, provider);
};

const getStakingContract = () => {
  return new ethers.Contract(CONTRACT_ADDRESSES.sepolia.stakingVault, StakingVaultABI, provider);
};

// Format amounts for display
const formatAmount = (amount: ethers.BigNumberish, decimals = 18) => {
  return ethers.utils.formatUnits(amount, decimals);
};

// Helper function to track referral history and leaderboard
const referralCache = new Map<string, string>();
const referralCounts = new Map<string, number>();
const stakingAmounts = new Map<string, string>();

// In-memory cache for staking information
const stakingInfoCache = new Map<string, any>();
const lastUpdated = new Map<string, number>();

// Get staking info from the blockchain
const fetchStakingInfo = async (walletAddress: string) => {
  try {
    console.log(`Fetching Ethereum staking info for ${walletAddress}`);
    const stakingContract = getStakingContract();
    const tokenContract = getTokenContract();
    
    // Get all data in parallel
    const [
      stakingInfo,
      isUnlocked,
      timeUntilUnlock,
      tokenBalance,
      referralCount
    ] = await Promise.all([
      stakingContract.getStakingInfo(walletAddress),
      stakingContract.isUnlocked(walletAddress),
      stakingContract.timeUntilUnlock(walletAddress),
      tokenContract.balanceOf(walletAddress),
      stakingContract.getReferralCount(walletAddress)
    ]);
    
    // Get global stats
    const [
      totalStaked,
      totalReferrals,
      stakersCount,
      rewardRate,
      lockDuration,
      earlyWithdrawalPenalty,
      referralRewardRate
    ] = await Promise.all([
      stakingContract.totalStaked(),
      stakingContract.totalReferrals(),
      stakingContract.stakersCount(),
      stakingContract.rewardRate(),
      stakingContract.lockDuration(),
      stakingContract.earlyWithdrawalPenalty(),
      stakingContract.referralRewardRate()
    ]);

    // Format the result
    const info = {
      amountStaked: parseFloat(formatAmount(stakingInfo.amountStaked)),
      pendingRewards: parseFloat(formatAmount(stakingInfo.pendingRewards)),
      stakedAt: new Date(stakingInfo.stakedAt.toNumber() * 1000).toISOString(),
      lastClaimAt: new Date(stakingInfo.lastClaimAt.toNumber() * 1000).toISOString(),
      lastCompoundAt: new Date(stakingInfo.lastClaimAt.toNumber() * 1000).toISOString(), // Same as lastClaimAt
      timeUntilUnlock: isUnlocked ? null : timeUntilUnlock.toNumber(),
      estimatedAPY: rewardRate.toNumber() / 100, // Convert basis points to percentage
      isLocked: !isUnlocked,
      referrer: stakingInfo.referrer === ethers.constants.AddressZero ? null : stakingInfo.referrer,
      walletTokenBalance: parseFloat(formatAmount(tokenBalance)),
      stakingVaultAddress: CONTRACT_ADDRESSES.sepolia.stakingVault,
      dataSource: 'ethereum',
      onChainVerified: true,
      isRegistered: stakingInfo.isRegistered,
      referralCount: referralCount.toNumber(),
      
      // Global stats for caching
      _globalStats: {
        totalStaked: parseFloat(formatAmount(totalStaked)),
        stakersCount: stakersCount.toNumber(),
        totalReferrals: totalReferrals.toNumber(),
        currentAPY: rewardRate.toNumber() / 100,
        lockDuration: lockDuration.toNumber(),
        earlyWithdrawalPenalty: earlyWithdrawalPenalty.toNumber(),
        referralRewardRate: referralRewardRate.toNumber()
      }
    };
    
    // Update caches
    stakingInfoCache.set(walletAddress, info);
    lastUpdated.set(walletAddress, Date.now());
    
    // Update referral cache if applicable
    if (stakingInfo.referrer !== ethers.constants.AddressZero) {
      referralCache.set(walletAddress, stakingInfo.referrer);
      const currentCount = referralCounts.get(stakingInfo.referrer) || 0;
      referralCounts.set(stakingInfo.referrer, currentCount + 1);
    }
    
    // Update staking amounts for leaderboard
    if (stakingInfo.amountStaked.gt(0)) {
      stakingAmounts.set(walletAddress, formatAmount(stakingInfo.amountStaked));
    }
    
    return info;
  } catch (error) {
    console.error(`Error fetching Ethereum staking info for ${walletAddress}:`, error);
    throw error;
  }
};

/**
 * Handler for getting staking info for a wallet
 */
export async function handleEthStakingInfo(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }
    
    // Check if we have cached data that's less than 30 seconds old
    const cached = stakingInfoCache.get(walletAddress);
    const lastUpdate = lastUpdated.get(walletAddress) || 0;
    
    if (cached && Date.now() - lastUpdate < 30000) {
      console.log(`Using cached Ethereum staking info for ${walletAddress}`);
      return res.json(cached);
    }
    
    // Fetch fresh data
    const info = await fetchStakingInfo(walletAddress);
    return res.json(info);
  } catch (error: any) {
    console.error('Error in handleEthStakingInfo:', error);
    return res.status(500).json({ 
      error: 'Failed to get staking info', 
      details: error?.message || 'Unknown error' 
    });
  }
}

/**
 * Handler for getting global staking stats
 */
export async function handleEthStakingStats(req: Request, res: Response) {
  try {
    const stakingContract = getStakingContract();
    
    // Get global stats
    const [
      totalStaked,
      totalReferrals,
      stakersCount,
      rewardRate
    ] = await Promise.all([
      stakingContract.totalStaked(),
      stakingContract.totalReferrals(),
      stakingContract.stakersCount(),
      stakingContract.rewardRate()
    ]);
    
    const stats = {
      totalStaked: parseFloat(formatAmount(totalStaked)),
      rewardPool: 0, // No separate reward pool in this contract
      stakersCount: stakersCount.toNumber(),
      currentAPY: rewardRate.toNumber() / 100, // Convert basis points to percentage
      stakingVaultAddress: CONTRACT_ADDRESSES.sepolia.stakingVault,
      lastUpdated: new Date().toISOString(),
      dataSource: 'ethereum',
      totalReferrals: totalReferrals.toNumber()
    };
    
    return res.json(stats);
  } catch (error: any) {
    console.error('Error in handleEthStakingStats:', error);
    return res.status(500).json({ 
      error: 'Failed to get staking stats', 
      details: error?.message || 'Unknown error' 
    });
  }
}

/**
 * Handler for getting referrals for a wallet
 */
export async function handleEthReferrals(req: Request, res: Response) {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }
    
    const stakingContract = getStakingContract();
    
    // Get referrals for this wallet
    const referrals = await stakingContract.getUserReferrals(walletAddress);
    const referralCount = await stakingContract.getReferralCount(walletAddress);
    
    // Get additional info about each referral
    const referralDetails = [];
    for (const referredAddress of referrals) {
      const info = await stakingContract.getStakingInfo(referredAddress);
      
      referralDetails.push({
        walletAddress: referredAddress,
        amountStaked: parseFloat(formatAmount(info.amountStaked)),
        stakedAt: new Date(info.stakedAt.toNumber() * 1000).toISOString()
      });
    }
    
    const result = {
      referrer: null, // Who referred this wallet
      referrals: referralDetails, // Who this wallet has referred
      referralCount: referralCount.toNumber(),
      totalRewards: 0 // We'd need to calculate this from events
    };
    
    // Check if this wallet was referred by someone
    const cachedReferrer = referralCache.get(walletAddress);
    if (cachedReferrer) {
      result.referrer = cachedReferrer;
    } else {
      // We would need to check the User Registration event to find this
      // This is a simplified version
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error in handleEthReferrals:', error);
    return res.status(500).json({ error: 'Failed to get referrals', details: error.message });
  }
}

/**
 * Handler for getting referral leaderboard
 */
export async function handleEthLeaderboard(req: Request, res: Response) {
  try {
    const { type, period } = req.params;
    
    if (type !== 'referrers' && type !== 'stakers') {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }
    
    if (period !== 'weekly' && period !== 'monthly' && period !== 'all-time') {
      return res.status(400).json({ error: 'Invalid leaderboard period' });
    }
    
    // For referrers leaderboard
    if (type === 'referrers') {
      // Sort referrers by count
      const entries = Array.from(referralCounts.entries());
      const sortedReferrers = entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([walletAddress, count], index) => ({
          rank: index + 1,
          walletAddress,
          referralCount: count,
          totalRewards: 0 // We'd need to calculate this from events
        }));
      
      return res.json(sortedReferrers);
    }
    
    // For stakers leaderboard
    if (type === 'stakers') {
      // Sort stakers by amount
      const entries = Array.from(stakingAmounts.entries());
      const sortedStakers = entries
        .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
        .slice(0, 10)
        .map(([walletAddress, amount], index) => ({
          rank: index + 1,
          walletAddress,
          amountStaked: parseFloat(amount)
        }));
      
      return res.json(sortedStakers);
    }
  } catch (error) {
    console.error('Error in handleEthLeaderboard:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard', details: error.message });
  }
}

/**
 * Handler for creating a register user transaction
 */
export async function handleEthRegisterUser(req: Request, res: Response) {
  try {
    const { walletAddress, referrer } = req.body;
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }
    
    // Create a transaction for registering the user
    const stakingContract = getStakingContract();
    const data = stakingContract.interface.encodeFunctionData(
      'registerUser',
      [referrer && ethers.utils.isAddress(referrer) ? referrer : ethers.constants.AddressZero]
    );
    
    const transaction = {
      to: CONTRACT_ADDRESSES.sepolia.stakingVault,
      data,
      chainId: 11155111, // Sepolia chain ID
      value: '0x0'
    };
    
    return res.json({ transaction });
  } catch (error) {
    console.error('Error in handleEthRegisterUser:', error);
    return res.status(500).json({ error: 'Failed to create register transaction', details: error.message });
  }
}

/**
 * Handler for creating a stake transaction
 */
export async function handleEthStakeTokens(req: Request, res: Response) {
  try {
    const { walletAddress, amount } = req.body;
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Convert amount to wei format
    const amountInWei = ethers.utils.parseUnits(amount, 18);
    
    // Create an approve transaction first
    const tokenContract = getTokenContract();
    const approveData = tokenContract.interface.encodeFunctionData(
      'approve',
      [CONTRACT_ADDRESSES.sepolia.stakingVault, amountInWei]
    );
    
    // Create the stake transaction
    const stakingContract = getStakingContract();
    const stakeData = stakingContract.interface.encodeFunctionData(
      'stake',
      [amountInWei]
    );
    
    const transactions = [
      {
        to: CONTRACT_ADDRESSES.sepolia.token,
        data: approveData,
        chainId: 11155111, // Sepolia chain ID
        value: '0x0'
      },
      {
        to: CONTRACT_ADDRESSES.sepolia.stakingVault,
        data: stakeData,
        chainId: 11155111, // Sepolia chain ID
        value: '0x0'
      }
    ];
    
    return res.json({ transactions });
  } catch (error) {
    console.error('Error in handleEthStakeTokens:', error);
    return res.status(500).json({ error: 'Failed to create stake transaction', details: error.message });
  }
}

/**
 * Handler for creating an unstake transaction
 */
export async function handleEthUnstakeTokens(req: Request, res: Response) {
  try {
    const { walletAddress, amount } = req.body;
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Convert amount to wei format
    const amountInWei = ethers.utils.parseUnits(amount, 18);
    
    // Create the unstake transaction
    const stakingContract = getStakingContract();
    const unstakeData = stakingContract.interface.encodeFunctionData(
      'unstake',
      [amountInWei]
    );
    
    const transaction = {
      to: CONTRACT_ADDRESSES.sepolia.stakingVault,
      data: unstakeData,
      chainId: 11155111, // Sepolia chain ID
      value: '0x0'
    };
    
    return res.json({ transaction });
  } catch (error) {
    console.error('Error in handleEthUnstakeTokens:', error);
    return res.status(500).json({ error: 'Failed to create unstake transaction', details: error.message });
  }
}

/**
 * Handler for creating a claim rewards transaction
 */
export async function handleEthClaimRewards(req: Request, res: Response) {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }
    
    // Create the claim rewards transaction
    const stakingContract = getStakingContract();
    const claimData = stakingContract.interface.encodeFunctionData('claimRewards', []);
    
    const transaction = {
      to: CONTRACT_ADDRESSES.sepolia.stakingVault,
      data: claimData,
      chainId: 11155111, // Sepolia chain ID
      value: '0x0'
    };
    
    return res.json({ transaction });
  } catch (error) {
    console.error('Error in handleEthClaimRewards:', error);
    return res.status(500).json({ error: 'Failed to create claim rewards transaction', details: error.message });
  }
}

/**
 * Handler for creating a buy and stake transaction
 */
export async function handleEthBuyAndStake(req: Request, res: Response) {
  try {
    const { walletAddress, amount, referrer } = req.body;
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum wallet address' });
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Convert ETH amount to wei
    const ethAmount = ethers.utils.parseEther(amount);
    
    // Calculate token amount (1 ETH = 1000 tokens)
    const tokenAmount = ethAmount.mul(1000);
    
    // Create the buy tokens transaction
    const tokenContract = getTokenContract();
    const buyData = tokenContract.interface.encodeFunctionData('buyTokens');
    
    // Check if user is registered
    const stakingContract = getStakingContract();
    let isRegistered;
    try {
      isRegistered = await stakingContract.registeredUsers(walletAddress);
    } catch (error) {
      console.error("Failed to check registration status:", error);
      isRegistered = false;
    }
    
    const transactions = [];
    
    // Add buy transaction
    transactions.push({
      to: CONTRACT_ADDRESSES.sepolia.token,
      data: buyData,
      chainId: 11155111, // Sepolia chain ID
      value: ethAmount.toHexString()
    });
    
    // Add register transaction if needed
    if (!isRegistered) {
      const registerData = stakingContract.interface.encodeFunctionData(
        'registerUser',
        [referrer && ethers.utils.isAddress(referrer) ? referrer : ethers.constants.AddressZero]
      );
      
      transactions.push({
        to: CONTRACT_ADDRESSES.sepolia.stakingVault,
        data: registerData,
        chainId: 11155111, // Sepolia chain ID
        value: '0x0'
      });
    }
    
    // Add approve transaction
    const approveData = tokenContract.interface.encodeFunctionData(
      'approve',
      [CONTRACT_ADDRESSES.sepolia.stakingVault, tokenAmount]
    );
    
    transactions.push({
      to: CONTRACT_ADDRESSES.sepolia.token,
      data: approveData,
      chainId: 11155111, // Sepolia chain ID
      value: '0x0'
    });
    
    // Add stake transaction
    const stakeData = stakingContract.interface.encodeFunctionData(
      'stake',
      [tokenAmount]
    );
    
    transactions.push({
      to: CONTRACT_ADDRESSES.sepolia.stakingVault,
      data: stakeData,
      chainId: 11155111, // Sepolia chain ID
      value: '0x0'
    });
    
    return res.json({ transactions });
  } catch (error) {
    console.error('Error in handleEthBuyAndStake:', error);
    return res.status(500).json({ error: 'Failed to create buy and stake transaction', details: error.message });
  }
}