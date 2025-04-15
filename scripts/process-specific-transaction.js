/**
 * Process Specific Transaction
 * 
 * This script will manually process a specific transaction ID through our Railway system
 * to ensure it's properly captured in our database.
 * 
 * Usage:
 * node scripts/process-specific-transaction.js
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAILWAY_DIR = path.join(__dirname, '..', 'railway');

// Import helpers from railway/index.js (simplified version)
async function callSolanaRpc(method, params = []) {
  try {
    const response = await axios.post(
      'https://api.devnet.solana.com',
      {
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error) {
      console.error('RPC error:', response.data.error);
      return null;
    }

    return response.data.result;
  } catch (error) {
    console.error(`Error calling RPC method ${method}:`, error.message);
    return null;
  }
}

function loadData(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
    return null;
  }
}

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
    return false;
  }
}

// Data file paths
const TOKEN_TRANSFERS_FILE = path.join(RAILWAY_DIR, 'data', 'token_transfers.json');
const STAKING_DATA_FILE = path.join(RAILWAY_DIR, 'data', 'staking_data.json');
const WALLETS_TO_MONITOR_FILE = path.join(RAILWAY_DIR, 'data', 'monitored_wallets.json');

// Your transaction signature
const TRANSACTION_SIGNATURE = 'tDdPdrFWs6QcsGzLXH7caYFvCVdRJ7XrDQgJEoRKtQJskGjK8rqAijkTtzkPveMczkw3Bw6KQSgBavktJjEVdDC';

// The wallet you're processing for
const WALLET_ADDRESS = '9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX';

// Process this specific transaction
async function processTransaction() {
  console.log(`Processing transaction ${TRANSACTION_SIGNATURE}`);
  
  // Get transaction details
  const txData = await callSolanaRpc('getTransaction', [TRANSACTION_SIGNATURE, { encoding: 'jsonParsed' }]);
  
  if (!txData) {
    console.error(`Could not retrieve transaction data for ${TRANSACTION_SIGNATURE}`);
    return;
  }
  
  console.log('Transaction data retrieved successfully');
  
  // Create data directories if they don't exist
  const dataDir = path.join(RAILWAY_DIR, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Initialize files if they don't exist
  if (!fs.existsSync(TOKEN_TRANSFERS_FILE)) {
    fs.writeFileSync(TOKEN_TRANSFERS_FILE, JSON.stringify({ transfers: [] }));
  }
  
  if (!fs.existsSync(STAKING_DATA_FILE)) {
    fs.writeFileSync(STAKING_DATA_FILE, JSON.stringify({ 
      stakingData: {}, 
      events: [],
      globalStats: {
        totalStaked: 0,
        stakersCount: 0,
        currentAPY: 0,
        lastUpdated: new Date().toISOString()
      }
    }));
  }
  
  if (!fs.existsSync(WALLETS_TO_MONITOR_FILE)) {
    fs.writeFileSync(WALLETS_TO_MONITOR_FILE, JSON.stringify({ wallets: [] }));
  }
  
  // First, make sure the wallet is being monitored
  const walletsData = loadData(WALLETS_TO_MONITOR_FILE);
  if (walletsData && !walletsData.wallets.includes(WALLET_ADDRESS)) {
    walletsData.wallets.push(WALLET_ADDRESS);
    saveData(WALLETS_TO_MONITOR_FILE, walletsData);
    console.log(`Added wallet ${WALLET_ADDRESS} to monitoring`);
  }
  
  // Process as a token transfer
  const tokenTransfersData = loadData(TOKEN_TRANSFERS_FILE);
  if (tokenTransfersData) {
    // Check if this transaction is already in our database
    const existingTransfer = tokenTransfersData.transfers.find(t => t.signature === TRANSACTION_SIGNATURE);
    
    if (!existingTransfer) {
      // Create a new transfer record
      const transferData = {
        signature: TRANSACTION_SIGNATURE,
        fromWallet: txData.transaction?.message?.accountKeys?.[0]?.pubkey || 'unknown',
        toWallet: WALLET_ADDRESS,
        amount: 1000, // Hardcoded based on inspecting the transaction
        timestamp: new Date().toISOString(),
        blockTime: txData.blockTime ? new Date(txData.blockTime * 1000).toISOString() : null
      };
      
      console.log('Adding token transfer:', transferData);
      
      // Add to transfers list
      tokenTransfersData.transfers.push(transferData);
      
      // Save updated data
      saveData(TOKEN_TRANSFERS_FILE, tokenTransfersData);
      console.log('Token transfer data saved successfully');
    } else {
      console.log('Transfer already in database, skipping.');
    }
  }
  
  // Process as a staking event
  const stakingData = loadData(STAKING_DATA_FILE);
  if (stakingData) {
    // Check if this transaction is already in our events
    const existingEvent = stakingData.events.find(e => e.signature === TRANSACTION_SIGNATURE);
    
    if (!existingEvent) {
      // Create a staking event record
      const stakingEvent = {
        signature: TRANSACTION_SIGNATURE,
        type: 'stake',
        walletAddress: WALLET_ADDRESS,
        amount: 1000, // Hardcoded based on inspecting the transaction
        timestamp: new Date().toISOString(),
        blockTime: txData.blockTime ? new Date(txData.blockTime * 1000).toISOString() : null
      };
      
      console.log('Adding staking event:', stakingEvent);
      
      // Add to events list
      if (!stakingData.events) {
        stakingData.events = [];
      }
      stakingData.events.push(stakingEvent);
      
      // Update wallet-specific staking data
      if (!stakingData.stakingData[WALLET_ADDRESS]) {
        stakingData.stakingData[WALLET_ADDRESS] = {
          amountStaked: 0,
          pendingRewards: 0,
          lastUpdateTime: new Date().toISOString(),
          stakedAt: null,
          eventCount: 0
        };
      }
      
      const walletStakingData = stakingData.stakingData[WALLET_ADDRESS];
      walletStakingData.eventCount++;
      walletStakingData.lastUpdateTime = new Date().toISOString();
      walletStakingData.amountStaked += 1000; // Add the staked amount
      if (!walletStakingData.stakedAt) {
        walletStakingData.stakedAt = new Date().toISOString();
      }
      
      // Update global stats
      if (!stakingData.globalStats) {
        stakingData.globalStats = {
          totalStaked: 0,
          stakersCount: 0,
          currentAPY: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Calculate total staked and stakers count
      let totalStaked = 0;
      let stakersCount = 0;
      
      for (const [_, data] of Object.entries(stakingData.stakingData)) {
        if (data.amountStaked > 0) {
          totalStaked += data.amountStaked;
          stakersCount++;
        }
      }
      
      // Update global stats
      stakingData.globalStats.totalStaked = totalStaked;
      stakingData.globalStats.stakersCount = stakersCount;
      stakingData.globalStats.lastUpdated = new Date().toISOString();
      stakingData.globalStats.currentAPY = 12; // 12% APY
      
      // Save updated data
      saveData(STAKING_DATA_FILE, stakingData);
      console.log('Staking data saved successfully');
    } else {
      console.log('Staking event already in database, skipping.');
    }
  }
  
  console.log('Transaction processing complete!');
}

// Execute the script
processTransaction().catch(error => {
  console.error('Error processing transaction:', error);
});