import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Token configuration
const tokenMintAddress = '12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5';
const stakingVaultProgramId = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';

// Interfaces for staking data
export interface StakingUserInfo {
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastClaimAt: Date | null;
  timeUntilUnlock: number | null; // milliseconds until unlock
  estimatedAPY: number;
  dataSource: 'blockchain' | 'helius' | 'default';
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
 * Gets a connection to the Solana network
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
  return new PublicKey(stakingVaultProgramId);
};

/**
 * Get the user's staking account PDA
 * @param walletAddress The user's wallet address
 */
export const getUserStakingPDA = async (
  walletAddress: string
): Promise<PublicKey> => {
  const walletPubkey = new PublicKey(walletAddress);
  const programId = getStakingProgramId();
  
  const [stakingAccountPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('staking_account'),
      walletPubkey.toBuffer()
    ],
    programId
  );
  
  return stakingAccountPDA;
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
    
    const stakingData = await response.json();
    
    // Also add wallet token balance
    const tokenBalance = await getTokenBalance(walletAddress, connection);
    
    // Format the response
    return {
      amountStaked: stakingData.amountStaked || 0,
      pendingRewards: stakingData.pendingRewards || 0,
      stakedAt: new Date(stakingData.stakedAt || Date.now()),
      lastClaimAt: stakingData.lastClaimAt ? new Date(stakingData.lastClaimAt) : null,
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
      timeUntilUnlock: null,
      estimatedAPY: 0,
      dataSource: 'default',
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
      stakingVaultAddress: statsData.stakingVaultAddress || stakingVaultProgramId,
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
      stakingVaultAddress: stakingVaultProgramId,
      lastUpdated: new Date().toISOString(),
    };
  }
};

/**
 * Buy and stake tokens in one transaction by batching instructions
 * 
 * @param walletAddress The wallet address staking tokens
 * @param amount Amount of tokens to stake
 * @param referralCode Optional referral code 
 * @returns Transaction signature if successful
 */
export const buyAndStakeTokens = async (
  walletAddress: string,
  solAmount: number,
  referralCode?: string
): Promise<{ 
  signature?: string; 
  error?: string; 
  transactionDetails?: any;
}> => {
  try {
    if (!walletAddress || !solAmount) {
      return { error: "Wallet address and amount are required" };
    }
    
    // Step 1: Get the buy and stake transaction from our backend
    const buyStakeResponse = await fetch('/api/buy-and-stake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        solAmount,
        referralCode
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
 * Completes a staking transaction by sending tokens to the staking vault
 * 
 * @param walletAddress The wallet address of the user
 * @param amount Amount of tokens to stake
 * @returns Transaction signature if successful
 */
export const stakeExistingTokens = async (
  walletAddress: string,
  amount: number
): Promise<{
  signature?: string;
  error?: string;
  stakingTransaction?: any;
}> => {
  try {
    if (!walletAddress || !amount) {
      return { error: "Wallet address and amount are required" };
    }
    
    // Get token balance first to make sure user has enough tokens
    const tokenBalance = await getTokenBalance(walletAddress);
    
    if (tokenBalance < amount) {
      return { 
        error: `Insufficient token balance. You have ${tokenBalance} tokens but are trying to stake ${amount}.` 
      };
    }
    
    // Create a staking transaction via our backend
    const response = await fetch('/api/stake-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        amount
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.message || "Failed to create staking transaction" };
    }
    
    const stakingData = await response.json();
    
    // Return the transaction details to be signed by the wallet
    return { 
      stakingTransaction: stakingData
    };
  } catch (error) {
    console.error('Error in staking process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};