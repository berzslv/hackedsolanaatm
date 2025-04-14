/**
 * External Staking Data Tool
 * 
 * This is a demonstration tool that simulates an external service
 * sending blockchain staking data to our application.
 * 
 * In a production system, this would be a separate service run by your
 * team that handles all blockchain interactions with the correct
 * BN.js library versions and returns consistent data.
 * 
 * Usage:
 * node scripts/external-staking-data-tool.js
 */

import fetch from 'node-fetch';

// Your application's base URL
const APP_URL = 'http://localhost:5000'; // Change this to match your deployment URL

// Example wallets to provide data for
const EXAMPLE_WALLETS = [
  '91fdzsE7dZsWpZEzBxWS9G2fJRqUxZWGjmrMg1ULNWqF',
  '2B99oKDqPZynTZzrH414tnxHWuf1vsDfcNaHGVzttQap',
  '8zGCh26f7o7n7a7AUHf6n7fqyB4ByaPKgWjCwEtYZ2uw',
];

// Generate sample staking data - in a real implementation,
// this would fetch actual data from the blockchain
function generateStakingData(walletAddress) {
  // Generate different values for different wallets
  const walletSeed = walletAddress.charCodeAt(1) + walletAddress.charCodeAt(walletAddress.length - 1);
  
  // Create deterministic but varied data based on wallet address
  const amountStaked = Math.floor(100 + (walletSeed * 50));
  const pendingRewards = Math.floor(amountStaked * 0.05); // 5% rewards
  
  // Randomize staking date (1-10 days ago)
  const daysAgo = Math.floor(1 + (walletSeed % 10));
  const stakedAt = new Date();
  stakedAt.setDate(stakedAt.getDate() - daysAgo);
  
  // Last update time (0-12 hours ago)
  const hoursAgo = Math.floor((walletSeed % 12));
  const lastUpdateTime = new Date();
  lastUpdateTime.setHours(lastUpdateTime.getHours() - hoursAgo);
  
  // Dynamic APY (80% - 150%)
  const apy = 80 + (walletSeed % 70);
  
  // Time until unlock (if any) - max 7 days in milliseconds
  // If staked over 7 days ago, this will be null
  const lockPeriodDays = 7;
  const daysLeft = lockPeriodDays - daysAgo;
  const timeUntilUnlock = daysLeft > 0 ? (daysLeft * 24 * 60 * 60 * 1000) : null;
  
  return {
    walletAddress,
    amountStaked,
    pendingRewards,
    stakedAt: stakedAt.toISOString(),
    lastUpdateTime: lastUpdateTime.toISOString(),
    estimatedAPY: apy,
    timeUntilUnlock,
    apiKey: 'demo-external-service'  // In production, use a real API key
  };
}

// Send staking data to the application
async function sendStakingData(stakingData) {
  try {
    console.log(`Sending staking data for ${stakingData.walletAddress}`);
    
    const response = await fetch(`${APP_URL}/api/external/staking-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stakingData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`Success: ${JSON.stringify(data)}`);
    } else {
      console.error(`Error: ${JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to send staking data: ${error.message}`);
    return null;
  }
}

// Check current staking data for all wallets
async function checkCurrentData() {
  try {
    console.log('\nChecking current staking data in system:');
    
    const response = await fetch(`${APP_URL}/api/external/staking-data`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`Total wallets with data: ${data.count}`);
      if (data.count > 0) {
        data.data.forEach(item => {
          console.log(`- Wallet: ${item.walletAddress} (Amount staked: ${item.data.amountStaked})`);
        });
      } else {
        console.log('No staking data found in the system');
      }
    } else {
      console.error(`Error: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error(`Failed to check staking data: ${error.message}`);
  }
}

// Main execution flow
async function main() {
  console.log('External Staking Data Tool');
  console.log('=========================');
  console.log('This tool simulates an external service sending blockchain staking data to the app');
  
  // First check existing data
  await checkCurrentData();
  
  // Process each example wallet
  for (const wallet of EXAMPLE_WALLETS) {
    const stakingData = generateStakingData(wallet);
    await sendStakingData(stakingData);
  }
  
  // Check updated data
  await checkCurrentData();
  
  console.log('\nDone!');
}

// Run the main function
main().catch(console.error);