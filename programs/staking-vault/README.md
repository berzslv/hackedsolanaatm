# Staking Vault Smart Contract

This directory contains the Solana-based smart contract for the HackATM token staking vault. Below are instructions for building, testing, and deploying the smart contract.

## Prerequisites

- Rust and Cargo installed (https://www.rust-lang.org/tools/install)
- Solana CLI tools installed (https://docs.solana.com/cli/install-solana-cli-tools)
- Anchor framework installed (https://www.anchor-lang.com/docs/installation)

## Project Structure

```
staking-vault/
├── src/
│   └── lib.rs          # Main contract code
├── Cargo.toml          # Rust dependencies
└── Xargo.toml          # BPF build configuration
```

## Building the Contract

1. From the project root directory (not this directory), build the smart contract:

```bash
anchor build
```

This will:
- Compile your Rust smart contract code
- Generate the IDL file located at `target/idl/staking_vault.json`
- Generate TypeScript bindings in `target/types/staking_vault.ts`
- Create a deployable program binary

## Testing the Contract

1. Create a local test validator:

```bash
solana-test-validator
```

2. Run the test suite:

```bash
anchor test
```

## Deploying to Devnet/Mainnet

1. Make sure you have a funded wallet:

```bash
solana config set --url devnet
solana airdrop 2 # Only on devnet
```

2. Update the program ID in `Anchor.toml` and `lib.rs` with your new program ID:

```bash
solana-keygen new -o staking-vault-keypair.json
anchor keys list
```

3. Update your `declare_id!` macro in `lib.rs` with the new program ID.

4. Deploy the program:

```bash
anchor deploy
```

5. Verify the deployment:

```bash
solana program show <YOUR_PROGRAM_ID>
```

## Integrating with Frontend

After deploying, make sure to:

1. Copy the generated IDL from `target/idl/staking_vault.json` to the `idl/staking_vault.json` folder in the project root.

2. Update the Program ID in the frontend code to match your deployed contract.

## Contract Design

The staking vault smart contract implements the following features:

- Token staking with 7-day lock period
- Early unstaking with 10% penalty
- Dynamic APY that can be adjusted by admin
- Automatic reward distribution based on staking duration
- Reward pool that can be topped up by admin

The main contract operations are:
- `initialize`: Set up the staking vault and token vault
- `stake`: Deposit tokens into the staking vault
- `unstake`: Withdraw tokens from the staking vault (with potential early withdrawal fee)
- `claimRewards`: Claim staking rewards
- `updateApy`: Update the APY (admin only)
- `addToRewardPool`: Add tokens to the reward pool (admin only)

## Important Notes

- The contract uses PDAs (Program Derived Addresses) for staking vault and user stake accounts
- The staking vault is the authority for the token vault, allowing it to transfer tokens
- User stake accounts are created for each staker to track their stake amount and timing
- APY is specified in basis points (1% = 100 basis points) for precise calculations
- The contract maintains a reward pool that's distributed to stakers based on their stake amount and duration
- Early unstaking fees are added to the reward pool to benefit loyal stakers