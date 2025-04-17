/**
 * Combined Smart Contract Client
 * 
 * This module provides client-side functions for interacting with the
 * referral staking smart contract on the Solana blockchain.
 */
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Token configuration
const tokenMintAddress = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
// The staking vault address (PDA derived from program and token mint)
const stakingVaultAddress = 'DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8';
// Program ID for the referral staking program
const stakingProgramId = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';

// Interfaces for staking data
export interface StakingUserInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastClaimAt: Date | null;
  lastCompoundAt?: Date | null;
  timeUntilUnlock: number | null; // milliseconds until unlock
  estimatedAPY: number;
  dataSource: 'blockchain' | 'helius' | 'external' | 'default';
  walletTokenBalance?: number;
  stakingVaultAddress?: string;
}

export interface StakingVaultInfo {
  totalStaked: number;
  rewardPool: number;
  stakersCount: number;
  currentAPY: number;
  stakingVaultAddress: string;
  lastUpdated: string;
}

/**
 * Get a connection to the Solana blockchain
 */
export const getSolanaConnection = (heliusApiKey?: string): Connection => {
  // If Helius API key is provided, use it for better RPC connection
  if (heliusApiKey) {
    return new Connection(`https://rpc-devnet.helius.xyz/?api-key=${heliusApiKey}`);
  }
  
  // Otherwise use standard devnet connection
  return new Connection(clusterApiUrl('devnet'));
};

/**
 * Get the token mint public key
 */
export const getTokenMint = (): PublicKey => {
  return new PublicKey(tokenMintAddress);
};

/**
 * Get the staking program ID
 */
export const getStakingProgramId = (): PublicKey => {
  return new PublicKey(stakingProgramId);
};

/**
 * Get the user's PDA (Program Derived Address) for the referral staking program
 * @param walletAddress The user's wallet address
 */
export const getUserStakingPDA = async (
  walletAddress: string
): Promise<PublicKey> => {
  const walletPubkey = new PublicKey(walletAddress);
  const programId = getStakingProgramId();
  
  // Get the PDA for user_info in the referral staking program
  const [userInfoPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('user_info'),
      walletPubkey.toBuffer()
    ],
    programId
  );
  
  return userInfoPDA;
};

/**
 * Get token balance for a wallet
 * @param walletAddress The wallet address to check
 */
export const getTokenBalance = async (
  walletAddress: string,
  connection?: Connection
): Promise<number> => {
  try {
    const conn = connection || getSolanaConnection();
    const tokenMint = getTokenMint();
    const walletPubkey = new PublicKey(walletAddress);
    
    // Get all token accounts owned by wallet for our specific mint
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: tokenMint }
    );
    
    // If no token accounts found, balance is 0
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    // Sum up balances from all token accounts with this mint
    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      totalBalance += Number(parsedInfo.tokenAmount.amount) / (10 ** parsedInfo.tokenAmount.decimals);
    }
    
    return totalBalance;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
};

/**
 * Get user's staking information by fetching on-chain data via server API
 * @param walletAddress The wallet address to get staking info for
 * @param heliusApiKey Optional Helius API key for better RPC
 */
export const getUserStakingInfo = async (
  walletAddress: string,
  heliusApiKey?: string
): Promise<StakingUserInfo> => {
  try {
    const connection = getSolanaConnection(heliusApiKey);
    
    // Get staking information from server API - this uses real blockchain data
    const response = await fetch(`/api/staking-info/${walletAddress}`);
    if (!response.ok) {
      throw new Error('Failed to fetch staking information');
    }
    
    const responseData = await response.json();
    
    // The API returns the staking info in a nested 'stakingInfo' property
    const stakingData = responseData.success && responseData.stakingInfo 
      ? responseData.stakingInfo 
      : responseData;
    
    console.log("Received staking data:", stakingData); // Debug log
    
    // Also add wallet token balance
    const tokenBalance = await getTokenBalance(walletAddress, connection);
    
    // Format the response
    return {
      amountStaked: stakingData.amountStaked || 0,
      pendingRewards: stakingData.pendingRewards || 0,
      stakedAt: new Date(stakingData.stakedAt || Date.now()),
      lastClaimAt: stakingData.lastClaimAt ? new Date(stakingData.lastClaimAt) : null, 
      lastCompoundAt: stakingData.lastCompoundAt ? new Date(stakingData.lastCompoundAt) : null,
      timeUntilUnlock: stakingData.timeUntilUnlock || null,
      estimatedAPY: stakingData.estimatedAPY || 0,
      dataSource: stakingData.dataSource || 'blockchain',
      walletTokenBalance: tokenBalance
    } as StakingUserInfo;
  } catch (error) {
    console.error('Error fetching staking info:', error);
    
    // Return empty data on error
    return {
      amountStaked: 0,
      pendingRewards: 0,
      stakedAt: new Date(),
      lastClaimAt: null,
      lastCompoundAt: null,
      timeUntilUnlock: null,
      estimatedAPY: 0,
      dataSource: 'default',
      stakingVaultAddress: stakingVaultAddress
    };
  }
};

/**
 * Get global staking vault statistics from blockchain via server API
 */
