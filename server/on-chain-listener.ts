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
    'confirmed'
  );

  // Listen for staking program events (stakes, unstakes, claims)
  connection.onLogs(STAKING_PROGRAM_ID, (logInfo) => {
    const { logs, signature } = logInfo;
    
    console.log("🔔 Staking Program Event Detected:", signature);
    console.log("Transaction logs:", logs);
    
    // Extract wallet address from transaction (this will depend on your program's structure)
    // This is a simplified example - in a real implementation you would parse the logs or fetch the transaction
    let walletAddress = "";
    let eventType = "";
    let amount = 0;
    
    for (let log of logs) {
      // Look for specific log patterns
      if (log.includes("Instruction: Stake")) {
        eventType = "stake";
        // Try to extract wallet and amount from logs
        // This is a simplified approach - you'd need to adjust based on your program's actual log format
        const match = log.match(/Stake: (\d+) tokens from ([a-zA-Z0-9]+)/);
        if (match) {
          amount = parseInt(match[1]);
          walletAddress = match[2];
        }
      } 
      else if (log.includes("Instruction: Unstake")) {
        eventType = "unstake";
        const match = log.match(/Unstake: (\d+) tokens by ([a-zA-Z0-9]+)/);
        if (match) {
          amount = parseInt(match[1]);
          walletAddress = match[2];
        }
      }
      else if (log.includes("Instruction: ClaimRewards")) {
        eventType = "claim";
        const match = log.match(/Claim: (\d+) rewards by ([a-zA-Z0-9]+)/);
        if (match) {
          amount = parseInt(match[1]);
          walletAddress = match[2];
        }
      }
    }

    // If we couldn't extract the data from logs, we can try to fetch the transaction
    if (!walletAddress && eventType) {
      console.log("Could not extract wallet address from logs, fetching transaction...");
      // This would be implementation-specific, based on how your transaction is structured
      // connection.getTransaction(signature).then(transaction => {...})
    }
    
    // Update our cache based on the event type
    if (walletAddress) {
      processStakingEvent(eventType, walletAddress, amount, signature);
    }
  });

  // Listen for token transfers
  connection.onLogs(TOKEN_PROGRAM_ID, (logInfo) => {
    const { logs, signature } = logInfo;
    
    // Only process if it involves our token
    const isRelevant = logs.some(log => log.includes(TOKEN_MINT.toBase58()));
    
    if (isRelevant) {
      console.log("🔄 Token Transfer Detected:", signature);
      // Process token transfer event
      // This would typically update balances in your application
      // You would need to fetch the transaction details to get the sender, receiver, and amount
    }
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