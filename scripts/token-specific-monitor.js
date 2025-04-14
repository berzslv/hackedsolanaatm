/**
 * Token-Specific Transaction Monitor
 * This script monitors only transactions involving your specific token
 */

const { Connection, PublicKey } = require("@solana/web3.js");

// Configuration - CHANGE YOUR TOKEN MINT HERE
const YOUR_TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const NETWORK = "devnet"; // Use "devnet" or "mainnet-beta"

// Set up memory DB
const tokenTransfers = [];

// Setup connection
const connection = new Connection(`https://api.${NETWORK}.solana.com`, "confirmed");

// Timestamp formatter
function formatTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Listen for token transfers specific to your token mint
 */
async function listenForTokenTransfers() {
  console.log(`[${formatTime()}] 🚀 Starting token monitor for mint: ${YOUR_TOKEN_MINT.toString()}`);
  console.log(`[${formatTime()}] 🌐 Connected to ${NETWORK}`);
  console.log(`[${formatTime()}] ⏳ Waiting for transactions...`);

  // Listen for all token program events
  connection.onLogs(TOKEN_PROGRAM_ID, async (logInfo) => {
    const { signature, logs, err } = logInfo;
    
    // Skip if error
    if (err) return;
    
    // Join logs into a single string for searching
    const logStr = logs.join(" ");
    
    // Only continue if it involves our specific token mint
    if (!logStr.includes(YOUR_TOKEN_MINT.toString())) return;
    
    // Get transaction details
    try {
      console.log(`\n[${formatTime()}] 💰 TOKEN TRANSACTION DETECTED: ${signature}`);
      
      // Get detailed transaction info
      const txInfo = await connection.getParsedTransaction(signature, "confirmed");
      
      if (txInfo && txInfo.meta) {
        // Check pre and post token balances to determine the type of operation
        if (txInfo.meta.preTokenBalances && txInfo.meta.postTokenBalances) {
          // Filter for balances related to our token
          const preBalances = txInfo.meta.preTokenBalances.filter(
            balance => balance.mint === YOUR_TOKEN_MINT.toString()
          );
          
          const postBalances = txInfo.meta.postTokenBalances.filter(
            balance => balance.mint === YOUR_TOKEN_MINT.toString()
          );
          
          // Analyze the transaction type
          let txType = "Unknown";
          let accounts = [];
          
          // Check if it's a transfer (source and destination addresses are different)
          const isTransfer = preBalances.some(pre => 
            postBalances.some(post => 
              post.accountIndex !== pre.accountIndex && 
              (post.uiTokenAmount.uiAmount > 0 || pre.uiTokenAmount.uiAmount > 0)
            )
          );
          
          // Check if it's a mint (new tokens appear in an account)
          const isMint = postBalances.some(post => {
            const matching = preBalances.find(pre => pre.accountIndex === post.accountIndex);
            return !matching && post.uiTokenAmount.uiAmount > 0;
          });
          
          // Check if it's a burn (tokens disappear from an account)
          const isBurn = preBalances.some(pre => {
            const matching = postBalances.find(post => post.accountIndex === pre.accountIndex);
            return !matching && pre.uiTokenAmount.uiAmount > 0;
          });
          
          // Set transaction type
          if (isTransfer) txType = "Transfer";
          else if (isMint) txType = "Mint";
          else if (isBurn) txType = "Burn";
          
          console.log(`[${formatTime()}] 📝 Transaction Type: ${txType}`);
          
          // Print balance changes
          for (const postBal of postBalances) {
            const accountIndex = postBal.accountIndex;
            const preBal = preBalances.find(pre => pre.accountIndex === accountIndex);
            
            const preAmount = preBal ? preBal.uiTokenAmount.uiAmount || 0 : 0;
            const postAmount = postBal.uiTokenAmount.uiAmount || 0;
            const diff = postAmount - preAmount;
            
            // Get account owner
            let ownerAddress = "Unknown";
            if (postBal.owner) {
              ownerAddress = postBal.owner;
            } else if (txInfo.transaction?.message?.accountKeys?.[accountIndex]) {
              ownerAddress = txInfo.transaction.message.accountKeys[accountIndex].pubkey.toString();
            }
            
            if (diff !== 0) {
              const changeSymbol = diff > 0 ? "+" : "";
              console.log(`[${formatTime()}] ${changeSymbol}${diff} tokens for account owned by: ${ownerAddress}`);
              accounts.push({
                owner: ownerAddress,
                change: diff
              });
            }
          }
          
          // Store the transaction
          tokenTransfers.push({
            signature,
            type: txType,
            accounts,
            timestamp: Date.now(),
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`
          });
          
          // Print explorer URL
          console.log(`[${formatTime()}] 🔗 Explorer URL: https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`);
        }
      }
    } catch (error) {
      console.error(`[${formatTime()}] ❌ Error processing transaction: ${error.message}`);
    }
  });
  
  // Keep the script running
  process.on('SIGINT', () => {
    console.log(`\n[${formatTime()}] 🛑 Stopping token monitor`);
    console.log(`[${formatTime()}] 📊 Detected ${tokenTransfers.length} token transactions`);
    process.exit(0);
  });
}

// Optional: Periodically log stats
setInterval(() => {
  console.log(`[${formatTime()}] 📊 Total transactions tracked: ${tokenTransfers.length}`);
}, 60000);

// Start monitoring
listenForTokenTransfers().catch(err => {
  console.error(`[${formatTime()}] ❌ Fatal error: ${err.message}`);
  process.exit(1);
});