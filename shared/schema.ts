import { pgTable, text, serial, integer, boolean, real, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for wallet addresses and referral codes
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Staking table for tracking staked tokens
export const staking = pgTable("staking", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().references(() => users.walletAddress),
  amountStaked: real("amount_staked").notNull(),
  pendingRewards: real("pending_rewards").notNull().default(0),
  lastCompoundAt: timestamp("last_compound_at").defaultNow().notNull(),
  stakedAt: timestamp("staked_at").defaultNow().notNull(),
});

// Referrals table for tracking referral transactions
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerAddress: text("referrer_address").notNull().references(() => users.walletAddress),
  buyerAddress: text("buyer_address").notNull().references(() => users.walletAddress),
  transactionHash: text("transaction_hash").notNull().unique(),
  amount: real("amount").notNull(),
  reward: real("reward").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leaderboard table for tracking top performers
export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().references(() => users.walletAddress),
  type: text("type").notNull(), // 'referrer' or 'staker'
  period: text("period").notNull(), // 'weekly' or 'monthly'
  rank: integer("rank").notNull(),
  amount: real("amount").notNull(),
  additionalInfo: text("additional_info"), // JSON string with additional metrics
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rewards table for tracking airdrops and bonuses
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().references(() => users.walletAddress),
  type: text("type").notNull(), // 'airdrop', 'apy_bonus', etc.
  amount: real("amount").notNull(),
  reason: text("reason").notNull(),
  transactionHash: text("transaction_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Token statistics table for global metrics
export const tokenStats = pgTable("token_stats", {
  id: serial("id").primaryKey(),
  totalSupply: real("total_supply").notNull(),
  circulatingSupply: real("circulating_supply").notNull(),
  totalStaked: real("total_staked").notNull(),
  stakersCount: integer("stakers_count").notNull(),
  currentPrice: real("current_price").notNull(),
  currentAPY: real("current_apy").notNull(),
  rewardPool: real("reward_pool").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertStakingSchema = createInsertSchema(staking).omit({ id: true, pendingRewards: true, lastCompoundAt: true, stakedAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({ id: true, updatedAt: true });
export const insertRewardSchema = createInsertSchema(rewards).omit({ id: true, createdAt: true });
export const insertTokenStatsSchema = createInsertSchema(tokenStats).omit({ id: true, updatedAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStaking = z.infer<typeof insertStakingSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type InsertTokenStats = z.infer<typeof insertTokenStatsSchema>;

export type User = typeof users.$inferSelect;
export type Staking = typeof staking.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type Leaderboard = typeof leaderboard.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
export type TokenStats = typeof tokenStats.$inferSelect;
