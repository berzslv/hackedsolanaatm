/**
 * Token Transaction History Checker
 * This script shows your recent token transactions and waits for new ones
 */

const { Connection, PublicKey } = require("@solana/web3.js");

// Configuration - CHANGE YOUR TOKEN MINT AND WALLET HERE
const YOUR_TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
const YOUR_WALLET = "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX"; // Your wallet address
const NETWORK = "devnet"; // Use "devnet" or "mainnet-beta"

// Better RPC endpoint with high rate limits
const rpcEndpoint = "https://api.devnet.solana.com"; 

// Setup connection
const connection = new Connection(rpcEndpoint, "confirmed");

// Tracking set for seen transactions
const seenTransactions = new Set();

// Timestamp formatter
function formatTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Analyze a token transaction to extract its details
 */
async function analyzeTransaction(signature) {
  try {
    // Skip if we've already processed this transaction
    if (seenTransactions.has(signature)) return;
    seenTransactions.add(signature);
    
    console.log(`\n[${formatTime()}] 🔎 Analyzing transaction: ${signature}`);
    
    // Get transaction details
    const txInfo = await connection.getParsedTransaction(signature, "confirmed");
    
    if (!txInfo || !txInfo.meta) {
      console.log(`[${formatTime()}] ⚠️ Could not retrieve transaction details`);
      return;
    }
    
    // Check if this transaction involves our token
    let involvesToken = false;
    
    // Check through all pre/post token balances
    if (txInfo.meta.preTokenBalances && txInfo.meta.postTokenBalances) {
      const allTokenBalances = [
        ...txInfo.meta.preTokenBalances, 
        ...txInfo.meta.postTokenBalances
      ];
      
      // Check if our token mint is involved
      involvesToken = allTokenBalances.some(balance => 
        balance.mint === YOUR_TOKEN_MINT.toString()
      );
    }
    
    // If it doesn't involve our token, skip
    if (!involvesToken) {
      console.log(`[${formatTime()}] ⏩ Transaction does not involve our token`);
      return;
    }
    
    // Extract basic transaction info
    const dateTime = new Date(txInfo.blockTime * 1000).toISOString()
      .replace('T', ' ')
      .substring(0, 19);
    
    const status = txInfo.meta.err ? 'Failed' : 'Success';
    
    console.log(`[${formatTime()}] 💰 TOKEN TRANSACTION FOUND!`);
    console.log(`[${formatTime()}] 📅 Date: ${dateTime}`);
    console.log(`[${formatTime()}] 📝 Status: ${status}`);
    
    // Analyze token balance changes
    if (txInfo.meta.preTokenBalances && txInfo.meta.postTokenBalances) {
      // Filter for our token
      const preBalances = txInfo.meta.preTokenBalances.filter(
        bal => bal.mint === YOUR_TOKEN_MINT.toString()
      );
      
      const postBalances = txInfo.meta.postTokenBalances.filter(
        bal => bal.mint === YOUR_TOKEN_MINT.toString()
      );
      
      // Determine transaction type
      let txType = "Unknown";
      
      // Check if accounts changed (created or deleted)
      const preAccounts = new Set(preBalances.map(b => b.accountIndex));
      const postAccounts = new Set(postBalances.map(b => b.accountIndex));
      
      const accountsCreated = [...postAccounts].some(idx => !preAccounts.has(idx));
      const accountsRemoved = [...preAccounts].some(idx => !postAccounts.has(idx));
      
      // Check balance changes
      let balanceChanges = [];
      
      // Loop through post balances to find changes
      for (const postBal of postBalances) {
        const matchingPre = preBalances.find(pre => pre.accountIndex === postBal.accountIndex);
        
        // Get owner address
        let owner = "unknown";
        if (postBal.owner) {
          owner = postBal.owner;
        } else if (txInfo.transaction?.message?.accountKeys?.[postBal.accountIndex]) {
          owner = txInfo.transaction.message.accountKeys[postBal.accountIndex].pubkey.toString();
        }
        
        // Is this your wallet?
        const isYourWallet = owner === YOUR_WALLET;
        
        if (matchingPre) {
          // Account existed before - check balance change
          const preBal = parseFloat(matchingPre.uiTokenAmount.uiAmount || 0);
          const postBal = parseFloat(postBal.uiTokenAmount.uiAmount || 0);
          const change = postBal - preBal;
          
          if (Math.abs(change) > 0.000001) { // Ignore dust changes
            balanceChanges.push({
              owner,
              isYourWallet,
              change,
              newBalance: postBal
            });
          }
        } else {
          // New account created
          const amount = parseFloat(postBal.uiTokenAmount.uiAmount || 0);
          balanceChanges.push({
            owner,
            isYourWallet,
            change: amount, // All new
            newBalance: amount
          });
        }
      }
      
      // Check for completely removed accounts (like in a burn)
      for (const preBal of preBalances) {
        const matchingPost = postBalances.find(post => post.accountIndex === preBal.accountIndex);
        
        if (!matchingPost) {
          // Account removed - tokens were likely burned or account closed
          let owner = "unknown";
          if (preBal.owner) {
            owner = preBal.owner;
          } else if (txInfo.transaction?.message?.accountKeys?.[preBal.accountIndex]) {
            owner = txInfo.transaction.message.accountKeys[preBal.accountIndex].pubkey.toString();
          }
          
          const isYourWallet = owner === YOUR_WALLET;
          const amount = parseFloat(preBal.uiTokenAmount.uiAmount || 0);
          
          balanceChanges.push({
            owner,
            isYourWallet, 
            change: -amount, // All removed
            newBalance: 0
          });
        }
      }
      
      // Determine transaction type based on the changes
      if (accountsCreated && !accountsRemoved) {
        txType = "Mint/Create";
      } else if (!accountsCreated && accountsRemoved) {
        txType = "Burn/Close";
      } else {
        txType = "Transfer";
      }
      
      // Output transaction type
      console.log(`[${formatTime()}] 📋 Type: ${txType}`);
      
      // Show balance changes
      if (balanceChanges.length > 0) {
        console.log(`[${formatTime()}] 📊 Balance changes:`);
        
        for (const change of balanceChanges) {
          const prefix = change.isYourWallet ? "YOUR WALLET" : "Account";
          const changeSymbol = change.change > 0 ? "+" : "";
          
          console.log(`[${formatTime()}]   ${prefix}: ${changeSymbol}${change.change} tokens (new balance: ${change.newBalance})`);
          console.log(`[${formatTime()}]   Owner: ${change.owner}`);
        }
      }
    }
    
    // Show logs if available
    if (txInfo.meta.logMessages && txInfo.meta.logMessages.length > 0) {
      // Filter for interesting logs
      const interestingLogs = txInfo.meta.logMessages.filter(log => 
        log.includes("Program log:") && 
        !log.includes("Program data:") && 
        !log.includes("Program consumption:")
      );
      
      if (interestingLogs.length > 0) {
        console.log(`[${formatTime()}] 📜 Program logs:`);
        
        interestingLogs.slice(0, 3).forEach(log => {
          console.log(`[${formatTime()}]   ${log.replace("Program log:", "").trim()}`);
        });
        
        if (interestingLogs.length > 3) {
          console.log(`[${formatTime()}]   ... and ${interestingLogs.length - 3} more log messages`);
        }
      }
    }
    
    // Show explorer link
    console.log(`[${formatTime()}] 🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`);
    
  } catch (error) {
    console.error(`[${formatTime()}] ❌ Error analyzing transaction: ${error.message}`);
  }
}

