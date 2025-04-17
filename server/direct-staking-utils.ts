/**
 * Direct Staking Utilities
 * This module provides direct access to the referral staking program using Anchor
 * It correctly handles the combined staking and referral functionality
 */
import { PublicKey, Connection, clusterApiUrl, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Constants for staking program
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const STAKING_VAULT_ADDRESS = new PublicKey('DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

// Load the referral staking IDL
let idl: any = null;
try {
  // Attempt to load the referral staking IDL
  const idlPath = path.join(process.cwd(), './attached_assets/idl (1).json');
  if (fs.existsSync(idlPath)) {
    const idlString = fs.readFileSync(idlPath, 'utf8');
    idl = JSON.parse(idlString);
    console.log('Successfully loaded referral_staking IDL');
  } else {
    console.warn('IDL file not found at', idlPath);
    // Try alternative path
    const altIdlPath = path.join(process.cwd(), './idl/referral_staking.json');
    if (fs.existsSync(altIdlPath)) {
      const idlString = fs.readFileSync(altIdlPath, 'utf8');
      idl = JSON.parse(idlString);
      console.log('Successfully loaded referral_staking IDL from alternative path');
    } else {
      console.error('Could not find referral_staking IDL file');
    }
  }
} catch (error) {
  console.error('Failed to load IDL:', error);
}

/**
 * Get the connection to the Solana cluster
 */
export function getConnection(): Connection {
  return new Connection(clusterApiUrl('devnet'), 'confirmed');
}

/**
 * Create an Anchor program instance for the staking program
 */
export function createStakingProgram(): anchor.Program | null {
  try {
    if (!idl) {
      console.error('IDL not loaded, cannot create program');
      return null;
    }
    
    if (!PROGRAM_ID) {
      console.error('Program ID is undefined');
      return null;
    }

    const connection = getConnection();
    // Create a proper NodeWallet instance that satisfies the Wallet interface
    const keypair = anchor.web3.Keypair.generate();
    const dummyWallet = new anchor.Wallet(keypair);
    
    // More detailed logging
    console.log(`Creating staking program with:
      - Program ID: ${PROGRAM_ID.toString()}
      - Connection: ${connection.rpcEndpoint}
      - IDL loaded: ${idl.name}, version ${idl.version}
    `);
    
    const provider = new anchor.AnchorProvider(
      connection,
      dummyWallet,
      { commitment: 'confirmed' }
    );
    
    // Log all required parameters to make sure they're defined
    console.log(`Provider created with wallet pubkey: ${dummyWallet.publicKey.toString()}`);
    console.log(`Creating program instance...`);

    // Create the program instance with proper typing
    return new anchor.Program(
      idl as anchor.Idl,
      PROGRAM_ID,
      provider as anchor.Provider
    );
  } catch (error) {
    console.error('Error creating staking program:', error);
    return null;
  }
}

/**
 * Find the Global State PDA
 * @returns The PDA address for the global state
 */
export function findGlobalStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    PROGRAM_ID
  );
}

/**
 * Find the User Info PDA
 * @param userWalletAddress The user's wallet address
 * @returns The PDA address for the user's info
 */
