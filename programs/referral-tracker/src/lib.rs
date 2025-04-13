use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_program::{program::invoke_signed, system_instruction};
use std::convert::TryFrom;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Constants for fee distribution
const REFERRER_FEE_PERCENT: u8 = 5; // 5% to referrer
const STAKING_FEE_PERCENT: u8 = 2;  // 2% to staking pool
const MARKETING_FEE_PERCENT: u8 = 1; // 1% to marketing wallet

#[program]
pub mod referral_tracker {
    use super::*;

    // Initialize the referral program
    pub fn initialize(
        ctx: Context<Initialize>,
        admin_authority_bump: u8
    ) -> Result<()> {
        let referral_program = &mut ctx.accounts.referral_program;
        referral_program.authority = ctx.accounts.authority.key();
        referral_program.token_mint = ctx.accounts.token_mint.key();
        referral_program.admin_authority_bump = admin_authority_bump;
        referral_program.staking_vault = ctx.accounts.staking_vault.key();
        referral_program.marketing_wallet = ctx.accounts.marketing_wallet.key();
        referral_program.total_referred_amount = 0;
        referral_program.total_referral_rewards = 0;
        referral_program.referrer_count = 0;
        
        msg!("Referral program initialized!");
        Ok(())
    }

    // Register a referral code for a user
    pub fn register_referral_code(
        ctx: Context<RegisterReferralCode>,
        referral_code: String,
    ) -> Result<()> {
        require!(!referral_code.is_empty(), ErrorCode::EmptyReferralCode);
        require!(referral_code.len() <= 10, ErrorCode::ReferralCodeTooLong);
        
        // Check if this wallet already has a referral code
        let user = &mut ctx.accounts.user_info;
        require!(user.referral_code.is_empty(), ErrorCode::ReferralCodeAlreadyExists);
        
        // Set the referral code
        user.authority = ctx.accounts.user.key();
        user.referral_code = referral_code;
        user.total_referred = 0;
        user.total_rewards_earned = 0;
        user.referred_count = 0;
        
        // Update referral program stats
        let referral_program = &mut ctx.accounts.referral_program;
        referral_program.referrer_count = referral_program.referrer_count.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        
        msg!("Referral code registered: {}", user.referral_code);
        Ok(())
    }

    // Record a referral - called when someone buys tokens
    pub fn record_referral(
        ctx: Context<RecordReferral>,
        amount: u64,
        referral_code: String,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);
        require!(!referral_code.is_empty(), ErrorCode::EmptyReferralCode);
        
        // Get the referred user and check if they already have a referrer
        let referred_user = &mut ctx.accounts.referred_user;
        
        // Only allow setting referrer if this is the first time
        if referred_user.referrer.is_none() {
            // Verify the user can't refer themselves
            require!(ctx.accounts.referrer_info.authority != ctx.accounts.referred_user_wallet.key(), ErrorCode::SelfReferral);
            
            // Set the referrer
            referred_user.referrer = Some(ctx.accounts.referrer_info.authority);
            referred_user.authority = ctx.accounts.referred_user_wallet.key();
            
            msg!("First purchase - binding referrer {} to user {}", 
                ctx.accounts.referrer_info.authority, 
                ctx.accounts.referred_user_wallet.key());
        } else {
            // Verify the referrer matches (if already set)
            require!(
                referred_user.referrer.unwrap() == ctx.accounts.referrer_info.authority,
                ErrorCode::ReferrerMismatch
            );
            
            msg!("Repeat purchase - referrer already bound");
        }
        
        // Calculate rewards
        let referrer_reward = amount.checked_mul(REFERRER_FEE_PERCENT as u64).ok_or(ErrorCode::MathOverflow)?
                              .checked_div(100).ok_or(ErrorCode::MathOverflow)?;
        
        // Update referrer stats
        let referrer_info = &mut ctx.accounts.referrer_info;
        referrer_info.total_referred = referrer_info.total_referred.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        referrer_info.total_rewards_earned = referrer_info.total_rewards_earned.checked_add(referrer_reward).ok_or(ErrorCode::MathOverflow)?;
        referrer_info.referred_count = referrer_info.referred_count.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
        
        // Update global stats
        let referral_program = &mut ctx.accounts.referral_program;
        referral_program.total_referred_amount = referral_program.total_referred_amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        referral_program.total_referral_rewards = referral_program.total_referral_rewards.checked_add(referrer_reward).ok_or(ErrorCode::MathOverflow)?;
        
