import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ethers } from 'ethers';
import { initProvider, getCurrentAccount, ensureCorrectNetwork } from '../lib/ethereum/ethUtils';
import { getContractAddresses, DEFAULT_NETWORK } from '../lib/ethereum/config';

interface EthWalletConnectProps {
  onConnect?: (address: string) => void;
}

export function EthWalletConnect({ onConnect }: EthWalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState(DEFAULT_NETWORK);

  // Check if wallet is already connected on component mount
  useEffect(() => {
    async function checkConnection() {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            if (onConnect) onConnect(accounts[0]);
            
            // Get current network
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await provider.getNetwork();
            setNetworkName(getNetworkName(network.chainId));
          }
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    }

    checkConnection();
  }, [onConnect]);

  // Setup event listeners for account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
      } else {
        setAddress(accounts[0]);
        if (onConnect) onConnect(accounts[0]);
      }
    };

    const handleChainChanged = (chainId: string) => {
      setNetworkName(getNetworkName(parseInt(chainId, 16)));
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [onConnect]);

  const connectWallet = async () => {
    setConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
      }

      // Initialize provider and signer
      await initProvider();
      
      // Ensure we're on the correct network
      await ensureCorrectNetwork();
      
      // Get the connected account
      const account = await getCurrentAccount();
      setAddress(account);
      if (onConnect) onConnect(account);

      // Get current network
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      setNetworkName(getNetworkName(network.chainId));
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  // Helper function to get network name from chain ID
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1:
        return 'Ethereum Mainnet';
      case 5:
        return 'Goerli Testnet';
      case 11155111:
        return 'Sepolia Testnet';
      case 1337:
        return 'Local Network';
      default:
        return `Unknown Network (${chainId})`;
    }
  };

  // Get contract addresses for current network
  const getContractInfo = () => {
    try {
      const addresses = getContractAddresses(networkName.toLowerCase().split(' ')[0]);
      return (
        <div className="text-xs text-gray-500 mt-2">
          <div>Network: {networkName}</div>
          <div className="truncate">Token: {addresses.token}</div>
          <div className="truncate">Staking: {addresses.stakingVault}</div>
        </div>
      );
    } catch (err) {
      return null;
    }
  };

  return (
    <div className="flex flex-col items-center">
      {address ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Connected to Ethereum</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          {getContractInfo()}
        </div>
      ) : (
        <Button 
          onClick={connectWallet} 
          disabled={connecting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {connecting ? 'Connecting...' : 'Connect Ethereum Wallet'}
        </Button>
      )}
      
      {error && (
        <div className="mt-2 text-sm text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}