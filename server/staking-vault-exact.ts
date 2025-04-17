/**
 * Staking Vault Exact Implementation
 * 
 * This implements the exact structure of the actual deployed staking vault contract
 * based on the provided contract code and verified accounts from the blockchain
 */
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Constants from the contract
export const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
export const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
export const STAKING_VAULT_ADDRESS = new PublicKey('DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8');
export const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');

// System Program and Rent Sysvar addresses
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
export const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111');

/**
 * Get the connection to the Solana cluster
 */
export function getConnection(): Connection {
  return new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
}

/**
 * Find the vault authority PDA
 * 
 * @returns The PDA address and bump seed
 */
export function findVaultAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STAKING_VAULT_ADDRESS.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Find the user stake info PDA
 * 
 * @param userWalletAddress The user's wallet public key
 * @returns The PDA address and bump seed
 */
export function findUserStakeInfoPDA(userWalletAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('user-stake'),
      STAKING_VAULT_ADDRESS.toBuffer(),
      userWalletAddress.toBuffer()
    ],
    PROGRAM_ID
  );
}

/**
 * Create a register user instruction that matches the RegisterUser structure in the smart contract
 * 
 * @param userWallet The user's wallet public key
 * @returns The transaction instruction for user registration
 */
export function createRegisterUserInstruction(
  userWallet: PublicKey
): TransactionInstruction {
  // Create the register_user instruction data
  // Format: [discriminator(8 bytes)]
  const registerDiscriminator = Buffer.from([173, 119, 128, 68, 189, 215, 169, 80]);
  
  // Find the user's stake info PDA
  const [userStakeInfoPDA] = findUserStakeInfoPDA(userWallet);

  // Create the instruction with the exact account order from the RegisterUser struct in the contract
  return new TransactionInstruction({
    keys: [
      { pubkey: userWallet, isSigner: true, isWritable: true },          // owner/user: Signer
      { pubkey: STAKING_VAULT_ADDRESS, isSigner: false, isWritable: false }, // staking_vault: Account
      { pubkey: userStakeInfoPDA, isSigner: false, isWritable: true },   // user_info: Account
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }, // system_program: Program
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }  // rent: Sysvar
    ],
    programId: PROGRAM_ID,
    data: registerDiscriminator,
  });
}

/**
 * Check if a user is registered with the staking program
 * 
 * @param userWalletAddress The user's wallet public key
 * @returns True if the user is registered, false otherwise
 */
