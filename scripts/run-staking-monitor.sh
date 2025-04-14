#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Hacked ATM Token Transaction Monitor...${NC}"
echo ""
echo -e "${YELLOW}This script will monitor both Solana token transfers and staking transactions${NC}"
echo -e "${YELLOW}for your Hacked ATM token on the Solana blockchain.${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop the monitor at any time."
echo ""

# Identify the JavaScript file to run based on NODE_ENV
if [ "$NODE_ENV" = "production" ]; then
  SCRIPT="multistep-transaction-monitor.js"
else
  SCRIPT="multistep-transaction-monitor.js" # Use same file for development/test
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run this script.${NC}"
  exit 1
fi

# Run the monitoring script
node "$SCRIPT"