export function findUserInfoPDA(userWalletAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_info"), userWalletAddress.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Check if a wallet address is a valid referrer by checking if they have a UserInfo account on-chain
 * @param walletAddress The wallet address to check
 * @returns Promise resolving to true if the address is a valid referrer, false otherwise
 */
export async function isValidReferrerOnChain(walletAddress: string): Promise<boolean> {
  try {
    // First check if it's a valid Solana address
    const walletPubkey = new PublicKey(walletAddress);
    
    // Get the connection
    const connection = getConnection();
    
    // Find the user's PDA
    const [userInfoPDA] = findUserInfoPDA(walletPubkey);
    
    console.log(`Checking if ${walletAddress} is a valid referrer on-chain`);
    console.log(`User Info PDA: ${userInfoPDA.toString()}`);
    
    // Check if the account exists on-chain
    const accountInfo = await connection.getAccountInfo(userInfoPDA);
    
    // If the account exists and is owned by our program, it's a valid referrer
    const isValid = accountInfo !== null && accountInfo.owner.equals(PROGRAM_ID);
    
    console.log(`On-chain validation result for ${walletAddress}: ${isValid ? 'Valid ✓' : 'Invalid ✗'}`);
    
    return isValid;
  } catch (error) {
    console.error(`Error validating referrer ${walletAddress} on chain:`, error);
    return false;
  }
}

/**
 * Create a user registration instruction for the referral staking program
 * @param userWallet The user's wallet public key 
 * @param referrer Optional referrer public key
 * @returns The transaction instruction for registering a user
 */
export function createRegisterUserInstruction(
  userWallet: PublicKey,
  referrer?: PublicKey
): TransactionInstruction {
  // Validate required parameters
  if (!userWallet) {
    throw new Error('User wallet address is required');
  }
  
  if (!idl) {
    throw new Error('IDL not loaded, cannot create register user instruction');
  }
  
  if (!PROGRAM_ID) {
    throw new Error('PROGRAM_ID is undefined, cannot create register user instruction');
  }
  
  try {
    // Create a temporary program to create the instruction
    const program = createStakingProgram();
    if (!program) {
      throw new Error('Failed to create staking program');
    }
    
    // Find the user info PDA
    const [userInfoPDA] = findUserInfoPDA(userWallet);
    
    // Log all details for debugging
    console.log(`
    Creating register user instruction:
    - User wallet: ${userWallet.toString()}
    - User Info PDA: ${userInfoPDA.toString()}
    - System Program ID: ${anchor.web3.SystemProgram.programId.toString()}
    - Rent Sysvar: ${anchor.web3.SYSVAR_RENT_PUBKEY.toString()}
    - Referrer: ${referrer ? referrer.toString() : 'none'}
    - Program ID: ${PROGRAM_ID.toString()}
    `);
    
    // The instruction data for the registerUser instruction
    // We need to handle the referrer specially to avoid BN issues
    let instructionArgs: any = {};
    
    if (referrer) {
      // Convert the referrer to a simple string representation
      instructionArgs.referrer = referrer.toString();
    } else {
      instructionArgs.referrer = null;
    }
    
    console.log(`Encoding registerUser instruction with args:`, JSON.stringify(instructionArgs));
    const data = program.coder.instruction.encode('registerUser', instructionArgs);
    
    // The accounts required for the referral staking instruction
    // Based on the referral_staking IDL, the registerUser instruction requires:
    // owner, userInfo, systemProgram, rent
    const keys = [
      { pubkey: userWallet, isSigner: true, isWritable: true },           // owner
      { pubkey: userInfoPDA, isSigner: false, isWritable: true },         // userInfo
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
      { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },     // rent
    ];
    
    // Verify every account key is defined
    keys.forEach((key, index) => {
      if (!key.pubkey) {
        throw new Error(`Required account at position ${index} is undefined`);
      }
    });
    
    // Create the instruction
    return new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data,
    });
  } catch (error) {
    console.error('Error creating register user instruction:', error);
    throw error;
  }
}

/**
 * Get on-chain staking information for a user directly from the blockchain
 * This function tries to properly decode account data using Anchor's IDL
 * 
 * @param walletAddress The user's wallet address
 * @returns Staking information fetched directly from the blockchain
 */
