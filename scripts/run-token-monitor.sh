#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting HackATM Token Transaction Monitor...${NC}"
echo ""
echo -e "${YELLOW}This script monitors all transactions involving your specific token.${NC}"
echo -e "${YELLOW}It excludes all other token transfers and unrelated blockchain activity.${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop the monitor at any time."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run this script.${NC}"
  exit 1
fi

# Run the monitoring script
node token-specific-monitor.js