const {
  Connection,
  clusterApiUrl,
  PublicKey,
} = require('@solana/web3.js');

// Replace with your actual program/token addresses
const STAKING_PROGRAM_ID = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
const TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
// SPL Token program ID
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

// Create a connection with a commitment level of 'confirmed' for faster confirmations
const connection = new Connection(clusterApiUrl("devnet"), {
  commitment: "confirmed",
  wsEndpoint: "wss://api.devnet.solana.com",
});

console.log("🔌 Connecting to Solana devnet...");
console.log(`📝 Monitoring staking program: ${STAKING_PROGRAM_ID.toString()}`);
console.log(`💰 Token mint address: ${TOKEN_MINT.toString()}`);

// More detailed staking program event monitor
const stakingSubscriptionId = connection.onLogs(
  STAKING_PROGRAM_ID,
  (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    if (err) {
      console.error("❌ Error in transaction:", err);
      return;
    }
    
    console.log("\n==================================");
    console.log("📦 New Program Interaction:", signature);
    console.log("==================================");
    
    // Lower case everything for easier matching
    const logString = logs.join(" ").toLowerCase();
    
    if (logString.includes("stake") || logString.includes("deposit")) {
      console.log("✅ STAKE DETECTED!");
      console.log("Transaction signature:", signature);
      
      // Extract amount if possible
      const amountMatch = logString.match(/stake[d]?\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        console.log(`Amount staked: ${amountMatch[1]}`);
      }
    } 
    else if (logString.includes("unstake") || logString.includes("withdraw")) {
      console.log("📤 UNSTAKE DETECTED!");
      console.log("Transaction signature:", signature);
      
      // Extract amount if possible
      const amountMatch = logString.match(/unstake[d]?\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        console.log(`Amount unstaked: ${amountMatch[1]}`);
      }
    } 
    else if (logString.includes("claim") || logString.includes("reward")) {
      console.log("💰 REWARD CLAIM DETECTED!");
      console.log("Transaction signature:", signature);
      
      // Extract amount if possible
      const amountMatch = logString.match(/claim[ed]?\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        console.log(`Amount claimed: ${amountMatch[1]}`);
      }
    }
    else {
      console.log("⚙️ Other program interaction detected");
    }
    
    // Print raw logs for debugging
    console.log("\nRaw Program Logs:");
    logs.forEach((log, i) => {
      console.log(`${i}: ${log}`);
    });
    
    // Fetch transaction details for more information
    fetchTransactionDetails(signature);
  },
  "confirmed"
);

// Token transfer monitor - watch for transactions involving our token
const tokenSubscriptionId = connection.onLogs(
  TOKEN_PROGRAM_ID,
  (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    if (err) return; // Skip errors
    
    // Join logs and convert to string
    const logString = logs.join(" ");
    
    // Only interested in logs mentioning our token mint
    if (logString.includes(TOKEN_MINT.toString())) {
      console.log("\n==================================");
      console.log("🔄 TOKEN TRANSFER DETECTED:", signature);
      console.log("==================================");
      
      // Try to parse source and destination
      const fromMatch = logString.match(/from\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
      const toMatch = logString.match(/to\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
      
      if (fromMatch && fromMatch[1]) {
        console.log(`From: ${fromMatch[1]}`);
      }
      
      if (toMatch && toMatch[1]) {
        console.log(`To: ${toMatch[1]}`);
      }
      
      // Try to extract amount
      const amountMatch = logString.match(/amount\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        console.log(`Amount: ${amountMatch[1]}`);
      }
      
      // Print the raw logs for debugging
      console.log("\nRaw Token Program Logs:");
      logs.forEach((log, i) => {
        console.log(`${i}: ${log}`);
      });
    }
  },
  "confirmed"
);

// Helper function to fetch more details about a transaction
async function fetchTransactionDetails(signature) {
  try {
    // Wait for confirmations first
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true
    });
    
    // Wait for finalization
    if (status && status.value && status.value.confirmationStatus !== 'finalized') {
      console.log(`Transaction status: ${status.value.confirmationStatus}`);
    }
    
    // Get and parse transaction details
    const transaction = await connection.getParsedTransaction(signature, 'confirmed');
    
    if (transaction && transaction.meta) {
      console.log("\nTransaction Details:");
      
      // Extract fee
      if (transaction.meta.fee) {
        console.log(`Fee: ${transaction.meta.fee / 1000000000} SOL`);
      }
      
      // Log all account keys involved (useful for debugging)
      if (transaction.transaction && transaction.transaction.message) {
        const accounts = transaction.transaction.message.accountKeys;
        console.log("Accounts involved:");
        accounts.forEach((account, index) => {
          console.log(`  ${index}: ${account.pubkey.toString()}`);
        });
      }
      
      // Extract pre and post token balances if available
      if (transaction.meta.preTokenBalances && transaction.meta.postTokenBalances) {
        console.log("\nToken Balance Changes:");
        
        // Create maps for easier comparison
        const preBalances = new Map();
        transaction.meta.preTokenBalances.forEach(balance => {
          preBalances.set(`${balance.accountIndex}-${balance.mint}`, balance.uiTokenAmount.uiAmount);
        });
        
        const postBalances = new Map();
        transaction.meta.postTokenBalances.forEach(balance => {
          postBalances.set(`${balance.accountIndex}-${balance.mint}`, balance.uiTokenAmount.uiAmount);
        });
        
        // Calculate changes
        for (const [key, postAmount] of postBalances) {
          const preAmount = preBalances.get(key) || 0;
          const change = postAmount - preAmount;
          
          if (change !== 0) {
            const [accountIndex, mint] = key.split('-');
            const accountKey = transaction.transaction.message.accountKeys[accountIndex].pubkey.toString();
            console.log(`  Account ${accountKey} (${mint}): ${change > 0 ? '+' : ''}${change.toFixed(6)}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching transaction details:", error);
  }
}

console.log("⏳ Event monitoring started. Waiting for transactions...");
console.log("Press Ctrl+C to stop monitoring.");

// Keep the process alive
setInterval(() => {
  // Send a ping to keep the connection alive
  connection.getHealth().catch(console.error);
}, 30000);

// Handle script termination
process.on('SIGINT', () => {
  console.log("\n🛑 Stopping event monitoring...");
  // Remove subscriptions
  if (stakingSubscriptionId) {
    connection.removeOnLogsListener(stakingSubscriptionId);
  }
  if (tokenSubscriptionId) {
    connection.removeOnLogsListener(tokenSubscriptionId);
  }
  console.log("Goodbye! 👋");
  process.exit(0);
});