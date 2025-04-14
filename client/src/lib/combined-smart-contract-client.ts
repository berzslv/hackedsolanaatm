import { useEffect, useState } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  Program, 
  AnchorProvider, 
  Idl,
  BN 
} from '@coral-xyz/anchor';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';

// Import IDL when it becomes available
// import idl from '@idl/referral_staking.json';

// Constants
export const PROGRAM_ID = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
export const HATM_TOKEN_MINT = new PublicKey("59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk");

// Temporary IDL placeholder until we have the actual IDL
const temporaryIdl: Idl = {
  version: "0.1.0",
  name: "referral_staking",
  instructions: [
    {
      name: "initialize",
      accounts: [], // Will be filled when IDL is available
      args: [] 
    },
    {
      name: "registerUser",
      accounts: [], 
      args: [] 
    },
    {
      name: "stake",
      accounts: [], 
      args: [] 
    },
    {
      name: "unstake",
      accounts: [], 
      args: [] 
    },
    {
      name: "claimRewards",
      accounts: [], 
      args: [] 
    },
    {
      name: "compoundRewards",
      accounts: [], 
      args: [] 
    }
  ],
  accounts: [],
  errors: []
};

// Interface definitions
export interface StakingInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastClaimAt: Date | null;
  timeUntilUnlock: number | null; // Milliseconds until unlock or null if already unlocked
  estimatedAPY: number;
}

export interface ReferralInfo {
  referrer: string | null;
  referralCode: string | null;
  referralCount: number;
  totalReferralRewards: number;
}

export interface StakingVaultInfo {
  totalStaked: number;
  rewardPool: number;
  stakersCount: number;
  currentAPY: number;
  unlockDuration: number; // In seconds
  earlyUnstakePenalty: number; // In basis points
}

// Helper function to find Global State PDA
function findGlobalStatePDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );
}

// Helper function to find User Info PDA
function findUserInfoPDA(walletAddress: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_info"), walletAddress.toBuffer()],
    PROGRAM_ID
  );
}

