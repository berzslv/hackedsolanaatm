import { 
  users, 
  staking, 
  referrals, 
  leaderboard, 
  rewards, 
  tokenStats,
  type User, 
  type Staking, 
  type Referral, 
  type Leaderboard, 
  type Reward, 
  type TokenStats,
  type InsertUser, 
  type InsertStaking, 
  type InsertReferral, 
  type InsertLeaderboard, 
  type InsertReward, 
  type InsertTokenStats
} from "@shared/schema";

// Interfaces for referral statistics
interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  weeklyRank: number | null;
  recentActivity: {
    date: string;
    transaction: string;
    amount: number;
    reward: number;
  }[];
}

// Interface for staking information
interface StakingInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastCompoundAt: Date;
  estimatedAPY: number;
  timeUntilUnlock: number | null; // milliseconds until 7-day lock expires or null if already unlocked
}

// Interface for unstaking result
interface UnstakeResult {
  amountUnstaked: number;
  fee: number;
  netAmount: number;
  burnAmount: number;
  marketingAmount: number;
}

// Modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  
  // Token stats methods
  getTokenStats(): Promise<TokenStats>;
  updateTokenStats(stats: Partial<InsertTokenStats>): Promise<TokenStats>;
  
  // Referral methods
  getReferralStats(walletAddress: string): Promise<ReferralStats>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  
  // Staking methods
  getStakingInfo(walletAddress: string): Promise<StakingInfo>;
  stakeTokens(stakingData: InsertStaking): Promise<Staking>;
  unstakeTokens(walletAddress: string, amount: number): Promise<UnstakeResult>;
  
  // Leaderboard methods
  getLeaderboard(type: string, period: string): Promise<Leaderboard[]>;
  updateLeaderboard(leaderboardEntry: InsertLeaderboard): Promise<Leaderboard>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stakingData: Map<string, Staking>;
  private referralsData: Map<number, Referral>;
  private leaderboardData: Map<number, Leaderboard>;
  private rewardsData: Map<number, Reward>;
  private tokenStatsData: TokenStats | null;
  
  currentId: number;

  constructor() {
    this.users = new Map();
    this.stakingData = new Map();
    this.referralsData = new Map();
    this.leaderboardData = new Map();
    this.rewardsData = new Map();
    this.tokenStatsData = null;
    this.currentId = 1;
    
    // Initialize with default token stats
    this.initializeTokenStats();
  }

  private initializeTokenStats() {
    this.tokenStatsData = {
      id: 1,
      totalSupply: 100000000, // 100 million tokens
      circulatingSupply: 25000000, // 25% in circulation
      totalStaked: 5243129, // Amount currently staked
      stakersCount: 1254, // Number of stakers
      currentPrice: 0.0025, // Current token price in USD
      currentAPY: 125.4, // Current APY percentage
      rewardPool: 128914, // Current reward pool size
      updatedAt: new Date()
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      id, 
      ...insertUser, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress,
    );
  }

  // Token stats methods
  async getTokenStats(): Promise<TokenStats> {
    if (!this.tokenStatsData) {
      this.initializeTokenStats();
    }
    return this.tokenStatsData!;
  }

  async updateTokenStats(stats: Partial<InsertTokenStats>): Promise<TokenStats> {
    if (!this.tokenStatsData) {
      this.initializeTokenStats();
    }
    
    this.tokenStatsData = {
      ...this.tokenStatsData!,
      ...stats,
      updatedAt: new Date()
    };
    
    return this.tokenStatsData;
  }

  // Referral methods
  async getReferralStats(walletAddress: string): Promise<ReferralStats> {
    // Find all referrals where this user is the referrer
    const userReferrals = Array.from(this.referralsData.values()).filter(
      (ref) => ref.referrerAddress === walletAddress
    );
    
    // Calculate total earnings
    const totalEarnings = userReferrals.reduce((sum, ref) => sum + ref.reward, 0);
    
    // Get recent activity - sort by date descending
    const recentActivity = userReferrals
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5) // Get top 5 most recent
      .map(ref => ({
        date: ref.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
        transaction: ref.transactionHash,
        amount: ref.amount,
        reward: ref.reward
      }));
    
    // Find weekly rank if exists
    const weeklyLeaderboard = Array.from(this.leaderboardData.values()).filter(
      (entry) => entry.type === 'referrer' && entry.period === 'weekly'
    ).sort((a, b) => a.rank - b.rank);
    
    let weeklyRank = null;
    const userEntry = weeklyLeaderboard.find(entry => entry.walletAddress === walletAddress);
    if (userEntry) {
      weeklyRank = userEntry.rank;
    }
    
    return {
      totalReferrals: userReferrals.length,
      totalEarnings,
      weeklyRank,
      recentActivity
    };
  }

  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const id = this.currentId++;
    const referral: Referral = {
      id,
      ...referralData,
      createdAt: new Date()
    };
    
    this.referralsData.set(id, referral);
    
    // Update token stats - increase reward pool
    await this.updateTokenStats({
      rewardPool: (this.tokenStatsData?.rewardPool || 0) + (referral.amount * 0.02) // 2% to reward pool
    });
    
    return referral;
  }

  // Staking methods
  async getStakingInfo(walletAddress: string): Promise<StakingInfo> {
    // Find staking entry for this wallet
    const userStaking = Array.from(this.stakingData.values()).find(
      (stake) => stake.walletAddress === walletAddress
    );
    
    if (!userStaking) {
      // Return default/empty staking info
      return {
        amountStaked: 0,
        pendingRewards: 0,
        stakedAt: new Date(),
        lastCompoundAt: new Date(),
        estimatedAPY: this.tokenStatsData?.currentAPY || 0,
        timeUntilUnlock: null
      };
    }
    
    // Calculate time until unlock (7 days from stake date)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const stakedTime = new Date().getTime() - userStaking.stakedAt.getTime();
    const timeUntilUnlock = stakedTime >= sevenDaysMs ? null : sevenDaysMs - stakedTime;
    
    return {
      amountStaked: userStaking.amountStaked,
      pendingRewards: userStaking.pendingRewards,
      stakedAt: userStaking.stakedAt,
      lastCompoundAt: userStaking.lastCompoundAt,
      estimatedAPY: this.tokenStatsData?.currentAPY || 0,
      timeUntilUnlock
    };
  }

  async stakeTokens(stakingData: InsertStaking): Promise<Staking> {
    // Check if user already has staked tokens
    const existingStake = Array.from(this.stakingData.values()).find(
      (stake) => stake.walletAddress === stakingData.walletAddress
    );
    
    let staking: Staking;
    
    if (existingStake) {
      // Update existing stake
      staking = {
        ...existingStake,
        amountStaked: existingStake.amountStaked + stakingData.amountStaked,
        lastCompoundAt: new Date()
      };
      
      // Replace in Map
      this.stakingData.set(existingStake.id, staking);
    } else {
      // Create new stake
      const id = this.currentId++;
      staking = {
        id,
        ...stakingData,
        pendingRewards: 0,
        lastCompoundAt: new Date(),
        stakedAt: new Date()
      };
      
      this.stakingData.set(id, staking);
    }
    
    // Update token stats
    await this.updateTokenStats({
      totalStaked: (this.tokenStatsData?.totalStaked || 0) + stakingData.amountStaked,
      stakersCount: Array.from(this.stakingData.values()).length
    });
    
    return staking;
  }

  async unstakeTokens(walletAddress: string, amount: number): Promise<UnstakeResult> {
    // Find staking entry
    const stakingEntry = Array.from(this.stakingData.values()).find(
      (stake) => stake.walletAddress === walletAddress
    );
    
    if (!stakingEntry || stakingEntry.amountStaked < amount) {
      throw new Error("Insufficient staked balance");
    }
    
    // Calculate if early withdrawal fee applies (within 7 days)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const stakedTime = new Date().getTime() - stakingEntry.stakedAt.getTime();
    const earlyWithdrawal = stakedTime < sevenDaysMs;
    
    let fee = 0;
    let burnAmount = 0;
    let marketingAmount = 0;
    
    if (earlyWithdrawal) {
      // 5% fee total - 4% burned, 1% to marketing
      fee = amount * 0.05;
      burnAmount = amount * 0.04;
      marketingAmount = amount * 0.01;
    }
    
    const netAmount = amount - fee;
    
    // Update staking entry
    const updatedStaking: Staking = {
      ...stakingEntry,
      amountStaked: stakingEntry.amountStaked - amount
    };
    
    // If complete unstake, remove entry, otherwise update
    if (updatedStaking.amountStaked <= 0) {
      this.stakingData.delete(stakingEntry.id);
    } else {
      this.stakingData.set(stakingEntry.id, updatedStaking);
    }
    
    // Update token stats
    await this.updateTokenStats({
      totalStaked: (this.tokenStatsData?.totalStaked || 0) - amount,
      stakersCount: Array.from(this.stakingData.values()).length,
      // Reduce circulating supply by burn amount
      circulatingSupply: (this.tokenStatsData?.circulatingSupply || 0) - burnAmount
    });
    
    return {
      amountUnstaked: amount,
      fee,
      netAmount,
      burnAmount,
      marketingAmount
    };
  }

  // Leaderboard methods
  async getLeaderboard(type: string, period: string): Promise<Leaderboard[]> {
    return Array.from(this.leaderboardData.values())
      .filter(entry => entry.type === type && entry.period === period)
      .sort((a, b) => a.rank - b.rank);
  }

  async updateLeaderboard(leaderboardEntry: InsertLeaderboard): Promise<Leaderboard> {
    const id = this.currentId++;
    const entry: Leaderboard = {
      id,
      ...leaderboardEntry,
      updatedAt: new Date()
    };
    
    this.leaderboardData.set(id, entry);
    return entry;
  }
}

export const storage = new MemStorage();
