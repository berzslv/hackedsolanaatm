// A simple in-memory cache for staking data provided by external service
// This acts as a proxy between the external staking data provider and our app

interface StakingData {
  walletAddress: string;
  amountStaked: number;
  pendingRewards: number;
  stakedAt: Date;
  lastUpdateTime: Date;
  estimatedAPY: number;
  timeUntilUnlock: number | null;
  timestamp: Date; // When this data was received
}

class ExternalStakingCache {
  private cache: Map<string, StakingData>;
  
  constructor() {
    this.cache = new Map<string, StakingData>();
    console.log('External staking data cache initialized');
  }
  
  // Update staking data for a wallet address
  updateStakingData(data: Omit<StakingData, 'timestamp'>): void {
    const walletAddress = data.walletAddress.toLowerCase();
    
    // Add timestamp when data was received
    const timestampedData: StakingData = {
      ...data,
      timestamp: new Date()
    };
    
    // Store in cache
    this.cache.set(walletAddress, timestampedData);
    console.log(`Updated staking data for ${walletAddress}`);
  }
  
  // Get staking data for a wallet address
  getStakingData(walletAddress: string): StakingData | null {
    const normalizedAddress = walletAddress.toLowerCase();
    const data = this.cache.get(normalizedAddress);
    
    if (!data) {
      console.log(`No external staking data found for ${walletAddress}`);
      return null;
    }
    
    // Check if data is stale (older than 5 minutes)
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (now.getTime() - data.timestamp.getTime() > staleThreshold) {
      console.log(`Staking data for ${walletAddress} is stale`);
      // We'll still return it, but log that it's stale
    }
    
    return data;
  }
  
  // Check if we have data for this wallet
  hasStakingData(walletAddress: string): boolean {
    return this.cache.has(walletAddress.toLowerCase());
  }
  
  // Clear all data
  clearCache(): void {
    this.cache.clear();
    console.log('External staking data cache cleared');
  }
  
  // Clear a specific wallet address from the cache
  clearWalletCache(walletAddress: string): void {
    this.cache.delete(walletAddress.toLowerCase());
    console.log(`Cleared staking cache for wallet: ${walletAddress}`);
  }
  
  // Get all wallet addresses with data
  getAllWalletAddresses(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export a singleton instance
export const externalStakingCache = new ExternalStakingCache();