import { Handler } from "@netlify/functions";
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Main handler function
export const handler: Handler = async (event, context) => {
  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Get the path parameter after /referrals/
  const path = event.path.replace('/.netlify/functions/referrals', '');
  const segments = path.split('/').filter(Boolean);
  
  try {
    // If a wallet address is provided, get referral stats for that address
    if (segments.length > 0) {
      const walletAddress = segments[0];
      const referralStats = await getReferralStats(walletAddress);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          referralStats
        })
      };
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: 'Wallet address is required' 
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error'
      })
    };
  }
};

// Generate referral statistics based on wallet address
async function getReferralStats(walletAddress: string) {
  try {
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);
    
    // Generate deterministic but realistic referral data from wallet address
    const walletSeed = walletPubkey.toBuffer()[0] + walletPubkey.toBuffer()[31];
    
    // Generate referral code from wallet address (first 6 chars)
    const referralCode = walletAddress.substring(0, 6).toUpperCase();
    
    // Generate total referrals and earnings
    const totalReferrals = Math.floor(walletSeed % 20); // 0-19 referrals
    const totalEarnings = totalReferrals * Math.floor(100 + (walletSeed * 10)); // Earnings based on referrals
    
    // Get weekly rank (null if no referrals)
    const weeklyRank = totalReferrals > 0 ? Math.floor(1 + (walletSeed % 100)) : null; // Rank 1-100 if active
    
    // Generate recent activity
    const recentActivity = [];
    for (let i = 0; i < Math.min(totalReferrals, 5); i++) {
      const daysAgo = i * 2; // Every 2 days
      const date = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
      
      recentActivity.push({
        date: date.toISOString(),
        transaction: `${walletAddress.substring(0, 8)}...${walletAddress.substring(32)}`,
        amount: Math.floor(100 + (i * 50 * (walletSeed % 5))),
        reward: Math.floor(10 + (i * 5 * (walletSeed % 3)))
      });
    }
    
    return {
      referralCode,
      totalReferrals,
      totalEarnings,
      weeklyRank,
      referredCount: totalReferrals,
      totalReferred: totalReferrals * 2, // Some users might have referred multiple people
      claimableRewards: Math.floor(totalEarnings * 0.1), // 10% of earnings are claimable
      recentActivity
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    throw error;
  }
}