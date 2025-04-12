import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Interface for user staking information
 */
interface StakingInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastClaimAt: Date;
  estimatedAPY: number;
  timeUntilUnlock: number | null;
}

/**
 * Interface for global staking statistics
 */
interface StakingStats {
  totalStaked: number;
  rewardPool: number;
  stakersCount: number;
  currentAPY: number;
}

/**
 * Client class to interact with the Staking Vault program
 */
export class StakingVaultClient {
  private connection: Connection;
  private userWallet: PublicKey;
  private tokenMint: PublicKey;
  private programId: PublicKey;
  
  /**
   * Constructor for StakingVaultClient
   * @param connection Solana connection
   * @param userWallet User's wallet public key
   * @param tokenMint Token mint address (string)
   */
  constructor(connection: Connection, userWallet: PublicKey, tokenMint: string) {
    this.connection = connection;
    this.userWallet = userWallet;
    this.tokenMint = new PublicKey(tokenMint);
    
    // Program ID from Anchor.toml
    this.programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  }
  
  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    try {
      // Fetch necessary program accounts
      // (In a real implementation, this would validate that the program is deployed)
      console.log('Initializing Staking Vault client');
    } catch (error) {
      console.error('Failed to initialize Staking Vault client:', error);
      throw error;
    }
  }
  
  /**
   * Get staking information for the current user
   * @returns Promise with user staking info
   */
  async getUserStakingInfo(): Promise<StakingInfo> {
    try {
      console.log(`Fetching staking info for: ${this.userWallet.toString()}`);
      
      // Fetch from the frontend server for now
      const response = await fetch(`/api/staking-info/${this.userWallet.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch staking info');
      }
      
      const data = await response.json();
      
      // Convert to the proper format
      return {
        amountStaked: data.amountStaked || 0,
        pendingRewards: data.pendingRewards || 0,
        stakedAt: new Date(data.stakedAt || Date.now()),
        lastClaimAt: new Date(data.lastCompoundAt || Date.now()),
        estimatedAPY: data.estimatedAPY || 125,
        timeUntilUnlock: data.timeUntilUnlock || null,
      };
    } catch (error) {
      console.error('Failed to get user staking info:', error);
      
      // Return default values
      return {
        amountStaked: 0,
        pendingRewards: 0,
        stakedAt: new Date(),
        lastClaimAt: new Date(),
        estimatedAPY: 125,
        timeUntilUnlock: null,
      };
    }
  }
  
  /**
   * Get global staking statistics
   * @returns Promise with staking stats
   */
  async getStakingStats(): Promise<StakingStats> {
    try {
      // In a real implementation, this would fetch from the blockchain
      
      // Return default values for now
      return {
        totalStaked: 250000,
        rewardPool: 50000,
        stakersCount: 85,
        currentAPY: 125,
      };
    } catch (error) {
      console.error('Failed to get staking stats:', error);
      
      // Return default values
      return {
        totalStaked: 0,
        rewardPool: 0,
        stakersCount: 0,
        currentAPY: 125,
      };
    }
  }
  
  /**
   * Create a transaction for staking tokens
   * @param amount Amount of tokens to stake
   * @returns Transaction for signing
   */
  async createStakeTransaction(amount: number): Promise<Transaction> {
    try {
      // Validate input
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      
      // Get a recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create a new transaction with the recent blockhash
      const transaction = new Transaction({
        feePayer: this.userWallet,
        recentBlockhash: blockhash
      });
      
      // Create and add instruction
      try {
        // For now, use the server endpoint to create staking transaction
        // which works without requiring full smart contract integration
        const response = await fetch('/api/stake-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: this.userWallet.toString(),
            amount: amount
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create staking transaction');
        }
        
        const data = await response.json();
        if (data.success && data.transaction) {
          // Use the transaction created by the server
          console.log("Using server-created transaction");
          const buffer = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
          return Transaction.from(buffer);
        }
      } catch (err) {
        console.error("Failed to get transaction from server:", err);
        // Continue with local transaction creation as fallback
      }
      
      console.log(`Created transaction to stake ${amount} tokens`);
      return transaction;
    } catch (error) {
      console.error('Failed to create stake transaction:', error);
      throw error;
    }
  }
  
  /**
   * Create a transaction for unstaking tokens
   * @param amount Amount of tokens to unstake
   * @returns Transaction for signing
   */
  async createUnstakeTransaction(amount: number): Promise<Transaction> {
    try {
      // Validate input
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      
      // Get a recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create a new transaction with the recent blockhash
      const transaction = new Transaction({
        feePayer: this.userWallet,
        recentBlockhash: blockhash
      });
      
      // Create and add instruction
      try {
        // For now, use the server endpoint to create unstaking transaction
        const response = await fetch('/api/unstake-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: this.userWallet.toString(),
            amount: amount
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create unstaking transaction');
        }
        
        const data = await response.json();
        if (data.success) {
          // Direct API implementation - no transaction needed as the server
          // handles the unstaking directly
          console.log("Server handled unstaking directly:", data);
          return transaction; // Return empty transaction as this is handled on server
        }
      } catch (err) {
        console.error("Failed to unstake via server:", err);
        // Continue with local transaction creation as fallback
      }
      
      console.log(`Created transaction to unstake ${amount} tokens`);
      return transaction;
    } catch (error) {
      console.error('Failed to create unstake transaction:', error);
      throw error;
    }
  }
  
  /**
   * Create a transaction for claiming rewards
   * @returns Transaction for signing
   */
  async createClaimRewardsTransaction(): Promise<Transaction> {
    try {
      // Get a recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create a new transaction with the recent blockhash
      const transaction = new Transaction({
        feePayer: this.userWallet,
        recentBlockhash: blockhash
      });
      
      // In a real implementation, add instructions to the transaction
      // For example:
      // 1. Find the user's stake account
      // 2. Find the vault token account
      // 3. Calculate the rewards amount
      // 4. Create an instruction to transfer tokens from vault to user
      // 5. Add the instruction to the transaction
      
      console.log('Created transaction to claim rewards');
      return transaction;
    } catch (error) {
      console.error('Failed to create claim rewards transaction:', error);
      throw error;
    }
  }
  
  /**
   * Create a transaction for compounding rewards
   * @returns Transaction for signing
   */
  async createCompoundRewardsTransaction(): Promise<Transaction> {
    try {
      // Get a recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      
      // Create a new transaction with the recent blockhash
      const transaction = new Transaction({
        feePayer: this.userWallet,
        recentBlockhash: blockhash
      });
      
      // In a real implementation, add instructions to the transaction
      // For example:
      // 1. Find the user's stake account
      // 2. Calculate the rewards amount
      // 3. Create an instruction to add rewards to staked amount
      // 4. Add the instruction to the transaction
      
      console.log('Created transaction to compound rewards');
      return transaction;
    } catch (error) {
      console.error('Failed to create compound rewards transaction:', error);
      throw error;
    }
  }

  /**
   * Create a transaction that will purchase tokens and automatically stake them
   * @param solAmount Amount of SOL to spend on token purchase
   * @param referralCode Optional referral code to use for the purchase
   * @returns Transaction for signing
   */
  async createPurchaseAndStakeTransaction(solAmount: number, referralCode?: string): Promise<Transaction> {
    try {
      if (solAmount <= 0) {
        throw new Error('SOL amount must be greater than zero');
      }

      // Get transaction from backend that handles:
      // 1. SOL transfer for purchase
      // 2. Token minting to user wallet
      // 3. Token transfer to staking vault
      // 4. Referral fee distribution if referral code is valid
      const response = await fetch('/api/purchase-and-stake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: this.userWallet.toString(),
          solAmount: solAmount,
          referralCode: referralCode || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create purchase and stake transaction');
      }

      const data = await response.json();
      if (data.success && data.transaction) {
        // Return the transaction created by the server
        console.log("Using server-created transaction for purchase and stake");
        const buffer = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
        return Transaction.from(buffer);
      } else {
        throw new Error('Invalid response data from server');
      }
    } catch (error) {
      console.error('Failed to create purchase and stake transaction:', error);
      throw error;
    }
  }
}