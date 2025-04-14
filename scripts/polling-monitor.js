/**
 * Polling-Based Transaction Monitor
 * 
 * This script uses a polling approach instead of WebSockets to monitor
 * transactions, which is more reliable in environments like WSL.
 */

const { 
  Connection, 
  PublicKey, 
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  SystemProgram
} = require('@solana/web3.js');

// Configuration
const YOUR_WALLET = "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX"; // Replace with your wallet if different
const MINT_AUTHORITY = "2B99oKDqPZynTZzrH414tnxHWuf1vsDfcNaHGVzttQap";
const TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
const STAKING_PROGRAM_ID = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const NETWORK = "devnet"; // Use "devnet" or "mainnet-beta"

// Polling interval in ms
const POLLING_INTERVAL = 5000; // 5 seconds

// Optional RPC endpoint - replace if needed
const rpcEndpoint = "https://api.devnet.solana.com";

// Set up the connection (no WebSocket needed)
const connection = new Connection(rpcEndpoint, 'confirmed');

// Track seen transactions
const seenTransactions = new Set();

// Track wallet for polling
let walletToMonitor = YOUR_WALLET;

// Pretty console logging
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
    case 'flow':
      console.log(`${prefix} 🔄 ${message}`);
      break;
    default:
      console.log(`${prefix} ℹ️ ${message}`);
  }
}

// Analyze a token transaction
async function analyzeTokenTransaction(signature) {
  try {
    const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
    
    if (!txDetails || !txDetails.meta) return;
    
    logWithTime('═════════════════════════════════════════', 'event');
    logWithTime(`TRANSACTION DETECTED: ${signature}`, 'event');
    
    // Extract basic transaction info
    const fee = txDetails.meta.fee / LAMPORTS_PER_SOL;
    const accounts = txDetails.transaction?.message?.accountKeys || [];
    const walletIndex = accounts.findIndex(acc => acc.pubkey.toString() === walletToMonitor);
    const status = txDetails.meta.err ? 'Failed' : 'Success';
    
    logWithTime(`Status: ${status}`, status === 'Success' ? 'success' : 'error');
    logWithTime(`Fee: ${fee} SOL`, 'info');
    
    // Check if this is a SOL transfer
    const isSolTransfer = txDetails.transaction?.message?.instructions?.some(ix => 
      ix.program === 'system' && ix.parsed?.type === 'transfer'
    );
    
    if (isSolTransfer) {
      // Find the transfer instruction
      const transferIx = txDetails.transaction?.message?.instructions?.find(ix => 
        ix.program === 'system' && ix.parsed?.type === 'transfer'
      );
      
      if (transferIx) {
        const sender = transferIx.parsed.info.source;
        const recipient = transferIx.parsed.info.destination;
        const amountLamports = transferIx.parsed.info.lamports;
        const amountSol = amountLamports / LAMPORTS_PER_SOL;
        
        logWithTime(`DETECTED: SOL TRANSFER`, 'success');
        logWithTime(`From: ${sender}`, 'flow');
        logWithTime(`To: ${recipient}`, 'flow');
        logWithTime(`Amount: ${amountSol} SOL`, 'flow');
        
        // Check if this is a transfer to the mint authority (potential buy)
        if (recipient === MINT_AUTHORITY) {
          logWithTime(`THIS IS A BUY TRANSACTION!`, 'success');
        }
      }
    }
    
    // Check if this transaction involved token transfers
    const involvedToken = txDetails.meta?.postTokenBalances?.some(
      balance => balance.mint === TOKEN_MINT.toString()
    );
    
    if (involvedToken) {
      logWithTime(`DETECTED: TOKEN ACTIVITY`, 'success');
      
      // Analyze token balances
      if (txDetails.meta?.preTokenBalances && txDetails.meta?.postTokenBalances) {
        logWithTime(`Token balance changes:`, 'info');
        
        for (const postBal of txDetails.meta.postTokenBalances) {
          if (postBal.mint !== TOKEN_MINT.toString()) continue;
          
          const matchingPreBal = txDetails.meta.preTokenBalances.find(
            pre => pre.accountIndex === postBal.accountIndex && pre.mint === postBal.mint
          );
          
          const preAmount = matchingPreBal ? (matchingPreBal.uiTokenAmount.uiAmount || 0) : 0;
          const postAmount = postBal.uiTokenAmount.uiAmount || 0;
          const change = postAmount - preAmount;
          
          if (change !== 0) {
            let accountAddress = 'Unknown';
            
            if (txDetails.transaction?.message?.accountKeys?.[postBal.accountIndex]) {
              accountAddress = txDetails.transaction.message.accountKeys[postBal.accountIndex].pubkey.toString();
            }
            
            const isYourWallet = accountAddress === walletToMonitor;
            
            if (isYourWallet) {
              logWithTime(`  YOUR TOKEN BALANCE ${change > 0 ? 'INCREASED' : 'DECREASED'} BY ${Math.abs(change)} TOKENS`,
                change > 0 ? 'success' : 'warn');
              logWithTime(`  New balance: ${postAmount} tokens`, 'info');
            } else {
              logWithTime(`  Account ${accountAddress}: ${change > 0 ? '+' : ''}${change} tokens`,
                'info');
            }
          }
        }
      }
    }
    
    // Check if the staking program was involved
    const stakingInvolved = txDetails.transaction?.message?.accountKeys?.some(
      account => account.pubkey.toString() === STAKING_PROGRAM_ID.toString()
    );
    
    if (stakingInvolved) {
      logWithTime(`DETECTED: STAKING CONTRACT INTERACTION`, 'success');
      
      // Get logs if available
      if (txDetails.meta?.logMessages && txDetails.meta.logMessages.length > 0) {
        logWithTime(`Staking contract logs:`, 'info');
        
        txDetails.meta.logMessages.forEach(log => {
          if (log.includes('Program log:')) {
            logWithTime(`  ${log.replace('Program log:', '').trim()}`, 'info');
          }
        });
      }
    }
    
    // Show important logs
    if (txDetails.meta?.logMessages && txDetails.meta.logMessages.length > 0) {
      // Only show a subset of logs to avoid overwhelming output
      const importantLogs = txDetails.meta.logMessages.filter(log => 
        log.includes('Program log:') && 
        !log.includes('Program data:') && 
        !log.includes('Program consumption:')
      );
      
      if (importantLogs.length > 0) {
        logWithTime(`Important transaction logs:`, 'info');
        
        importantLogs.slice(0, 5).forEach((log, i) => {
          const cleanLog = log.replace('Program log:', '').trim();
          logWithTime(`  ${i+1}: ${cleanLog}`, 'info');
        });
        
        if (importantLogs.length > 5) {
          logWithTime(`  ... and ${importantLogs.length - 5} more logs`, 'info');
        }
      }
    }
    
    // Provide explorer link
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
    logWithTime(`Explorer URL: ${explorerUrl}`);
    logWithTime('═════════════════════════════════════════', 'event');
  } catch (error) {
    logWithTime(`Error analyzing transaction ${signature}: ${error.message}`, 'error');
  }
}