// Hook to interact with the combined smart contract
export function useCombinedSmartContract() {
  const anchorWallet = useAnchorWallet();
  const [program, setProgram] = useState<Program | null>(null);
  const [globalState, setGlobalState] = useState<PublicKey | null>(null);
  const [vaultAddress, setVaultAddress] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the program and find PDAs when wallet is connected
  useEffect(() => {
    if (!anchorWallet) return;
    
    try {
      // Get connection and provider
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
      const provider = new AnchorProvider(
        connection,
        anchorWallet,
        { commitment: 'confirmed' }
      );
      
      // Create program instance
      const programInstance = new Program(temporaryIdl, PROGRAM_ID, provider);
      setProgram(programInstance);
      
      // Find Global State PDA
      const [globalStatePDA] = findGlobalStatePDA();
      setGlobalState(globalStatePDA);
      
      // TODO: Load vault address from global state when account is available
    } catch (err) {
      console.error("Error initializing staking program:", err);
      setError("Failed to initialize staking program");
    }
  }, [anchorWallet]);
  
  // Function to register user
  const registerUser = async (referrer?: string): Promise<boolean> => {
    if (!program || !anchorWallet) {
      setError("Wallet not connected");
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const [userInfoPDA] = findUserInfoPDA(anchorWallet.publicKey);
      
      // Check if user is already registered
      try {
        await program.account.userInfo.fetch(userInfoPDA);
        console.log("User already registered");
        setLoading(false);
        return true;
      } catch (e) {
        // User not registered yet, continue with registration
      }
      
      // Parse referrer pubkey if provided
      let referrerPubkey: PublicKey | null = null;
      if (referrer) {
        try {
          referrerPubkey = new PublicKey(referrer);
        } catch (e) {
          console.error("Invalid referrer address:", e);
        }
      }
      
      // Prepare transaction
      const tx = await program.methods
        .registerUser(referrerPubkey)
        .accounts({
          owner: anchorWallet.publicKey,
          userInfo: userInfoPDA,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      
      // Send transaction
      const signature = await program.provider.sendAndConfirm(tx);
      console.log("User registered successfully. Signature:", signature);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error registering user:", err);
      setError("Failed to register user");
      setLoading(false);
      return false;
    }
  };
  
  // Function to stake tokens
  const stakeTokens = async (amount: number): Promise<boolean> => {
    if (!program || !anchorWallet || !globalState) {
      setError("Wallet not connected or program not initialized");
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Ensure user is registered
      await ensureUserRegistered();
      
      // Get user info PDA
      const [userInfoPDA] = findUserInfoPDA(anchorWallet.publicKey);
      
      // Get global state to get vault address
      const globalStateData = await program.account.globalState.fetch(globalState);
      const vaultAddress = globalStateData.vault;
      
      // Convert amount to lamports (adjust based on token decimals)
      const amountBN = new BN(amount);
      
      // TODO: Implement actual token transfer logic
      // This needs to be completed once we have the full IDL and token accounts setup
      
      // For now, show what we would do:
      console.log(`Would stake ${amount} tokens from ${anchorWallet.publicKey.toString()} to vault ${vaultAddress.toString()}`);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error staking tokens:", err);
      setError("Failed to stake tokens");
      setLoading(false);
      return false;
    }
  };
  
  // Function to unstake tokens
  const unstakeTokens = async (amount: number): Promise<boolean> => {
    if (!program || !anchorWallet || !globalState) {
      setError("Wallet not connected or program not initialized");
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user info PDA
      const [userInfoPDA] = findUserInfoPDA(anchorWallet.publicKey);
      
      // Get global state to get vault address
      const globalStateData = await program.account.globalState.fetch(globalState);
      const vaultAddress = globalStateData.vault;
      
      // Convert amount to lamports (adjust based on token decimals)
      const amountBN = new BN(amount);
      
      // TODO: Implement actual token unstake logic
      // This needs to be completed once we have the full IDL and token accounts setup
      
      // For now, show what we would do:
      console.log(`Would unstake ${amount} tokens from vault ${vaultAddress.toString()} to ${anchorWallet.publicKey.toString()}`);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error unstaking tokens:", err);
      setError("Failed to unstake tokens");
      setLoading(false);
      return false;
    }
  };
  
  // Function to claim rewards
  const claimRewards = async (): Promise<boolean> => {
    if (!program || !anchorWallet || !globalState) {
      setError("Wallet not connected or program not initialized");
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user info PDA
      const [userInfoPDA] = findUserInfoPDA(anchorWallet.publicKey);
      
      // Get global state to get vault address
      const globalStateData = await program.account.globalState.fetch(globalState);
      const vaultAddress = globalStateData.vault;
      
      // TODO: Implement actual reward claiming logic
      // This needs to be completed once we have the full IDL and token accounts setup
      
      // For now, show what we would do:
      console.log(`Would claim rewards for ${anchorWallet.publicKey.toString()} from vault ${vaultAddress.toString()}`);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error claiming rewards:", err);
      setError("Failed to claim rewards");
      setLoading(false);
      return false;
    }
  };
  
  // Function to compound rewards
  const compoundRewards = async (): Promise<boolean> => {
    if (!program || !anchorWallet || !globalState) {
      setError("Wallet not connected or program not initialized");
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user info PDA
      const [userInfoPDA] = findUserInfoPDA(anchorWallet.publicKey);
      
      // TODO: Implement actual reward compounding logic
      // This needs to be completed once we have the full IDL and token accounts setup
      
      // For now, show what we would do:
      console.log(`Would compound rewards for ${anchorWallet.publicKey.toString()}`);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Error compounding rewards:", err);
      setError("Failed to compound rewards");
      setLoading(false);
      return false;
    }
  };
  
  // Ensure user is registered before performing other operations
  const ensureUserRegistered = async (): Promise<boolean> => {
    if (!program || !anchorWallet) {
      setError("Wallet not connected");
      return false;
    }
    
    const [userInfoPDA] = findUserInfoPDA(anchorWallet.publicKey);
    
    try {
      // Check if user is already registered
      await program.account.userInfo.fetch(userInfoPDA);
      return true;
    } catch (e) {
      // User not registered, register now
      return await registerUser();
    }
  };
  
  // Function to get user staking info
  const getUserStakingInfo = async (walletAddress?: string): Promise<StakingInfo | null> => {
    if (!program) {
      setError("Program not initialized");
      return null;
    }
    
    try {
      const pubkey = walletAddress 
        ? new PublicKey(walletAddress) 
        : anchorWallet?.publicKey;
        
      if (!pubkey) {
        setError("No wallet address provided");
        return null;
      }
      
      const [userInfoPDA] = findUserInfoPDA(pubkey);
      
      try {
        const userInfo = await program.account.userInfo.fetch(userInfoPDA);
        
        // Get global state for config values
        const [globalStatePDA] = findGlobalStatePDA();
        const globalState = await program.account.globalState.fetch(globalStatePDA);
        
        // Calculate time until unlock
        const currentTime = Math.floor(Date.now() / 1000);
        const stakedTime = userInfo.lastStakeTime.toNumber();
        const unlockDuration = globalState.unlockDuration.toNumber();
        const unlockTime = stakedTime + unlockDuration;
        
        let timeUntilUnlock = null;
        if (currentTime < unlockTime) {
          timeUntilUnlock = (unlockTime - currentTime) * 1000; // Convert to milliseconds
        }
        
        // Calculate estimated APY (simplified version)
        const estimatedAPY = (globalState.rewardRate.toNumber() * 365) / 100;
        
        return {
          amountStaked: userInfo.stakedAmount.toNumber(),
          pendingRewards: userInfo.rewards.toNumber(),
          stakedAt: new Date(userInfo.lastStakeTime.toNumber() * 1000),
          lastClaimAt: userInfo.lastClaimTime.toNumber() > 0 
            ? new Date(userInfo.lastClaimTime.toNumber() * 1000) 
            : null,
          timeUntilUnlock,
          estimatedAPY
        };
      } catch (e) {
        // User not registered or error fetching data
        console.warn("Error fetching user info:", e);
        return {
          amountStaked: 0,
          pendingRewards: 0,
          stakedAt: new Date(),
          lastClaimAt: null,
          timeUntilUnlock: null,
          estimatedAPY: 0
        };
      }
    } catch (err) {
      console.error("Error getting staking info:", err);
      setError("Failed to get staking info");
      return null;
    }
  };
  
  // Function to get referral info
  const getUserReferralInfo = async (walletAddress?: string): Promise<ReferralInfo | null> => {
    if (!program) {
      setError("Program not initialized");
      return null;
    }
    
    try {
      const pubkey = walletAddress 
        ? new PublicKey(walletAddress) 
        : anchorWallet?.publicKey;
        
      if (!pubkey) {
        setError("No wallet address provided");
        return null;
      }
      
      const [userInfoPDA] = findUserInfoPDA(pubkey);
      
      try {
        const userInfo = await program.account.userInfo.fetch(userInfoPDA);
        
        // Generate referral code from wallet address
        // In a production system, you might want to store this in the contract
        // or use a more sophisticated approach
        const referralCode = pubkey.toString().substring(0, 8);
        
        return {
          referrer: userInfo.referrer ? userInfo.referrer.toString() : null,
          referralCode,
          referralCount: userInfo.referralCount.toNumber(),
          totalReferralRewards: userInfo.totalReferralRewards.toNumber()
        };
      } catch (e) {
        // User not registered or error fetching data
        console.warn("Error fetching referral info:", e);
        return {
          referrer: null,
          referralCode: null,
          referralCount: 0,
          totalReferralRewards: 0
        };
      }
    } catch (err) {
      console.error("Error getting referral info:", err);
      setError("Failed to get referral info");
      return null;
    }
  };
  
  // Function to get vault info
  const getVaultInfo = async (): Promise<StakingVaultInfo | null> => {
    if (!program) {
      setError("Program not initialized");
      return null;
    }
    
    try {
      const [globalStatePDA] = findGlobalStatePDA();
      const globalState = await program.account.globalState.fetch(globalStatePDA);
      
      return {
        totalStaked: globalState.totalStaked.toNumber(),
        rewardPool: globalState.rewardPool.toNumber(),
        stakersCount: globalState.stakersCount.toNumber(),
        currentAPY: (globalState.rewardRate.toNumber() * 365) / 100,
        unlockDuration: globalState.unlockDuration.toNumber(),
        earlyUnstakePenalty: globalState.earlyUnstakePenalty.toNumber()
      };
    } catch (err) {
      console.error("Error getting vault info:", err);
      setError("Failed to get vault info");
      return null;
    }
  };
  
  return {
    program,
    loading,
    error,
    registerUser,
    stakeTokens,
    unstakeTokens,
    claimRewards,
    compoundRewards,
    getUserStakingInfo,
    getUserReferralInfo,
    getVaultInfo,
    ensureUserRegistered
  };
}