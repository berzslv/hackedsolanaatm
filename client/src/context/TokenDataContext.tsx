import React, { createContext, useState, useContext, useEffect } from 'react';
import { useSolana } from './SolanaContext';
import { generateUniqueId } from '@/lib/utils';

interface ReferralActivity {
  date: string;
  transaction: string;
  amount: number;
  reward: number;
}

interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  weeklyRank: number | null;
  recentActivity: ReferralActivity[];
}

interface LeaderboardEntry {
  address: string;
  amount: number;
  referralCount?: number;
  stakingDuration?: number;
  apyBonus?: number;
}

interface Leaderboard {
  weekly: LeaderboardEntry[];
  monthly: LeaderboardEntry[];
}

interface TokenDataContextType {
  tokenPrice: number;
  currentAPY: number;
  totalStaked: number;
  rewardPool: number;
  stakersCount: number;
  nextReward: number;
  userTokenBalance: number;
  userStakedBalance: number;
  userPendingRewards: number;
  referralCode: string;
  referralStats: ReferralStats;
  referrersLeaderboard: Leaderboard;
  stakersLeaderboard: Leaderboard;
  refreshTokenBalance: () => Promise<void>;
}

const TokenDataContext = createContext<TokenDataContextType | undefined>(undefined);

// Sample data for demonstration
const mockReferrersLeaderboard: Leaderboard = {
  weekly: [
    { address: 'address...m4jF', amount: 6240, referralCount: 45 },
    { address: 'address...p3xR', amount: 4120, referralCount: 31 },
    { address: 'address...k9nT', amount: 3480, referralCount: 24 }
  ],
  monthly: [
    { address: 'address...t4kL', amount: 15420, referralCount: 132 },
    { address: 'address...m4jF', amount: 12350, referralCount: 89 },
    { address: 'address...w7bQ', amount: 9870, referralCount: 76 }
  ]
};

const mockStakersLeaderboard: Leaderboard = {
  weekly: [
    { address: 'address...t7zK', amount: 542000, stakingDuration: 14, apyBonus: 1.0 },
    { address: 'address...b2vH', amount: 324000, stakingDuration: 21, apyBonus: 0.75 },
    { address: 'address...h5cF', amount: 215000, stakingDuration: 9, apyBonus: 0.5 }
  ],
  monthly: [
    { address: 'address...r9pJ', amount: 1240000, stakingDuration: 45, apyBonus: 1.0 },
    { address: 'address...t7zK', amount: 980000, stakingDuration: 38, apyBonus: 0.75 },
    { address: 'address...x2nM', amount: 675000, stakingDuration: 32, apyBonus: 0.5 }
  ]
};

