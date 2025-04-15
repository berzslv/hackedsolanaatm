use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_lang::solana_program::program_option::COption;

declare_id!("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");

/// Token mint address for the HATM token
/// This will need to be updated with your actual token mint address
pub const HATM_TOKEN_MINT: &str = "59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk";

#[program]
pub mod referral_staking {
    use super::*;

    /// Initialize the staking vault and global state
    pub fn initialize(
        ctx: Context<Initialize>, 
        reward_rate: u64,  // Daily reward rate in basis points (1/100 of a percent)
        unlock_duration: i64,  // Staking lock duration in seconds
        early_unstake_penalty: u64,  // Penalty for early unstaking in basis points
        min_stake_amount: u64,  // Minimum amount of tokens that can be staked
        referral_reward_rate: u64,  // Reward rate for referrers in basis points
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.authority = ctx.accounts.authority.key();
        global_state.token_mint = ctx.accounts.token_mint.key();
        global_state.vault = ctx.accounts.vault.key();
        global_state.reward_rate = reward_rate;
        global_state.unlock_duration = unlock_duration;
        global_state.early_unstake_penalty = early_unstake_penalty;
        global_state.min_stake_amount = min_stake_amount;
        global_state.referral_reward_rate = referral_reward_rate;
        global_state.total_staked = 0;
        global_state.stakers_count = 0;
        global_state.reward_pool = 0;
        global_state.last_update_time = Clock::get()?.unix_timestamp;
        global_state.bump = ctx.bumps.global_state;
        
        Ok(())
    }
    
    /// Register a new user in the system
    pub fn register_user(ctx: Context<RegisterUser>, referrer: Option<Pubkey>) -> Result<()> {
        let user_info = &mut ctx.accounts.user_info;
        user_info.owner = ctx.accounts.owner.key();
        user_info.staked_amount = 0;
        user_info.rewards = 0;
        user_info.last_stake_time = 0;
        user_info.last_claim_time = 0;
        user_info.referrer = referrer;
        user_info.referral_count = 0;
        user_info.total_referral_rewards = 0;
        
        msg!("User registered successfully");
        if let Some(ref_pubkey) = referrer {
            msg!("Registered with referrer: {}", ref_pubkey);
        }
        
        Ok(())
    }
    
    /// Stake tokens into the vault
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let user_info = &mut ctx.accounts.user_info;
        
        // Check minimum stake amount
        require!(amount >= global_state.min_stake_amount, StakingError::AmountTooSmall);
        
        // Transfer tokens from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        // Calculate pending rewards before updating state
        let current_time = Clock::get()?.unix_timestamp;
        if user_info.staked_amount > 0 && current_time > user_info.last_stake_time {
            let time_passed = (current_time - user_info.last_stake_time) as u64;
            let reward = calculate_reward(
                user_info.staked_amount,
                time_passed,
                global_state.reward_rate,
            );
            user_info.rewards = user_info.rewards.checked_add(reward).unwrap_or(user_info.rewards);
        }
        
        // Check if this is a first-time stake
        let is_new_staker = user_info.staked_amount == 0;
        
        // Update user state
        user_info.staked_amount = user_info.staked_amount.checked_add(amount).unwrap_or(user_info.staked_amount);
        user_info.last_stake_time = current_time;
        
        // Update global state
        global_state.total_staked = global_state.total_staked.checked_add(amount).unwrap_or(global_state.total_staked);
        if is_new_staker {
            // This is a new staker
            global_state.stakers_count = global_state.stakers_count.checked_add(1).unwrap_or(global_state.stakers_count);
        }
        global_state.last_update_time = current_time;
        
        // Add referral rewards if applicable (only for first-time stakers)
        if is_new_staker && user_info.referrer.is_some() {
            msg!("Processing referral reward for first-time staker");
            
            // We need to use the update_referrer_rewards instruction to update the referrer's stats
            // For proper implementation, this would be done via a separate transaction
            msg!("For a full implementation, call update_referrer_rewards instruction separately");
            msg!("Referrer: {}", user_info.referrer.unwrap());
            msg!("Staking amount: {}", amount);
            msg!("Referral rate: {}", global_state.referral_reward_rate);
        }
        
