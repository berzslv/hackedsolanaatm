/*
 * This file provides a client for interacting with the Railway.com webhook service
 * that tracks Solana token transactions without requiring Anchor or BN.js
 */

import { apiRequest } from './queryClient';

// You would replace this with your actual Railway.com service URL
const WEBHOOK_SERVICE_URL = 'https://your-railway-app-url.railway.app';

export interface TokenTransfer {
  signature: string;
  fromWallet: string;
  toWallet: string;
  amount: number;
  timestamp: string;
  blockTime: number | null;
}

export interface StakingEvent {
  signature: string;
  type: 'stake' | 'unstake' | 'claim' | 'unknown';
  walletAddress: string;
  amount: number;
  timestamp: string;
  blockTime: number | null;
}

export interface TokenTransfersResponse {
  transfers: TokenTransfer[];
}

export interface StakingDataResponse {
  stakingData: Record<string, any>;
  events: StakingEvent[];
}

export interface WalletStakingDataResponse {
  walletAddress: string;
  events: StakingEvent[];
}

/**
 * Fetches all token transfers from the webhook service
 */
export async function fetchTokenTransfers(): Promise<TokenTransfersResponse> {
  try {
    const response = await fetch(`${WEBHOOK_SERVICE_URL}/api/token-transfers`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    // Return empty data structure if there's an error
    return { transfers: [] };
  }
}

/**
 * Fetches all staking data from the webhook service
 */
export async function fetchStakingData(): Promise<StakingDataResponse> {
  try {
    const response = await fetch(`${WEBHOOK_SERVICE_URL}/api/staking-data`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching staking data:', error);
    // Return empty data structure if there's an error
    return { stakingData: {}, events: [] };
  }
}

/**
 * Fetches staking data for a specific wallet
 */
export async function fetchWalletStakingData(walletAddress: string): Promise<WalletStakingDataResponse> {
  try {
    const response = await fetch(`${WEBHOOK_SERVICE_URL}/api/staking-data/${walletAddress}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching staking data for wallet ${walletAddress}:`, error);
    // Return empty data structure if there's an error
    return { walletAddress, events: [] };
  }
}

/**
 * Combines all data from the webhook service to provide comprehensive transaction analysis
 * This can be used to display user's transaction history without complex on-chain queries
 */
export async function getCompleteTransactionHistory(walletAddress: string) {
  try {
    const [tokenTransfers, walletStakingData] = await Promise.all([
      fetchTokenTransfers(),
      fetchWalletStakingData(walletAddress),
    ]);

    // Filter token transfers for this wallet
    const relevantTransfers = tokenTransfers.transfers.filter(
      transfer => transfer.fromWallet === walletAddress || transfer.toWallet === walletAddress
    );

    // Combine all transaction data
    const allTransactions = [
      ...relevantTransfers.map(transfer => ({
        type: 'transfer',
        signature: transfer.signature,
        timestamp: transfer.timestamp,
        data: transfer
      })),
      ...walletStakingData.events.map(event => ({
        type: 'staking',
        signature: event.signature,
        timestamp: event.timestamp,
        data: event
      }))
    ];

    // Sort by timestamp, newest first
    allTransactions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return allTransactions;
  } catch (error) {
    console.error(`Error getting complete transaction history for ${walletAddress}:`, error);
    return [];
  }
}