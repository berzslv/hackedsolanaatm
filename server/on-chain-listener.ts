import { Connection, PublicKey } from '@solana/web3.js';
import { externalStakingCache } from './external-staking-cache';
import { stakingDataStore } from './helius-webhooks';

// Program and token IDs
const STAKING_PROGRAM_ID = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
const TOKEN_MINT = new PublicKey("12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/**
 * Start Solana WebSocket listeners for on-chain events
 */
export function startOnChainListeners() {
  console.log("Starting on-chain event listeners...");
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    {
      commitment: 'confirmed',
      wsEndpoint: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com'
    }
  );

  // Listen for staking program events (stakes, unstakes, claims)
  const stakingSubscriptionId = connection.onLogs(STAKING_PROGRAM_ID, async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    if (err) {
      console.error("❌ Error in staking program transaction:", err);
      return;
    }
    
    console.log("\n==================================");
    console.log("🔔 Staking Program Event Detected:", signature);
    console.log("==================================");
    
    // First try to extract information from logs
    let walletAddress = "";
    let eventType = "";
    let amount = 0;
    
    // Convert logs to a single string for easier pattern matching
    const logString = logs.join(" ").toLowerCase();
    console.log("Log string for analysis:", logString);
    
    // Look for event patterns
    if (logString.includes("stake") || logString.includes("deposit")) {
      eventType = "stake";
      console.log("✅ STAKE event detected");
      
      // Try to extract amount
      const amountMatch = logString.match(/stake[d]?\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        amount = parseInt(amountMatch[1]);
        console.log(`Amount staked: ${amount}`);
      }
    } 
    else if (logString.includes("unstake") || logString.includes("withdraw")) {
      eventType = "unstake";
      console.log("📤 UNSTAKE event detected");
      
      // Try to extract amount
      const amountMatch = logString.match(/unstake[d]?\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        amount = parseInt(amountMatch[1]);
        console.log(`Amount unstaked: ${amount}`);
      }
    }
    else if (logString.includes("claim") || logString.includes("reward")) {
      eventType = "claim";
      console.log("💰 REWARD CLAIM event detected");
      
      // Try to extract amount
      const amountMatch = logString.match(/claim[ed]?\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        amount = parseInt(amountMatch[1]);
        console.log(`Amount claimed: ${amount}`);
      }
    }
    else {
      console.log("⚙️ Other staking program interaction detected");
      // Print raw logs for debugging
      logs.forEach((log, i) => {
        console.log(`Log ${i}: ${log}`);
      });
    }
    
    // If we couldn't extract enough information from logs, fetch the transaction
    if (!walletAddress || amount === 0) {
      console.log("Fetching transaction details to extract more information...");
      
      try {
        // Get detailed transaction information
        const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
        
        if (txDetails && txDetails.transaction && txDetails.transaction.message) {
          const accounts = txDetails.transaction.message.accountKeys;
          console.log("Accounts involved in transaction:");
          
          // Assuming wallet is typically one of the first accounts (not the program itself)
          for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const pubkey = account.pubkey.toString();
            
            // Skip if it's the program ID
            if (pubkey === STAKING_PROGRAM_ID.toString()) {
              continue;
            }
            
            console.log(`Account ${i}: ${pubkey}`);
            
            // If we haven't found a wallet yet, use first non-program account
            if (!walletAddress && i > 0) {
              walletAddress = pubkey;
              console.log(`Extracted wallet address: ${walletAddress}`);
            }
          }
          
          // If we still don't have an amount, try to extract from token balances
          if (amount === 0 && txDetails.meta && txDetails.meta.preTokenBalances && txDetails.meta.postTokenBalances) {
            const tokenChanges = calculateTokenBalanceChanges(
              txDetails.meta.preTokenBalances, 
              txDetails.meta.postTokenBalances
            );
            
            if (tokenChanges.length > 0) {
              console.log("Token balance changes detected:");
              for (const change of tokenChanges) {
                console.log(`Account ${change.owner}: ${change.change > 0 ? '+' : ''}${change.change}`);
                
                // Use the first significant change as our amount
                if (amount === 0 && Math.abs(change.change) > 0) {
                  amount = Math.abs(change.change);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error getting transaction details:", error);
      }
    }
    
    // If we've gathered enough information, process the event
    if (eventType && walletAddress) {
      // Default to 100 if we still couldn't determine amount
      if (amount === 0) amount = 100;
      
      console.log(`Processing ${eventType} event for wallet ${walletAddress} with amount ${amount}`);
      processStakingEvent(eventType, walletAddress, amount, signature);
    } else {
      console.log("Couldn't extract enough information to process this event");
    }
  });

  // Listen for token transfers
  const tokenSubscriptionId = connection.onLogs(TOKEN_PROGRAM_ID, async (logInfo) => {
    const { logs, signature, err } = logInfo;
    
    if (err) return; // Skip errors
    
    // Join logs and convert to string
    const logString = logs.join(" ");
    
    // Only process if it involves our token
    if (logString.includes(TOKEN_MINT.toString())) {
      console.log("\n==================================");
      console.log("🔄 TOKEN TRANSFER Detected:", signature);
      console.log("==================================");
      
      let fromWallet = "";
      let toWallet = "";
      let transferAmount = 0;
      
      // Try to extract from logs
      const fromMatch = logString.match(/from\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
      const toMatch = logString.match(/to\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
      
      if (fromMatch && fromMatch[1]) {
        fromWallet = fromMatch[1];
        console.log(`From: ${fromWallet}`);
      }
      
      if (toMatch && toMatch[1]) {
        toWallet = toMatch[1];
        console.log(`To: ${toWallet}`);
      }
      
      // Try to extract amount
      const amountMatch = logString.match(/amount\s+(\d+)/i);
      if (amountMatch && amountMatch[1]) {
        transferAmount = parseInt(amountMatch[1]);
        console.log(`Amount: ${transferAmount}`);
      }
      
      // If we couldn't extract enough from logs, get transaction details
      if (!fromWallet || !toWallet || transferAmount === 0) {
        try {
          const txDetails = await connection.getParsedTransaction(signature, 'confirmed');
          
          if (txDetails && txDetails.meta && txDetails.meta.preTokenBalances && txDetails.meta.postTokenBalances) {
            console.log("Analyzing token balance changes from transaction...");
            
            const tokenChanges = calculateTokenBalanceChanges(
              txDetails.meta.preTokenBalances, 
              txDetails.meta.postTokenBalances
            );
            
            for (const change of tokenChanges) {
              console.log(`Account ${change.owner}: ${change.change > 0 ? '+' : ''}${change.change}`);
              
              // Negative change = from wallet
              if (change.change < 0 && !fromWallet) {
                fromWallet = change.owner;
              }
              
              // Positive change = to wallet
              if (change.change > 0 && !toWallet) {
                toWallet = change.owner;
              }
              
              // Use the absolute value of the largest change as our amount
              if (Math.abs(change.change) > transferAmount) {
                transferAmount = Math.abs(change.change);
              }
            }
          }
        } catch (error) {
          console.error("Error getting token transfer details:", error);
        }
      }
      
      // Process the token transfer event if we have enough info
      if ((fromWallet || toWallet) && transferAmount > 0) {
        console.log(`Processing token transfer: ${fromWallet} -> ${toWallet}, amount: ${transferAmount}`);
        // In a real implementation, you would update balances, trigger notifications, etc.
      }
    }
  });

  // Helper function to calculate token balance changes from transaction
  function calculateTokenBalanceChanges(preBalances: any[], postBalances: any[]) {
    const changes: { owner: string, mint: string, change: number }[] = [];
    
    // Create maps for easier comparison
    const preMap = new Map();
    for (const balance of preBalances) {
      const key = `${balance.owner}-${balance.mint}`;
      preMap.set(key, balance.uiTokenAmount.uiAmount || 0);
    }
    
    // Compare with post balances
    for (const postBalance of postBalances) {
      const key = `${postBalance.owner}-${postBalance.mint}`;
      const preAmount = preMap.get(key) || 0;
      const postAmount = postBalance.uiTokenAmount.uiAmount || 0;
      
      if (preAmount !== postAmount) {
        changes.push({
          owner: postBalance.owner,
          mint: postBalance.mint,
          change: postAmount - preAmount
        });
      }
    }
    
    return changes;
  }

  // Keep connections alive with periodic health checks
  const intervalId = setInterval(() => {
    // Use getVersion instead of getHealth as it's more reliable
    connection.getVersion().catch(err => {
      console.warn("WebSocket connection health check failed:", err);
      console.log("Attempting to reconnect WebSocket...");
    });
  }, 30000);

  // Handle application shutdown
  process.on('SIGINT', () => {
    console.log("\n🛑 Stopping WebSocket listeners and cleaning up...");
    
    if (stakingSubscriptionId) {
      connection.removeOnLogsListener(stakingSubscriptionId);
    }
    
    if (tokenSubscriptionId) {
      connection.removeOnLogsListener(tokenSubscriptionId);
    }
    
    clearInterval(intervalId);
    process.exit(0);
  });

  console.log("On-chain event listeners started successfully");
  return { connection };
}

/**
 * Process a staking event and update our local cache
 */
function processStakingEvent(
  eventType: string, 
  walletAddress: string, 
  amount: number,
  signature: string
) {
  console.log(`Processing ${eventType} event for ${walletAddress}, amount: ${amount}`);
  
  // Get current staking data (or initialize empty data)
  const currentData = externalStakingCache.getStakingData(walletAddress) || {
    walletAddress,
    amountStaked: 0,
    pendingRewards: 0,
    stakedAt: new Date(),
    lastUpdateTime: new Date(),
    estimatedAPY: 120,
    timeUntilUnlock: null 
  };
  
  // Update data based on event type
  switch (eventType) {
    case 'stake':
      externalStakingCache.updateStakingData({
        ...currentData,
        amountStaked: currentData.amountStaked + amount,
        // If this is their first stake, update stakedAt
        stakedAt: currentData.amountStaked === 0 ? new Date() : currentData.stakedAt,
        lastUpdateTime: new Date()
      });
      
      // Also update the Helius webhook data store
      const existingHeliusStake = stakingDataStore.get(walletAddress);
      if (existingHeliusStake) {
        stakingDataStore.set(walletAddress, {
          ...existingHeliusStake,
          amountStaked: existingHeliusStake.amountStaked + amount,
          lastUpdateTime: new Date()
        });
      } else {
        stakingDataStore.set(walletAddress, {
          walletAddress,
          amountStaked: amount,
          pendingRewards: 0,
          stakedAt: new Date(),
          lastUpdateTime: new Date()
        });
      }
      break;
      
    case 'unstake':
      externalStakingCache.updateStakingData({
        ...currentData,
        amountStaked: Math.max(0, currentData.amountStaked - amount),
        lastUpdateTime: new Date()
      });
      
      // Also update the Helius webhook data store
      const existingHeliusUnstake = stakingDataStore.get(walletAddress);
      if (existingHeliusUnstake) {
        stakingDataStore.set(walletAddress, {
          ...existingHeliusUnstake,
          amountStaked: Math.max(0, existingHeliusUnstake.amountStaked - amount),
          lastUpdateTime: new Date()
        });
      }
      break;
      
    case 'claim':
      externalStakingCache.updateStakingData({
        ...currentData,
        pendingRewards: 0, // Reset pending rewards after claim
        lastUpdateTime: new Date()
      });
      
      // Also update the Helius webhook data store
      const existingHeliusClaim = stakingDataStore.get(walletAddress);
      if (existingHeliusClaim) {
        stakingDataStore.set(walletAddress, {
          ...existingHeliusClaim,
          pendingRewards: 0,
          lastUpdateTime: new Date()
        });
      }
      break;
  }
  
  console.log(`Updated staking data for ${walletAddress}`);
}