        Ok(())
    }
    
    /// Update referrer's rewards (called after a new referred user stakes)
    pub fn update_referrer_rewards(
        ctx: Context<UpdateReferrerRewards>,
        staking_amount: u64
    ) -> Result<()> {
        // Get accounts
        let global_state = &ctx.accounts.global_state;
        let referrer_info = &mut ctx.accounts.referrer_info;
        
        // Calculate referral reward
        let referral_reward = calculate_referral_reward(staking_amount, global_state.referral_reward_rate);
        
        msg!("Updating referrer rewards");
        msg!("Referrer: {}", referrer_info.owner);
        msg!("Referral reward: {}", referral_reward);
        
        // Update referrer's stats
        referrer_info.total_referral_rewards = referrer_info.total_referral_rewards
            .checked_add(referral_reward)
            .unwrap_or(referrer_info.total_referral_rewards);
        
        referrer_info.rewards = referrer_info.rewards
            .checked_add(referral_reward)
            .unwrap_or(referrer_info.rewards);
        
        referrer_info.referral_count = referrer_info.referral_count
            .checked_add(1)
            .unwrap_or(referrer_info.referral_count);
        
        Ok(())
    }
    
    /// Unstake tokens from the vault
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        // Calculate pending rewards first
        let current_time = Clock::get()?.unix_timestamp;
        let user_info = &mut ctx.accounts.user_info;
        
        if user_info.staked_amount > 0 && current_time > user_info.last_stake_time {
            let time_passed = (current_time - user_info.last_stake_time) as u64;
            let reward = calculate_reward(
                user_info.staked_amount,
                time_passed,
                ctx.accounts.global_state.reward_rate,
            );
            user_info.rewards = user_info.rewards.checked_add(reward).unwrap_or(user_info.rewards);
        }
        
        // Check if user has enough staked tokens
        require!(amount <= user_info.staked_amount, StakingError::InsufficientStakedAmount);
        
        // Calculate early unstake penalty if applicable
        let mut penalty: u64 = 0;
        let time_staked = current_time - user_info.last_stake_time;
        
        if time_staked < ctx.accounts.global_state.unlock_duration {
            penalty = (amount as u128)
                .checked_mul(ctx.accounts.global_state.early_unstake_penalty as u128)
                .unwrap_or(0)
                .checked_div(10000)
                .unwrap_or(0) as u64;
            
            msg!("Early unstake penalty applied: {}", penalty);
            msg!("Time staked: {} seconds of {} required", time_staked, ctx.accounts.global_state.unlock_duration);
        } else {
            msg!("No penalty - unlock period satisfied");
        }
        
        let withdraw_amount = amount.checked_sub(penalty).unwrap_or(0);
        
        // Transfer tokens from vault to user
        let seeds = &[
            b"global_state".as_ref(),
            &[ctx.accounts.global_state.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.global_state.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, withdraw_amount)?;
        
        // Update user state
        user_info.staked_amount = user_info.staked_amount.checked_sub(amount).unwrap_or(0);
        user_info.last_stake_time = current_time;
        
        // Update global state after the transfer
        let global_state = &mut ctx.accounts.global_state;
        global_state.total_staked = global_state.total_staked.checked_sub(amount).unwrap_or(0);
        if user_info.staked_amount == 0 {
            // User has unstaked everything
            global_state.stakers_count = global_state.stakers_count.checked_sub(1).unwrap_or(0);
        }
        global_state.last_update_time = current_time;
        
        // Add penalty to reward pool
        global_state.reward_pool = global_state.reward_pool.checked_add(penalty).unwrap_or(global_state.reward_pool);
        
        Ok(())
    }
    
    /// Claim rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        // Calculate pending rewards first
        let current_time = Clock::get()?.unix_timestamp;
        let user_info = &mut ctx.accounts.user_info;
        
        if user_info.staked_amount > 0 && current_time > user_info.last_stake_time {
            let time_passed = (current_time - user_info.last_stake_time) as u64;
            let reward = calculate_reward(
                user_info.staked_amount,
                time_passed,
                ctx.accounts.global_state.reward_rate,
            );
            user_info.rewards = user_info.rewards.checked_add(reward).unwrap_or(user_info.rewards);
        }
        
        // Check if user has rewards to claim
        let rewards_to_claim = user_info.rewards;
        require!(rewards_to_claim > 0, StakingError::NoRewardsToClaim);
        
        // Check if reward pool has enough tokens
        require!(
            rewards_to_claim <= ctx.accounts.global_state.reward_pool, 
            StakingError::InsufficientRewardPool
        );
        
        // Transfer rewards from vault to user
        let seeds = &[
            b"global_state".as_ref(),
            &[ctx.accounts.global_state.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.global_state.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, rewards_to_claim)?;
        
        msg!("Claimed rewards: {}", rewards_to_claim);
        
        // Update user state
        user_info.rewards = 0;
        user_info.last_claim_time = current_time;
        user_info.last_stake_time = current_time; // Reset stake time to avoid double rewards
        
        // Update global state after transfer
        let global_state = &mut ctx.accounts.global_state;
        global_state.reward_pool = global_state.reward_pool.checked_sub(rewards_to_claim).unwrap_or(0);
        global_state.last_update_time = current_time;
        
        Ok(())
    }
    
    /// Compound rewards (add rewards to staked amount)
    pub fn compound_rewards(ctx: Context<CompoundRewards>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let user_info = &mut ctx.accounts.user_info;
        
        // Calculate pending rewards
        let current_time = Clock::get()?.unix_timestamp;
        if user_info.staked_amount > 0 && current_time > user_info.last_stake_time {
            let time_passed = (current_time - user_info.last_stake_time) as u64;
            let reward = calculate_reward(
                user_info.staked_amount,
                time_passed,
                global_state.reward_rate,
            );
            user_info.rewards = user_info.rewards.checked_add(reward).unwrap_or(user_info.rewards);
        }
        
        // Check if user has rewards to compound
        let rewards_to_compound = user_info.rewards;
        require!(rewards_to_compound > 0, StakingError::NoRewardsToClaim);
        
        msg!("Compounding rewards: {}", rewards_to_compound);
        
        // Update user state
        user_info.staked_amount = user_info.staked_amount.checked_add(rewards_to_compound).unwrap_or(user_info.staked_amount);
        user_info.rewards = 0;
        user_info.last_stake_time = current_time;
        
        // Update global state
        global_state.total_staked = global_state.total_staked.checked_add(rewards_to_compound).unwrap_or(global_state.total_staked);
        global_state.last_update_time = current_time;
        
        Ok(())
    }
    
    /// Add tokens to the reward pool
    pub fn add_to_reward_pool(ctx: Context<AddToRewardPool>, amount: u64) -> Result<()> {
        // First do the transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        // Then update state
        let global_state = &mut ctx.accounts.global_state;
        global_state.reward_pool = global_state.reward_pool.checked_add(amount).unwrap_or(global_state.reward_pool);
        global_state.last_update_time = Clock::get()?.unix_timestamp;
        
        msg!("Added to reward pool: {}", amount);
        
        Ok(())
    }
    
    /// Update staking parameters
    pub fn update_parameters(
        ctx: Context<UpdateParameters>,
        reward_rate: Option<u64>,
        unlock_duration: Option<i64>,
        early_unstake_penalty: Option<u64>,
        min_stake_amount: Option<u64>,
        referral_reward_rate: Option<u64>,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        
        // Only update parameters that are provided
        if let Some(rate) = reward_rate {
            global_state.reward_rate = rate;
            msg!("Updated reward rate: {}", rate);
        }
        
        if let Some(duration) = unlock_duration {
            global_state.unlock_duration = duration;
            msg!("Updated unlock duration: {} seconds", duration);
        }
        
        if let Some(penalty) = early_unstake_penalty {
            require!(penalty <= 5000, StakingError::PenaltyTooHigh); // Max 50%
            global_state.early_unstake_penalty = penalty;
            msg!("Updated early unstake penalty: {}%", penalty as f64 / 100.0);
        }
        
        if let Some(min_amount) = min_stake_amount {
            global_state.min_stake_amount = min_amount;
            msg!("Updated minimum stake amount: {}", min_amount);
        }
        
        if let Some(referral_rate) = referral_reward_rate {
            require!(referral_rate <= 2000, StakingError::ReferralRateTooHigh); // Max 20%
            global_state.referral_reward_rate = referral_rate;
            msg!("Updated referral reward rate: {}%", referral_rate as f64 / 100.0);
        }
        
        global_state.last_update_time = Clock::get()?.unix_timestamp;
        
        Ok(())
    }
    
    /// Get user staking info (view function)
    pub fn get_user_info(ctx: Context<GetUserInfo>) -> Result<UserInfoData> {
        let user_info = &ctx.accounts.user_info;
        let global_state = &ctx.accounts.global_state;
        
        // Calculate pending rewards
        let current_time = Clock::get()?.unix_timestamp;
        let mut pending_rewards = user_info.rewards;
        
        if user_info.staked_amount > 0 && current_time > user_info.last_stake_time {
            let time_passed = (current_time - user_info.last_stake_time) as u64;
            let reward = calculate_reward(
                user_info.staked_amount,
                time_passed,
                global_state.reward_rate,
            );
            pending_rewards = pending_rewards.checked_add(reward).unwrap_or(pending_rewards);
        }
        
        // Calculate unlock time
        let unlock_time = if user_info.staked_amount > 0 {
            user_info.last_stake_time + global_state.unlock_duration
        } else {
            0
        };
        
        // Calculate time until unlock
        let time_until_unlock = if current_time < unlock_time && user_info.staked_amount > 0 {
            Some(unlock_time - current_time)
        } else {
            None
        };
        
        Ok(UserInfoData {
            owner: user_info.owner,
            staked_amount: user_info.staked_amount,
            pending_rewards,
            last_stake_time: user_info.last_stake_time,
            last_claim_time: user_info.last_claim_time,
            referrer: user_info.referrer,
            referral_count: user_info.referral_count,
            total_referral_rewards: user_info.total_referral_rewards,
            time_until_unlock,
            is_locked: time_until_unlock.is_some(),
        })
    }
    
    /// Get global staking statistics (view function)
    pub fn get_vault_info(ctx: Context<GetVaultInfo>) -> Result<VaultInfoData> {
        let global_state = &ctx.accounts.global_state;
        
        // Calculate APY in percentage (reward_rate is in basis points)
        let apy = (global_state.reward_rate as f64 / 100.0) * 365.0;
        
        Ok(VaultInfoData {
            total_staked: global_state.total_staked,
            stakers_count: global_state.stakers_count,
            reward_pool: global_state.reward_pool,
            apy,
            unlock_duration: global_state.unlock_duration,
            early_unstake_penalty: global_state.early_unstake_penalty,
            referral_reward_rate: global_state.referral_reward_rate,
            min_stake_amount: global_state.min_stake_amount,
        })
    }
}

