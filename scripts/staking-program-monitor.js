/**
 * Standalone Staking Program Transaction Monitor
 * 
 * This script monitors the staking smart contract for transactions and logs details about
 * each transaction in real-time. It can be run independently from the main application.
 * 
 * Usage:
 * node scripts/staking-program-monitor.js
 */

// Import required libraries
const { 
  Connection, 
  PublicKey, 
  clusterApiUrl,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

// Configuration
const STAKING_PROGRAM_ID = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
const TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const NETWORK = "devnet"; // Use "devnet" or "mainnet-beta"

// Set up the connection with WebSocket support
const connection = new Connection(clusterApiUrl(NETWORK), {
  commitment: "confirmed",
  wsEndpoint: NETWORK === "mainnet-beta" 
    ? "wss://api.mainnet-beta.solana.com" 
    : "wss://api.devnet.solana.com"
});

// Fancy console output with timestamps
function logWithTime(message, type = 'info') {
  const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'error':
      console.error(`${prefix} ❌ ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️ ${message}`);
      break;
    case 'success':
      console.log(`${prefix} ✅ ${message}`);
      break;
    case 'event':
      console.log(`${prefix} 🔔 ${message}`);
      break;
    default:
      console.log(`${prefix} ℹ️ ${message}`);
  }
}

// Track transactions we've already seen to avoid duplicates
const processedTransactions = new Set();

// Start monitoring all staking program transactions
logWithTime(`Starting to monitor staking program: ${STAKING_PROGRAM_ID.toString()}`);
logWithTime(`Token mint: ${TOKEN_MINT.toString()}`);
logWithTime(`Network: ${NETWORK}`);
logWithTime('Waiting for transactions... (This could take a while if there is no activity)');

// Subscribe to all logs for the staking program
const stakingSubscriptionId = connection.onLogs(
  STAKING_PROGRAM_ID,
  async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    // Skip if we've already processed this transaction
    if (processedTransactions.has(signature)) {
      return;
    }
    
    // Mark this transaction as processed
    processedTransactions.add(signature);
    
    // Handle errors
    if (err) {
      logWithTime(`Error in transaction ${signature}: ${err}`, 'error');
      return;
    }
    
    logWithTime('═════════════════════════════════════════', 'event');
    logWithTime(`New staking program transaction: ${signature}`, 'event');
    
    // Join logs for easier analysis
    const logString = logs.join('\n').toLowerCase();
    
    // Try to determine the transaction type
    let transactionType = 'unknown';
    if (logString.includes('stake') || logString.includes('deposit')) {
      transactionType = 'stake';
      logWithTime(`STAKE transaction detected! - ${signature}`, 'success');
    } 
    else if (logString.includes('unstake') || logString.includes('withdraw')) {
      transactionType = 'unstake';
      logWithTime(`UNSTAKE transaction detected! - ${signature}`, 'success');
    }
    else if (logString.includes('claim') || logString.includes('reward')) {
      transactionType = 'claim';
      logWithTime(`REWARD CLAIM transaction detected! - ${signature}`, 'success');
    }
    else {
      logWithTime(`Other staking program interaction detected - ${signature}`, 'info');
    }
    
    // Fetch more details about the transaction
    try {
      const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
      
      if (txDetails) {
        // Extract accounts involved in the transaction
        if (txDetails.transaction && txDetails.transaction.message) {
          const accounts = txDetails.transaction.message.accountKeys;
          logWithTime('Accounts involved in this transaction:', 'info');
          
          // Print detailed account information
          accounts.forEach((account, index) => {
            const pubkey = account.pubkey.toString();
            const isProgram = pubkey === STAKING_PROGRAM_ID.toString();
            const isTokenProgram = pubkey === TOKEN_PROGRAM_ID.toString();
            const isTokenMint = pubkey === TOKEN_MINT.toString();
            
            let accountRole = '';
            if (isProgram) accountRole = ' (Staking Program)';
            else if (isTokenProgram) accountRole = ' (Token Program)';
            else if (isTokenMint) accountRole = ' (Token Mint)';
            else if (index === 0) accountRole = ' (Likely Fee Payer)';
            else if (index === 1 && !isProgram) accountRole = ' (Possible User Wallet)';
            
            logWithTime(`  Account ${index}: ${pubkey}${accountRole}`, 'info');
          });
        }
        
        // Extract token balance changes
        if (txDetails.meta && txDetails.meta.preTokenBalances && txDetails.meta.postTokenBalances) {
          logWithTime('Token balance changes:', 'info');
          
          // Maps for easier lookup
          const preBalances = new Map();
          txDetails.meta.preTokenBalances.forEach(bal => {
            const key = `${bal.accountIndex}-${bal.mint}`;
            preBalances.set(key, bal.uiTokenAmount.uiAmount || 0);
          });
          
          // Calculate and log balance changes
          txDetails.meta.postTokenBalances.forEach(postBal => {
            const key = `${postBal.accountIndex}-${postBal.mint}`;
            const preAmount = preBalances.get(key) || 0;
            const postAmount = postBal.uiTokenAmount.uiAmount || 0;
            const change = postAmount - preAmount;
            
            if (change !== 0) {
              const accountIndex = postBal.accountIndex;
              const mintAddress = postBal.mint;
              const isTargetToken = mintAddress === TOKEN_MINT.toString();
              
              let accountAddress = 'Unknown';
              if (txDetails.transaction && txDetails.transaction.message && 
                  txDetails.transaction.message.accountKeys &&
                  txDetails.transaction.message.accountKeys[accountIndex]) {
                accountAddress = txDetails.transaction.message.accountKeys[accountIndex].pubkey.toString();
              }
              
              const tokenInfo = isTargetToken ? 'HATM Token' : 'Other Token';
              
              logWithTime(`  Account ${accountAddress}: ${change > 0 ? '+' : ''}${change.toFixed(6)} ${tokenInfo}`, change > 0 ? 'success' : 'warn');
            }
          });
        }
        
        // Log fee information
        if (txDetails.meta && txDetails.meta.fee) {
          const feeInSol = txDetails.meta.fee / LAMPORTS_PER_SOL;
          logWithTime(`Transaction fee: ${feeInSol.toFixed(6)} SOL`, 'info');
        }
        
        // Log instructions (if available in parsed form)
        if (txDetails.meta && txDetails.meta.logMessages) {
          logWithTime('Transaction log messages:', 'info');
          txDetails.meta.logMessages.forEach((msg, i) => {
            const truncatedMsg = msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
            logWithTime(`  ${i}: ${truncatedMsg}`, 'info');
          });
        }
        
        // Log transaction status
        if (txDetails.meta) {
          const status = txDetails.meta.err ? 'Failed' : 'Success';
          logWithTime(`Transaction status: ${status}`, status === 'Success' ? 'success' : 'error');
        }
        
        // Provide explorer link
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
        logWithTime(`Explorer URL: ${explorerUrl}`, 'info');
      }
    } catch (error) {
      logWithTime(`Error fetching transaction details: ${error.message}`, 'error');
    }
    
    logWithTime('═════════════════════════════════════════', 'event');
  },
  'confirmed'
);

