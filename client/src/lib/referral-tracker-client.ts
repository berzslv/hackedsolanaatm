import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { BN } from 'bn.js';

// Interface for referral stats
interface ReferralStats {
  referralCode: string;
  totalReferred: number;
  totalEarnings: number;
  claimableRewards: number;
  referredCount: number;
}

/**
 * Client class to interact with the Referral Tracker program
 */
export class ReferralTrackerClient {
  private connection: Connection;
  private userWallet: PublicKey;
  private programId: PublicKey;
  private tokenMint: PublicKey;

  /**
   * Constructor for ReferralTrackerClient
   * @param connection Solana connection
   * @param userWallet User's wallet public key
   * @param tokenMint Token mint public key
   */
  constructor(connection: Connection, userWallet: PublicKey, tokenMint: string) {
    this.connection = connection;
    this.userWallet = userWallet;
    this.tokenMint = new PublicKey(tokenMint);
    
    // Program ID from Anchor.toml
    this.programId = new PublicKey('Gg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnH');
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    try {
      // Fetch necessary program accounts
      // (In a real implementation, this would validate that the program is deployed)
      console.log('Initializing Referral Tracker client');
    } catch (error) {
      console.error('Failed to initialize Referral Tracker client:', error);
      throw error;
    }
  }

  /**
   * Register a referral code for the user
   * @param referralCode The referral code to register
   * @returns Transaction for signing
   */
  async createRegisterReferralCodeTransaction(referralCode: string): Promise<Transaction> {
    try {
      // Validate input
      if (!referralCode || referralCode.length > 10) {
        throw new Error('Invalid referral code. It should be 1-10 characters long.');
      }

      // Create transaction (stub)
      // In a full implementation, this would create the actual transaction
      const transaction = new Transaction();
      
      // Add instruction to register referral code
      // transaction.add(instructionToRegisterCode);
      
      console.log(`Created transaction to register referral code: ${referralCode}`);
      return transaction;
    } catch (error) {
      console.error('Failed to create register referral code transaction:', error);
      throw error;
    }
  }

  /**
   * Create a transaction to record a referral
   * @param amount The amount of tokens being purchased
   * @param referralCode The referral code used
   * @returns Transaction for signing
   */
  async createRecordReferralTransaction(
    amount: number,
    referralCode: string
  ): Promise<Transaction> {
    try {
      // Validate
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      
      if (!referralCode) {
        throw new Error('Referral code is required');
      }

      // Create transaction (stub)
      const transaction = new Transaction();
      
      // Add instruction to record referral
      // transaction.add(instructionToRecordReferral);
      
      console.log(`Created transaction to record referral with code ${referralCode} for amount ${amount}`);
      return transaction;
    } catch (error) {
      console.error('Failed to create record referral transaction:', error);
      throw error;
    }
  }

  /**
   * Create a transaction to claim referral rewards
   * @param amount The amount of rewards to claim
   * @returns Transaction for signing
   */
  async createClaimRewardsTransaction(amount: number): Promise<Transaction> {
    try {
      // Validate
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }

      // Create transaction (stub)
      const transaction = new Transaction();
      
      // Add instruction to claim rewards
      // transaction.add(instructionToClaimRewards);
      
      console.log(`Created transaction to claim ${amount} tokens in rewards`);
      return transaction;
    } catch (error) {
      console.error('Failed to create claim rewards transaction:', error);
      throw error;
    }
  }

  /**
   * Look up a referral code to find the associated wallet
   * @param referralCode The referral code to look up
   * @returns Promise with the wallet address
   */
  async lookupReferralCode(referralCode: string): Promise<string | null> {
    try {
      // Validate
      if (!referralCode) {
        throw new Error('Referral code is required');
      }

      // In a real implementation, this would query the blockchain
      console.log(`Looking up referral code: ${referralCode}`);
      
      // Return dummy data for now
      return null; // Would return the wallet address in a real implementation
    } catch (error) {
      console.error('Failed to lookup referral code:', error);
      return null;
    }
  }

  /**
   * Get referral stats for the current user
   * @returns Promise with the referral stats
   */
  async getReferralStats(): Promise<ReferralStats | null> {
    try {
      console.log(`Fetching referral stats for: ${this.userWallet.toString()}`);
      
      // Fetch from the frontend server for now
      const response = await fetch(`/api/referrals/${this.userWallet.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch referral stats');
      }
      
      const data = await response.json();
      
      return {
        referralCode: data.referralCode || '',
        totalReferred: data.totalReferrals || 0,
        totalEarnings: data.totalEarnings || 0,
        claimableRewards: data.claimable || 0,
        referredCount: data.referredCount || 0,
      };
    } catch (error) {
      console.error('Failed to get referral stats:', error);
      return null;
    }
  }

  /**
   * Validate if a referral code exists
   * @param referralCode The referral code to validate
   * @returns Promise<boolean> indicating if the code is valid
   */
  async validateReferralCode(referralCode: string): Promise<boolean> {
    try {
      // Validate
      if (!referralCode) {
        return false;
      }

      // Check with the backend for now
      const response = await fetch(`/api/validate-referral/${referralCode}`);
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Failed to validate referral code:', error);
      return false;
    }
  }
}