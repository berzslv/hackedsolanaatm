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
      default: return { border: 'border-border', bg: 'bg-muted', text: 'text-foreground/70' };
    }
  };
  
  const renderLeaderboard = (type: LeaderboardType, tab: LeaderboardTab) => {
    const leaderboard = type === 'referrers' 
      ? (referrersLeaderboard && referrersLeaderboard[tab] ? referrersLeaderboard[tab] : [])
      : (stakersLeaderboard && stakersLeaderboard[tab] ? stakersLeaderboard[tab] : []);
    
    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
      return (
        <div className="bg-card/50 rounded-lg p-6 text-center mb-6">
          <p className="text-foreground/70">No data available for this period</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 mb-6">
        {leaderboard.map((entry, index) => {
          const rankColors = getRankColor(index + 1);
          
          if (!entry || typeof entry !== 'object') {
            return null;
          }
          
          // Safe access to properties with fallbacks
          const address = entry.address ? shortenAddress(entry.address) : 'Unknown';
          const referralCount = typeof entry.referralCount === 'number' ? entry.referralCount : 0;
          const stakingDuration = typeof entry.stakingDuration === 'number' ? entry.stakingDuration : 0;
          const amount = typeof entry.amount === 'number' ? entry.amount : 0;
          const apyBonus = typeof entry.apyBonus === 'number' ? entry.apyBonus : 0;
          
          return (
            <div 
              key={index} 
              className={`bg-card rounded-lg p-4 border-l-4 ${rankColors.border} flex items-center justify-between shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full ${rankColors.bg} flex items-center justify-center ${rankColors.text} text-xs font-bold`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-foreground font-medium">{address}</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    {type === 'referrers' 
                      ? `${referralCount} referrals this ${tab}` 
                      : `${stakingDuration} days staking`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={type === 'referrers' ? 'text-accent font-semibold' : 'text-primary font-semibold'}>
                  {amount} HATM
                </p>
                <p className="text-xs text-foreground/70 mt-1">
                  {type === 'referrers' 
                    ? 'earned from referrals' 
                    : `staked with +${apyBonus}% APY bonus`
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
      <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border border-border shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-foreground">Top Referrers</h3>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={referrersTab === 'weekly' ? 'default' : 'outline'}
              onClick={() => setReferrersTab('weekly')}
            >
              Weekly
            </Button>
            <Button 
              size="sm"
              variant={referrersTab === 'monthly' ? 'default' : 'outline'}
              onClick={() => setReferrersTab('monthly')}
            >
              Monthly
            </Button>
          </div>
        </div>
        
        {renderLeaderboard('referrers', referrersTab)}
        
        <div className="bg-muted p-3 rounded-lg text-sm text-foreground/70">
          <p className="flex items-center gap-1">
            <i className="ri-trophy-line text-accent"></i>
            Top referrers receive additional token airdrops at the end of each period
          </p>
        </div>
      </div>
      
      {/* Stakers Leaderboard */}
      <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 border border-border shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-foreground">Top Stakers</h3>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={stakersTab === 'weekly' ? 'default' : 'outline'}
              onClick={() => setStakersTab('weekly')}
            >
              Weekly
            </Button>
            <Button 
              size="sm"
              variant={stakersTab === 'monthly' ? 'default' : 'outline'}
              onClick={() => setStakersTab('monthly')}
            >
              Monthly
            </Button>
          </div>
        </div>
        
        {renderLeaderboard('stakers', stakersTab)}
        
        <div className="bg-muted p-3 rounded-lg text-sm text-foreground/70">
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
