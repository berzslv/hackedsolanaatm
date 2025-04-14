# HATM Token Monitoring Service

A lightweight service that receives and processes Helius webhooks for tracking Solana token transactions and staking events without requiring Anchor or BN.js.

## Features

- Receives webhook events from Helius about token transfers and staking operations
- Stores transaction data in JSON files, no database required
- Provides simple API endpoints to retrieve transaction data
- Filters specifically for HATM token operations

## Setup Instructions for Railway

1. Create a new project in Railway.com

2. Connect your GitHub repository or use the Railway CLI to deploy

3. Set the following environment variables in Railway:
   - `PORT` (optional, defaults to 3000)
   - `HELIUS_WEBHOOK_SECRET` - The secret used to authenticate Helius webhooks
   - `ADMIN_KEY` (optional) - A key for admin operations like clearing data

4. Deploy the service

5. Configure your Helius webhook to point to your Railway app:
   - URL: `https://your-railway-app-url.railway.app/webhook/transaction`
   - Header: 
     - Key: `x-api-key`
     - Value: Your `HELIUS_WEBHOOK_SECRET` value

## API Endpoints

- `GET /` - Service info and status
- `GET /api/token-transfers` - Get all token transfer events
- `GET /api/staking-data` - Get all staking events
- `GET /api/staking-data/:walletAddress` - Get staking events for a specific wallet
- `POST /webhook/transaction` - Endpoint for Helius webhooks
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
```

## Helius Webhook Setup

1. Go to the [Helius Dashboard](https://dev.helius.xyz/dashboard)
2. Create a webhook with the following settings:
   - Webhook URL: `https://your-railway-app-url.railway.app/webhook/transaction`
   - Auth Header: `x-api-key` with value matching your `HELIUS_WEBHOOK_SECRET`
   - Filter for events related to your token: `59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk`

## Removing the Need for Anchor and BN.js

This service completely eliminates the need for Anchor and BN.js by:
1. Using simple transaction receipt data from Helius instead of parsing on-chain data directly
2. Storing all data in simple JSON format without complex serialization/deserialization
3. Using Railway.com for hosting, which provides automatic scaling and deployment