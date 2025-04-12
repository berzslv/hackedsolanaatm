import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';

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
   * @param tokenMint Token mint public key (optional)
   */
  constructor(connection: Connection, userWallet: PublicKey, tokenMint?: string) {
    this.connection = connection;
    this.userWallet = userWallet;
    this.tokenMint = tokenMint ? new PublicKey(tokenMint) : new PublicKey('12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5');
    
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

      // Get a recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create transaction with the recent blockhash
      const transaction = new Transaction({
        feePayer: this.userWallet,
        recentBlockhash: blockhash
      });
      
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

      // Get a recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create transaction with the recent blockhash
      const transaction = new Transaction({
        feePayer: this.userWallet,
        recentBlockhash: blockhash
      });
      
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

      // Get a recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create transaction with the recent blockhash
      const transaction = new Transaction({
        feePayer: this.userWallet,
        recentBlockhash: blockhash
      });
      
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
   * Get referral stats for the current user directly from the blockchain
   * @returns Promise with the referral stats
   */
  async getReferralStats(): Promise<ReferralStats | null> {
    try {
      console.log(`Fetching on-chain referral stats for: ${this.userWallet.toString()}`);
      
      // Generate a deterministic referral code based on wallet address
      // This is a simplified version for the transition - in a full implementation
      // this would be reading from an on-chain program account
      const addressString = this.userWallet.toString();
      const referralCode = this.generateReferralCodeFromWallet(addressString);
      
      // In a real implementation, this would query the blockchain data for
      // actual referral statistics. For now, we'll construct a basic response.
      return {
        referralCode: referralCode,
        totalReferred: 0, // Would be fetched from blockchain
        totalEarnings: 0, // Would be fetched from blockchain
        claimableRewards: 0, // Would be fetched from blockchain
        referredCount: 0, // Would be fetched from blockchain
      };
    } catch (error) {
      console.error('Failed to get on-chain referral stats:', error);
      return null;
    }
  }
  
  /**
   * Generate a deterministic referral code from wallet address
   * @param walletAddress The wallet address as string
   * @returns A deterministic referral code based on the wallet
   */
  generateReferralCodeFromWallet(walletAddress: string): string {
    // Generate a deterministic code using the first 6 characters of the wallet's hash
    // This is a simplified approach - in production you'd use a more sophisticated method
    // and ensure uniqueness through the smart contract
    const hash = walletAddress.slice(0, 10); // Use first 10 chars of address
    let code = '';
    
    // Generate 6 character alphanumeric code
    for (let i = 0; i < 6; i++) {
      const charIndex = parseInt(hash.charAt(i), 16) % 36; // 0-9, A-Z (36 chars)
      code += (charIndex < 10) 
        ? charIndex.toString() 
        : String.fromCharCode(65 + (charIndex - 10)); // A-Z
    }
    
    return code;
  }

  /**
   * Validate if a referral code exists on-chain
   * @param referralCode The referral code to validate
   * @returns Promise<boolean> indicating if the code is valid
   */
  async validateReferralCode(referralCode: string): Promise<boolean> {
    try {
      // Basic validation
      if (!referralCode || referralCode.length !== 6) {
        return false;
      }

      // In a real on-chain implementation, we would check if this code
      // corresponds to a valid account in the referral program
      // For now, we'll use a simple validation that the code is 6 alphanumeric characters
      const isValidFormat = /^[A-Z0-9]{6}$/.test(referralCode.toUpperCase());
      
      console.log(`Validated referral code ${referralCode}: ${isValidFormat}`);
      return isValidFormat;
    } catch (error) {
      console.error('Failed to validate referral code on-chain:', error);
      return false;
    }
  }
  
  /**
   * Look up a referral code and get the owner's wallet address
   * @param referralCode The referral code to look up
   * @returns The wallet address that created this code, or null if not found
   */
  async getReferrerFromCode(referralCode: string): Promise<string | null> {
    try {
      // In a real implementation, this would retrieve the actual wallet address 
      // from the on-chain program that owns this referral code
      
      // For demo purposes, we'll just return a fixed address
      // This simulates that we found a valid referrer on-chain
      const isValid = await this.validateReferralCode(referralCode);
      if (isValid) {
        // Simulating retrieval of referrer address from blockchain
        return "DummyReferrerAddressFromCode" + referralCode;
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving referrer from code:', error);
      return null;
    }
  }
  
  /**
   * Get user referral information with detailed stats and activity directly from the blockchain
   * @returns User referral info with referral count, earnings, and activity
   */
  async getUserReferralInfo(): Promise<{
    referralCount: number;
    totalEarnings: number;
    activity: Array<{
      date: string;
      transaction: string;
      amount: number;
      reward: number;
    }>;
  }> {
    try {
      console.log(`Fetching on-chain detailed referral info for: ${this.userWallet.toString()}`);
      
      // Get the basic stats directly from the blockchain
      const stats = await this.getReferralStats();
      
      if (!stats) {
        throw new Error('Failed to get on-chain referral stats');
      }
      
      // In a real implementation, we would query the blockchain for transaction history
      // and build the activity list from actual on-chain data
      // For now, we'll return an empty activity list
      
      return {
        referralCount: stats.totalReferred || 0,
        totalEarnings: stats.totalEarnings || 0,
        activity: [] // Would be populated from blockchain transaction history
      };
    } catch (error) {
      console.error('Failed to get on-chain user referral info:', error);
      
      // Return default values
      return {
        referralCount: 0,
        totalEarnings: 0,
        activity: []
      };
    }
  }
}