export const TokenDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connected, publicKey } = useSolana();
  const [referralCode, setReferralCode] = useState<string>("");
  
  // Create a refresh function that will be added to the state
  const refreshTokenBalanceFunc = async () => {
    if (!connected || !publicKey) return;
    
    try {
      const walletAddress = publicKey.toString();
      console.log("Refreshing token balance for:", walletAddress);
      
      // Get token balance from the API
      const balanceResponse = await fetch(`/api/token-balance/${walletAddress}`);
      const balanceData = await balanceResponse.json();
      
      if (balanceResponse.ok && balanceData.success) {
        console.log("Refreshed token balance:", balanceData.balance);
        
        // Get staking info to update staked balance and pending rewards
        const stakingResponse = await fetch(`/api/staking-info/${walletAddress}`);
        const stakingData = await stakingResponse.json();
        
        console.log("Refreshed staking info:", stakingData);
        
        // Update token data with real values (keep referral stats the same)
        setTokenData(prev => ({
          ...prev,
          userTokenBalance: balanceData.balance || 0,
          userStakedBalance: stakingData.success && stakingData.stakingInfo ? 
            stakingData.stakingInfo.amountStaked : 0,
          userPendingRewards: stakingData.success && stakingData.stakingInfo ? 
            stakingData.stakingInfo.pendingRewards : 0,
        }));
      }
    } catch (error) {
      console.error('Error refreshing token data:', error);
    }
  };
  
  // Initialize with default values
  const [tokenData, setTokenData] = useState<TokenDataContextType>({
    tokenPrice: 0.0025,
    currentAPY: 125.4,
    totalStaked: 5243129,
    rewardPool: 128914,
    stakersCount: 1254,
    nextReward: 2530,
    userTokenBalance: 0,
    userStakedBalance: 0,
    userPendingRewards: 0,
    referralCode: "",
    referralStats: {
      totalReferrals: 0,
      totalEarnings: 0,
      weeklyRank: null,
      recentActivity: []
    },
    referrersLeaderboard: mockReferrersLeaderboard,
    stakersLeaderboard: mockStakersLeaderboard,
    refreshTokenBalance: refreshTokenBalanceFunc
  });
  
  // Function to refresh token balance, staking info, referral data, and leaderboards
  const refreshTokenBalance = async () => {
    if (!connected || !publicKey) return;
    
    try {
      const walletAddress = publicKey.toString();
      console.log("Refreshing token data for:", walletAddress);
      
      // Get token balance from the API
      const balanceResponse = await fetch(`/api/token-balance/${walletAddress}`);
      const balanceData = await balanceResponse.json();
      
      if (balanceResponse.ok && balanceData.success) {
        console.log("Refreshed token balance:", balanceData.balance);
        
        // Get staking info to update staked balance and pending rewards
        const stakingResponse = await fetch(`/api/staking-info/${walletAddress}`);
        const stakingData = await stakingResponse.json();
        
        console.log("Refreshed staking info:", stakingData);
        
        // Get referral stats
        const referralResponse = await fetch(`/api/referrals/${walletAddress}`);
        const referralData = await referralResponse.json();
        console.log("Refreshed referral stats:", referralData);
        
        // Get leaderboards
        const referrersWeeklyResponse = await fetch('/api/leaderboard/referrers/weekly');
        const referrersWeeklyData = await referrersWeeklyResponse.json();
        
        const referrersMonthlyResponse = await fetch('/api/leaderboard/referrers/monthly');
        const referrersMonthlyData = await referrersMonthlyResponse.json();
        
        const stakersWeeklyResponse = await fetch('/api/leaderboard/stakers/weekly');
        const stakersWeeklyData = await stakersWeeklyResponse.json();
        
        const stakersMonthlyResponse = await fetch('/api/leaderboard/stakers/monthly');
        const stakersMonthlyData = await stakersMonthlyResponse.json();
        
        // Update token data with all refreshed values
        setTokenData(prev => ({
          ...prev,
          userTokenBalance: balanceData.balance || 0,
          userStakedBalance: stakingData.success && stakingData.stakingInfo ? 
            stakingData.stakingInfo.amountStaked : 0,
          userPendingRewards: stakingData.success && stakingData.stakingInfo ? 
            stakingData.stakingInfo.pendingRewards : 0,
          referralStats: referralData,
          referrersLeaderboard: {
            weekly: referrersWeeklyData || [],
            monthly: referrersMonthlyData || []
          },
          stakersLeaderboard: {
            weekly: stakersWeeklyData || [],
            monthly: stakersMonthlyData || []
          }
        }));
      }
    } catch (error) {
      console.error('Error refreshing token data:', error);
    }
  };
  
  // Initialize with refreshTokenBalance function
  useEffect(() => {
    setTokenData(prev => ({
      ...prev,
      refreshTokenBalance
    }));
  }, [connected, publicKey]);
  
  // Fetch real token balance and staking info when wallet connected
  useEffect(() => {
    if (connected && publicKey) {
      // First check if we already have a referral code stored for this wallet address
      const walletAddress = publicKey.toString();
      const storedCodes = localStorage.getItem('walletReferralCodes');
      const codeMap = storedCodes ? JSON.parse(storedCodes) : {};
      
      let walletReferralCode: string;
      
      // If we have a stored code for this wallet, use it
      if (codeMap[walletAddress]) {
        walletReferralCode = codeMap[walletAddress];
      } else {
        // Generate a new code for this wallet and store it
        walletReferralCode = generateUniqueId().slice(0, 6).toUpperCase();
        codeMap[walletAddress] = walletReferralCode;
        localStorage.setItem('walletReferralCodes', JSON.stringify(codeMap));
      }
      
      setReferralCode(walletReferralCode);
      
      // Fetch real token balance from API
      const fetchTokenBalance = async () => {
        try {
          // Get token balance from the API
          const balanceResponse = await fetch(`/api/token-balance/${walletAddress}`);
          const balanceData = await balanceResponse.json();
          
          if (balanceResponse.ok && balanceData.success) {
            console.log("Fetched token balance:", balanceData.balance);
            
            // Get staking info to update staked balance and pending rewards
            const stakingResponse = await fetch(`/api/staking-info/${walletAddress}`);
            const stakingData = await stakingResponse.json();
            
            console.log("Fetched staking info:", stakingData);
            
            // Get referral stats
            const referralResponse = await fetch(`/api/referrals/${walletAddress}`);
            const referralData = await referralResponse.json();
            console.log("Fetched referral stats:", referralData);
            
            // Get leaderboards
            const referrersWeeklyResponse = await fetch('/api/leaderboard/referrers/weekly');
            const referrersWeeklyData = await referrersWeeklyResponse.json();
            
            const referrersMonthlyResponse = await fetch('/api/leaderboard/referrers/monthly');
            const referrersMonthlyData = await referrersMonthlyResponse.json();
            
            const stakersWeeklyResponse = await fetch('/api/leaderboard/stakers/weekly');
            const stakersWeeklyData = await stakersWeeklyResponse.json();
            
            const stakersMonthlyResponse = await fetch('/api/leaderboard/stakers/monthly');
            const stakersMonthlyData = await stakersMonthlyResponse.json();
            
            // Update token data with real values
            setTokenData(prev => ({
              ...prev,
              referralCode: walletReferralCode,
              userTokenBalance: balanceData.balance || 0,
              userStakedBalance: stakingData.success && stakingData.stakingInfo ? 
                stakingData.stakingInfo.amountStaked : 0,
              userPendingRewards: stakingData.success && stakingData.stakingInfo ? 
                stakingData.stakingInfo.pendingRewards : 0,
              refreshTokenBalance, // Make sure it's included
              referralStats: referralData,
              referrersLeaderboard: {
                weekly: referrersWeeklyData || [],
                monthly: referrersMonthlyData || []
              },
              stakersLeaderboard: {
                weekly: stakersWeeklyData || [],
                monthly: stakersMonthlyData || []
              }
            }));
          }
        } catch (error) {
          console.error('Error fetching token data:', error);
        }
      };
      
      // Call the fetch function
      fetchTokenBalance();
    } else {
      // Reset user data when disconnected
      setTokenData(prev => ({
        ...prev,
        referralCode: "",
        userTokenBalance: 0,
        userStakedBalance: 0,
        userPendingRewards: 0,
        refreshTokenBalance, // Make sure it's included
        referralStats: {
          totalReferrals: 0,
          totalEarnings: 0,
          weeklyRank: null,
          recentActivity: []
        }
      }));
    }
  }, [connected, publicKey]);
  
  return (
    <TokenDataContext.Provider value={tokenData}>
      {children}
    </TokenDataContext.Provider>
  );
};

export const useTokenData = () => {
  const context = useContext(TokenDataContext);
  if (context === undefined) {
    throw new Error('useTokenData must be used within a TokenDataProvider');
  }
  return context;
};