/// Calculate reward based on amount, time passed, and rate
fn calculate_reward(amount: u64, time_passed: u64, daily_rate: u64) -> u64 {
    let seconds_in_day: u64 = 86400;
    
    // Calculate daily reward: amount * rate / 10000 (rate is in basis points)
    let daily_reward = (amount as u128)
        .checked_mul(daily_rate as u128)
        .unwrap_or(0)
        .checked_div(10000)
        .unwrap_or(0);
    
    // Calculate reward for time passed: daily_reward * time_passed / seconds_in_day
    let reward = daily_reward
        .checked_mul(time_passed as u128)
        .unwrap_or(0)
        .checked_div(seconds_in_day as u128)
        .unwrap_or(0);
    
    reward as u64
}

/// Calculate referral reward based on amount and rate
fn calculate_referral_reward(amount: u64, referral_rate: u64) -> u64 {
    (amount as u128)
        .checked_mul(referral_rate as u128)
        .unwrap_or(0)
        .checked_div(10000)
        .unwrap_or(0) as u64
}

/// User information account
#[account]
#[derive(Default)]
pub struct UserInfo {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub rewards: u64,
    pub last_stake_time: i64,
    pub last_claim_time: i64,
    pub referrer: Option<Pubkey>,
    pub referral_count: u64,
    pub total_referral_rewards: u64,
}