export async function isUserRegistered(userWalletAddress: PublicKey): Promise<boolean> {
  try {
    const connection = getConnection();
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userWalletAddress);
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    
    return accountInfo !== null && accountInfo.owner.equals(PROGRAM_ID);
  } catch (error) {
    console.error(`Error checking user registration: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Create a staking instruction that exactly matches the Stake structure in the smart contract
 * 
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
  // Create the stake instruction data
  // Format: [discriminator(8 bytes)][amount(8 bytes)]
  const stakeDiscriminator = Buffer.from([111, 18, 107, 137, 251, 29, 19, 105]);
  
  // Convert the bigint amount to an 8-byte buffer (little-endian)
  const amountBuffer = Buffer.alloc(8);
  const amountBigInt = BigInt(amount.toString());
  for (let i = 0; i < 8; i++) {
    amountBuffer[i] = Number((amountBigInt >> BigInt(i * 8)) & BigInt(0xff));
  }
  
  // Combine instruction data parts
  const instructionData = Buffer.concat([stakeDiscriminator, amountBuffer]);
  
  // Find the user's stake info PDA
  const [userStakeInfoPDA] = findUserStakeInfoPDA(userWallet);
  
  // Find the vault authority PDA
  const [vaultAuthority] = findVaultAuthorityPDA();
  
  // Create the stake instruction with the correct account structure
  // based on the Stake struct in the contract:
  /*
  #[derive(Accounts)]
  pub struct Stake<'info> {
      #[account(mut)]
      pub user: Signer<'info>,

      #[account(
          mut,
          has_one = token_mint,
          has_one = token_vault,
      )]
      pub staking_vault: Account<'info, StakingVault>,

      #[account(
          init_if_needed,
          payer = user,
          space = 8 + UserStakeInfo::LEN,
          seeds = [b"user-stake", staking_vault.key().as_ref(), user.key().as_ref()],
          bump,
      )]
      pub user_stake_info: Account<'info, UserStakeInfo>,

      pub token_mint: Account<'info, Mint>,

      #[account(
          mut,
          constraint = token_vault.mint == token_mint.key(),
      )]
      pub token_vault: Account<'info, TokenAccount>,

      #[account(
          mut,
          constraint = user_token_account.mint == token_mint.key(),
          constraint = user_token_account.owner == user.key(),
      )]
      pub user_token_account: Account<'info, TokenAccount>,

      pub token_program: Program<'info, Token>,
      pub system_program: Program<'info, System>,
      pub rent: Sysvar<'info, Rent>,
  }
  */
  
  // Create the instruction with the exact account order from the contract
  return new TransactionInstruction({
    keys: [
      { pubkey: userWallet, isSigner: true, isWritable: true },              // user: Signer
      { pubkey: STAKING_VAULT_ADDRESS, isSigner: false, isWritable: true },  // staking_vault: Account
      { pubkey: userStakeInfoPDA, isSigner: false, isWritable: true },       // user_stake_info: Account
      { pubkey: TOKEN_MINT_ADDRESS, isSigner: false, isWritable: false },    // token_mint: Account
      { pubkey: VAULT_TOKEN_ACCOUNT, isSigner: false, isWritable: true },    // token_vault: Account
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },       // user_token_account: Account
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },      // token_program: Program
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },     // system_program: Program
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },    // rent: Sysvar
      { pubkey: vaultAuthority, isSigner: false, isWritable: false }         // vault_authority: PDA (derived)
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });
}

/**
 * Get on-chain staking information for a user directly from the blockchain
 * 
 * @param walletAddress The user's wallet address
 * @returns Staking information fetched directly from the blockchain
 */
export async function getOnChainStakingInfo(walletAddress: string): Promise<any> {
  try {
    const connection = getConnection();
    const userPublicKey = new PublicKey(walletAddress);
    
    // Find the user's stake info PDA
    const [userStakeInfoPDA] = findUserStakeInfoPDA(userPublicKey);
    console.log(`Checking user stake info at: ${userStakeInfoPDA.toString()}`);
    
    // Get the account info
    const accountInfo = await connection.getAccountInfo(userStakeInfoPDA);
    
    // If account doesn't exist, return zeroed data
    if (!accountInfo) {
      console.log(`No user stake info found for: ${walletAddress}`);
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
    // UserStakeInfo layout from the contract:
    /*
    #[account]
    #[derive(Default)]
    pub struct UserStakeInfo {
        pub authority: Pubkey,          // 32 bytes
        pub staking_vault: Pubkey,      // 32 bytes
        pub amount: u64,                // 8 bytes
        pub stake_start_time: i64,      // 8 bytes
        pub last_claim_time: i64,       // 8 bytes
    }
    */
    
    const data = accountInfo.data;
    console.log(`Account data length: ${data.length} bytes`);
    
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
    
    // Convert timestamps from seconds to milliseconds for JavaScript Date
    const stakeStartDate = Number(stakeStartTime) * 1000;
    const lastClaimDate = Number(lastClaimTime) * 1000;
    
    console.log(`User stake info found:`);
    console.log(`- Authority: ${authority.toString()}`);
    console.log(`- Staking Vault: ${stakingVault.toString()}`);
    console.log(`- Amount Staked: ${amountStaked.toString()}`);
    console.log(`- Stake Start Time: ${new Date(stakeStartDate).toISOString()}`);
    console.log(`- Last Claim Time: ${new Date(lastClaimDate).toISOString()}`);
    
    return {
      registered: true,
      authority: authority.toString(),
      stakingVault: stakingVault.toString(),
      amountStaked: amountStaked.toString(),
      stakeStartTime: stakeStartDate,
      lastClaimTime: lastClaimDate,
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