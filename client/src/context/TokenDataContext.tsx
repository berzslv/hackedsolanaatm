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
    stakersLeaderboard: mockStakersLeaderboard
  });
  
  // Generate referral code when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      // In a real implementation, this would be handled by the backend
      // and would be unique to the wallet address
      const generatedCode = generateUniqueId().slice(0, 6).toUpperCase();
      setReferralCode(generatedCode);
      
      // Simulate user data being loaded when connected
      setTokenData(prev => ({
        ...prev,
        referralCode: generatedCode,
        userTokenBalance: 1000,
        userStakedBalance: 500,
        userPendingRewards: 25,
        referralStats: {
          totalReferrals: 12,
          totalEarnings: 250,
          weeklyRank: 8,
          recentActivity: [
            {
              date: '2023-06-01',
              transaction: '5XkZHNqRstA1cLaBVY8FvDuKCJ2tLKWx1jQKbCYMFQY3',
              amount: 1000,
              reward: 30
            },
            {
              date: '2023-05-28',
              transaction: '2vKr8YPvR4FNYRqUwj5vkFdkB5v1AuVmfBKN3XxLwbGz',
              amount: 2500,
              reward: 75
            },
            {
              date: '2023-05-25',
              transaction: '3bC7gCJ86E8KFHtVCm5eH5E32k7vHyZ1xKr3UeGQMTLe',
              amount: 4800,
              reward: 144
            }
          ]
        }
      }));
    } else {
      // Reset user data when disconnected
      setTokenData(prev => ({
        ...prev,
        referralCode: "",
        userTokenBalance: 0,
        userStakedBalance: 0,
        userPendingRewards: 0,
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
