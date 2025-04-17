/**
 * Contract ABIs for Ethereum integration
 * 
 * These are the minimal ABIs needed to interact with the contracts.
 * They only include the functions we'll be using in the frontend.
 */

// Minimal ABI for HackedATMToken
export const TokenABI = [
  // Read-only functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  
  // State-changing functions
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function buyTokens() payable returns (bool)",
  "function burnWithPenalty(uint256 amount) returns (bool)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event TokensBought(address indexed buyer, uint256 amount)",
  "event TokensBurned(address indexed burner, uint256 amount)"
];

// Minimal ABI for StakingVault
export const StakingVaultABI = [
  // Read-only functions
  "function stakingToken() view returns (address)",
  "function lockDuration() view returns (uint256)",
  "function earlyWithdrawalPenalty() view returns (uint256)",
  "function referralRewardRate() view returns (uint256)",
  "function rewardRate() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function totalReferrals() view returns (uint256)",
  "function stakersCount() view returns (uint256)",
  "function userStakes(address) view returns (uint256 amount, uint256 stakedAt, uint256 lastClaimAt, uint256 pendingRewards, address referrer, bool isRegistered)",
  "function registeredUsers(address) view returns (bool)",
  "function getStakingInfo(address user) view returns (uint256 amountStaked, uint256 pendingRewards, uint256 stakedAt, uint256 lastClaimAt, address referrer, bool isRegistered)",
  "function getUserReferrals(address user) view returns (address[])",
  "function getReferralCount(address user) view returns (uint256)",
  "function isUnlocked(address user) view returns (bool)",
  "function timeUntilUnlock(address user) view returns (uint256)",
  
  // State-changing functions
  "function registerUser(address referrer) returns (bool)",
  "function stake(uint256 amount) returns (bool)",
  "function unstake(uint256 amount) returns (bool)",
  "function claimRewards() returns (bool)",
  
  // Events
  "event UserRegistered(address indexed user, address indexed referrer)",
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount, uint256 penalty)",
  "event RewardClaimed(address indexed user, uint256 amount)",
  "event ReferralRewardPaid(address indexed referrer, address indexed referred, uint256 amount)"
];