export async function getOnChainStakingInfo(walletAddress: string): Promise<any> {
  try {
    const connection = getConnection();
    const walletPubkey = new PublicKey(walletAddress);
    
    // 1. Find user staking account PDA
    const [userInfoPDA] = findUserInfoPDA(walletPubkey);
    
    console.log(`Looking up on-chain staking info for wallet: ${walletAddress}`);
    console.log(`User Info PDA: ${userInfoPDA.toString()}`);
    
    // 2. Get staking account data from the blockchain
    const accountInfo = await connection.getAccountInfo(userInfoPDA);
    
    if (!accountInfo || !accountInfo.data) {
      console.log(`No staking account found on-chain for ${walletAddress}`);
      return {
        amountStaked: 0,
        pendingRewards: 0,
        stakedAt: new Date().toISOString(),
        referrer: null,
        isInitialized: false,
        lastUpdateTime: new Date().toISOString()
      };
    }
    
    console.log(`Found on-chain staking account for ${walletAddress} with ${accountInfo.data.length} bytes of data`);
    
    // Check if account has our correct owner (staking program)
    const isProgramOwned = accountInfo.owner.equals(PROGRAM_ID);
    
    // Try to decode the account data using Anchor's Program
    let decodedData = null;
    
    try {
      const program = createStakingProgram();
      if (program) {
        // Get the coder from the program
        const coder = program.coder;
        
        // Create a buffer from the account data
        const dataBuffer = accountInfo.data;
        
        // Try to decode the account data using Anchor's account decoder
        // This requires that you provided the correct IDL when creating the program
        try {
          // We're looking for a UserInfo account type
          decodedData = coder.accounts.decode('UserInfo', dataBuffer);
          console.log('Successfully decoded UserInfo account:', decodedData);
        } catch (decodeError) {
          console.error('Error decoding UserInfo account:', decodeError);
          
          // Fallback: Try to manually parse based on expected layout
          // This is a simplified example - actual account layout may differ
          try {
            // Often Anchor places a discriminator at the start of the account (8 bytes)
            // Then typically numeric fields like BN are 8 bytes, booleans are 1 byte
            // PublicKeys are 32 bytes, etc.
            
            // Skip the 8-byte discriminator
            const buffer = dataBuffer.slice(8);
            
            // Example layout (adjust based on your actual UserInfo struct):
            // owner: PublicKey (32 bytes)
            // staked_amount: u64 (8 bytes)
            // rewards: u64 (8 bytes)
            // staked_at: i64 (8 bytes) - timestamp
            // referrer: Option<Pubkey> (1 + 32 bytes) - 1 byte for Option, then pubkey
            
            const owner = new PublicKey(buffer.slice(0, 32));
            
            // Convert the next 8 bytes to a BigInt for the staked amount
            const stakedAmountBytes = buffer.slice(32, 40);
            const stakedAmount = BigInt('0x' + Buffer.from(stakedAmountBytes).toString('hex'));
            
            // Convert the next 8 bytes to a BigInt for rewards
            const rewardsBytes = buffer.slice(40, 48);
            const rewards = BigInt('0x' + Buffer.from(rewardsBytes).toString('hex'));
            
            // Next 8 bytes for timestamp (staked_at)
            const stakedAtBytes = buffer.slice(48, 56);
            const stakedAtValue = new DataView(stakedAtBytes.buffer, stakedAtBytes.byteOffset, stakedAtBytes.byteLength).getBigInt64(0, true);
            const stakedAt = new Date(Number(stakedAtValue) * 1000);
            
            // The next byte would indicate if there's a referrer (1) or not (0)
            const hasReferrer = buffer[56] === 1;
            
            let referrer = null;
            if (hasReferrer) {
              // Extract the referrer pubkey
              referrer = new PublicKey(buffer.slice(57, 89)).toString();
            }
            
            decodedData = {
              owner: owner.toString(),
              stakedAmount: stakedAmount.toString(),
              rewards: rewards.toString(),
              stakedAt,
              referrer
            };
            
            console.log('Manually parsed account data:', decodedData);
          } catch (parseError) {
            console.error('Error manually parsing account data:', parseError);
          }
        }
      }
    } catch (programError) {
      console.error('Error using Anchor program for decoding:', programError);
    }
    
    // Return our parsed information
    return {
      amountStaked: decodedData ? Number(decodedData.stakedAmount) / 1_000_000_000 : -1, // Convert from lamports
      pendingRewards: decodedData ? Number(decodedData.rewards) / 1_000_000_000 : 0,
      stakedAt: decodedData && decodedData.stakedAt ? decodedData.stakedAt.toISOString() : new Date().toISOString(),
      referrer: decodedData ? decodedData.referrer : null,
      isInitialized: true,
      accountExists: true,
      isProgramOwned,
      dataSize: accountInfo.data.length,
      owner: decodedData ? decodedData.owner : null,
      lastUpdateTime: new Date().toISOString(),
      rawData: decodedData  // Include the raw decoded data for debugging
    };
  } catch (error) {
    console.error("Error fetching on-chain staking info:", error);
    return {
      amountStaked: 0,
      pendingRewards: 0,
      stakedAt: new Date().toISOString(),
      referrer: null,
      isInitialized: false,
      error: error instanceof Error ? error.message : String(error),
      lastUpdateTime: new Date().toISOString()
    };
  }
}

