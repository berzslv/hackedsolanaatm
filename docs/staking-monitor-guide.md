# Hacked ATM Token Staking Monitoring Guide

This guide explains how to use the transaction monitoring tools to track your staking contract activity.

## Overview

The HATM staking platform includes robust transaction monitoring tools that allow you to:

1. Track staking, unstaking, and reward claim transactions
2. Monitor token transfers for the HATM token
3. Capture transaction logs for debugging and verification

## Staking Smart Contract

The Hacked ATM Token staking is powered by our on-chain smart contract with the following details:

- **Staking Program ID**: `EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm`
- **Token Mint Address**: `12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5`
- **Network**: Solana Devnet

## Monitoring Tools

### 1. Standalone Transaction Monitor

The standalone monitor watches transactions in real-time without requiring the full application to be running.

**To use the standalone monitor:**

```bash
# Run from project root
./scripts/run-staking-monitor.sh
```

This will start a detailed monitoring session that shows:
- Staking events (stake, unstake, claim)
- Token transfers for the HATM token
- Account information and balance changes
- Full transaction logs

**Sample output:**

```
[2025-04-14 10:30:15] ℹ️ Starting to monitor staking program: EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm
[2025-04-14 10:30:15] ℹ️ Token mint: 12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5
[2025-04-14 10:30:15] ℹ️ Network: devnet
[2025-04-14 10:30:15] ℹ️ Waiting for transactions... (This could take a while if there is no activity)
[2025-04-14 10:31:22] 🔔 ═════════════════════════════════════════
[2025-04-14 10:31:22] 🔔 New staking program transaction: 4eS7TgKXNdPDB5AfxNtTQD7KpRjQZCEJvnQEg7hJJ6KRfP2VSAw7bWn1WnUqZcWh94eS6WZQDnL8f4UgUG2Y2GVZ
[2025-04-14 10:31:22] ✅ STAKE transaction detected! - 4eS7TgKXNdPDB5AfxNtTQD7KpRjQZCEJvnQEg7hJJ6KRfP2VSAw7bWn1WnUqZcWh94eS6WZQDnL8f4UgUG2Y2GVZ
...
```

Press `Ctrl+C` to stop the monitor.

### 2. Integrated Application Monitoring

When the main application is running, it automatically integrates with the staking contract to capture and process transactions. This allows the website to update balances and statistics in real-time.

The integrated monitor:
- Updates user staking balances on the website
- Maintains staking statistics
- Processes reward calculations
- Updates the referral system

You can see this data updating on the website dashboard when transactions occur.

### 3. Transaction Debugging

For developers and advanced users:

```bash
# Run the detailed transaction monitor
node scripts/monitor-staking-events.js
```

This script provides more technical details about each transaction, including:
- Complete account key list
- Token balance changes
- Instruction data
- Detailed logs for debugging

## How Transactions Are Monitored

Behind the scenes, these tools use Solana's WebSocket API to subscribe to program logs in real-time. When any interaction with the staking contract occurs, the monitor:

1. Receives the transaction notification
2. Analyzes the transaction logs to determine the transaction type
3. Fetches full transaction details including accounts involved
4. Processes and displays relevant information

The staking program recognizes several transaction types:
- **Stake** - Adding tokens to the staking vault
- **Unstake** - Withdrawing tokens from the staking vault
- **Claim** - Harvesting earned rewards
- **Compound** - Reinvesting rewards automatically

## Troubleshooting

If you don't see transactions appearing in the monitor:

1. Verify you're connected to the correct network (Devnet)
2. Check that you're using the correct program ID and token mint
3. Ensure your WebSocket connection is active
4. Try restarting the monitor script

For persistent issues, examine your browser console for any connection errors.

## Next Steps

To perform test transactions that will appear in the monitor:

1. Connect your wallet on the website
2. Click "Request Airdrop" to get test tokens
3. Stake some tokens using the staking widget
4. Observe the transactions in the monitor

This allows you to verify the staking system end-to-end and confirm your transactions are being recorded correctly.