// Also monitor token transfers involving our token
const tokenSubscriptionId = connection.onLogs(
  TOKEN_PROGRAM_ID,
  async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    // Skip errors and transactions we've already processed
    if (err || processedTransactions.has(signature)) {
      return;
    }
    
    // Only process logs that mention our token
    const logString = logs.join(' ');
    if (!logString.includes(TOKEN_MINT.toString())) {
      return;
    }
    
    // Mark this transaction as processed
    processedTransactions.add(signature);
    
    logWithTime('═════════════════════════════════════════', 'event');
    logWithTime(`HATM token transfer detected: ${signature}`, 'event');
    
    // Try to fetch full transaction details
    try {
      const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
      
      if (txDetails && txDetails.meta && txDetails.meta.preTokenBalances && txDetails.meta.postTokenBalances) {
        // Track token transfers
        const transfers = [];
        
        // Create maps for pre and post balances
        const preBalMap = new Map();
        txDetails.meta.preTokenBalances.forEach(bal => {
          if (bal.mint === TOKEN_MINT.toString()) {
            preBalMap.set(bal.accountIndex, bal.uiTokenAmount.uiAmount || 0);
          }
        });
        
        // Find changes
        txDetails.meta.postTokenBalances.forEach(postBal => {
          if (postBal.mint === TOKEN_MINT.toString()) {
            const preAmount = preBalMap.get(postBal.accountIndex) || 0;
            const postAmount = postBal.uiTokenAmount.uiAmount || 0;
            const change = postAmount - preAmount;
            
            if (change !== 0) {
              transfers.push({
                accountIndex: postBal.accountIndex,
                change: change
              });
            }
          }
        });
        
        // Log the transfers
        if (transfers.length > 0) {
          logWithTime("Token transfers detected:", 'success');
          
          transfers.forEach(transfer => {
            let accountAddress = 'Unknown';
            if (txDetails.transaction && txDetails.transaction.message && 
                txDetails.transaction.message.accountKeys &&
                txDetails.transaction.message.accountKeys[transfer.accountIndex]) {
              accountAddress = txDetails.transaction.message.accountKeys[transfer.accountIndex].pubkey.toString();
            }
            
            const transferType = transfer.change > 0 ? 'Received' : 'Sent';
            logWithTime(`  Account ${accountAddress}: ${transferType} ${Math.abs(transfer.change)} HATM tokens`, transfer.change > 0 ? 'success' : 'info');
          });
        }
        
        // Provide explorer link
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
        logWithTime(`Explorer URL: ${explorerUrl}`, 'info');
      }
    } catch (error) {
      logWithTime(`Error processing token transfer: ${error.message}`, 'error');
    }
    
    logWithTime('═════════════════════════════════════════', 'event');
  },
  'confirmed'
);

// Keep the connection alive with periodic health checks
const healthCheckInterval = setInterval(() => {
  connection.getHealth().catch(err => {
    logWithTime(`WebSocket connection health check failed: ${err}`, 'warn');
    logWithTime('Attempting to reconnect...', 'info');
  });
}, 30000);

// Handle script termination
process.on('SIGINT', () => {
  logWithTime('\nShutting down monitor...', 'warn');
  
  if (stakingSubscriptionId) {
    connection.removeOnLogsListener(stakingSubscriptionId);
  }
  
  if (tokenSubscriptionId) {
    connection.removeOnLogsListener(tokenSubscriptionId);
  }
  
  clearInterval(healthCheckInterval);
  
  // Clean up and exit
  logWithTime('Monitor successfully shut down. Goodbye!', 'success');
  process.exit(0);
});

// Limit processed transactions set size to prevent memory leaks
setInterval(() => {
  // Only keep the 100 most recent transactions
  if (processedTransactions.size > 100) {
    const toRemove = Array.from(processedTransactions).slice(0, processedTransactions.size - 100);
    toRemove.forEach(tx => processedTransactions.delete(tx));
    logWithTime(`Cleared ${toRemove.length} old transactions from memory`, 'info');
  }
}, 60000);