// Main polling function to check for new transactions
async function pollForTransactions() {
  try {
    const walletPublicKey = new PublicKey(walletToMonitor);
    
    // Get recent signatures
    const signatures = await connection.getSignaturesForAddress(
      walletPublicKey, 
      { limit: 10 }
    );
    
    // Process new signatures
    let newTransactionsFound = false;
    
    for (const sigInfo of signatures) {
      if (!seenTransactions.has(sigInfo.signature)) {
        newTransactionsFound = true;
        seenTransactions.add(sigInfo.signature);
        
        // Analyze this transaction
        await analyzeTokenTransaction(sigInfo.signature);
      }
    }
    
    if (!newTransactionsFound && seenTransactions.size > 0) {
      // Only log this if we're not just starting up
      logWithTime(`No new transactions found in this polling cycle`);
    } else if (seenTransactions.size === 0) {
      // First run
      logWithTime(`Initialized with last ${signatures.length} transactions`);
      signatures.forEach(sigInfo => seenTransactions.add(sigInfo.signature));
    }
    
    // Check SOL balance periodically
    const balance = await connection.getBalance(walletPublicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    logWithTime(`Current SOL balance: ${solBalance.toFixed(6)} SOL`);
    
    // Check token balance if possible
    try {
      // This is a simplification - in a real app you'd get the token account first
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { mint: TOKEN_MINT }
      );
      
      if (tokenAccounts.value.length > 0) {
        const tokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        logWithTime(`Current token balance: ${tokenBalance} HATM tokens`);
      } else {
        logWithTime(`No token account found for this wallet`, 'warn');
      }
    } catch (error) {
      // Don't report errors for token balance checks
    }
    
  } catch (error) {
    logWithTime(`Error polling for transactions: ${error.message}`, 'error');
  }
}

// Start the script
async function main() {
  logWithTime(`Starting polling-based transaction monitor`);
  logWithTime(`Monitoring wallet: ${walletToMonitor}`);
  logWithTime(`Token mint: ${TOKEN_MINT.toString()}`);
  logWithTime(`Mint authority: ${MINT_AUTHORITY}`);
  logWithTime(`Staking program: ${STAKING_PROGRAM_ID.toString()}`);
  logWithTime(`Network: ${NETWORK}`);
  logWithTime(`Using RPC: ${rpcEndpoint}`);
  logWithTime(`Polling interval: ${POLLING_INTERVAL}ms`);
  logWithTime('Press Ctrl+C to stop the monitor');
  
  // Initial poll
  await pollForTransactions();
  
  // Set up polling interval
  const intervalId = setInterval(pollForTransactions, POLLING_INTERVAL);
  
  // Handle termination
  process.on('SIGINT', () => {
    logWithTime('\nShutting down monitor...', 'warn');
    clearInterval(intervalId);
    
    logWithTime(`Monitored ${seenTransactions.size} transactions`, 'success');
    logWithTime('Monitor successfully shut down. Goodbye!', 'success');
    process.exit(0);
  });
}

// Start the program
main().catch(err => {
  logWithTime(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});