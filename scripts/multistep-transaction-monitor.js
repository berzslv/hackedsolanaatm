/**
 * Multistep Transaction Monitor
 * 
 * This script specifically watches for the multi-step buy and stake process:
 * 1. SOL transfer from user to mint authority (purchase)
 * 2. Token mint to user wallet
 * 3. Token transfer to staking vault
 * 
 * It connects all these transactions and shows the complete flow.
 */

const { 
  Connection, 
  PublicKey, 
  clusterApiUrl,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

// Configuration
const MINT_AUTHORITY = "2B99oKDqPZynTZzrH414tnxHWuf1vsDfcNaHGVzttQap";
const TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
const STAKING_PROGRAM_ID = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const NETWORK = "devnet"; // Use "devnet" or "mainnet-beta"

// Better RPC endpoint with WebSocket support
const rpcEndpoint = "https://api.devnet.solana.com";
const wsEndpoint = "wss://api.devnet.solana.com";

// Set up the connection with proper WebSocket configuration
const connection = new Connection(rpcEndpoint, {
  commitment: "confirmed",
  wsEndpoint: wsEndpoint
});

// Track all the SOL transfers to the mint authority - these are potential purchases
const solTransfers = new Map();

// Track buy+stake flows
const buyStakeFlows = new Map();

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

// Track seen transactions to avoid duplicates
const seenTransactions = new Set();

logWithTime(`Starting buy+stake flow monitor`);
logWithTime(`Mint authority: ${MINT_AUTHORITY}`);
logWithTime(`Token mint: ${TOKEN_MINT.toString()}`);
logWithTime(`Staking program: ${STAKING_PROGRAM_ID.toString()}`);
logWithTime(`Network: ${NETWORK}`);
logWithTime(`Using RPC: ${rpcEndpoint}`);
logWithTime(`Using WebSocket: ${wsEndpoint}`);
logWithTime('Waiting for transactions...');

// ----- MONITORING APPROACH 1: Watch System Program for SOL transfers -----
// This catches step 1 of the buy+stake flow: SOL transfers to mint authority
connection.onLogs(
  SystemProgram.programId,
  async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    // Skip if already processed or has an error
    if (seenTransactions.has(signature) || err) return;
    seenTransactions.add(signature);
    
    try {
      // Only process if it's likely a SOL transfer
      if (!logs.join(' ').includes('system program')) return;
      
      // Get transaction details
      const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
      
      if (!txDetails) return;
      
      // Check if this is a SOL transfer to our mint authority
      const toMintAuthority = txDetails.transaction?.message?.instructions?.some(ix => {
        if (ix.program !== 'system') return false;
        
        // Check if this is a transfer instruction to mint authority
        return ix.parsed?.type === 'transfer' && 
               ix.parsed?.info?.destination === MINT_AUTHORITY;
      });
      
      if (toMintAuthority) {
        // Find the SOL amount and sender
        const transferIx = txDetails.transaction?.message?.instructions?.find(ix => 
          ix.program === 'system' && 
          ix.parsed?.type === 'transfer' && 
          ix.parsed?.info?.destination === MINT_AUTHORITY
        );
        
        if (transferIx) {
          const sender = transferIx.parsed.info.source;
          const amountLamports = transferIx.parsed.info.lamports;
          const amountSol = amountLamports / LAMPORTS_PER_SOL;
          
          logWithTime('═════════════════════════════════════════', 'event');
          logWithTime(`POTENTIAL BUY+STAKE STEP 1: SOL TRANSFER (${signature})`, 'success');
          logWithTime(`From: ${sender}`, 'flow');
          logWithTime(`To: ${MINT_AUTHORITY} (Mint Authority)`, 'flow');
          logWithTime(`Amount: ${amountSol} SOL`, 'flow');
          
          // Track this SOL transfer as the start of a potential buy+stake flow
          solTransfers.set(sender, {
            step1: {
              signature,
              amount: amountSol,
              timestamp: new Date()
            },
            // We'll fill these in when we see the token mint and stake
            step2: null,
            step3: null
          });
          
          // Provide explorer link
          const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
          logWithTime(`Explorer URL: ${explorerUrl}`);
          
          logWithTime(`Watching for follow-up token mint and stake for wallet: ${sender}`, 'flow');
          logWithTime('═════════════════════════════════════════', 'event');
        }
      }
    } catch (error) {
      logWithTime(`Error processing SOL transfer: ${error.message}`, 'error');
    }
  }
);

