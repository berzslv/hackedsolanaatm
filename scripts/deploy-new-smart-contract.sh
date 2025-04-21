#!/bin/bash

# This script builds and deploys the new smart contract

# Change to project root
cd "$(dirname "$0")/.."

# Stop on any error
set -e

echo "Building and deploying the new simple-staking contract..."

# Extract authority key from token-keypair.json and convert it to a format Anchor can use
echo "Preparing deployment keypair..."
node -e '
const fs = require("fs");
const keypairData = JSON.parse(fs.readFileSync("./token-keypair.json", "utf-8"));
const authSecretKey = Buffer.from(keypairData.authority.secretKey);
fs.writeFileSync("./deploy-keypair.json", JSON.stringify(Array.from(authSecretKey)));
'

# Update the wallet path in Anchor.toml temporarily
sed -i 's|wallet = "./token-keypair.json"|wallet = "./deploy-keypair.json"|g' Anchor.toml

echo "Building the new smart contract..."
anchor build

# Get the new program ID (we actually set it in lib.rs, so we're just echoing it here)
NEW_PROGRAM_ID="HD9d34ZJaYb7jQtwjrxLCxfiRKxiPj31VxaWwRwGcWc9"
echo "New Program ID: $NEW_PROGRAM_ID"

# Deploy the new program
echo "Deploying the new smart contract to Solana devnet..."
anchor deploy

echo "Smart contract deployment completed."

# Clean up
rm -f deploy-keypair.json
sed -i 's|wallet = "./deploy-keypair.json"|wallet = "./token-keypair.json"|g' Anchor.toml

echo "Deployment process completed successfully!"
echo "New Program ID: $NEW_PROGRAM_ID"