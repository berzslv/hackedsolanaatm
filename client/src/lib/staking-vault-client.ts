import { web3, Program, AnchorProvider, Idl } from '@project-serum/anchor';
import { PublicKey, Connection, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction 
} from '@solana/spl-token';
import { createHash } from 'crypto';

// This will be replaced with the actual IDL once the program is compiled
const idl: Idl = {
  version: "0.1.0",
  name: "staking_vault",
  instructions: [],
  accounts: [],
  events: [],
  errors: []
};

// We'll use the same address as in the contract
const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

export class StakingVaultClient {
  // The staking program
  program: Program;
  
  // Connection to Solana cluster
  connection: Connection;
  
  // The token mint (HackATM token)
  tokenMint: PublicKey;
  
  // The staking vault PDA
  stakingVaultPDA: PublicKey;
  
  // Vault authority PDA (used to sign transactions)
  vaultAuthority: PublicKey;
  
  // User's wallet 
  wallet: PublicKey;

  constructor(
    connection: Connection,
    wallet: PublicKey,
    tokenMintAddress: string
  ) {
    // Initialize connection and wallet
    this.connection = connection;
    this.wallet = wallet;
    this.tokenMint = new PublicKey(tokenMintAddress);
    
    // Initialize Anchor program
    const provider = new AnchorProvider(
      connection,
      {} as any, // We'll handle signing in the frontend
      { commitment: 'confirmed' }
    );
    this.program = new Program(idl, PROGRAM_ID, provider);
    
    // We'll derive these PDAs in the initialize method
    this.stakingVaultPDA = PublicKey.default;
    this.vaultAuthority = PublicKey.default;
  }

  async initialize() {
    try {
      // Find staking vault PDA - we'll use a consistent seed for now
      const vaultSeed = createHash('sha256').update('hackatm-staking-vault').digest();
      const [stakingVaultPDA, _] = await PublicKey.findProgramAddress(
        [vaultSeed],
        PROGRAM_ID
      );
      this.stakingVaultPDA = stakingVaultPDA;
      
      // Find vault authority PDA
      const [vaultAuthority, vaultAuthorityBump] = await PublicKey.findProgramAddress(
        [stakingVaultPDA.toBuffer()],
        PROGRAM_ID
      );
      this.vaultAuthority = vaultAuthority;
      
      return {
        stakingVault: this.stakingVaultPDA,
        vaultAuthority: this.vaultAuthority,
        vaultAuthorityBump,
      };
    } catch (error) {
      console.error('Failed to initialize StakingVaultClient', error);
      throw error;
    }
  }

  /**
   * Create a transaction to stake tokens
   * @param amount Amount of tokens to stake
   * @returns Transaction to be signed by the user
   */
  async createStakeTransaction(amount: number): Promise<Transaction> {
    try {
      // First, make sure we have the PDAs
      if (this.stakingVaultPDA === PublicKey.default) {
        await this.initialize();
      }
      
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        this.wallet
      );
      
      // Get vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        this.vaultAuthority,
        true // allowOwnerOffCurve
      );
      