impl UserInfo {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        8 + // staked_amount
        8 + // rewards
        8 + // last_stake_time
        8 + // last_claim_time
        33 + // referrer (Option<Pubkey>)
        8 + // referral_count
        8; // total_referral_rewards
}

/// Global state account
#[account]
#[derive(Default)]
pub struct GlobalState {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub vault: Pubkey,
    pub reward_rate: u64,  // In basis points (1/100 of a percent)
    pub unlock_duration: i64,  // In seconds
    pub early_unstake_penalty: u64,  // In basis points
    pub min_stake_amount: u64,
    pub referral_reward_rate: u64,  // In basis points
    pub total_staked: u64,
    pub stakers_count: u64,
    pub reward_pool: u64,
    pub last_update_time: i64,
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // token_mint
        32 + // vault
        8 + // reward_rate
        8 + // unlock_duration
        8 + // early_unstake_penalty
        8 + // min_stake_amount
        8 + // referral_reward_rate
        8 + // total_staked
        8 + // stakers_count
        8 + // reward_pool
        8 + // last_update_time
        1; // bump
}

/// User info data for return from get_user_info
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UserInfoData {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub pending_rewards: u64,
    pub last_stake_time: i64,
    pub last_claim_time: i64,
    pub referrer: Option<Pubkey>,
    pub referral_count: u64,
    pub total_referral_rewards: u64,
    pub time_until_unlock: Option<i64>,
    pub is_locked: bool,
}