// ----- MONITORING APPROACH 2: Watch Token Program for token mints and transfers -----
// This catches steps 2 and 3: Token mint and transfers to staking vault
connection.onLogs(
  TOKEN_PROGRAM_ID,
  async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    // Skip if already processed or has an error
    if (seenTransactions.has(signature) || err) return;
    seenTransactions.add(signature);
    
    try {
      // Only process if it involves our token mint
      if (!logs.join(' ').includes(TOKEN_MINT.toString())) return;
      
      // Get transaction details
      const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
      
      if (!txDetails) return;
      
      // Check token balances to see what happened
      if (txDetails.meta?.preTokenBalances && txDetails.meta?.postTokenBalances) {
        // For tracking
        let isMint = false;
        let isTransfer = false;
        let mintAmount = 0;
        let transferAmount = 0;
        let recipientWallet = null;
        let senderWallet = null;
        
        // This structure for analyzing token balance changes will work with most token transactions
        for (const postBal of txDetails.meta.postTokenBalances) {
          // Skip if not our token
          if (postBal.mint !== TOKEN_MINT.toString()) continue;
          
          // Get the pre-balance for this account
          const matchingPreBal = txDetails.meta.preTokenBalances.find(
            pre => pre.accountIndex === postBal.accountIndex && pre.mint === postBal.mint
          );
          
          const preAmount = matchingPreBal ? (matchingPreBal.uiTokenAmount.uiAmount || 0) : 0;
          const postAmount = postBal.uiTokenAmount.uiAmount || 0;
          const change = postAmount - preAmount;
          
          // If there was a change, record details
          if (change !== 0) {
            // Get the wallet address for this token account
            let walletAddress = 'unknown';
            if (txDetails.transaction?.message?.accountKeys?.[postBal.accountIndex]) {
              walletAddress = txDetails.transaction.message.accountKeys[postBal.accountIndex].pubkey.toString();
            }
            
            // If tokens were created (didn't exist in pre-balance), it's a mint
            if (change > 0 && preAmount === 0) {
              isMint = true;
              mintAmount = change;
              recipientWallet = walletAddress;
            }
            // If tokens decreased, it's a transfer out (or burn)
            else if (change < 0) {
              isTransfer = true;
              transferAmount = Math.abs(change);
              senderWallet = walletAddress;
            }
          }
        }
        
        // Check if this is a mint transaction (part of step 2 in buy+stake)
        if (isMint && recipientWallet) {
          logWithTime('═════════════════════════════════════════', 'event');
          logWithTime(`POTENTIAL BUY+STAKE STEP 2: TOKEN MINT (${signature})`, 'success');
          logWithTime(`To: ${recipientWallet}`, 'flow');
          logWithTime(`Amount: ${mintAmount} HATM tokens`, 'flow');
          
          // Check if this matches a previous SOL transfer
          if (solTransfers.has(recipientWallet)) {
            const flow = solTransfers.get(recipientWallet);
            flow.step2 = {
              signature,
              amount: mintAmount,
              timestamp: new Date()
            };
            
            // Show the flow progress
            logWithTime(`This is part of a buy+stake flow for wallet: ${recipientWallet}`, 'flow');
            logWithTime(`Step 1: SOL Transfer ✓ (${flow.step1.amount} SOL)`, 'flow');
            logWithTime(`Step 2: Token Mint ✓ (${mintAmount} tokens)`, 'flow');
            logWithTime(`Step 3: Token Stake (Waiting...)`, 'flow');
            
            // Update our tracking
            solTransfers.set(recipientWallet, flow);
          }
          
          // Provide explorer link
          const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
          logWithTime(`Explorer URL: ${explorerUrl}`);
          logWithTime('═════════════════════════════════════════', 'event');
        }
        
        // Check if this is a token transfer (potentially part of step 3 in buy+stake)
        if (isTransfer && senderWallet) {
          logWithTime('═════════════════════════════════════════', 'event');
          logWithTime(`POTENTIAL BUY+STAKE STEP 3: TOKEN TRANSFER (${signature})`, 'success');
          logWithTime(`From: ${senderWallet}`, 'flow');
          logWithTime(`Amount: ${transferAmount} HATM tokens`, 'flow');
          
          // Check if this matches a previous SOL transfer and token mint
          if (solTransfers.has(senderWallet) && solTransfers.get(senderWallet).step2) {
            const flow = solTransfers.get(senderWallet);
            flow.step3 = {
              signature,
              amount: transferAmount,
              timestamp: new Date()
            };
            
            // Show the complete flow
            logWithTime(`COMPLETE BUY+STAKE FLOW DETECTED for wallet: ${senderWallet}`, 'success');
            logWithTime(`Step 1: SOL Transfer ✓ (${flow.step1.amount} SOL) - ${flow.step1.signature}`, 'flow');
            logWithTime(`Step 2: Token Mint ✓ (${flow.step2.amount} tokens) - ${flow.step2.signature}`, 'flow');
            logWithTime(`Step 3: Token Stake ✓ (${transferAmount} tokens) - ${signature}`, 'flow');
            
            // Calculate timings
            const step1Time = flow.step1.timestamp.getTime();
            const step2Time = flow.step2.timestamp.getTime();
            const step3Time = flow.step3.timestamp.getTime();
            const totalTimeMs = step3Time - step1Time;
            const totalTimeSec = totalTimeMs / 1000;
            
            logWithTime(`Total flow completion time: ${totalTimeSec.toFixed(2)} seconds`, 'flow');
            
            // Move to completed flows and remove from active tracking
            buyStakeFlows.set(senderWallet, flow);
            solTransfers.delete(senderWallet);
          }
          
          // Provide explorer link
          const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
          logWithTime(`Explorer URL: ${explorerUrl}`);
          logWithTime('═════════════════════════════════════════', 'event');
        }
      }
    } catch (error) {
      logWithTime(`Error processing token transaction: ${error.message}`, 'error');
    }
  }
);

