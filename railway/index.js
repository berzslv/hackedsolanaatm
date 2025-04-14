import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Config
const PORT = process.env.PORT || 3000;
const TOKEN_MINT = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
const STAKING_PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const API_KEY = process.env.API_KEY || ''; // API key for your RPC provider
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin'; // For admin operations
const POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL || '60000', 10); // Default 1 minute

// RPC endpoints
const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
  // You can add other RPCs here if needed
  // Add your preferred RPC providers here
};

// Data storage
const DATA_DIR = join(__dirname, 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const TOKEN_TRANSFERS_FILE = join(DATA_DIR, 'token_transfers.json');
const STAKING_DATA_FILE = join(DATA_DIR, 'staking_data.json');
const WALLETS_TO_MONITOR_FILE = join(DATA_DIR, 'monitored_wallets.json');

// Initialize empty data files if they don't exist
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

// Track seen transactions
const seenTransactions = new Set();

// Helper Functions
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

// Get RPC endpoint based on network
function getRpcEndpoint() {
  return RPC_ENDPOINTS[NETWORK] || RPC_ENDPOINTS.devnet;
}

// Make RPC call to Solana
async function callSolanaRpc(method, params = []) {
  try {
    const response = await axios.post(
      getRpcEndpoint(),
      {
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Add API key header if provided
          ...(API_KEY && { 'x-api-key': API_KEY })
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

// Polling function to get transactions for monitored wallets
async function pollTransactions() {
  console.log(`[${new Date().toISOString()}] Polling for transactions...`);
  
  // Load wallets to monitor
  const walletsData = loadData(WALLETS_TO_MONITOR_FILE);
  if (!walletsData || !walletsData.wallets || !walletsData.wallets.length) {
    console.log('No wallets to monitor');
    return;
  }

  // Get signatures for each wallet
  for (const wallet of walletsData.wallets) {
    try {
      console.log(`Checking transactions for wallet: ${wallet}`);
      
      // Get recent signatures for this wallet
      const signatures = await callSolanaRpc('getSignaturesForAddress', [wallet, { limit: 10 }]);
      
      if (!signatures || !signatures.length) {
        console.log(`No recent transactions found for wallet: ${wallet}`);
        continue;
      }
      
      // Process each signature
      for (const sigInfo of signatures) {
        const signature = sigInfo.signature;
        
        // Skip if we've already seen this transaction
        if (seenTransactions.has(signature)) {
          continue;
        }
        
        console.log(`Found new transaction: ${signature}`);
        seenTransactions.add(signature);
        
        // Get transaction details
        const txData = await callSolanaRpc('getTransaction', [signature, { encoding: 'jsonParsed' }]);
        
        if (!txData) {
          console.log(`Could not retrieve transaction data for ${signature}`);
          continue;
        }
        
        // Process the transaction
        await processTransaction(txData, signature, wallet);
      }
    } catch (error) {
      console.error(`Error polling transactions for wallet ${wallet}:`, error.message);
    }
  }
  
  console.log(`[${new Date().toISOString()}] Polling complete`);
}

// Process a transaction
async function processTransaction(txData, signature, wallet) {
  try {
    // Check if this is a token transfer
    const isTokenTransfer = isTokenTransferTransaction(txData, TOKEN_MINT);
    
    if (isTokenTransfer) {
      await processTokenTransfer(txData, signature, wallet);
    }
    
    // Check if this is a staking operation
    const isStakingOperation = isStakingTransaction(txData, STAKING_PROGRAM_ID);
    
    if (isStakingOperation) {
      await processStakingOperation(txData, signature, wallet);
    }
  } catch (error) {
    console.error(`Error processing transaction ${signature}:`, error.message);
  }
}

// Determine if a transaction is a token transfer
function isTokenTransferTransaction(txData, tokenMint) {
  // Check if the transaction contains token balance changes
  if (!txData.meta || !txData.meta.preTokenBalances || !txData.meta.postTokenBalances) {
    return false;
  }
  
  // Check if any of the token balances involve our mint
  const allTokenBalances = [
    ...txData.meta.preTokenBalances,
    ...txData.meta.postTokenBalances
  ];
  
  return allTokenBalances.some(balance => balance.mint === tokenMint);
}

// Determine if a transaction is a staking operation
function isStakingTransaction(txData, stakingProgramId) {
  // Check if the transaction involves the staking program
  if (!txData.transaction || !txData.transaction.message || !txData.transaction.message.accountKeys) {
    return false;
  }
  
  return txData.transaction.message.accountKeys.some(
    key => key.pubkey === stakingProgramId
  );
}

// Process a token transfer transaction
async function processTokenTransfer(txData, signature, wallet) {
  console.log(`Processing token transfer: ${signature}`);
  
  const tokenTransfersData = loadData(TOKEN_TRANSFERS_FILE);
  if (!tokenTransfersData) {
    console.error('Could not load token transfers data');
    return;
  }
  
  // Extract token transfer details
  let fromWallet = 'unknown';
  let toWallet = 'unknown';
  let amount = 0;
  
  try {
    // Analyze token balance changes
    if (txData.meta && txData.meta.preTokenBalances && txData.meta.postTokenBalances) {
      const preBalances = txData.meta.preTokenBalances.filter(
        bal => bal.mint === TOKEN_MINT
      );
      
      const postBalances = txData.meta.postTokenBalances.filter(
        bal => bal.mint === TOKEN_MINT
      );
      
      // Look for balance decreases (sending)
      for (const pre of preBalances) {
        const post = postBalances.find(p => p.accountIndex === pre.accountIndex);
        const preAmount = pre.uiTokenAmount.uiAmount || 0;
        const postAmount = post ? post.uiTokenAmount.uiAmount || 0 : 0;
        
        if (postAmount < preAmount) {
          // This account sent tokens
          fromWallet = txData.transaction.message.accountKeys[pre.accountIndex].pubkey;
          amount = preAmount - postAmount;
          break;
        }
      }
      
      // Look for balance increases (receiving)
      for (const post of postBalances) {
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        const preAmount = pre ? pre.uiTokenAmount.uiAmount || 0 : 0;
        const postAmount = post.uiTokenAmount.uiAmount || 0;
        
        if (postAmount > preAmount) {
          // This account received tokens
          toWallet = txData.transaction.message.accountKeys[post.accountIndex].pubkey;
          // If amount not set by sender check, use this
          if (amount === 0) {
            amount = postAmount - preAmount;
          }
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error extracting token transfer details:', error.message);
  }
  
  // Create transfer record
  const transferData = {
    signature,
    fromWallet,
    toWallet,
    amount,
    timestamp: new Date().toISOString(),
    blockTime: txData.blockTime ? new Date(txData.blockTime * 1000).toISOString() : null
  };
  
  console.log('Token transfer data:', transferData);
  
  // Add to transfers list
  tokenTransfersData.transfers.push(transferData);
  
  // Save updated data
  saveData(TOKEN_TRANSFERS_FILE, tokenTransfersData);
}

// Process a staking operation
async function processStakingOperation(txData, signature, wallet) {
  console.log(`Processing staking operation: ${signature}`);
  
  const stakingData = loadData(STAKING_DATA_FILE);
  if (!stakingData) {
    console.error('Could not load staking data');
    return;
  }
  
  // Determine operation type from logs
  let eventType = 'unknown';
  let amount = 0;
  let walletAddress = wallet;
  
  try {
    if (txData.meta && txData.meta.logMessages) {
      const logs = txData.meta.logMessages;
      const logText = logs.join(' ');
      
      if (logText.toLowerCase().includes('stake')) {
        eventType = 'stake';
      } else if (logText.toLowerCase().includes('unstake')) {
        eventType = 'unstake';
      } else if (logText.toLowerCase().includes('claim')) {
        eventType = 'claim';
      } else if (logText.toLowerCase().includes('reward')) {
        eventType = 'reward';
      }
      
      // Try to extract amount from logs (simplified)
      const amountMatch = logText.match(/amount: (\d+)/i);
      if (amountMatch && amountMatch[1]) {
        amount = parseInt(amountMatch[1], 10);
      }
    }
  } catch (error) {
    console.error('Error determining staking operation type:', error.message);
  }
  
  // Create staking event record
  const stakingEvent = {
    signature,
    type: eventType,
    walletAddress,
    amount,
    timestamp: new Date().toISOString(),
    blockTime: txData.blockTime ? new Date(txData.blockTime * 1000).toISOString() : null
  };
  
  console.log('Staking event data:', stakingEvent);
  
  // Make sure events array exists
  if (!stakingData.events) {
    stakingData.events = [];
  }
  
  // Add to events list
  stakingData.events.push(stakingEvent);
  
  // Update wallet-specific staking data
  if (!stakingData.stakingData[walletAddress]) {
    stakingData.stakingData[walletAddress] = {
      amountStaked: 0,
      pendingRewards: 0,
      lastUpdateTime: new Date().toISOString(),
      eventCount: 0
    };
  }
  
  const walletStakingData = stakingData.stakingData[walletAddress];
  walletStakingData.eventCount++;
  walletStakingData.lastUpdateTime = new Date().toISOString();
  
  // Update staking amount based on event type
  if (eventType === 'stake') {
    walletStakingData.amountStaked += amount;
  } else if (eventType === 'unstake') {
    walletStakingData.amountStaked = Math.max(0, walletStakingData.amountStaked - amount);
  } else if (eventType === 'claim') {
    walletStakingData.pendingRewards = 0;
  }
  
  // Save updated data
  saveData(STAKING_DATA_FILE, stakingData);
}

// Add a wallet to monitor
app.post('/api/add-wallet', (req, res) => {
  const { walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  
  try {
    const walletsData = loadData(WALLETS_TO_MONITOR_FILE);
    
    if (!walletsData) {
      return res.status(500).json({ error: 'Error loading wallets data' });
    }
    
    // Check if wallet is already being monitored
    if (walletsData.wallets.includes(walletAddress)) {
      return res.status(200).json({ 
        success: true, 
        message: 'Wallet is already being monitored',
        wallets: walletsData.wallets 
      });
    }
    
    // Add the wallet to the list
    walletsData.wallets.push(walletAddress);
    
    // Save updated data
    saveData(WALLETS_TO_MONITOR_FILE, walletsData);
    
    return res.status(200).json({
      success: true,
      message: 'Wallet added successfully',
      wallets: walletsData.wallets
    });
  } catch (error) {
    console.error('Error adding wallet:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a wallet from monitoring
app.post('/api/remove-wallet', (req, res) => {
  const { walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  
  try {
    const walletsData = loadData(WALLETS_TO_MONITOR_FILE);
    
    if (!walletsData) {
      return res.status(500).json({ error: 'Error loading wallets data' });
    }
    
    // Remove the wallet from the list
    walletsData.wallets = walletsData.wallets.filter(w => w !== walletAddress);
    
    // Save updated data
    saveData(WALLETS_TO_MONITOR_FILE, walletsData);
    
    return res.status(200).json({
      success: true,
      message: 'Wallet removed successfully',
      wallets: walletsData.wallets
    });
  } catch (error) {
    console.error('Error removing wallet:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get token transfers
app.get('/api/token-transfers', (req, res) => {
  const tokenTransfers = loadData(TOKEN_TRANSFERS_FILE);
  if (!tokenTransfers) {
    return res.status(500).json({ error: 'Error loading token transfers data' });
  }
  
  return res.status(200).json(tokenTransfers);
});

// Endpoint to get staking data
app.get('/api/staking-data', (req, res) => {
  const stakingData = loadData(STAKING_DATA_FILE);
  if (!stakingData) {
    return res.status(500).json({ error: 'Error loading staking data' });
  }
  
  return res.status(200).json(stakingData);
});

// Endpoint to get wallet-specific staking data
app.get('/api/staking-data/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  const stakingData = loadData(STAKING_DATA_FILE);
  if (!stakingData) {
    return res.status(500).json({ error: 'Error loading staking data' });
  }
  
  // Filter staking events for this wallet
  const walletEvents = stakingData.events?.filter(event => 
    event.walletAddress === walletAddress
  ) || [];
  
  return res.status(200).json({ walletAddress, events: walletEvents });
});

// Clear data (for testing)
app.post('/api/clear-data', (req, res) => {
  // Check if caller has admin rights
  const adminKey = req.headers['admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Clear token transfers
  saveData(TOKEN_TRANSFERS_FILE, { transfers: [] });
  
  // Clear staking data
  saveData(STAKING_DATA_FILE, { stakingData: {}, events: [] });
  
  return res.status(200).json({ success: true, message: 'Data cleared' });
});

// Get list of monitored wallets
app.get('/api/monitored-wallets', (req, res) => {
  const walletsData = loadData(WALLETS_TO_MONITOR_FILE);
  if (!walletsData) {
    return res.status(500).json({ error: 'Error loading wallets data' });
  }
  
  return res.status(200).json(walletsData);
});

// Get wallet token balance
app.get('/api/token-balance/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    // Call getTokenAccountsByOwner RPC method
    const accounts = await callSolanaRpc('getTokenAccountsByOwner', [
      walletAddress,
      { mint: TOKEN_MINT },
      { encoding: 'jsonParsed' }
    ]);
    
    if (!accounts || !accounts.value || accounts.value.length === 0) {
      return res.status(200).json({ walletAddress, balance: 0 });
    }
    
    let totalBalance = 0;
    
    // Sum up balances from all token accounts
    for (const account of accounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const amount = parsedInfo.tokenAmount.uiAmount || 0;
      totalBalance += amount;
    }
    
    return res.status(200).json({
      walletAddress,
      balance: totalBalance
    });
  } catch (error) {
    console.error(`Error getting token balance for ${walletAddress}:`, error.message);
    return res.status(500).json({ error: 'Error getting token balance' });
  }
});

// Force poll now
app.post('/api/poll-now', async (req, res) => {
  // Check if caller has admin rights
  const adminKey = req.headers['admin-key'];
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Trigger polling
  try {
    pollTransactions();
    return res.status(200).json({ success: true, message: 'Polling started' });
  } catch (error) {
    return res.status(500).json({ error: 'Error starting polling' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  return res.status(200).json({
    service: 'HATM Token Monitor',
    status: 'Running',
    endpoints: [
      '/api/token-transfers',
      '/api/staking-data',
      '/api/staking-data/:walletAddress',
      '/webhook/transaction'
    ]
  });
});

// Start the transaction polling loop
let pollingIntervalId = null;

function startPolling() {
  console.log(`Starting transaction polling with interval ${POLLING_INTERVAL}ms`);
  // Run once immediately
  pollTransactions().catch(err => {
    console.error('Error in initial transaction polling:', err.message);
  });
  
  // Then start the interval
  pollingIntervalId = setInterval(() => {
    pollTransactions().catch(err => {
      console.error('Error in transaction polling:', err.message);
    });
  }, POLLING_INTERVAL);
}

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start polling after server starts
  startPolling();
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;