# HATM Token Monitoring Service

A lightweight service for tracking Solana token transactions and staking events without requiring Anchor or BN.js. This service uses direct RPC polling to monitor wallets and transactions.

## Features

- Direct polling of Solana blockchain for token transfers and staking operations
- Stores transaction data in JSON files, no database required
- Provides simple API endpoints to retrieve transaction data
- Filters specifically for HATM token operations
- No dependency on Helius or other third-party services

## Setup Instructions for Railway

1. Create a new project in Railway.com

2. Connect your GitHub repository or use the Railway CLI to deploy

3. Set the following environment variables in Railway:
   - `PORT` (optional, defaults to 3000)
   - `SOLANA_NETWORK` - The Solana network to connect to (defaults to 'devnet')
   - `API_KEY` (optional) - API key for your RPC provider if using a paid one
   - `ADMIN_KEY` - A key for admin operations like clearing data
   - `POLLING_INTERVAL` (optional) - Polling interval in milliseconds (defaults to 60000)

4. Deploy the service

5. Add wallets to be monitored using the API endpoint

## API Endpoints

- `GET /` - Service info and status
- `GET /api/token-transfers` - Get all token transfer events
- `GET /api/staking-data` - Get all staking events
- `GET /api/staking-data/:walletAddress` - Get staking events for a specific wallet
- `GET /api/token-balance/:walletAddress` - Get token balance for a wallet
- `GET /api/monitored-wallets` - Get list of wallets being monitored
- `POST /api/add-wallet` - Add a wallet to monitoring (body: `{ "walletAddress": "..." }`)
- `POST /api/remove-wallet` - Remove a wallet from monitoring (body: `{ "walletAddress": "..." }`)
- `POST /api/poll-now` - Manually trigger transaction polling (requires admin-key header)
- `POST /api/clear-data` - Clear all stored data (requires admin-key header)

## Using with Your Frontend

From your frontend application, you can fetch the transaction data using:

```javascript
// Example using fetch
async function getTokenTransfers() {
  const response = await fetch('https://your-railway-app-url.railway.app/api/token-transfers');
  const data = await response.json();
  return data;
}

// Example using axios
async function getStakingData() {
  const response = await axios.get('https://your-railway-app-url.railway.app/api/staking-data');
  return response.data;
}

// Add your wallet to be monitored
async function addWalletToMonitor(walletAddress) {
  const response = await fetch('https://your-railway-app-url.railway.app/api/add-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress })
  });
  return response.json();
}

// Get token balance for your wallet
async function getTokenBalance(walletAddress) {
  const response = await fetch(`https://your-railway-app-url.railway.app/api/token-balance/${walletAddress}`);
  return response.json();
}
```

## How the Polling Works

1. When the service starts, it begins polling for transactions for all monitored wallets
2. Every `POLLING_INTERVAL` milliseconds (default: 1 minute), it checks for new transactions
3. When a transaction involving the HATM token or staking program is found, it's analyzed and stored
4. The data is accessible via the API endpoints at any time

## Removing the Need for Anchor and BN.js

This service completely eliminates the need for Anchor and BN.js by:
1. Using direct RPC calls to the Solana network with simple JSON parsing
2. Storing all data in simple JSON format without complex serialization/deserialization
3. Using Railway.com for hosting, which provides automatic scaling and deployment
4. Implementing a polling-based approach instead of relying on WebSockets or external services