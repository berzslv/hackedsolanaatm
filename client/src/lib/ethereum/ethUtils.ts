/**
 * Ethereum Utilities
 * 
 * This file contains utilities for interacting with Ethereum
 */
import { ethers } from 'ethers';
import { TokenABI, StakingVaultABI } from './abis';
import { getContractAddresses, getRpcEndpoint, getChainId, DEFAULT_NETWORK } from './config';

let provider: ethers.providers.Web3Provider | null = null;
let signer: ethers.Signer | null = null;

/**
 * Initialize Ethereum provider
 * @returns Provider and signer
 */
export async function initProvider() {
  if (window.ethereum) {
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create ethers provider
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      
      // Make sure we're on the right network
      await ensureCorrectNetwork();
      
      return { provider, signer };
    } catch (error) {
      console.error('User denied account access or other error:', error);
      throw error;
    }
  } else {
    console.error('No Ethereum provider detected');
    throw new Error('No Ethereum provider detected. Please install MetaMask or another wallet.');
  }
}

/**
 * Make sure the user is connected to the correct network
 */
export async function ensureCorrectNetwork() {
  if (!provider) return false;
  
  const network = await provider.getNetwork();
  const targetChainId = getChainId();
  
  if (network.chainId !== targetChainId) {
    try {
      // Request network switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + targetChainId.toString(16) }],
      });
      
      // Refresh provider after network switch
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      
      return true;
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }
  
  return true;
}

/**
 * Get user's current account
 * @returns User's Ethereum address
 */
export async function getCurrentAccount() {
  if (!provider) {
    await initProvider();
  }
  
  if (!signer) {
    throw new Error('No signer available');
  }
  
  return await signer.getAddress();
}

/**
 * Get token contract instance
 * @param withSigner Whether to connect with signer (for transactions)
 * @returns Token contract instance
 */
export function getTokenContract(withSigner = false) {
  if (!provider) {
    throw new Error('Provider not initialized');
  }
  
  const addresses = getContractAddresses();
  const contract = new ethers.Contract(addresses.token, TokenABI, provider);
  
  return withSigner && signer ? contract.connect(signer) : contract;
}

/**
 * Get staking vault contract instance
 * @param withSigner Whether to connect with signer (for transactions)
 * @returns Staking vault contract instance
 */
export function getStakingContract(withSigner = false) {
  if (!provider) {
    throw new Error('Provider not initialized');
  }
  
  const addresses = getContractAddresses();
  const contract = new ethers.Contract(addresses.stakingVault, StakingVaultABI, provider);
  
  return withSigner && signer ? contract.connect(signer) : contract;
}

/**
 * Get token balance for an address
 * @param address Address to check
 * @returns Token balance as ethers.BigNumber
 */
export async function getTokenBalance(address: string) {
  const tokenContract = getTokenContract();
  return await tokenContract.balanceOf(address);
}

/**
 * Format a BigNumber to a user-friendly string with specified decimals
 * @param amount Amount as BigNumber
 * @param decimals Decimals to use
 * @returns Formatted string
 */
export function formatAmount(amount: ethers.BigNumberish, decimals = 18) {
  return ethers.utils.formatUnits(amount, decimals);
}

/**
 * Parse a string to a BigNumber with specified decimals
 * @param amount Amount as string
 * @param decimals Decimals to use
 * @returns BigNumber
 */
export function parseAmount(amount: string, decimals = 18) {
  return ethers.utils.parseUnits(amount, decimals);
}

/**
 * Register a user in the staking contract
 * @param referrer Optional referrer address
 * @returns Transaction response
 */
export async function registerUser(referrer: string = ethers.constants.AddressZero) {
  const stakingContract = getStakingContract(true);
  
  // Execute the transaction
  const tx = await stakingContract.registerUser(referrer);
  
  // Wait for the transaction to be mined
  return await tx.wait();
}

/**
 * Stake tokens to the staking vault
 * @param amount Amount to stake as string (e.g. "100")
 * @returns Transaction response
 */
export async function stakeTokens(amount: string) {
  const tokenContract = getTokenContract(true);
  const stakingContract = getStakingContract(true);
  const addresses = getContractAddresses();
  
  // Parse the amount with 18 decimals
  const parsedAmount = parseAmount(amount);
  
  // First, approve the staking contract to spend tokens
  const approveTx = await tokenContract.approve(addresses.stakingVault, parsedAmount);
  await approveTx.wait();
  
  // Then, stake the tokens
  const stakeTx = await stakingContract.stake(parsedAmount);
  return await stakeTx.wait();
}

/**
 * Unstake tokens from the staking vault
 * @param amount Amount to unstake as string (e.g. "100")
 * @returns Transaction response
 */
export async function unstakeTokens(amount: string) {
  const stakingContract = getStakingContract(true);
  
  // Parse the amount with 18 decimals
  const parsedAmount = parseAmount(amount);
  
  // Execute the transaction
  const tx = await stakingContract.unstake(parsedAmount);
  return await tx.wait();
}

/**
 * Claim staking rewards
 * @returns Transaction response
 */
