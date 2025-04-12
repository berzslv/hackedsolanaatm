# Staking Vault IDL Instructions

This directory is for placing your Staking Vault IDL (Interface Description Language) JSON file after you compile your Solana smart contract.

## How to use

1. After you compile your Anchor contract with `anchor build`, you'll find the generated IDL in:
   - `target/idl/staking_vault.json` (default location)
   - or `target/types/staking_vault.json` (TypeScript version)

2. Copy the IDL file to this directory and name it `staking_vault.json`

3. The application is configured to look for your IDL file in multiple places, including this directory.

## Why is this important?

The IDL file contains the interface definition for your smart contract. It includes:
- The contract's instructions (functions)
- Account structures
- Data types
- Events

Without a proper IDL file, the client application cannot properly interact with your smart contract.

## Current Implementation Details

Until you provide a real IDL file, the application uses a placeholder IDL that supports the following functionality:

- `initialize`: Sets up the staking vault
- `stake`: Stakes tokens in the vault
- `unstake`: Unstakes tokens from the vault
- `claimRewards`: Claims staking rewards

Once you upload your real IDL, the application will use that instead, allowing for true on-chain interaction with your deployed smart contract.

## Contract Requirements

Your smart contract should implement these key accounts:

1. `StakingVault` account with fields:
   - `authority`: PublicKey
   - `tokenMint`: PublicKey
   - `tokenVault`: PublicKey
   - `totalStaked`: u64
   - `rewardPool`: u64
   - `stakersCount`: u32
   - `currentApyBasisPoints`: u32

2. `UserStake` account with fields:
   - `owner`: PublicKey
   - `amountStaked`: u64
   - `stakedAt`: i64
   - `lastClaimAt`: i64

The application is designed to work with these account structures, so ensure your smart contract implements them similarly.