        // Record this referral in the ledger
        let referral_entry = &mut ctx.accounts.referral_entry;
        referral_entry.referrer = ctx.accounts.referrer_info.authority;
        referral_entry.referred = ctx.accounts.referred_user_wallet.key();
        referral_entry.amount = amount;
        referral_entry.reward = referrer_reward;
        referral_entry.timestamp = Clock::get()?.unix_timestamp;
        
        msg!("Referral recorded: {} SOL, reward: {} tokens", 
             amount as f64 / 1_000_000_000.0, // SOL amount
             referrer_reward as f64 / 1_000_000_000.0 // Token amount (assuming 9 decimals)
        );
        
        Ok(())
    }

    // Distribute fees from a token purchase
    pub fn distribute_fees(
        ctx: Context<DistributeFees>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);
        
        // Calculate fee distribution
        let referrer_amount = amount.checked_mul(REFERRER_FEE_PERCENT as u64).ok_or(ErrorCode::MathOverflow)?
                             .checked_div(100).ok_or(ErrorCode::MathOverflow)?;
        
        let staking_amount = amount.checked_mul(STAKING_FEE_PERCENT as u64).ok_or(ErrorCode::MathOverflow)?
                            .checked_div(100).ok_or(ErrorCode::MathOverflow)?;
        
        let marketing_amount = amount.checked_mul(MARKETING_FEE_PERCENT as u64).ok_or(ErrorCode::MathOverflow)?
                              .checked_div(100).ok_or(ErrorCode::MathOverflow)?;
        
        // Distribute to referrer if applicable
        if let Some(referrer) = ctx.accounts.referred_user.referrer {
            // Find the referrer's token account
            // In production, you'd validate and transfer to the referrer
            // For this code, we'll just log it
            msg!("Would transfer {} tokens to referrer: {}", 
                 referrer_amount as f64 / 1_000_000_000.0,
                 referrer);
        } else {
            // If no referrer, add this portion to staking pool
            let extra_staking = staking_amount.checked_add(referrer_amount).ok_or(ErrorCode::MathOverflow)?;
            msg!("No referrer - adding extra {} tokens to staking pool", 
                 extra_staking as f64 / 1_000_000_000.0);
        }
        
        // In production, transfer tokens to staking vault and marketing wallet here
        msg!("Would send {} tokens to staking vault", 
             staking_amount as f64 / 1_000_000_000.0);
        
        msg!("Would send {} tokens to marketing wallet", 
             marketing_amount as f64 / 1_000_000_000.0);
        
        Ok(())
    }

    // Claim referral rewards
    pub fn claim_rewards(
        ctx: Context<ClaimRewards>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);
        
        let referrer_info = &mut ctx.accounts.referrer_info;
        require!(referrer_info.claimable_rewards >= amount, ErrorCode::InsufficientRewards);
        
        // Update claimable rewards
        referrer_info.claimable_rewards = referrer_info.claimable_rewards.checked_sub(amount).ok_or(ErrorCode::MathOverflow)?;
        
        // Transfer tokens from vault to referrer
        let referral_program = &ctx.accounts.referral_program;
        let seeds = &[
            b"admin-authority",
            referral_program.to_account_info().key.as_ref(),
            &[referral_program.admin_authority_bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.referrer_token_account.to_account_info(),
            authority: ctx.accounts.admin_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;
        
        msg!("Claimed {} tokens in referral rewards", amount as f64 / 1_000_000_000.0);
        Ok(())
    }

    // Look up a referral code
    pub fn lookup_referral_code(
        ctx: Context<LookupReferralCode>,
        referral_code: String,
    ) -> Result<()> {
        require!(!referral_code.is_empty(), ErrorCode::EmptyReferralCode);
        
        // Referrer info is checked in the account constraint
        msg!("Referral code {} belongs to wallet: {}", 
             referral_code, 
             ctx.accounts.referrer_info.authority);
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(admin_authority_bump: u8)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + ReferralProgram::LEN
    )]
    pub referral_program: Account<'info, ReferralProgram>,
    
    pub token_mint: Account<'info, Mint>,
    
    /// CHECK: This is just a record of the staking vault address
    pub staking_vault: UncheckedAccount<'info>,
    
    /// CHECK: This is just a record of the marketing wallet address
    pub marketing_wallet: UncheckedAccount<'info>,
    
    /// CHECK: PDA that will be used to sign token transfers
    #[account(
        seeds = [b"admin-authority", referral_program.key().as_ref()],
        bump = admin_authority_bump,
    )]
    pub admin_authority: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(referral_code: String)]