/// Vault info data for return from get_vault_info
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VaultInfoData {
    pub total_staked: u64,
    pub stakers_count: u64,
    pub reward_pool: u64,
    pub apy: f64,
    pub unlock_duration: i64,
    pub early_unstake_penalty: u64,
    pub referral_reward_rate: u64,
    pub min_stake_amount: u64,
}

/// Initialize the staking vault and global state
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// Check if the token mint is valid
    #[account(
        constraint = token_mint.mint_authority == COption::Some(authority.key()) @ StakingError::InvalidMintAuthority
    )]
    pub token_mint: Account<'info, anchor_spl::token::Mint>,
    
    /// Token account that will act as the vault
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = global_state,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    /// Global state account
    #[account(
        init,
        payer = authority,
        space = GlobalState::LEN,
        seeds = [b"global_state".as_ref()],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

/// Register a new user
#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// User info account
    #[account(
        init,
        payer = owner,
        space = UserInfo::LEN,
        seeds = [b"user_info".as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub user_info: Account<'info, UserInfo>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// Stake tokens
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// Global state account
    #[account(
        mut,
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// User info account
    #[account(
        mut,
        seeds = [b"user_info".as_ref(), owner.key().as_ref()],
        bump,
        constraint = user_info.owner == owner.key() @ StakingError::InvalidOwner,
    )]
    pub user_info: Account<'info, UserInfo>,
    
    /// User token account
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ StakingError::InvalidOwner,
        constraint = user_token_account.mint == global_state.token_mint @ StakingError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Vault token account
    #[account(
        mut,
        constraint = vault.key() == global_state.vault @ StakingError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Update referrer rewards after a referred user stakes
#[derive(Accounts)]
pub struct UpdateReferrerRewards<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// Global state account - read only here
    #[account(
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// Referrer's user info account
    #[account(
        mut,
        seeds = [b"user_info".as_ref(), referrer_info.owner.as_ref()],
        bump,
    )]
    pub referrer_info: Account<'info, UserInfo>,
    
    pub system_program: Program<'info, System>,
}