export const getStakingVaultInfo = async (
  heliusApiKey?: string
): Promise<StakingVaultInfo> => {
  try {
    // Get staking vault information from server API - this uses real blockchain data
    const response = await fetch('/api/staking-stats');
    if (!response.ok) {
      throw new Error('Failed to fetch staking vault statistics');
    }
    
    const statsData = await response.json();
    
    return {
      totalStaked: statsData.totalStaked || 0,
      rewardPool: statsData.rewardPool || 0,
      stakersCount: statsData.stakersCount || 0,
      currentAPY: statsData.currentAPY || 0,
      stakingVaultAddress: statsData.stakingVaultAddress || stakingVaultAddress,
      lastUpdated: statsData.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching staking vault info:', error);
    
    // Return empty data on error
    return {
      totalStaked: 0,
      rewardPool: 0,
      stakersCount: 0,
      currentAPY: 0,
      stakingVaultAddress: stakingVaultAddress,
      lastUpdated: new Date().toISOString(),
    };
  }
};

/**
 * Buy and stake tokens in one transaction using the referral staking program
 * 
 * @param walletAddress The wallet address staking tokens
 * @param amount Amount of tokens to buy and stake
 * @param referralAddress Optional referral wallet address
 * @returns Transaction details if successful
 */
export const buyAndStakeTokens = async (
  walletAddress: string,
  solAmount: number,
  referralAddress?: string
): Promise<{ 
  signature?: string; 
  error?: string; 
  transactionDetails?: any;
}> => {
  try {
    if (!walletAddress || !solAmount) {
      return { error: "Wallet address and amount are required" };
    }
    
    // Step 1: Get the buy and stake transaction from our V2 endpoint
    const buyStakeResponse = await fetch('/api/buy-and-stake-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        amount: solAmount,
        referrer: referralAddress // Make sure we use the right parameter name
      })
    });
    
    if (!buyStakeResponse.ok) {
      const errorData = await buyStakeResponse.json();
      return { error: errorData.message || "Failed to create buy and stake transaction" };
    }
    
    const buyStakeData = await buyStakeResponse.json();
    
    // Return the transaction details - the frontend will need to sign and send this
    return { 
      transactionDetails: buyStakeData
    };
  } catch (error) {
    console.error('Error in buy and stake process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Register a user with the staking program
 * 
 * @param walletAddress The wallet address of the user
 * @returns Transaction details if successful
 */
export const registerUser = async (
  walletAddress: string
): Promise<{
  signature?: string;
  error?: string;
  transaction?: any;
  isRegistered?: boolean;
}> => {
  try {
    if (!walletAddress) {
      return { error: "Wallet address is required" };
    }
    
    // Call the register-user endpoint
    const response = await fetch('/api/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.message || "Failed to create registration transaction" };
    }
    
    const registrationData = await response.json();
    
    // If user is already registered, return that info
    if (registrationData.isRegistered) {
      return { 
        isRegistered: true,
        transaction: null
      };
    }
    
    // Return the transaction that needs to be signed
    return {
      transaction: registrationData,
      isRegistered: false
    };
  } catch (error) {
    console.error('Error in registration process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Stakes tokens using the referral staking program
 * 
 * @param walletAddress The wallet address of the user
 * @param amount Amount of tokens to stake
 * @param wallet The connected wallet with sign & send capability
 * @param referralAddress Optional referral wallet address (not used in this implementation)
 * @returns Transaction details if successful
 */
export const stakeExistingTokens = async (
  walletAddress: string,
  amount: number,
  wallet: any // wallet with sign & send methods
): Promise<{
  signature?: string;
  error?: string;
  stakingTransaction?: any;
}> => {
  try {
    if (!walletAddress || !amount) {
      return { error: "Wallet address and amount are required" };
    }
    
    if (!wallet) {
      return { error: "Wallet connection is required" };
    }
    
    // Get token balance first to make sure user has enough tokens
    const tokenBalance = await getTokenBalance(walletAddress);
    
    if (tokenBalance < amount) {
      return { 
        error: `Insufficient token balance. You have ${tokenBalance} tokens but are trying to stake ${amount}.` 
      };
    }
    
    // Create a staking transaction via our direct-stake endpoint
    const response = await fetch('/api/direct-stake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        amount,
        referrer: referralAddress
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.message || "Failed to create staking transaction" };
    }
    
    const stakingData = await response.json();
    
    // Log the response to help with debugging
    console.log('Stake transaction response:', stakingData);
    
    // Validate that there's transaction data in the response
    if (!stakingData.success || !stakingData.transaction) {
      return { 
        error: 'Invalid response from server - missing transaction data' 
      };
    }
    
    // Directly try sending the serialized transaction without deserializing
    try {
      const connection = new Connection(clusterApiUrl('devnet'));
      
      // Log the transaction
      console.log('Sending transaction directly to wallet');
      
      // Configure transaction options
      const sendOptions = {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5
      };
      
      // Send and confirm in one step
      const serializedTransaction = stakingData.transaction;
      
      // Let the wallet handle the transaction bytes directly
      const transactionSignature = await wallet.sendTransaction(
        serializedTransaction,
        connection,
        sendOptions
      );
      
      console.log('Transaction sent with signature:', transactionSignature);
      
      // Return the signature for confirmation
      return { 
        signature: transactionSignature,
        stakingTransaction: stakingData
      };
    } catch (signError) {
      console.error('Error signing/sending transaction:', signError);
      return { 
        error: `Transaction signing failed: ${signError instanceof Error ? signError.message : String(signError)}`
      };
    }
  } catch (error) {
    console.error('Error in staking process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};