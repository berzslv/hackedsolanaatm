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
const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET || 'your-secret-key';
const TOKEN_MINT = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
const STAKING_PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';

// Data storage
const DATA_DIR = join(__dirname, 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const TOKEN_TRANSFERS_FILE = join(DATA_DIR, 'token_transfers.json');
const STAKING_DATA_FILE = join(DATA_DIR, 'staking_data.json');

// Initialize empty data files if they don't exist
if (!fs.existsSync(TOKEN_TRANSFERS_FILE)) {
  fs.writeFileSync(TOKEN_TRANSFERS_FILE, JSON.stringify({ transfers: [] }));
}

if (!fs.existsSync(STAKING_DATA_FILE)) {
  fs.writeFileSync(STAKING_DATA_FILE, JSON.stringify({ stakingData: {} }));
}

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

function verifyWebhookSignature(req) {
  const signature = req.headers['x-api-key'];
  return signature === WEBHOOK_SECRET;
}

// Endpoint to receive Helius webhook events
app.post('/webhook/transaction', async (req, res) => {
  console.log('Received webhook event');
  
  // Check webhook signature
  if (!verifyWebhookSignature(req)) {
    console.log('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  
  const data = req.body;
  
  // Process transaction data
  try {
    const transaction = data.transaction || data;
    const accountKeys = transaction.message?.accountKeys || [];
    const logs = data.logs || [];
    
    // Detect token transfers
    const isTokenTransfer = accountKeys.some(key => key === TOKEN_MINT);
    
    if (isTokenTransfer) {
      console.log('Detected token transfer event');
      
      // Get token transfers data
      const tokenTransfers = loadData(TOKEN_TRANSFERS_FILE);
      
      // Create transfer data
      const transferData = {
        signature: transaction.signatures?.[0] || 'unknown',
        fromWallet: 'unknown',
        toWallet: 'unknown',
        amount: 0,
        timestamp: new Date().toISOString(),
        blockTime: data.blockTime || null
      };
      
      // Extract sender and recipient if available
      if (transaction.message && transaction.message.instructions) {
        // Too complex to extract in a simple way, would need deeper parsing
        // Just recording the transaction
      }
      
      // Add to list of transfers
      tokenTransfers.transfers.push(transferData);
      
      // Save updated data
      saveData(TOKEN_TRANSFERS_FILE, tokenTransfers);
    }
    
    // Detect staking events
    const isStakingEvent = accountKeys.some(key => key === STAKING_PROGRAM_ID);
    
    if (isStakingEvent) {
      console.log('Detected staking event');
      
      // Get staking data
      const stakingData = loadData(STAKING_DATA_FILE);
      
      // Determine what kind of staking event it is
      let eventType = 'unknown';
      let walletAddress = 'unknown';
      let amount = 0;
      
      // Try to determine event type from logs
      const logText = logs.join(' ');
      if (logText.includes('stake')) {
        eventType = 'stake';
      } else if (logText.includes('unstake')) {
        eventType = 'unstake';
      } else if (logText.includes('claim')) {
        eventType = 'claim';
      }
      
      // Create staking event data
      const stakingEvent = {
        signature: transaction.signatures?.[0] || 'unknown',
        type: eventType,
        walletAddress,
        amount,
        timestamp: new Date().toISOString(),
        blockTime: data.blockTime || null
      };
      
      // Add to staking events
      if (!stakingData.events) {
        stakingData.events = [];
      }
      
      stakingData.events.push(stakingEvent);
      
      // Save updated data
      saveData(STAKING_DATA_FILE, stakingData);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook event:', error);
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

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default server;