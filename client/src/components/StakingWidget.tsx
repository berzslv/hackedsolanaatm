import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWalletContext } from '@/context/WalletContext';
import { useTokenData } from '@/context/TokenDataContext';
import { shortenAddress } from '@/lib/utils';

const StakingWidget = () => {
  const { connected, publicKey, setShowWalletModal } = useWalletContext();
  const { userStakedBalance, userPendingRewards, userTokenBalance } = useTokenData();
  
  const [stakeAmount, setStakeAmount] = useState<string>('');
  
  const handleMaxClick = () => {
    setStakeAmount(userTokenBalance.toString());
  };
  
  const handleStake = () => {
    if (!connected) {
      setShowWalletModal(true);
      return;
    }
    
    // Process staking
    alert('Staking functionality will be implemented when connected to Solana blockchain');
  };
  
  const handleUnstake = () => {
    if (!connected) {
      setShowWalletModal(true);
      return;
    }
    
    // Process unstaking
    alert('Unstaking functionality will be implemented when connected to Solana blockchain');
  };
  
  const handleClaimRewards = () => {
    if (!connected) {
      setShowWalletModal(true);
      return;
    }
    
    // Process claiming rewards
    alert('Claim rewards functionality will be implemented when connected to Solana blockchain');
  };
  
  return (
    <div className="p-6 relative z-10">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Your Staking</h3>
        <div className="px-3 py-1 bg-dark-600 rounded-full text-sm text-light-300">
          {connected && publicKey 
            ? shortenAddress(publicKey.toString())
            : 'Wallet Not Connected'
          }
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-dark-700 rounded-lg p-4">
          <p className="text-sm text-light-300 mb-1">Your Staked Balance</p>
          <p className="text-2xl font-semibold text-white">
            {connected ? `${userStakedBalance} HATM` : '0 HATM'}
          </p>
          <div className="mt-2 text-xs text-light-300 flex items-center gap-1">
            <i className="ri-information-line"></i>
            {connected 
              ? 'Staked tokens earn continuous rewards'
              : 'Connect wallet to view balance'
            }
          </div>
        </div>
        
        <div className="bg-dark-700 rounded-lg p-4">
          <p className="text-sm text-light-300 mb-1">Pending Rewards</p>
          <p className="text-2xl font-semibold text-primary">
            {connected ? `${userPendingRewards} HATM` : '0 HATM'}
          </p>
          <div className="mt-2 text-xs text-light-300 flex items-center gap-1">
            <i className="ri-information-line"></i>
            <span>Auto-compounds every 30 minutes</span>
          </div>
        </div>
      </div>
      
      <div className="bg-dark-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">Stake Your Tokens</h4>
          <div className="text-xs text-light-300 bg-dark-600 px-2 py-1 rounded">
            <span>Balance: </span>
            <span>{connected ? `${userTokenBalance} HATM` : '0 HATM'}</span>
          </div>
        </div>
        
        <div className="bg-dark-600 rounded-lg p-3 mb-4 flex justify-between items-center">
          <Input 
            type="number" 
            placeholder="0.0" 
            className="bg-transparent w-2/3 outline-none border-none"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            disabled={!connected}
          />
          <div className="flex items-center gap-2">
            <button 
              className="text-xs bg-dark-800 px-2 py-1 rounded hover:bg-dark-700"
              onClick={handleMaxClick}
              disabled={!connected}
            >
              MAX
            </button>
            <div className="text-light-300">HATM</div>
          </div>
        </div>
        
        <Button 
          className="w-full py-3 bg-gradient-to-r from-primary to-secondary rounded-lg font-medium text-dark-900 hover:opacity-90 transition-opacity"
          onClick={handleStake}
        >
          {connected ? 'Stake Tokens' : 'Connect Wallet to Stake'}
        </Button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Button 
          className="py-3 bg-dark-700 border border-primary/30 rounded-lg font-medium text-primary hover:bg-dark-600 transition-colors flex items-center justify-center gap-2"
          disabled={!connected || userStakedBalance <= 0}
          onClick={handleUnstake}
        >
          <i className="ri-wallet-3-line"></i>
          Unstake Tokens
        </Button>
        <Button 
          className="py-3 bg-dark-700 border border-primary/30 rounded-lg font-medium text-primary hover:bg-dark-600 transition-colors flex items-center justify-center gap-2"
          disabled={!connected || userPendingRewards <= 0}
          onClick={handleClaimRewards}
        >
          <i className="ri-coin-line"></i>
          Claim Rewards
        </Button>
      </div>
      
      <div className="mt-4 text-xs text-light-300 bg-dark-900/50 p-2 rounded-lg">
        <p className="flex items-center gap-1">
          <i className="ri-alert-line text-yellow-400"></i>
          Early withdrawal (within 7 days) incurs a 5% fee (4% burned, 1% marketing)
        </p>
      </div>
    </div>
  );
};

export default StakingWidget;