/**
 * Create a staking instruction for the referral staking program
 * @param userWallet The user's wallet public key
 * @param amount The amount to stake (already converted to lamports)
 * @param userTokenAccount The user's token account
 * @returns The transaction instruction for staking
 */
export function createStakingInstruction(
  userWallet: PublicKey,
  amount: bigint,
  userTokenAccount: PublicKey
): TransactionInstruction {
  // Validate all input parameters
  if (!userWallet) {
    throw new Error('User wallet address is required');
  }
  
  if (!amount) {
    throw new Error('Staking amount is required');
  }
  
  // Convert to number for simple validation
  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error(`Invalid staking amount: ${amount}`);
  }
  
  if (!userTokenAccount) {
    throw new Error('User token account is required');
  }
  
  if (!idl) {
    throw new Error('IDL not loaded, cannot create staking instruction');
  }
  
  if (!PROGRAM_ID) {
    throw new Error('PROGRAM_ID is undefined, cannot create staking instruction');
  }
  
  if (!VAULT_TOKEN_ACCOUNT) {
    throw new Error('VAULT_TOKEN_ACCOUNT is undefined, cannot create staking instruction');
  }
  
  try {
    // Create a temporary program to create the instruction
    const program = createStakingProgram();
    if (!program) {
      throw new Error('Failed to create staking program');
    }
    
    // Find the global state PDA
    const [globalStatePDA] = findGlobalStatePDA();
    console.log(`Global State PDA: ${globalStatePDA.toString()}`);
    
    // Find the user info PDA
    const [userInfoPDA] = findUserInfoPDA(userWallet);
    console.log(`User Info PDA: ${userInfoPDA.toString()}`);
    
    // The instruction data for the stake instruction
    // Convert the amount to string format for encoding to avoid BN.js import issues
    const data = program.coder.instruction.encode('stake', { 
      amount: { toString: () => amount.toString() }
    });
    
    // Check all accounts and log their details
    console.log(`
    Creating staking instruction with:
    - Amount: ${amount.toString()} lamports (${Number(amount) / 1_000_000_000} tokens)
    - User wallet: ${userWallet.toString()}
    - User token account: ${userTokenAccount.toString()}
    - Global state PDA: ${globalStatePDA.toString()}
    - User info PDA: ${userInfoPDA.toString()}
    - Vault token account: ${VAULT_TOKEN_ACCOUNT.toString()}
    - Token program ID: ${TOKEN_PROGRAM_ID.toString()}
    - System program ID: ${anchor.web3.SystemProgram.programId.toString()}
    `);
    
    // The accounts required for the referral staking instruction
    // Based on the referral_staking IDL, the stake instruction requires exactly these accounts in this order:
    // owner, globalState, userInfo, userTokenAccount, vault, tokenProgram, systemProgram
    const keys = [
      { pubkey: userWallet, isSigner: true, isWritable: true },           // owner
      { pubkey: globalStatePDA, isSigner: false, isWritable: true },      // globalState
      { pubkey: userInfoPDA, isSigner: false, isWritable: true },         // userInfo
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },    // userTokenAccount
      { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true }, // vault (this should be the token account, not the vault PDA)
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },   // tokenProgram
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
    ];
    
    // Verify every account key is defined
    keys.forEach((key, index) => {
      if (!key.pubkey) {
        throw new Error(`Required account at position ${index} is undefined`);
      }
    });
    
    // Create the instruction
    return new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data,
    });
  } catch (error) {
    console.error('Error creating staking instruction:', error);
    throw error;
  }
}