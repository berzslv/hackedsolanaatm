/**
 * Ethereum Configuration
 * 
 * This file contains configuration for Ethereum integration
 * Update these values after deploying contracts to testnet
 */

// Contract addresses (manually set for demonstration)
export const CONTRACT_ADDRESSES = {
  // Sepolia testnet
  sepolia: {
    token: "0x1234567890AbCdEf1234567890AbCdEf12345678", // Demo token address
    stakingVault: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12" // Demo staking address
  },
  // Goerli testnet
  goerli: {
    token: "0x0000000000000000000000000000000000000000", // Replace after deployment
    stakingVault: "0x0000000000000000000000000000000000000000" // Replace after deployment
  },
  // Localhost/Hardhat
  localhost: {
    token: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Typical local Hardhat address
    stakingVault: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" // Typical local Hardhat address
  }
};

// JSON RPC endpoints
export const RPC_ENDPOINTS = {
  sepolia: `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY || 'INFURA_KEY_PLACEHOLDER'}`,
  goerli: `https://goerli.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY || 'INFURA_KEY_PLACEHOLDER'}`,
  localhost: "http://localhost:8545"
};

// Chain IDs
export const CHAIN_IDS = {
  sepolia: 11155111,
  goerli: 5,
  localhost: 1337
};

// Default network to use
export const DEFAULT_NETWORK = "sepolia"; // Change as needed

/**
 * Get contract addresses for a specific network
 * @param network Network name (sepolia, goerli, localhost)
 * @returns Contract addresses for the specified network
 */
export function getContractAddresses(network: string = DEFAULT_NETWORK) {
  return CONTRACT_ADDRESSES[network as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES.sepolia;
}

/**
 * Get RPC endpoint for a specific network
 * @param network Network name (sepolia, goerli, localhost)
 * @returns RPC endpoint for the specified network
 */
export function getRpcEndpoint(network: string = DEFAULT_NETWORK) {
  return RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS] || RPC_ENDPOINTS.sepolia;
}

/**
 * Get Chain ID for a specific network
 * @param network Network name (sepolia, goerli, localhost)
 * @returns Chain ID for the specified network
 */
export function getChainId(network: string = DEFAULT_NETWORK) {
  return CHAIN_IDS[network as keyof typeof CHAIN_IDS] || CHAIN_IDS.sepolia;
}