pub struct RegisterReferralCode<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub referral_program: Account<'info, ReferralProgram>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserInfo::LEN,
        seeds = [b"user-info", user.key().as_ref()],
        bump,
    )]
    pub user_info: Account<'info, UserInfo>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, referral_code: String)]
pub struct RecordReferral<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub referral_program: Account<'info, ReferralProgram>,
    
    /// CHECK: The user who made the purchase
    pub referred_user_wallet: UncheckedAccount<'info>,
    
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + ReferredUser::LEN,
        seeds = [b"referred-user", referred_user_wallet.key().as_ref()],
        bump,
    )]
    pub referred_user: Account<'info, ReferredUser>,
    
    #[account(
        mut,
        constraint = referrer_info.referral_code == referral_code @ ErrorCode::InvalidReferralCode,
    )]
    pub referrer_info: Account<'info, UserInfo>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + ReferralEntry::LEN,
        seeds = [
            b"referral-entry",
            referrer_info.authority.as_ref(),
            referred_user_wallet.key().as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes(),
        ],
        bump,
    )]
    pub referral_entry: Account<'info, ReferralEntry>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DistributeFees<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub referral_program: Account<'info, ReferralProgram>,
    
    #[account(mut)]
    pub referred_user: Account<'info, ReferredUser>,
    
    #[account(
        mut,
        constraint = token_vault.mint == referral_program.token_mint,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = staking_vault.key() == referral_program.staking_vault,
    )]
    pub staking_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = marketing_wallet.owner.key() == referral_program.marketing_wallet,
    )]
    pub marketing_wallet: Account<'info, TokenAccount>,
    
    /// CHECK: PDA used to sign token transfers
    #[account(
        seeds = [b"admin-authority", referral_program.key().as_ref()],
        bump = referral_program.admin_authority_bump,
    )]
    pub admin_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = referrer_info.authority == user.key() @ ErrorCode::Unauthorized,
    )]
    pub referrer_info: Account<'info, UserInfo>,
    
    #[account(mut)]
    pub referral_program: Account<'info, ReferralProgram>,
    
    #[account(
        mut,
        constraint = token_vault.mint == referral_program.token_mint,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = referrer_token_account.mint == referral_program.token_mint,
        constraint = referrer_token_account.owner == user.key(),
    )]
    pub referrer_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: PDA used to sign token transfers
    #[account(
        seeds = [b"admin-authority", referral_program.key().as_ref()],
        bump = referral_program.admin_authority_bump,
    )]
    pub admin_authority: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(referral_code: String)]
pub struct LookupReferralCode<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        constraint = referrer_info.referral_code == referral_code @ ErrorCode::InvalidReferralCode,
    )]
    pub referrer_info: Account<'info, UserInfo>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ReferralProgram {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub staking_vault: Pubkey,
    pub marketing_wallet: Pubkey,
    pub admin_authority_bump: u8,
    pub total_referred_amount: u64,
    pub total_referral_rewards: u64,
    pub referrer_count: u64,
}

impl ReferralProgram {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 1 + 8 + 8 + 8;
}

#[account]
pub struct UserInfo {
    pub authority: Pubkey,
    pub referral_code: String,
    pub total_referred: u64,
    pub total_rewards_earned: u64,
    pub claimable_rewards: u64,
    pub referred_count: u64,
}

impl UserInfo {
    pub const LEN: usize = 32 + 11 + 8 + 8 + 8 + 8; // 11 bytes for the referral code (max 10 chars + null terminator)
}

#[account]
pub struct ReferredUser {
    pub authority: Pubkey,
    pub referrer: Option<Pubkey>,
}

impl ReferredUser {
    pub const LEN: usize = 32 + 33; // 33 bytes for Option<Pubkey>
}

#[account]
pub struct ReferralEntry {
    pub referrer: Pubkey,
    pub referred: Pubkey,
    pub amount: u64,
    pub reward: u64,
    pub timestamp: i64,
}

impl ReferralEntry {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    
    #[msg("Arithmetic operation overflow")]
    MathOverflow,
    
    #[msg("Empty referral code")]
    EmptyReferralCode,
    
    #[msg("Referral code too long (max 10 characters)")]
    ReferralCodeTooLong,
    
    #[msg("Referral code already exists for this user")]
    ReferralCodeAlreadyExists,
    
    #[msg("Invalid referral code")]
    InvalidReferralCode,
    
    #[msg("Cannot refer yourself")]
    SelfReferral,
    
    #[msg("Referrer mismatch")]
    ReferrerMismatch,
    
    #[msg("Insufficient rewards to claim")]
    InsufficientRewards,
    
    #[msg("Unauthorized")]
    Unauthorized,
}