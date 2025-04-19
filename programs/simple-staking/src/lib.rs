use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");

#[program]
pub mod simple_staking {
    use super::*;

    /// Initialize the staking vault
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Initialize the vault state
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.token_mint = ctx.accounts.token_mint.key();
        vault.token_vault = ctx.accounts.token_vault.key();
        vault.bump = *ctx.bumps.get("vault").unwrap();
        vault.vault_bump = *ctx.bumps.get("vault_authority").unwrap();
        
        msg!("Staking vault initialized");
        Ok(())
    }

    /// Register a new user
    pub fn register_user(ctx: Context<RegisterUser>) -> Result<()> {
        // Initialize the user staking info
        let user_info = &mut ctx.accounts.user_info;
        user_info.owner = ctx.accounts.user.key();
        user_info.amount_staked = 0;
        user_info.rewards_earned = 0;
        user_info.last_stake_timestamp = Clock::get()?.unix_timestamp;
        user_info.last_claim_timestamp = Clock::get()?.unix_timestamp;
        user_info.bump = *ctx.bumps.get("user_info").unwrap();
        
        msg!("User registered for staking");
        Ok(())
    }

    /// Stake tokens
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        // Get accounts
        let user = &ctx.accounts.user;
        let user_info = &mut ctx.accounts.user_info;
        let token_program = &ctx.accounts.token_program;
        let user_token_account = &ctx.accounts.user_token_account;
        let vault_token_account = &ctx.accounts.vault_token_account;

        // Create transfer instruction
        let cpi_accounts = Transfer {
            from: user_token_account.to_account_info(),
            to: vault_token_account.to_account_info(),
            authority: user.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(
            token_program.to_account_info(),
            cpi_accounts,
        );

        // Execute transfer
        token::transfer(cpi_ctx, amount)?;

        // Update user staking info
        user_info.amount_staked = user_info.amount_staked.checked_add(amount).unwrap();
        user_info.last_stake_timestamp = Clock::get()?.unix_timestamp;

        msg!("Staked {} tokens", amount);
        Ok(())
    }

    /// Unstake tokens
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        // Get accounts
        let user_info = &mut ctx.accounts.user_info;
        let vault = &ctx.accounts.vault;
        let vault_authority = &ctx.accounts.vault_authority;
        let vault_token_account = &ctx.accounts.vault_token_account;
        let user_token_account = &ctx.accounts.user_token_account;
        let token_program = &ctx.accounts.token_program;

        // Check if user has enough staked tokens
        require!(user_info.amount_staked >= amount, ErrorCode::InsufficientStake);

        // Create authority seeds for signing
        let vault_auth_seeds = &[b"vault_auth".as_ref(), &[vault.vault_bump]];
        let signer = &[&vault_auth_seeds[..]];

        // Transfer tokens back to user
        let cpi_accounts = Transfer {
            from: vault_token_account.to_account_info(),
            to: user_token_account.to_account_info(),
            authority: vault_authority.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            cpi_accounts,
            signer,
        );

        token::transfer(cpi_ctx, amount)?;

        // Update user staking info
        user_info.amount_staked = user_info.amount_staked.checked_sub(amount).unwrap();

        msg!("Unstaked {} tokens", amount);
        Ok(())
    }
}

#[account]
pub struct StakingVault {
    pub authority: Pubkey,        // Program wallet owner
    pub token_mint: Pubkey,       // Token mint address
    pub token_vault: Pubkey,      // Vault token account
    pub bump: u8,                 // Vault PDA bump
    pub vault_bump: u8,           // Vault authority bump
}

#[account]
pub struct UserStakeInfo {
    pub owner: Pubkey,                  // User wallet address
    pub amount_staked: u64,             // Amount of tokens staked
    pub rewards_earned: u64,            // Amount of tokens earned as rewards
    pub last_stake_timestamp: i64,      // Last stake timestamp
    pub last_claim_timestamp: i64,      // Last claim timestamp
    pub bump: u8,                       // PDA bump
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<StakingVault>(),
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, StakingVault>,
    
    #[account(
        seeds = [b"vault_auth"],
        bump
    )]
    /// CHECK: This is a PDA that will be used as the authority for token operations
    pub vault_authority: UncheckedAccount<'info>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        constraint = token_vault.mint == token_mint.key(),
        constraint = token_vault.owner == vault_authority.key(),
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<UserStakeInfo>(),
        seeds = [b"user_info", user.key().as_ref()],
        bump
    )]
    pub user_info: Account<'info, UserStakeInfo>,
    
    #[account(
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, StakingVault>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_info", user.key().as_ref()],
        bump = user_info.bump,
        constraint = user_info.owner == user.key()
    )]
    pub user_info: Account<'info, UserStakeInfo>,
    
    #[account(
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, StakingVault>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == vault.token_mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = vault_token_account.key() == vault.token_vault,
        constraint = vault_token_account.mint == vault.token_mint
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_info", user.key().as_ref()],
        bump = user_info.bump,
        constraint = user_info.owner == user.key()
    )]
    pub user_info: Account<'info, UserStakeInfo>,
    
    #[account(
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, StakingVault>,
    
    #[account(
        seeds = [b"vault_auth"],
        bump = vault.vault_bump
    )]
    /// CHECK: This is a PDA that serves as the vault authority
    pub vault_authority: UncheckedAccount<'info>,
    
    #[account(
        mut,
        constraint = vault_token_account.key() == vault.token_vault,
        constraint = vault_token_account.mint == vault.token_mint,
        constraint = vault_token_account.owner == vault_authority.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == vault.token_mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient staked tokens")]
    InsufficientStake,
}