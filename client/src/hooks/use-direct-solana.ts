import { useState, useEffect, useRef } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { DirectSolanaClient, StakingInfo, StakingStats } from '@/lib/direct-solana-client';
import { useSolana } from '@/hooks/use-solana';

export const useDirectSolana = (heliusApiKey?: string) => {
  const { connected, publicKey } = useSolana();
  
  // References to maintain client instance
  const clientRef = useRef<DirectSolanaClient | null>(null);
  const connectionRef = useRef<Connection | null>(null);
  
  // State for staking data
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [stakingStats, setStakingStats] = useState<StakingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the client when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      try {
        // Create a connection if needed
        if (!connectionRef.current) {
          connectionRef.current = new Connection(clusterApiUrl('devnet'), 'confirmed');
        }
        
        // Create a new client
        clientRef.current = new DirectSolanaClient(
          connectionRef.current,
          publicKey,
          heliusApiKey
        );
        
        console.log('Direct Solana client initialized');
        
        // Load initial data
        loadStakingData();
      } catch (err) {
        console.error('Failed to initialize Direct Solana client:', err);
        setError('Failed to initialize blockchain connection');
      }
    } else {
      // Reset state when wallet disconnects
      setStakingInfo(null);
      setStakingStats(null);
    }
  }, [connected, publicKey, heliusApiKey]);
  
  // Function to load staking data
  const loadStakingData = async (forceRefresh = false) => {
    if (!clientRef.current || !connected || !publicKey) {
      console.log('Cannot load staking data - client not ready or wallet not connected');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Load user staking info
      const userInfo = await clientRef.current.getUserStakingInfo(forceRefresh);
      setStakingInfo(userInfo);
      
      // Load global staking stats
      const stats = await clientRef.current.getStakingStats(forceRefresh);
      setStakingStats(stats);
      
      console.log('Staking data loaded directly from blockchain');
    } catch (err) {
      console.error('Error loading staking data:', err);
      setError('Failed to load staking data from blockchain');
    } finally {
      setLoading(false);
    }
  };
  
  // Force refresh all data
  const refreshAllData = async () => {
    if (clientRef.current) {
      await clientRef.current.forceRefreshAllData();
      await loadStakingData(true);
    }
  };
  
  // Set a new Helius API key
  const setHeliusApiKey = (apiKey: string) => {
    if (clientRef.current) {
      clientRef.current.setHeliusApiKey(apiKey);
    }
  };
  
  return {
    stakingInfo,
    stakingStats,
    loading,
    error,
    refreshAllData,
    setHeliusApiKey
  };
};