/**
 * Check for historical transactions involving our token
 */
async function checkHistoricalTransactions() {
  try {
    console.log(`[${formatTime()}] 🔍 Searching for historical token transactions for wallet: ${YOUR_WALLET}`);
    
    // Get all signatures for wallet first
    const walletPubkey = new PublicKey(YOUR_WALLET);
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 20 });
    
    console.log(`[${formatTime()}] 📝 Found ${signatures.length} recent transactions, analyzing for token activity...`);
    
    // Process each transaction
    for (const sigInfo of signatures) {
      await analyzeTransaction(sigInfo.signature);
    }
    
    console.log(`[${formatTime()}] ✅ Historical analysis complete`);
    
  } catch (error) {
    console.error(`[${formatTime()}] ❌ Error checking historical transactions: ${error.message}`);
  }
}

/**
 * Poll for new transactions
 */
async function pollForNewTransactions() {
  try {
    const walletPubkey = new PublicKey(YOUR_WALLET);
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 5 });
    
    let newFound = false;
    
    // Check for new transactions
    for (const sigInfo of signatures) {
      if (!seenTransactions.has(sigInfo.signature)) {
        newFound = true;
        await analyzeTransaction(sigInfo.signature);
      }
    }
    
    if (!newFound) {
      process.stdout.write(".");  // Just show a dot to indicate polling
    }
    
  } catch (error) {
    console.error(`[${formatTime()}] ❌ Error polling for new transactions: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`[${formatTime()}] 🚀 Starting Token Transaction History Checker`);
  console.log(`[${formatTime()}] 💳 Wallet: ${YOUR_WALLET}`);
  console.log(`[${formatTime()}] 🪙 Token: ${YOUR_TOKEN_MINT.toString()}`);
  console.log(`[${formatTime()}] 🌐 Network: ${NETWORK}`);
  console.log(`[${formatTime()}] 🔌 RPC: ${rpcEndpoint}`);
  
  // Check historical transactions first
  await checkHistoricalTransactions();
  
  // Now start polling for new transactions
  console.log(`\n[${formatTime()}] ⏱️ Now monitoring for new transactions... (each dot = one check)`);
  
  // Poll regularly
  setInterval(pollForNewTransactions, 5000);
  
  // Keep script running
  process.on('SIGINT', () => {
    console.log(`\n[${formatTime()}] 🛑 Stopping transaction monitor`);
    console.log(`[${formatTime()}] 📊 Analyzed ${seenTransactions.size} transactions`);
    process.exit(0);
  });
}

// Start the program
main().catch(err => {
  console.error(`[${formatTime()}] ❌ Fatal error: ${err.message}`);
  process.exit(1);
});