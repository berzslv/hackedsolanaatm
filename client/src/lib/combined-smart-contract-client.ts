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

// Polyfill Buffer for the browser environment
// This is needed because some Solana libraries use Node's Buffer which isn't available in browsers
import * as buffer from 'buffer';
import { BrowserBuffer } from './browser-polyfills';

if (typeof window !== 'undefined') {
  // Only run this in browser environments
  window.Buffer = window.Buffer || buffer.Buffer;
  
  // Add a debug flag to check if polyfill is working
  console.log('Buffer polyfill working:', typeof Buffer !== 'undefined');
}

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
 * Stakes tokens using the referral staking program with a client-side built transaction
 * This approach avoids any serialization/deserialization issues
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
    
    // Get token balance first to make sure user has enough tokens
    const tokenBalance = await getTokenBalance(walletAddress);
    
    if (tokenBalance < amount) {
      return { 
        error: `Insufficient token balance. You have ${tokenBalance} tokens but are trying to stake ${amount}.` 
      };
    }
    
    // Fetch the necessary account info from the server
    const response = await fetch('/api/staking-accounts-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        amount
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.message || "Failed to get staking account info" };
    }
    
    const accountsInfo = await response.json();
    
    if (!accountsInfo.success) {
      return { error: accountsInfo.error || "Failed to get staking accounts info" };
    }
    
    console.log('Building transaction locally with account info:', accountsInfo);
    
    // Now build the transaction on the client side
    try {
      const connection = new Connection(clusterApiUrl('devnet'));
      const userPubkey = new PublicKey(walletAddress);
      
      // Parse all the account addresses from the server response
      const tokenMint = new PublicKey(accountsInfo.tokenMint);
      const programId = new PublicKey(accountsInfo.programId);
      const vaultPubkey = new PublicKey(accountsInfo.vault);
      const vaultTokenAccount = new PublicKey(accountsInfo.vaultTokenAccount);
      
      // Get the user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        userPubkey,
        false,
        TOKEN_PROGRAM_ID
      );
      
      // 2. Create a new transaction
      const transaction = new Transaction();
      
      // 3. Get latest blockhash for the transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = userPubkey;
      
      // 4. Check if user is registered, and create registration instruction if needed
      if (!accountsInfo.isRegistered) {
        console.log('User is not registered. Adding registration instruction.');
        
        // Find user stake info PDA
        const [userStakeInfoPDA] = PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('user_info'), userPubkey.toBuffer()],
          programId
        );
        
        console.log('User stake info PDA:', userStakeInfoPDA.toString());
        
        // Add register instruction - being explicit about all required accounts
        const registerInstruction = new TransactionInstruction({
          keys: [
            { pubkey: userPubkey, isSigner: true, isWritable: true }, // user/payer
            { pubkey: userStakeInfoPDA, isSigner: false, isWritable: true }, // user stake info account (PDA)
            { pubkey: vaultPubkey, isSigner: false, isWritable: false }, // vault account
            { pubkey: tokenMint, isSigner: false, isWritable: false }, // token mint
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
          ],
          programId,
          data: BufferPolyfill.from([0]) // 0 = register instruction
        });
        
        transaction.add(registerInstruction);
      }
      
      // 5. Add stake instruction
      const [userStakeInfoPDA] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode('user_info'), userPubkey.toBuffer()],
        programId
      );
      
      // Calculate amount in lamports (9 decimals)
      const amountLamports = amount * Math.pow(10, 9);
      
      // Create stake instruction - follows IDL account order exactly
      const stakeInstruction = new TransactionInstruction({
        keys: [
          { pubkey: userPubkey, isSigner: true, isWritable: true },        // user/payer
          { pubkey: vaultPubkey, isSigner: false, isWritable: true },      // stakingVault
          { pubkey: userStakeInfoPDA, isSigner: false, isWritable: true }, // userStake info account
          { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // user token account
          { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // tokenVault account  
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
        ],
        programId,
        data: (() => {
          // Create instruction data with code (1 = stake) followed by amount
          // Use a direct Uint8Array instead of BufferPolyfill.alloc
          const dataLayout = new Uint8Array(9);
          dataLayout[0] = 1; // Instruction index for stake
          
          // Write the amount as a 64-bit little-endian value
          const amountBuffer = BufferPolyfill.from(new BN(amountLamports).toArray('le', 8));
          
          // Copy values manually from amountBuffer to dataLayout
          for (let i = 0; i < 8; i++) {
              dataLayout[i+1] = amountBuffer[i];
          }
          
          return dataLayout;
        })()
      });
      
      transaction.add(stakeInstruction);
      
      console.log('Transaction built successfully');
      
      // 6. Simulate the transaction first to catch any errors
      try {
        console.log('Simulating transaction before sending...');
        const simulation = await connection.simulateTransaction(transaction);
        
        if (simulation.value.err) {
          console.error('Transaction simulation failed:', simulation.value.err);
          
          // Provide more detailed error information for Custom errors
          if (typeof simulation.value.err === 'object' && 'InstructionError' in simulation.value.err) {
            const instructionError = simulation.value.err.InstructionError;
            if (Array.isArray(instructionError) && instructionError.length >= 2) {
              const instructionIndex = instructionError[0];
              const errorInfo = instructionError[1];
              
              if (typeof errorInfo === 'object' && 'Custom' in errorInfo) {
                const customCode = errorInfo.Custom;
                console.error(`Custom program error in instruction ${instructionIndex}: Code ${customCode}`);
                
                // Provide more accurate explanations for custom program errors
                const errorExplanations: {[key: number]: string} = {
                  100: 'Insufficient funds or missing account',
                  101: 'Invalid token account',
                  102: 'Invalid token owner',
                  103: 'Account not registered with staking program'
                };
                const errorExplanation = errorExplanations[customCode] || 'Unknown custom error';
                
                console.error(`Error explanation: ${errorExplanation}`);
                return { error: `Transaction simulation failed: Custom program error ${customCode} - ${errorExplanation}` };
              }
            }
          }
          
          return { error: `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}` };
        }
        
        // Successful simulation - log logs for debugging
        if (simulation.value.logs) {
          console.log('Simulation logs:', simulation.value.logs);
        }
        
        console.log('Transaction simulation successful');
      } catch (simError) {
        console.warn('Simulation error (continuing anyway):', simError);
      }
      
      // 7. Sign and send transaction with explicit options
      const signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
      
      console.log('Transaction sent successfully with signature:', signature);
      
      // 7. Wait for confirmation (optional)
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });
      
      console.log('Transaction confirmed:', confirmation);
      
      // Return success
      return {
        signature,
        stakingTransaction: {
          success: true,
          message: `Successfully staked ${amount} tokens`,
          signature
        }
      };
    } catch (txError) {
      console.error('Error building/sending transaction:', txError);
      return {
        error: `Failed to process staking transaction: ${txError instanceof Error ? txError.message : String(txError)}`
      };
    }
  } catch (error) {
    console.error('Error in staking process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};