/// Unstake tokens
#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// Global state account
    #[account(
        mut,
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// User info account
    #[account(
        mut,
        seeds = [b"user_info".as_ref(), owner.key().as_ref()],
        bump,
        constraint = user_info.owner == owner.key() @ StakingError::InvalidOwner,
    )]
    pub user_info: Account<'info, UserInfo>,
    
    /// User token account
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ StakingError::InvalidOwner,
        constraint = user_token_account.mint == global_state.token_mint @ StakingError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Vault token account
    #[account(
        mut,
        constraint = vault.key() == global_state.vault @ StakingError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Claim rewards
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// Global state account
    #[account(
        mut,
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// User info account
    #[account(
        mut,
        seeds = [b"user_info".as_ref(), owner.key().as_ref()],
        bump,
        constraint = user_info.owner == owner.key() @ StakingError::InvalidOwner,
    )]
    pub user_info: Account<'info, UserInfo>,
    
    /// User token account
    #[account(
        mut,
        constraint = user_token_account.owner == owner.key() @ StakingError::InvalidOwner,
        constraint = user_token_account.mint == global_state.token_mint @ StakingError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Vault token account
    #[account(
        mut,
        constraint = vault.key() == global_state.vault @ StakingError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Compound rewards
#[derive(Accounts)]
pub struct CompoundRewards<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    /// Global state account
    #[account(
        mut,
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// User info account
    #[account(
        mut,
        seeds = [b"user_info".as_ref(), owner.key().as_ref()],
        bump,
        constraint = user_info.owner == owner.key() @ StakingError::InvalidOwner,
    )]
    pub user_info: Account<'info, UserInfo>,
    
    pub system_program: Program<'info, System>,
}

/// Add tokens to reward pool
#[derive(Accounts)]
pub struct AddToRewardPool<'info> {
    #[account(
        mut,
        constraint = authority.key() == global_state.authority @ StakingError::Unauthorized,
    )]
    pub authority: Signer<'info>,
    
    /// Global state account
    #[account(
        mut,
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// User token account
    #[account(
        mut,
        constraint = user_token_account.owner == authority.key() @ StakingError::InvalidOwner,
        constraint = user_token_account.mint == global_state.token_mint @ StakingError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// Vault token account
    #[account(
        mut,
        constraint = vault.key() == global_state.vault @ StakingError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Update staking parameters
#[derive(Accounts)]
pub struct UpdateParameters<'info> {
    #[account(
        constraint = authority.key() == global_state.authority @ StakingError::Unauthorized,
    )]
    pub authority: Signer<'info>,
    
    /// Global state account
    #[account(
        mut,
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    pub system_program: Program<'info, System>,
}

/// Get user info read-only
#[derive(Accounts)]
pub struct GetUserInfo<'info> {
    /// User account to look up
    #[account()]
    pub owner: Signer<'info>,
    
    /// Global state account (read-only)
    #[account(
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    
    /// User info account (read-only)
    #[account(
        seeds = [b"user_info".as_ref(), owner.key().as_ref()],
        bump,
        constraint = user_info.owner == owner.key() @ StakingError::InvalidOwner,
    )]
    pub user_info: Account<'info, UserInfo>,
}

/// Get vault info read-only
#[derive(Accounts)]
pub struct GetVaultInfo<'info> {
    /// Global state account (read-only)
    #[account(
        seeds = [b"global_state".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
}

#[error_code]
pub enum StakingError {
    #[msg("Unauthorized operation")]
    Unauthorized,
    
    #[msg("Invalid owner")]
    InvalidOwner,
    
    #[msg("Invalid mint")]
    InvalidMint,
    
    #[msg("Invalid vault")]
    InvalidVault,
    
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    
    #[msg("Amount too small")]
    AmountTooSmall,
    
    #[msg("Insufficient staked amount")]
    InsufficientStakedAmount,
    
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    
    #[msg("Insufficient reward pool")]
    InsufficientRewardPool,
    
    #[msg("Early unstake penalty too high (max 50%)")]
    PenaltyTooHigh,
    
    #[msg("Referral reward rate too high (max 20%)")]
    ReferralRateTooHigh,
}