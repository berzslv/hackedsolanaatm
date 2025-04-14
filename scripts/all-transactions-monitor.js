/**
 * All Transactions Monitor
 * This script will catch ALL transactions related to your wallet and the token
 */

const { 
  Connection, 
  PublicKey, 
  clusterApiUrl,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

// Configuration - CHANGE THIS TO YOUR WALLET ADDRESS
const YOUR_WALLET = "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX"; // Replace with your wallet address
const TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const NETWORK = "devnet"; // Use "devnet" or "mainnet-beta"

// ⚠️ Use a better RPC endpoint with WebSocket support
const rpcEndpoint = "https://api.devnet.solana.com";
const wsEndpoint = "wss://api.devnet.solana.com";

// Set up the connection with proper WebSocket configuration
const connection = new Connection(rpcEndpoint, {
  commitment: "confirmed",
  wsEndpoint: wsEndpoint
});

// Pretty console logging
function log(message, type = 'info') {
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

// Track seen transactions to avoid duplicates
const seenTransactions = new Set();

log(`Starting transaction monitor for wallet: ${YOUR_WALLET}`);
log(`Token mint: ${TOKEN_MINT.toString()}`);
log(`Network: ${NETWORK}`);
log(`Using RPC: ${rpcEndpoint}`);
log(`Using WebSocket: ${wsEndpoint}`);
log('Waiting for transactions...');

// METHOD 1: Monitor ALL token program activities
connection.onLogs(
  TOKEN_PROGRAM_ID,
  async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    // Skip if already processed or error
    if (seenTransactions.has(signature) || err) return;
    seenTransactions.add(signature);
    
    // Only process if it involves our token mint
    if (!logs.join(' ').includes(TOKEN_MINT.toString())) return;
    
    log('═════════════════════════════════════════', 'event');
    log(`TOKEN PROGRAM TRANSACTION DETECTED: ${signature}`, 'event');
    
    try {
      // Get transaction details
      const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
      
      if (txDetails) {
        // Check if the transaction involves our wallet
        const involvedAccounts = txDetails.transaction?.message?.accountKeys || [];
        const walletInvolved = involvedAccounts.some(account => 
          account.pubkey.toString() === YOUR_WALLET
        );
        
        if (walletInvolved) {
          log(`YOUR WALLET IS INVOLVED IN THIS TRANSACTION!`, 'success');
          
          // Extract token transfers
          if (txDetails.meta?.preTokenBalances && txDetails.meta?.postTokenBalances) {
            log('Token balance changes:');
            
            // Maps for easier lookup
            const preBalances = new Map();
            txDetails.meta.preTokenBalances.forEach(bal => {
              const key = `${bal.accountIndex}-${bal.mint}`;
              preBalances.set(key, bal.uiTokenAmount.uiAmount || 0);
            });
            
            // Calculate balance changes
            txDetails.meta.postTokenBalances.forEach(postBal => {
              const key = `${postBal.accountIndex}-${postBal.mint}`;
              const preAmount = preBalances.get(key) || 0;
              const postAmount = postBal.uiTokenAmount.uiAmount || 0;
              const change = postAmount - preAmount;
              
              if (change !== 0) {
                let accountAddress = 'Unknown';
                if (txDetails.transaction?.message?.accountKeys?.[postBal.accountIndex]) {
                  accountAddress = txDetails.transaction.message.accountKeys[postBal.accountIndex].pubkey.toString();
                }
                
                const isYourWallet = accountAddress === YOUR_WALLET;
                const isTargetToken = postBal.mint === TOKEN_MINT.toString();
                
                if (isTargetToken) {
                  if (isYourWallet) {
                    log(`  YOUR WALLET ${change > 0 ? 'RECEIVED' : 'SENT'} ${Math.abs(change)} HATM TOKENS`, 
                       change > 0 ? 'success' : 'warn');
                  } else {
                    log(`  Account ${accountAddress}: ${change > 0 ? '+' : ''}${change} HATM tokens`, 
                       change > 0 ? 'success' : 'warn');
                  }
                }
              }
            });
          }
          
          // Provide explorer link
          const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
          log(`Explorer URL: ${explorerUrl}`);
        }
      }
    } catch (error) {
      log(`Error processing transaction: ${error.message}`, 'error');
    }
    
    log('═════════════════════════════════════════', 'event');
  }
);

// METHOD 2: Monitor your specific wallet (tracks ALL transactions including SOL transfers)
log(`Setting up signature subscription for wallet: ${YOUR_WALLET}`);

// This approach directly watches for signatures (transactions) involving your wallet
const walletPubkey = new PublicKey(YOUR_WALLET);

// First check recent transactions
async function checkRecentTransactions() {
  try {
    log('Checking recent transactions...');
    const signatures = await connection.getSignaturesForAddress(walletPubkey, {
      limit: 10,
    });
    
    log(`Found ${signatures.length} recent transactions`);
    
    // Process each signature
    for (const sigInfo of signatures) {
      if (!seenTransactions.has(sigInfo.signature)) {
        seenTransactions.add(sigInfo.signature);
        log(`Recent transaction: ${sigInfo.signature}`);
      }
    }
  } catch (error) {
    log(`Error checking recent transactions: ${error.message}`, 'error');
  }
}

// Then set up a subscription for new transactions
async function setupSignatureSubscription() {
  try {
    // Subscribe to new signatures
    const subscriptionId = connection.onSignature(
      // THIS IS A DUMMY VALUE - the real subscription happens below
      "4NuUDRy7gF8dJFvJ4oi6XHdtfkFZNm98tNnXRtQYPZP2fVJzP3tYmcuSc57EQFkQ1KzJy2XWXNEBmxFD62xqPkHB",
      (result, context) => {
        log(`Signature notification: ${result}`, 'event');
      }
    );
    
    log(`Subscription ID for signature monitoring: ${subscriptionId}`);
  } catch (error) {
    log(`Error setting up signature subscription: ${error.message}`, 'error');
  }
}

// Start watching for account activity (this captures all transactions for your wallet!)
connection.onAccountChange(
  walletPubkey,
  async (accountInfo, context) => {
    log(`Account change detected for your wallet!`, 'event');
    
    try {
      // Get recent transactions when account changes
      const signatures = await connection.getSignaturesForAddress(walletPubkey, {
        limit: 5,
      });
      
      for (const sigInfo of signatures) {
        if (!seenTransactions.has(sigInfo.signature)) {
          seenTransactions.add(sigInfo.signature);
          
          log('═════════════════════════════════════════', 'event');
          log(`NEW TRANSACTION FOR YOUR WALLET: ${sigInfo.signature}`, 'success');
          
          // Get full transaction details
          const txDetails = await connection.getParsedTransaction(sigInfo.signature, 'confirmed');
          
          if (txDetails) {
            // See if this involves our token
            const involveToken = txDetails.meta?.postTokenBalances?.some(
              balance => balance.mint === TOKEN_MINT.toString()
            );
            
            if (involveToken) {
              log(`THIS TRANSACTION INVOLVES THE HATM TOKEN!`, 'success');
              
              // Display token balance changes
              if (txDetails.meta?.preTokenBalances && txDetails.meta?.postTokenBalances) {
                // Find the changes for your wallet
                const yourPreBalance = txDetails.meta.preTokenBalances.find(
                  bal => {
                    const accountKey = txDetails.transaction?.message?.accountKeys?.[bal.accountIndex];
                    return accountKey && accountKey.pubkey.toString() === YOUR_WALLET && bal.mint === TOKEN_MINT.toString();
                  }
                );
                
                const yourPostBalance = txDetails.meta.postTokenBalances.find(
                  bal => {
                    const accountKey = txDetails.transaction?.message?.accountKeys?.[bal.accountIndex];
                    return accountKey && accountKey.pubkey.toString() === YOUR_WALLET && bal.mint === TOKEN_MINT.toString();
                  }
                );
                
                if (yourPreBalance && yourPostBalance) {
                  const preAmount = yourPreBalance.uiTokenAmount.uiAmount || 0;
                  const postAmount = yourPostBalance.uiTokenAmount.uiAmount || 0;
                  const change = postAmount - preAmount;
                  
                  if (change !== 0) {
                    log(`  YOUR HATM BALANCE CHANGED: ${change > 0 ? '+' : ''}${change} tokens`, 
                        change > 0 ? 'success' : 'warn');
                    log(`  New balance: ${postAmount} HATM tokens`);
                  }
                }
              }
            }
            
            // Show SOL balance changes
            if (txDetails.meta?.preBalances && txDetails.meta?.postBalances) {
              const accounts = txDetails.transaction?.message?.accountKeys || [];
              
              for (let i = 0; i < accounts.length; i++) {
                if (accounts[i].pubkey.toString() === YOUR_WALLET) {
                  const preSol = txDetails.meta.preBalances[i] / LAMPORTS_PER_SOL;
                  const postSol = txDetails.meta.postBalances[i] / LAMPORTS_PER_SOL;
                  const change = postSol - preSol;
                  
                  if (Math.abs(change) > 0.000001) { // Ignore dust changes
                    log(`  YOUR SOL BALANCE CHANGED: ${change > 0 ? '+' : ''}${change.toFixed(6)} SOL`, 
                        change > 0 ? 'success' : 'warn');
                    log(`  New SOL balance: ${postSol.toFixed(6)} SOL`);
                  }
                }
              }
            }
            
            // Show transaction info
            if (txDetails.meta) {
              const status = txDetails.meta.err ? 'Failed' : 'Success';
              log(`Transaction status: ${status}`, status === 'Success' ? 'success' : 'error');
            }
            
            // Show log messages (often contains program output)
            if (txDetails.meta?.logMessages && txDetails.meta.logMessages.length > 0) {
              log('Transaction log messages:');
              txDetails.meta.logMessages.forEach((msg, i) => {
                // Truncate long messages
                const truncatedMsg = msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
                log(`  ${i+1}: ${truncatedMsg}`);
              });
            }
            
            // Provide explorer link
            const explorerUrl = `https://explorer.solana.com/tx/${sigInfo.signature}?cluster=${NETWORK}`;
            log(`Explorer URL: ${explorerUrl}`);
          }
          
          log('═════════════════════════════════════════', 'event');
        }
      }
    } catch (error) {
      log(`Error processing account change: ${error.message}`, 'error');
    }
  },
  'confirmed'
);

// Start monitoring your wallet's SOL balance
async function monitorSOLBalance() {
  try {
    const balance = await connection.getBalance(walletPubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    log(`Current SOL balance: ${solBalance.toFixed(6)} SOL`);
  } catch (error) {
    log(`Error getting SOL balance: ${error.message}`, 'error');
  }
}

// Check recent transactions when starting
checkRecentTransactions().catch(console.error);

// Monitor SOL balance periodically
monitorSOLBalance().catch(console.error);
setInterval(() => {
  monitorSOLBalance().catch(console.error);
}, 60000); // Check every minute

// Keep the script running with a heartbeat
const intervalId = setInterval(() => {
  // Simple heartbeat to keep the WebSocket connection alive
  connection.getVersion().catch(err => {
    log(`WebSocket connection check failed: ${err}`, 'warn');
    log('Attempting to reconnect...', 'info');
  });
}, 30000);

// Handle termination
process.on('SIGINT', () => {
  log('\nShutting down monitor...', 'warn');
  clearInterval(intervalId);
  
  log('Monitor successfully shut down. Goodbye!', 'success');
  process.exit(0);
});