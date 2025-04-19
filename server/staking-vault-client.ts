/**
 * Staking Vault Client
 * A clean implementation of the staking vault contract interactions
 * based on the actual on-chain smart contract
 */
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Constants from the contract
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const STAKING_VAULT_ADDRESS = new PublicKey('EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

/**
 * Get the connection to the Solana cluster
 */
export function getConnection(): Connection {
  return new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
}

/**
 * Find the user stake info PDA for a user
 * @param userWalletAddress The user's wallet public key
 * @returns The PDA address and bump seed
 */
export function findUserStakeInfoPDA(userWalletAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('user_info'),
      userWalletAddress.toBuffer()
    ],
    PROGRAM_ID
  );
}

/**
 * Find the vault authority PDA
 * @returns The PDA address and bump seed
 */
export function findVaultAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STAKING_VAULT_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Check if a user is registered (has a stake info account)
 * @param userWalletAddress The user's wallet public key
 * @returns True if the user is registered, false otherwise
 */
export async function isUserRegistered(userWalletAddress: PublicKey): Promise<boolean> {
  try {
    const connection = getConnection();
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userWalletAddress);
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    
    // User is registered if the account exists and is owned by our program
    return accountInfo !== null && accountInfo.owner.equals(PROGRAM_ID);
  } catch (error) {
    console.error(`Error checking user registration: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Create a staking instruction for the staking vault program
 * @param userWallet The user's wallet public key
 * @param amount The amount to stake (already adjusted for decimals)
 * @param userTokenAccount The user's token account
 * @returns The transaction instruction for staking
 */
export function createStakingInstruction(
  userWallet: PublicKey,
  amount: bigint,
  userTokenAccount: PublicKey
): TransactionInstruction {
  // Find the user's stake info PDA
  const [userStakeInfoPDA] = findUserStakeInfoPDA(userWallet);
  
  // Create the stake instruction data
  // Format: [discriminator(8 bytes)][amount(8 bytes)]
  const stakeDiscriminator = Buffer.from([206, 176, 202, 18, 200, 209, 179, 108]); // Updated discriminator matching SimpleStaking IDL
  
  // Convert the bigint amount to an 8-byte buffer (little-endian)
  const amountBuffer = Buffer.alloc(8);
  const amountBigInt = BigInt(amount.toString());
  for (let i = 0; i < 8; i++) {
    amountBuffer[i] = Number((amountBigInt >> BigInt(i * 8)) & BigInt(0xff));
  }
  
  // Combine instruction data parts
  const instructionData = Buffer.concat([stakeDiscriminator, amountBuffer]);
  
  // Create the stake instruction with the correct account structure
  // based on the Stake struct in the contract
  return new TransactionInstruction({
    keys: [
      { pubkey: userWallet, isSigner: true, isWritable: true },              // user (signer)
      { pubkey: STAKING_VAULT_ADDRESS, isSigner: false, isWritable: true },  // staking_vault
      { pubkey: userStakeInfoPDA, isSigner: false, isWritable: true },       // user_stake_info
      { pubkey: TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false },    // token_mint
      { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true },    // token_vault
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },       // user_token_account
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // token_program
      { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false } // system_program
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });
}

/**
 * Get on-chain staking information for a user directly from the blockchain
 * @param walletAddress The user's wallet address
 * @returns Staking information fetched directly from the blockchain
 */
export async function getOnChainStakingInfo(walletAddress: string): Promise<any> {
  try {
    const connection = getConnection();
    const userPublicKey = new PublicKey(walletAddress);
    
    // Find the user's stake info PDA
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userPublicKey);
    
    // Get the account info
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    
    // If account doesn't exist, return zeroed data
    if (!accountInfo) {
      return {
        registered: false,
        amountStaked: 0,
        stakeStartTime: null,
        lastClaimTime: null,
        userStakeInfoAddress: userStakeInfoPDA.toString()
      };
    }
    
    // If account exists but not owned by our program, something is wrong
    if (!accountInfo.owner.equals(PROGRAM_ID)) {
      console.warn(`User stake info account exists but is owned by ${accountInfo.owner.toString()} instead of our program`);
      return {
        registered: false,
        amountStaked: 0,
        stakeStartTime: null,
        lastClaimTime: null,
        userStakeInfoAddress: userStakeInfoPDA.toString(),
        wrongOwner: accountInfo.owner.toString()
      };
    }
    
    // Parse the account data
    // UserStakeInfo layout:
    // - authority: Pubkey (32 bytes)
    // - staking_vault: Pubkey (32 bytes)
    // - amount: u64 (8 bytes)
    // - stake_start_time: i64 (8 bytes)
    // - last_claim_time: i64 (8 bytes)
    const data = accountInfo.data;
    
    // Skip the 8-byte account discriminator
    let offset = 8;
    
    // Read the authority (wallet address)
    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read the staking vault address
    const stakingVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read the staked amount
    const amountStaked = data.readBigUInt64LE(offset);
    offset += 8;
    
    // Read the stake start time
    const stakeStartTime = data.readBigInt64LE(offset);
    offset += 8;
    
    // Read the last claim time
    const lastClaimTime = data.readBigInt64LE(offset);
    
    return {
      registered: true,
      authority: authority.toString(),
      stakingVault: stakingVault.toString(),
      amountStaked: amountStaked.toString(),
      stakeStartTime: Number(stakeStartTime) * 1000, // Convert to milliseconds
      lastClaimTime: Number(lastClaimTime) * 1000,   // Convert to milliseconds
      userStakeInfoAddress: userStakeInfoPDA.toString()
    };
  } catch (error) {
    console.error(`Error getting on-chain staking info: ${error instanceof Error ? error.message : String(error)}`);
    return {
      registered: false,
      amountStaked: 0,
      stakeStartTime: null,
      lastClaimTime: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}