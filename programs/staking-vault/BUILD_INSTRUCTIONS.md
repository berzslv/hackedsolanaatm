# Building the Staking Vault Program

Follow these simplified steps to build the staking vault program and generate the IDL file:

## Setup

1. Replace your existing files with the simplified templates:

```bash
# Copy the simplified Cargo.toml
cp Cargo.toml.template Cargo.toml

# Copy the simplified Rust program
cp src/lib.rs.simple src/lib.rs
```

2. Generate a program keypair if you don't have one:

```bash
# Create program keypair
solana-keygen new -o target/deploy/staking_vault-keypair.json

# Get the program ID
PROGRAM_ID=$(solana-keygen pubkey target/deploy/staking_vault-keypair.json)
echo "Your program ID is: $PROGRAM_ID"
```

3. Update the program ID in your code:

```bash
# Replace the placeholder with your actual program ID
sed -i "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" src/lib.rs
```

4. Also update the Anchor.toml file:

```bash
# Update the program ID in Anchor.toml
sed -i "s/staking_vault = \".*\"/staking_vault = \"$PROGRAM_ID\"/" ../../Anchor.toml
```

## Building the Program

```bash
# Build the program
anchor build
```

If the build succeeds, you'll find your IDL file at:
- `target/idl/staking_vault.json`

## Troubleshooting

If you encounter errors, try these steps:

1. Check Rust version compatibility:
```bash
rustup default stable
rustup update
rustup component add rust-src
```

2. Verify Anchor version (should match Cargo.toml):
```bash
anchor --version
```

3. If you have dependency issues, try cleaning and rebuilding:
```bash
cargo clean
anchor clean
anchor build
```

4. For program ID validation errors, make sure your program ID is valid:
```bash
solana-keygen verify <YOUR_PROGRAM_ID> target/deploy/staking_vault-keypair.json
```

## Copy the IDL for the Web App

Once you have successfully built the program, copy the IDL file to the web application:

```bash
cp target/idl/staking_vault.json ../../idl/
```

That's it! The web application will now use this IDL to interact with your smart contract.