export async function claimRewards() {
  const stakingContract = getStakingContract(true);
  
  // Execute the transaction
  const tx = await stakingContract.claimRewards();
  return await tx.wait();
}

/**
 * Buy tokens with ETH
 * @param ethAmount Amount of ETH to use (as string, e.g. "0.1")
 * @returns Transaction response
 */
export async function buyTokens(ethAmount: string) {
  const tokenContract = getTokenContract(true);
  
  // Convert ETH amount to wei
  const weiAmount = parseAmount(ethAmount);
  
  // Execute the transaction with ETH value
  const tx = await tokenContract.buyTokens({ value: weiAmount });
  return await tx.wait();
}

/**
 * Buy and stake tokens in one operation
 * @param ethAmount Amount of ETH to use (as string, e.g. "0.1")
 * @param referrer Optional referrer address
 * @returns Array of transaction responses [buyTx, approveTx, stakeTx]
 */
export async function buyAndStakeTokens(ethAmount: string, referrer: string = ethers.constants.AddressZero) {
  const tokenContract = getTokenContract(true);
  const stakingContract = getStakingContract(true);
  const addresses = getContractAddresses();
  
  // Convert ETH amount to wei
  const weiAmount = parseAmount(ethAmount);
  
  // Step 1: Buy tokens with ETH
  const buyTx = await tokenContract.buyTokens({ value: weiAmount });
  const buyReceipt = await buyTx.wait();
  
  // Calculate the token amount (1 ETH = 1000 tokens)
  const tokenAmount = weiAmount.mul(1000);
  
  // Step 2: Make sure user is registered
  let isRegistered = false;
  try {
    const userAddress = await getCurrentAccount();
    isRegistered = await stakingContract.registeredUsers(userAddress);
  } catch (error) {
    console.error("Failed to check registration status:", error);
  }
  
  // Register if not already registered
  if (!isRegistered) {
    const registerTx = await stakingContract.registerUser(referrer);
    await registerTx.wait();
  }
  
  // Step 3: Approve staking contract to spend tokens
  const approveTx = await tokenContract.approve(addresses.stakingVault, tokenAmount);
  const approveReceipt = await approveTx.wait();
  
  // Step 4: Stake the tokens
  const stakeTx = await stakingContract.stake(tokenAmount);
  const stakeReceipt = await stakeTx.wait();
  
  return [buyReceipt, approveReceipt, stakeReceipt];
}

/**
 * Get user's staking info
 * @param address User address
 * @returns Staking info
 */
export async function getStakingInfo(address: string) {
  const stakingContract = getStakingContract();
  
  const [
    amountStaked,
    pendingRewards,
    stakedAt,
    lastClaimAt,
    referrer,
    isRegistered
  ] = await stakingContract.getStakingInfo(address);
  
  return {
    amountStaked,
    pendingRewards,
    stakedAt: new Date(stakedAt.toNumber() * 1000),
    lastClaimAt: new Date(lastClaimAt.toNumber() * 1000),
    referrer,
    isRegistered,
    // Format the staked amount and pending rewards for display
    formattedStakedAmount: formatAmount(amountStaked),
    formattedPendingRewards: formatAmount(pendingRewards)
  };
}

/**
 * Get user's referrals
 * @param address User address
 * @returns Array of referral addresses
 */
export async function getUserReferrals(address: string) {
  const stakingContract = getStakingContract();
  return await stakingContract.getUserReferrals(address);
}

/**
 * Get global staking stats
 * @returns Object with staking stats
 */
export async function getGlobalStats() {
  const stakingContract = getStakingContract();
  
  const [totalStaked, totalReferrals, stakersCount, rewardRate] = await Promise.all([
    stakingContract.totalStaked(),
    stakingContract.totalReferrals(),
    stakingContract.stakersCount(),
    stakingContract.rewardRate()
  ]);
  
  return {
    totalStaked,
    totalReferrals: totalReferrals.toNumber(),
    stakersCount: stakersCount.toNumber(),
    currentAPY: rewardRate.toNumber() / 100, // Convert basis points to percentage
    formattedTotalStaked: formatAmount(totalStaked)
  };
}

/**
 * Get time until a user can unstake without penalty
 * @param address User address
 * @returns Time in seconds, or 0 if already unlocked
 */
export async function getTimeUntilUnlock(address: string) {
  const stakingContract = getStakingContract();
  const seconds = await stakingContract.timeUntilUnlock(address);
  return seconds.toNumber();
}

/**
 * Check if wallet is connected
 * @returns Boolean indicating if wallet is connected
 */
export async function isWalletConnected() {
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0;
  } catch (error) {
    console.error("Failed to check if wallet is connected:", error);
    return false;
  }
}

/**
 * Listen for account changes
 * @param callback Function to call when accounts change
 */
export function onAccountsChanged(callback: (accounts: string[]) => void) {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', callback);
  }
}

/**
 * Listen for network changes
 * @param callback Function to call when network changes
 */
export function onNetworkChanged(callback: (networkId: string) => void) {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', callback);
  }
}