      // Find user stake info PDA
      const [userStakeInfoPDA, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from('user-stake'),
          this.stakingVaultPDA.toBuffer(),
          this.wallet.toBuffer()
        ],
        PROGRAM_ID
      );
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add instruction to stake tokens
      const ix = this.program.instruction.stake(
        new web3.BN(amount),
        {
          accounts: {
            user: this.wallet,
            stakingVault: this.stakingVaultPDA,
            userStakeInfo: userStakeInfoPDA,
            tokenMint: this.tokenMint,
            tokenVault: vaultTokenAccount,
            userTokenAccount: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          },
        }
      );
      
      transaction.add(ix);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet;
      
      return transaction;
    } catch (error) {
      console.error('Failed to create stake transaction', error);
      throw error;
    }
  }

  /**
   * Create a transaction to unstake tokens
   * @param amount Amount of tokens to unstake
   * @returns Transaction to be signed by the user
   */
  async createUnstakeTransaction(amount: number): Promise<Transaction> {
    try {
      // First, make sure we have the PDAs
      if (this.stakingVaultPDA === PublicKey.default) {
        await this.initialize();
      }
      
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        this.wallet
      );
      
      // Get vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        this.vaultAuthority,
        true // allowOwnerOffCurve
      );
      
      // Find user stake info PDA
      const [userStakeInfoPDA, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from('user-stake'),
          this.stakingVaultPDA.toBuffer(),
          this.wallet.toBuffer()
        ],
        PROGRAM_ID
      );
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add instruction to unstake tokens
      const ix = this.program.instruction.unstake(
        new web3.BN(amount),
        {
          accounts: {
            user: this.wallet,
            stakingVault: this.stakingVaultPDA,
            userStakeInfo: userStakeInfoPDA,
            tokenMint: this.tokenMint,
            tokenVault: vaultTokenAccount,
            userTokenAccount: userTokenAccount,
            vaultAuthority: this.vaultAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          },
        }
      );
      
      transaction.add(ix);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet;
      
      return transaction;
    } catch (error) {
      console.error('Failed to create unstake transaction', error);
      throw error;
    }
  }

  /**
   * Create a transaction to claim staking rewards
   * @returns Transaction to be signed by the user
   */
  async createClaimRewardsTransaction(): Promise<Transaction> {
    try {
      // First, make sure we have the PDAs
      if (this.stakingVaultPDA === PublicKey.default) {
        await this.initialize();
      }
      
      // Get user token account
      const userTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        this.wallet
      );
      
      // Get vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        this.tokenMint,
        this.vaultAuthority,
        true // allowOwnerOffCurve
      );
      
      // Find user stake info PDA
      const [userStakeInfoPDA, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from('user-stake'),
          this.stakingVaultPDA.toBuffer(),
          this.wallet.toBuffer()
        ],
        PROGRAM_ID
      );
      
      // Create transaction
      const transaction = new Transaction();
      
      // Add instruction to claim rewards
      const ix = this.program.instruction.claimRewards(
        {
          accounts: {
            user: this.wallet,
            stakingVault: this.stakingVaultPDA,
            userStakeInfo: userStakeInfoPDA,
            tokenMint: this.tokenMint,
            tokenVault: vaultTokenAccount,
            userTokenAccount: userTokenAccount,
            vaultAuthority: this.vaultAuthority,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          },
        }
      );
      
      transaction.add(ix);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet;
      
      return transaction;
    } catch (error) {
      console.error('Failed to create claim rewards transaction', error);
      throw error;
    }
  }

  /**
   * Get user staking info
   * @returns User staking information or null if not staked
   */
  async getUserStakingInfo() {
    try {
      // First, make sure we have the PDAs
      if (this.stakingVaultPDA === PublicKey.default) {
        await this.initialize();
      }
      
      // Find user stake info PDA
      const [userStakeInfoPDA, _] = await PublicKey.findProgramAddress(
        [
          Buffer.from('user-stake'),
          this.stakingVaultPDA.toBuffer(),
          this.wallet.toBuffer()
        ],
        PROGRAM_ID
      );
      
      // Fetch user stake info account
      try {
        const userStakeInfo = await this.program.account.userStakeInfo.fetch(userStakeInfoPDA);
        
        // Calculate pending rewards
        const currentTime = Math.floor(Date.now() / 1000);
        const stakingVault = await this.program.account.stakingVault.fetch(this.stakingVaultPDA);
        
        // Simplified reward calculation (same as in the contract)
        const timeElapsed = currentTime - userStakeInfo.lastClaimTime.toNumber();
        const rewardsPerSecond = userStakeInfo.amount.toNumber() * stakingVault.currentApyBasisPoints.toNumber() / 31536000;
        const pendingRewards = rewardsPerSecond * timeElapsed;
        
        return {
          amountStaked: userStakeInfo.amount.toNumber(),
          pendingRewards,
          stakedAt: new Date(userStakeInfo.stakeStartTime.toNumber() * 1000),
          lastClaimTime: new Date(userStakeInfo.lastClaimTime.toNumber() * 1000),
          estimatedAPY: stakingVault.currentApyBasisPoints.toNumber() / 100,
          // Calculate time until unlock (7 days from stake date)
          timeUntilUnlock: Math.max(0, (userStakeInfo.stakeStartTime.toNumber() + 7 * 86400) - currentTime) * 1000
        };
      } catch (error) {
        // If account doesn't exist yet, return default values
        if (error.message && error.message.includes('Account does not exist')) {
          return {
            amountStaked: 0,
            pendingRewards: 0,
            stakedAt: new Date(),
            lastClaimTime: new Date(),
            estimatedAPY: 125,
            timeUntilUnlock: null
          };
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to get user staking info', error);
      throw error;
    }
  }

  /**
   * Get global staking stats
   * @returns Global staking statistics
   */
  async getStakingStats() {
    try {
      // First, make sure we have the PDAs
      if (this.stakingVaultPDA === PublicKey.default) {
        await this.initialize();
      }
      
      // Fetch staking vault account
      const stakingVault = await this.program.account.stakingVault.fetch(this.stakingVaultPDA);
      
      return {
        totalStaked: stakingVault.totalStaked.toNumber(),
        rewardPool: stakingVault.rewardPool.toNumber(),
        stakersCount: stakingVault.stakersCount.toNumber(),
        currentAPY: stakingVault.currentApyBasisPoints.toNumber() / 100,
        lastCompoundTime: new Date(stakingVault.lastCompoundTime.toNumber() * 1000)
      };
    } catch (error) {
      console.error('Failed to get staking stats', error);
      throw error;
    }
  }
}