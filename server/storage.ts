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
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";

// Interfaces for referral statistics
interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  totalEarnings: number;
  weeklyRank: number | null;
  referredCount: number;
  totalReferred: number;
  claimableRewards: number;
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
  getAllUsers(): Promise<User[]>;
  
  // Token stats methods
  getTokenStats(): Promise<TokenStats>;
  updateTokenStats(stats: Partial<InsertTokenStats>): Promise<TokenStats>;
  
  // Referral methods
  getReferralStats(walletAddress: string): Promise<ReferralStats>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  validateReferralCode(code: string): Promise<boolean>;
  getReferrerAddressByCode(code: string): Promise<string | null>;
  updateUserReferralCode(walletAddress: string, referralCode: string): Promise<void>;
  
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
  private leaderboardData: Map<string, Leaderboard>;
  private rewardsData: Map<number, Reward>;
  private tokenStatsData: TokenStats | null;
  
  currentId: number;

  constructor() {
    this.users = new Map<number, User>();
    this.stakingData = new Map<string, Staking>();
    this.referralsData = new Map<number, Referral>();
    this.leaderboardData = new Map<string, Leaderboard>();
    this.rewardsData = new Map<number, Reward>();
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
    // This method is not actively used in our application,
    // as our user model doesn't have a username field, but
    // it's kept for compatibility with the IStorage interface
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      id, 
      walletAddress: insertUser.walletAddress,
      referralCode: insertUser.referralCode,
      referredBy: insertUser.referredBy ?? null,
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
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
    
    // Find referral code for this user
    const user = Array.from(this.users.values()).find(u => u.walletAddress === walletAddress);
    const referralCode = user?.referralCode || null;
    
    // Calculate total volume referred
    const totalReferred = userReferrals.reduce((sum, ref) => sum + ref.amount, 0);
    
    // Calculate claimable rewards (assuming 10% is held for claiming)
    const claimableRewards = Math.floor(totalEarnings * 0.1);
    
    return {
      referralCode,
      totalReferrals: userReferrals.length,
      totalEarnings,
      weeklyRank,
      referredCount: userReferrals.length, // Number of unique referrals
      totalReferred, // Total volume referred in SOL
      claimableRewards,
      recentActivity
    };
  }

  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const id = this.currentId++;
    const referral: Referral = {
      id,
      referrerAddress: referralData.referrerAddress,
      buyerAddress: referralData.buyerAddress, 
      transactionHash: referralData.transactionHash,
      amount: referralData.amount,
      reward: referralData.reward,
      createdAt: new Date()
    };
    
    this.referralsData.set(id, referral);
    
    // Update token stats - increase reward pool
    await this.updateTokenStats({
      rewardPool: (this.tokenStatsData?.rewardPool || 0) + (referral.amount * 0.02) // 2% to reward pool
    });
    
    return referral;
  }
  
  async validateReferralCode(code: string): Promise<boolean> {
    // For development/testing, accept specific codes
    if (code === "TEST" || code === "AKIPB0" || code === "123456") {
      console.log(`Referral code "${code}" accepted for testing`);
      return true;
    }
    
    // Find a user with this referral code
    const userWithCode = Array.from(this.users.values()).find(
      (user) => user.referralCode === code
    );
    
    console.log(`Validating referral code "${code}": ${!!userWithCode}`);
    return !!userWithCode; // Return true if found, false if not
  }
  
  async getReferrerAddressByCode(code: string): Promise<string | null> {
    // For development/testing, return a predefined address for test codes
    if (code === "TEST") return "test-referrer-address";
    if (code === "AKIPB0") return "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX";
    if (code === "123456") return "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX";
    
    // Find a user with this referral code
    const userWithCode = Array.from(this.users.values()).find(
      (user) => user.referralCode === code
    );
    
    if (!userWithCode || !userWithCode.walletAddress) {
      console.log(`No referrer found for code "${code}"`);
      return null;
    }
    
    console.log(`Found referrer for code "${code}": ${userWithCode.walletAddress}`);
    return userWithCode.walletAddress;
  }
  
  async updateUserReferralCode(walletAddress: string, referralCode: string): Promise<void> {
    // Find the user by wallet address
    const userToUpdate = Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress
    );
    
    if (userToUpdate) {
      // Update the referral code
      userToUpdate.referralCode = referralCode;
      this.users.set(userToUpdate.id, userToUpdate);
      console.log(`Updated referral code for ${walletAddress} to ${referralCode}`);
    } else {
      console.log(`User with wallet address ${walletAddress} not found`);
    }
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
      this.stakingData.set(String(existingStake.id), staking);
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
      
      this.stakingData.set(String(id), staking);
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
      this.stakingData.delete(String(stakingEntry.id));
    } else {
      this.stakingData.set(String(stakingEntry.id), updatedStaking);
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
      walletAddress: leaderboardEntry.walletAddress,
      type: leaderboardEntry.type,
      period: leaderboardEntry.period,
      amount: leaderboardEntry.amount,
      rank: leaderboardEntry.rank,
      additionalInfo: leaderboardEntry.additionalInfo ?? null,
      updatedAt: new Date()
    };
    
    this.leaderboardData.set(String(id), entry);
    return entry;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Note: This method is included for interface compatibility but not actively used
    // Our user model doesn't have a username field
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure referredBy is null if undefined
    const userToCreate = {
      ...insertUser,
      referredBy: insertUser.referredBy ?? null
    };
    
    const [user] = await db.insert(users).values(userToCreate).returning();
    return user;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getTokenStats(): Promise<TokenStats> {
    // Get the latest token stats or create default if none exists
    const [stats] = await db.select().from(tokenStats).orderBy(desc(tokenStats.id)).limit(1);
    
    if (!stats) {
      // Create default token stats
      return this.initializeTokenStats();
    }
    
    return stats;
  }
  
  private async initializeTokenStats(): Promise<TokenStats> {
    const defaultStats = {
      totalSupply: 100000000, // 100 million tokens
      circulatingSupply: 25000000, // 25% in circulation
      totalStaked: 5243129, // Amount currently staked
      stakersCount: 1254, // Number of stakers
      currentPrice: 0.0025, // Current token price in USD
      currentAPY: 125.4, // Current APY percentage
      rewardPool: 128914, // Current reward pool size
    };
    
    const [stats] = await db.insert(tokenStats).values(defaultStats).returning();
    return stats;
  }

  async updateTokenStats(stats: Partial<InsertTokenStats>): Promise<TokenStats> {
    const currentStats = await this.getTokenStats();
    
    // Merge current stats with updates
    const updatedStats = {
      ...stats,
      totalSupply: stats.totalSupply ?? currentStats.totalSupply,
      circulatingSupply: stats.circulatingSupply ?? currentStats.circulatingSupply,
      totalStaked: stats.totalStaked ?? currentStats.totalStaked,
      stakersCount: stats.stakersCount ?? currentStats.stakersCount,
      currentPrice: stats.currentPrice ?? currentStats.currentPrice,
      currentAPY: stats.currentAPY ?? currentStats.currentAPY,
      rewardPool: stats.rewardPool ?? currentStats.rewardPool,
    };
    
    const [newStats] = await db.insert(tokenStats).values(updatedStats).returning();
    return newStats;
  }

  async getReferralStats(walletAddress: string): Promise<ReferralStats> {
    // Find all referrals where this user is the referrer
    const userReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerAddress, walletAddress))
      .orderBy(desc(referrals.createdAt));
    
    // Calculate total earnings
    const totalEarnings = userReferrals.reduce((sum, ref) => sum + ref.reward, 0);
    
    // Get recent activity - top 5 most recent
    const recentActivity = userReferrals
      .slice(0, 5)
      .map(ref => ({
        date: ref.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
        transaction: ref.transactionHash,
        amount: ref.amount,
        reward: ref.reward
      }));
    
    // Find weekly rank if exists
    const [leaderboardEntry] = await db
      .select()
      .from(leaderboard)
      .where(and(
        eq(leaderboard.walletAddress, walletAddress),
        eq(leaderboard.type, 'referrer'),
        eq(leaderboard.period, 'weekly')
      ));
    
    const weeklyRank = leaderboardEntry ? leaderboardEntry.rank : null;
    
    // Find referral code for this user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));
    
    const referralCode = user?.referralCode || null;
    
    // Calculate total volume referred
    const totalReferred = userReferrals.reduce((sum, ref) => sum + ref.amount, 0);
    
    // Calculate claimable rewards (assuming 10% is held for claiming)
    const claimableRewards = Math.floor(totalEarnings * 0.1);
    
    return {
      referralCode,
      totalReferrals: userReferrals.length,
      totalEarnings,
      weeklyRank,
      referredCount: userReferrals.length, // Number of unique referrals
      totalReferred, // Total volume referred in SOL
      claimableRewards,
      recentActivity
    };
  }

  async createReferral(referralData: InsertReferral): Promise<Referral> {
    // Insert the referral
    const [referral] = await db.insert(referrals).values(referralData).returning();
    
    // Update token stats - increase reward pool
    const currentStats = await this.getTokenStats();
    await this.updateTokenStats({
      rewardPool: currentStats.rewardPool + (referralData.amount * 0.02) // 2% to reward pool
    });
    
    return referral;
  }
  
  async validateReferralCode(code: string): Promise<boolean> {
    // For development/testing, accept specific codes
    if (code === "TEST" || code === "AKIPB0" || code === "123456") {
      console.log(`Referral code "${code}" accepted for testing`);
      return true;
    }
    
    // Find a user with this referral code
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, code));
    
    console.log(`Validating referral code "${code}": ${!!user}`);
    return !!user; // Return true if user exists with this code, false otherwise
  }
  
  async getReferrerAddressByCode(code: string): Promise<string | null> {
    // For development/testing, return a predefined address for test codes
    if (code === "TEST") return "test-referrer-address";
    if (code === "AKIPB0") return "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX";
    if (code === "123456") return "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX";
    
    // Find a user with this referral code
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, code));
    
    if (!user || !user.walletAddress) {
      console.log(`No referrer found for code "${code}"`);
      return null;
    }
    
    console.log(`Found referrer for code "${code}": ${user.walletAddress}`);
    return user.walletAddress;
  }

  async updateUserReferralCode(walletAddress: string, referralCode: string): Promise<void> {
    // Find the user by wallet address
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress));
    
    if (user) {
      // Update the referral code
      await db
        .update(users)
        .set({ referralCode })
        .where(eq(users.id, user.id));
      
      console.log(`Updated referral code for ${walletAddress} to ${referralCode}`);
    } else {
      console.log(`User with wallet address ${walletAddress} not found`);
    }
  }

  async getStakingInfo(walletAddress: string): Promise<StakingInfo> {
    // Find staking entry for this wallet
    const [userStaking] = await db
      .select()
      .from(staking)
      .where(eq(staking.walletAddress, walletAddress));
    
    // Get current APY from token stats
    const tokenStatsData = await this.getTokenStats();
    
    if (!userStaking) {
      // Return default/empty staking info
      return {
        amountStaked: 0,
        pendingRewards: 0,
        stakedAt: new Date(),
        lastCompoundAt: new Date(),
        estimatedAPY: tokenStatsData.currentAPY,
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
      estimatedAPY: tokenStatsData.currentAPY,
      timeUntilUnlock
    };
  }

  async stakeTokens(stakingData: InsertStaking): Promise<Staking> {
    // Check if user already has staked tokens
    const [existingStake] = await db
      .select()
      .from(staking)
      .where(eq(staking.walletAddress, stakingData.walletAddress));
    
    let result: Staking;
    
    if (existingStake) {
      // Update existing stake
      const [updated] = await db
        .update(staking)
        .set({
          amountStaked: existingStake.amountStaked + stakingData.amountStaked,
          lastCompoundAt: new Date()
        })
        .where(eq(staking.id, existingStake.id))
        .returning();
      
      result = updated;
    } else {
      // Create new stake
      const [newStake] = await db
        .insert(staking)
        .values({
          ...stakingData,
          pendingRewards: 0,
          lastCompoundAt: new Date(),
          stakedAt: new Date()
        })
        .returning();
      
      result = newStake;
    }
    
    // Update token stats
    const tokenStatsData = await this.getTokenStats();
    
    // Count stakers
    const [stakersCountResult] = await db
      .select({ count: count() })
      .from(staking);
    
    const stakersCount = Number(stakersCountResult?.count || 0);
    
    await this.updateTokenStats({
      totalStaked: tokenStatsData.totalStaked + stakingData.amountStaked,
      stakersCount
    });
    
    return result;
  }

  async unstakeTokens(walletAddress: string, amount: number): Promise<UnstakeResult> {
    // Find staking entry
    const [stakingEntry] = await db
      .select()
      .from(staking)
      .where(eq(staking.walletAddress, walletAddress));
    
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
    const newAmountStaked = stakingEntry.amountStaked - amount;
    
    if (newAmountStaked <= 0) {
      // Delete the staking entry
      await db
        .delete(staking)
        .where(eq(staking.id, stakingEntry.id));
    } else {
      // Update the staking entry
      await db
        .update(staking)
        .set({ amountStaked: newAmountStaked })
        .where(eq(staking.id, stakingEntry.id));
    }
    
    // Update token stats
    const tokenStatsData = await this.getTokenStats();
    
    // Count stakers
    const [stakersCountResult] = await db
      .select({ count: count() })
      .from(staking);
    
    const stakersCount = Number(stakersCountResult?.count || 0);
    
    await this.updateTokenStats({
      totalStaked: tokenStatsData.totalStaked - amount,
      stakersCount,
      circulatingSupply: tokenStatsData.circulatingSupply - burnAmount
    });
    
    return {
      amountUnstaked: amount,
      fee,
      netAmount,
      burnAmount,
      marketingAmount
    };
  }

  async getLeaderboard(type: string, period: string): Promise<Leaderboard[]> {
    return db
      .select()
      .from(leaderboard)
      .where(and(
        eq(leaderboard.type, type),
        eq(leaderboard.period, period)
      ))
      .orderBy(leaderboard.rank);
  }

  async updateLeaderboard(leaderboardEntry: InsertLeaderboard): Promise<Leaderboard> {
    // Ensure additionalInfo is null if undefined
    const entryToUpsert = {
      ...leaderboardEntry,
      additionalInfo: leaderboardEntry.additionalInfo ?? null
    };
    
    // Check if entry already exists for this wallet/type/period
    const [existingEntry] = await db
      .select()
      .from(leaderboard)
      .where(and(
        eq(leaderboard.walletAddress, entryToUpsert.walletAddress),
        eq(leaderboard.type, entryToUpsert.type),
        eq(leaderboard.period, entryToUpsert.period)
      ));
    
    if (existingEntry) {
      // Update existing entry
      const [updated] = await db
        .update(leaderboard)
        .set({
          rank: entryToUpsert.rank,
          amount: entryToUpsert.amount,
          additionalInfo: entryToUpsert.additionalInfo,
          updatedAt: new Date()
        })
        .where(eq(leaderboard.id, existingEntry.id))
        .returning();
      
      return updated;
    } else {
      // Create new entry
      const [newEntry] = await db
        .insert(leaderboard)
        .values({
          ...entryToUpsert,
          updatedAt: new Date()
        })
        .returning();
      
      return newEntry;
    }
  }
}

// Use DatabaseStorage for persistence
// Now using MemStorage instead of DatabaseStorage since all data is stored on-chain
export const storage = new MemStorage();