// ----- MONITORING APPROACH 3: Watch the actual staking program -----
// This catches direct interactions with the staking smart contract
connection.onLogs(
  STAKING_PROGRAM_ID,
  async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    // Skip if already processed or has an error
    if (seenTransactions.has(signature) || err) return;
    seenTransactions.add(signature);
    
    try {
      logWithTime('═════════════════════════════════════════', 'event');
      logWithTime(`STAKING PROGRAM TRANSACTION DETECTED: ${signature}`, 'event');
      
      // Get transaction details
      const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
      
      if (txDetails) {
        // Analyze the logs to figure out what kind of staking action was performed
        const logText = logs.join('\n');
        
        let actionType = 'Unknown';
        let walletInvolved = 'Unknown';
        
        // Extract wallet address from account keys if possible
        if (txDetails.transaction?.message?.accountKeys && txDetails.transaction.message.accountKeys.length > 0) {
          // Usually the first account is the one initiating the transaction
          walletInvolved = txDetails.transaction.message.accountKeys[0].pubkey.toString();
        }
        
        // Determine the action type based on log keywords
        if (logText.includes('Instruction: stake')) {
          actionType = 'Stake';
        } else if (logText.includes('Instruction: unstake')) {
          actionType = 'Unstake';
        } else if (logText.includes('Instruction: claim')) {
          actionType = 'Claim Rewards';
        } else if (logText.includes('Instruction: compound')) {
          actionType = 'Compound Rewards';
        }
        
        logWithTime(`Action: ${actionType}`, 'success');
        logWithTime(`Wallet: ${walletInvolved}`, 'flow');
        
        // Show important logs (might contain amounts etc.)
        logWithTime('Important logs:', 'info');
        logs.forEach(log => {
          if (log.includes('Program log:')) {
            logWithTime(`  ${log.replace('Program log:', '').trim()}`, 'info');
          }
        });
        
        // Provide explorer link
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
        logWithTime(`Explorer URL: ${explorerUrl}`);
      }
      
      logWithTime('═════════════════════════════════════════', 'event');
    } catch (error) {
      logWithTime(`Error processing staking transaction: ${error.message}`, 'error');
    }
  }
);

// Cleanup incomplete flows periodically (older than 5 minutes)
setInterval(() => {
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;
  
  for (const [wallet, flow] of solTransfers.entries()) {
    const step1Time = flow.step1.timestamp.getTime();
    if (now - step1Time > fiveMinutesMs) {
      logWithTime(`Removing stale buy+stake flow for wallet: ${wallet}`, 'warn');
      solTransfers.delete(wallet);
    }
  }
}, 60000); // Check every minute

// Keep the connection alive
const intervalId = setInterval(() => {
  // Simple heartbeat to keep the WebSocket connection alive
  connection.getVersion().catch(err => {
    logWithTime(`WebSocket connection check failed: ${err}`, 'warn');
    logWithTime('Attempting to reconnect...', 'info');
  });
}, 30000);

// Handle termination
process.on('SIGINT', () => {
  logWithTime('\nShutting down monitor...', 'warn');
  clearInterval(intervalId);
  
  // Print summary
  logWithTime(`Detected ${buyStakeFlows.size} complete buy+stake flows`, 'success');
  logWithTime(`Detected ${solTransfers.size} pending/incomplete flows`, 'warn');
  
  logWithTime('Monitor successfully shut down. Goodbye!', 'success');
  process.exit(0);
});