# Referral Staking Smart Contract

A combined referral and staking system for the HATM token on Solana.

## Features

### Staking Features
- Token staking with rewards calculation based on time and stake amount
- Configurable daily reward rate (APY)
- 7-day locking period with early unstaking penalties
- Auto-compounding rewards option
- Rewards claiming

### Referral Features
- Track referral relationships on-chain
- Reward referrers when their referred users stake tokens
- Track referral count and total referral rewards per user

## Technical Design

### Accounts
1. `GlobalState` - Stores global configuration and statistics
   - Authority
   - Token mint
   - Vault address
   - Reward rate
   - Unlock duration
   - Penalties
   - Total staked
   - Stakers count
   - Reward pool

2. `UserInfo` - Stores per-user staking and referral data
   - Wallet address
   - Staked amount
   - Pending rewards
   - Last stake/claim times
   - Referrer (if any)
   - Referral count
   - Total referral rewards

### Key Functions
- `initialize` - Set up the staking vault and global state
- `registerUser` - Register a user with optional referrer
- `stake` - Stake tokens into the vault
- `unstake` - Unstake tokens with potential early withdrawal penalties
- `claimRewards` - Claim accumulated rewards
- `compoundRewards` - Add rewards to staked amount
- `addToRewardPool` - Add tokens to the reward pool for distribution
- `updateParameters` - Update staking parameters (admin only)

## Deployment

To deploy this contract:

1. Build the contract:
   ```
   anchor build
   ```

2. Deploy to devnet:
   ```
   anchor deploy
   ```

3. Initialize the contract with:
   ```
   anchor run initialize
   ```

## Interaction

The contract can be interacted with through:
- Anchor client in JavaScript/TypeScript
- Direct program calls via Solana's web3.js

## Security Considerations

- The contract implements checks to prevent unauthorized access
- Early unstaking penalties are capped at 50%
- Referral rewards are capped at 20%
- All math operations use checked arithmetic to prevent overflows

## Future Improvements

- Tiered staking rewards based on staking duration
- Token vesting schedules
- Enhanced referral tiers and gamification
- NFT staking integration