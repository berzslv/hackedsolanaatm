#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Hacked ATM Token Polling Monitor...${NC}"
echo ""
echo -e "${YELLOW}This script uses polling instead of WebSockets to monitor your transactions.${NC}"
echo -e "${YELLOW}It should work reliably in any environment including WSL.${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop the monitor at any time."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run this script.${NC}"
  exit 1
fi

# Run the monitoring script
node polling-monitor.js