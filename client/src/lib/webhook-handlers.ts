
import { PublicKey } from '@solana/web3.js';

// Constants
const PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';
const VAULT_ADDRESS = 'DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8';

export interface StakeEvent {
  signature: string;
  timestamp: number;
  userAddress: string;
  amount: number;
}

export interface UnstakeEvent {
  signature: string;
  timestamp: number;
  userAddress: string;
  amount: number;
  rewards?: number;
}

export interface BalanceUpdate {
  accountAddress: string;
  balanceChange: number;
  timestamp: number;
}

// In-memory cache for quick balance lookups
const stakingBalances = new Map<string, number>();

export function handleStakeEvent(event: any): StakeEvent {
  // Parse stake instruction from Helius enhanced transaction data
  const stakeInstruction = event.instructions.find(
    (ix: any) => ix.programId === PROGRAM_ID && ix.name === 'stake'
  );

  if (!stakeInstruction) throw new Error('Invalid stake event');

  return {
    signature: event.signature,
    timestamp: event.timestamp,
    userAddress: stakeInstruction.accounts.user,
    amount: stakeInstruction.accounts.amount
  };
}

export function handleUnstakeEvent(event: any): UnstakeEvent {
  // Parse unstake instruction
  const unstakeInstruction = event.instructions.find(
    (ix: any) => ix.programId === PROGRAM_ID && ix.name === 'unstake'
  );

  if (!unstakeInstruction) throw new Error('Invalid unstake event');

  return {
    signature: event.signature,
    timestamp: event.timestamp,
    userAddress: unstakeInstruction.accounts.user,
    amount: unstakeInstruction.accounts.amount,
    rewards: unstakeInstruction.accounts.rewards
  };
}

export function handleBalanceUpdate(update: any): BalanceUpdate {
  // Update in-memory cache
  stakingBalances.set(update.accountAddress, update.currentBalance);

  return {
    accountAddress: update.accountAddress,
    balanceChange: update.balanceChange,
    timestamp: update.timestamp
  };
}

export function getStakedBalance(userAddress: string): number {
  return stakingBalances.get(userAddress) || 0;
}
