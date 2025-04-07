import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTokenData } from '@/context/TokenDataContext';
import { shortenAddress } from '@/lib/utils';

type LeaderboardTab = 'weekly' | 'monthly';
type LeaderboardType = 'referrers' | 'stakers';

const Leaderboard = () => {
  const { referrersLeaderboard, stakersLeaderboard } = useTokenData();
  const [referrersTab, setReferrersTab] = useState<LeaderboardTab>('weekly');
  const [stakersTab, setStakersTab] = useState<LeaderboardTab>('weekly');
  
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return { border: 'border-[#FFD700]', bg: 'bg-[#FFD700]/20', text: 'text-[#FFD700]' };
      case 2: return { border: 'border-[#C0C0C0]', bg: 'bg-[#C0C0C0]/20', text: 'text-[#C0C0C0]' };
      case 3: return { border: 'border-[#CD7F32]', bg: 'bg-[#CD7F32]/20', text: 'text-[#CD7F32]' };
      default: return { border: 'border-dark-600', bg: 'bg-dark-600/50', text: 'text-light-300' };
    }
  };
  
  const renderLeaderboard = (type: LeaderboardType, tab: LeaderboardTab) => {
    const leaderboard = type === 'referrers' 
      ? referrersLeaderboard[tab] 
      : stakersLeaderboard[tab];
    
    return (
      <div className="space-y-4 mb-6">
        {leaderboard.map((entry, index) => {
          const rankColors = getRankColor(index + 1);
          
          return (
            <div 
              key={index} 
              className={`bg-dark-700 rounded-lg p-4 border-l-4 ${rankColors.border} flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full ${rankColors.bg} flex items-center justify-center ${rankColors.text} text-xs font-bold`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-white font-medium">{shortenAddress(entry.address)}</p>
                  <p className="text-xs text-light-300 mt-1">
                    {type === 'referrers' 
                      ? `${entry.referralCount} referrals this ${tab}` 
                      : `${entry.stakingDuration} days staking`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={type === 'referrers' ? 'text-accent font-semibold' : 'text-primary font-semibold'}>
                  {entry.amount} HATM
                </p>
                <p className="text-xs text-light-300 mt-1">
                  {type === 'referrers' 
                    ? 'earned from referrals' 
                    : `staked with +${entry.apyBonus}% APY bonus`
                  }
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Referrers Leaderboard */}
      <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-6 border border-dark-600">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Top Referrers</h3>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={referrersTab === 'weekly' ? 'default' : 'outline'}
              onClick={() => setReferrersTab('weekly')}
              className={referrersTab === 'weekly' ? 'bg-dark-700' : 'bg-dark-600'}
            >
              Weekly
            </Button>
            <Button 
              size="sm"
              variant={referrersTab === 'monthly' ? 'default' : 'outline'}
              onClick={() => setReferrersTab('monthly')}
              className={referrersTab === 'monthly' ? 'bg-dark-700' : 'bg-dark-600'}
            >
              Monthly
            </Button>
          </div>
        </div>
        
        {renderLeaderboard('referrers', referrersTab)}
        
        <div className="bg-dark-900/50 p-3 rounded-lg text-sm text-light-300">
          <p className="flex items-center gap-1">
            <i className="ri-trophy-line text-accent"></i>
            Top referrers receive additional token airdrops at the end of each period
          </p>
        </div>
      </div>
      
      {/* Stakers Leaderboard */}
      <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-6 border border-dark-600">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Top Stakers</h3>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={stakersTab === 'weekly' ? 'default' : 'outline'}
              onClick={() => setStakersTab('weekly')}
              className={stakersTab === 'weekly' ? 'bg-dark-700' : 'bg-dark-600'}
            >
              Weekly
            </Button>
            <Button 
              size="sm"
              variant={stakersTab === 'monthly' ? 'default' : 'outline'}
              onClick={() => setStakersTab('monthly')}
              className={stakersTab === 'monthly' ? 'bg-dark-700' : 'bg-dark-600'}
            >
              Monthly
            </Button>
          </div>
        </div>
        
        {renderLeaderboard('stakers', stakersTab)}
        
        <div className="bg-dark-900/50 p-3 rounded-lg text-sm text-light-300">
          <p className="flex items-center gap-1">
            <i className="ri-trophy-line text-primary"></i>
            Top stakers receive APY bonuses and token airdrops at the end of each period
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
