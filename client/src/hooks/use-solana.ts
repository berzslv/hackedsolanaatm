import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, Transaction, VersionedTransaction, clusterApiUrl } from '@solana/web3.js';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { createAnchorWallet, AnchorWallet } from '@/lib/anchor-types';

/**
 * A composable hook for interacting with Solana blockchain
 */
export function useSolana() {
  const { 
    publicKey,
    connected,
    connecting,
    disconnect,
    signTransaction,
    signAllTransactions,
    sendTransaction,
    wallet
  } = useWallet();
  
  const { setVisible } = useWalletModal();
  
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);
  
  // Get connection to Solana (using devnet for now)
  const getConnection = useCallback(() => {
    return new Connection(clusterApiUrl('devnet'), 'confirmed');
  }, []);
  
  // Refresh SOL balance
  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(0);
      return;
    }
    
    try {
      setBalanceLoading(true);
      const connection = getConnection();
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / 1_000_000_000); // Convert from lamports to SOL
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  }, [publicKey, getConnection]);
  
  // Open wallet modal
  const openWalletModal = useCallback(() => {
    setVisible(true);
  }, [setVisible]);
  
  // Refresh balance when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      refreshBalance();
    }
  }, [connected, publicKey, refreshBalance]);
  
  return {
    publicKey,
    connected,
    connecting,
    disconnect,
    signTransaction,
    signAllTransactions,
    sendTransaction,
    wallet,
    balance,
    balanceLoading,
    refreshBalance,
    openWalletModal,
    getConnection
  };
}