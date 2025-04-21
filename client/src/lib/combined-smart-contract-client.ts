/**
 * Combined Smart Contract Client
 * 
 * This module provides client-side functions for interacting with the
 * referral staking smart contract on the Solana blockchain.
 */
import { 
  Connection, 
  PublicKey, 
  clusterApiUrl, 
  Transaction,
  TransactionInstruction,
  SystemProgram
} from '@solana/web3.js';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider } from '@project-serum/anchor';

// Import our comprehensive buffer polyfill
import { 
  BufferPolyfill as EnhancedBufferPolyfill, 
  bnToArray as enhancedBnToArray, 
  bnToUint8Array, 
  needsBufferPolyfill 
} from './buffer-polyfill';

// Legacy buffer handling for reference/fallback
import * as buffer from 'buffer';
import { BrowserBuffer } from './browser-polyfills';

if (typeof window !== 'undefined') {
  // Only run this in browser environments
  window.Buffer = window.Buffer || buffer.Buffer;
  
  // Add a debug flag to check if polyfill is working
  console.log('Buffer polyfill working:', typeof Buffer !== 'undefined');
}

// Simple safe converter function for BN to array conversion
const bnToArray = (bn: BN): number[] => {
  const hex = bn.toString(16);
  // Ensure even number of characters
  const normalizedHex = hex.length % 2 ? '0' + hex : hex;
  
  // Convert hex string to byte array
  const result = [];
  for (let i = 0; i < normalizedHex.length; i += 2) {
    result.push(parseInt(normalizedHex.substr(i, 2), 16));
  }
  return result;
};

// Simple conversion from array to Uint8Array
const arrayToUint8Array = (arr: number[]): Uint8Array => {
  return new Uint8Array(arr);
};

// Create a reliable Buffer polyfill for this module
const BufferPolyfill = typeof window !== 'undefined' 
  ? (window.Buffer || BrowserBuffer)
  : (typeof buffer !== 'undefined' ? buffer.Buffer : Buffer);

// Throw an error if Buffer is still not available
if (!BufferPolyfill) {
  throw new Error('Buffer is not available. The polyfill failed to load.');
}

// Token configuration
const tokenMintAddress = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
// The staking vault address (PDA derived from program and token mint)
const stakingVaultAddress = 'EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu';
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
      new TextEncoder().encode('user_info'),
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
 * Stakes tokens using the referral staking program with proper Anchor client
 * 
 * @param walletAddress The wallet address of the user
 * @param amount Amount of tokens to stake
 * @param wallet The connected wallet with sign & send capability
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
    
    console.log("Starting staking process with Anchor client");

    // Get token balance first to make sure user has enough tokens
    const tokenBalance = await getTokenBalance(walletAddress);
    
    if (tokenBalance < amount) {
      return { 
        error: `Insufficient token balance. You have ${tokenBalance} tokens but are trying to stake ${amount}.` 
      };
    }
    
    // Use Anchor approach as per Solana standards
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      // Create Anchor provider from wallet connection
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        AnchorProvider.defaultOptions()
      );
      
      // Set the provider globally
      anchor.setProvider(provider);
      
      // Using constants from our project
      const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
      const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
      
      console.log("Fetching IDL for program:", PROGRAM_ID.toString());
      
      // Fetch the IDL from chain
      const idl = await Program.fetchIdl(PROGRAM_ID, provider);
      if (!idl) {
        console.error("Failed to fetch IDL");
        return { error: "Failed to fetch program IDL" };
      }
      
      console.log("Creating program instance with fetched IDL");
      const program = new Program(idl, PROGRAM_ID, provider);
      
      const userPubkey = new PublicKey(walletAddress);
      
      console.log("Finding global state PDA");
      // Find global state PDA
      const [globalStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_state")],
        program.programId
      );
      
      console.log("Finding user stake PDA");
      // Find user stake PDA using "user_info" seed
      const [userStakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_info"), userPubkey.toBuffer()],
        program.programId
      );
      
      console.log("Getting associated token address");
      // Get user's token account 
      const userTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT_ADDRESS,
        userPubkey
      );
      
      // Find vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
      );
      
      // Find vault authority PDA
      const [vaultAuthPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_auth")],
        program.programId
      );
      
      // Find vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT_ADDRESS,
        vaultAuthPda,
        true // Allow off-curve addresses (PDAs)
      );
      
      console.log("Building transaction with program.methods");
      // Convert amount to proper decimal format (9 decimals for HATM)
      const amountWithDecimals = new BN(amount * 1e9);
      
      // Build the transaction using program.methods
      const tx = await program.methods
        .stake(amountWithDecimals)
        .accounts({
          owner: userPubkey,
          globalState: globalStatePda,
          stakeAccount: userStakePda,
          userTokenAccount: userTokenAccount,
          tokenVault: vaultTokenAccount,
          tokenMint: TOKEN_MINT_ADDRESS,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      
      console.log("Transaction built successfully using Anchor");
      
      // Get recent block hash and add to transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = userPubkey;
      
      console.log("Transaction ready for signing");
      
      // Sign and send the transaction
      const signature = await wallet.sendTransaction(tx, connection);
      console.log("Transaction sent with signature:", signature);
      
      // Return success
      return {
        signature,
        stakingTransaction: tx
      };
    } catch (buildError) {
      console.error('Error building stake transaction with Anchor:', buildError);
      return { error: `Error building stake transaction: ${buildError instanceof Error ? buildError.message : String(buildError)}` };
    }
  } catch (error) {
    console.error('Error in staking process:', error);
    return { error: error instanceof Error ? error.message : String(error) };
  }
};