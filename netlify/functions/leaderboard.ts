import { Handler } from "@netlify/functions";

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Sample data for demonstration
const referrersWeeklyLeaderboard = [
  { address: 'address...m4jF', amount: 6240, referralCount: 45 },
  { address: 'address...p3xR', amount: 4120, referralCount: 31 },
  { address: 'address...k9nT', amount: 3480, referralCount: 24 }
];

const referrersMonthlyLeaderboard = [
  { address: 'address...t4kL', amount: 15420, referralCount: 132 },
  { address: 'address...m4jF', amount: 12350, referralCount: 89 },
  { address: 'address...w7bQ', amount: 9870, referralCount: 76 }
];

const stakersWeeklyLeaderboard = [
  { address: 'address...t7zK', amount: 542000, stakingDuration: 14, apyBonus: 1.0 },
  { address: 'address...b2vH', amount: 324000, stakingDuration: 21, apyBonus: 0.75 },
  { address: 'address...h5cF', amount: 215000, stakingDuration: 9, apyBonus: 0.5 }
];

const stakersMonthlyLeaderboard = [
  { address: 'address...r9pJ', amount: 1240000, stakingDuration: 45, apyBonus: 1.0 },
  { address: 'address...t7zK', amount: 980000, stakingDuration: 38, apyBonus: 0.75 },
  { address: 'address...x2nM', amount: 675000, stakingDuration: 32, apyBonus: 0.5 }
];

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
  
  // Get the path parameter after /leaderboard/
  const path = event.path.replace('/.netlify/functions/leaderboard', '');
  const segments = path.split('/').filter(Boolean);
  
  try {
    // Route to appropriate data based on path
    // Expected format: /leaderboard/{type}/{period}
    if (segments.length >= 2) {
      const type = segments[0]; // 'referrers' or 'stakers'
      const period = segments[1]; // 'weekly' or 'monthly'
      
      let leaderboardData;
      
      if (type === 'referrers') {
        leaderboardData = period === 'weekly' 
          ? referrersWeeklyLeaderboard 
          : referrersMonthlyLeaderboard;
      } else if (type === 'stakers') {
        leaderboardData = period === 'weekly' 
          ? stakersWeeklyLeaderboard 
          : stakersMonthlyLeaderboard;
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'Invalid leaderboard type. Use "referrers" or "stakers".' 
          })
        };
      }
      
      // Add ranks to the data
      const rankedData = leaderboardData.map((entry, index) => ({
        rank: index + 1,
        walletAddress: entry.address,
        ...entry
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(rankedData)
      };
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: 'Invalid path. Use /leaderboard/{type}/{period}' 
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