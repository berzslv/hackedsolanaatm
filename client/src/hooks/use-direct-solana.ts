import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useSolana } from '@/hooks/use-solana';
import { 
  StakingUserInfo, 
  StakingVaultInfo, 
  getUserStakingInfo, 
  getStakingVaultInfo 
} from '@/lib/combined-smart-contract-client';

/**
 * Hook to interact with Solana blockchain directly
 * @param heliusApiKey Optional Helius API key for better RPC connection
 */
export const useDirectSolana = (heliusApiKey?: string) => {
  const { publicKey, connected } = useSolana();
  
  const [stakingInfo, setStakingInfo] = useState<StakingUserInfo | null>(null);
  const [stakingStats, setStakingStats] = useState<StakingVaultInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch user's staking info
  const fetchUserStakingInfo = useCallback(async () => {
    if (!publicKey) {
      setStakingInfo(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const walletAddress = publicKey.toString();
      const info = await getUserStakingInfo(walletAddress, heliusApiKey);
      
      setStakingInfo(info);
    } catch (err) {
      console.error('Error fetching user staking info:', err);
      setError('Failed to fetch staking information. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [publicKey, heliusApiKey]);
  
  // Fetch global staking vault stats
  const fetchStakingStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await getStakingVaultInfo(heliusApiKey);
      
      setStakingStats(stats);
    } catch (err) {
      console.error('Error fetching staking vault stats:', err);
      setError('Failed to fetch staking statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [heliusApiKey]);
  
  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchStakingStats(),
        connected ? fetchUserStakingInfo() : Promise.resolve()
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh staking data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [fetchStakingStats, fetchUserStakingInfo, connected]);
  
  // Fetch data on mount and when wallet changes
  useEffect(() => {
    if (connected) {
      fetchUserStakingInfo();
    } else {
      setStakingInfo(null);
    }
    
    fetchStakingStats();
  }, [connected, publicKey, fetchUserStakingInfo, fetchStakingStats]);
  
  return {
    stakingInfo,
    stakingStats,
    loading,
    error,
    refreshAllData,
    fetchUserStakingInfo,
    fetchStakingStats
  };
};