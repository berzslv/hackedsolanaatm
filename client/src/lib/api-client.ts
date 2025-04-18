/**
 * API Client for token staking operations
 */
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getStakingAccountInfo } from './combined-smart-contract-client';

/**
 * Stakes existing tokens by creating and sending a transaction directly from client side
 * @param walletAddress User's wallet address
 * @param amount Amount to stake
 * @param wallet Connected wallet object with sendTransaction capability
 * @returns Transaction result or error
 */
export const stakeExistingTokens = async (
  walletAddress: string,
  amount: number,
  wallet: any,
  referrer?: string
): Promise<{
  error?: string;
  stakingTransaction?: any;
}> => {
  try {
    // Call our backend endpoint to get necessary account info and prepare for staking
    const response = await fetch('/api/direct-stake-exact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        amount,
        referrer,
      }),
    });

    if (!response.ok) {
      // Check the content type to properly handle HTML error responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('Direct stake API error:', errorData);
          return { error: errorData.message || 'Failed to create staking transaction' };
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          return { error: `Server error (${response.status}): Could not parse response` };
        }
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const errorText = await response.text();
        console.error('Direct stake API returned non-JSON error:', errorText.substring(0, 150) + '...');
        return { error: `Server error (${response.status}): Received HTML instead of JSON` };
      }
    }

    const stakeData = await response.json();
    console.log('Server returned staking data:', stakeData);

    if (!stakeData.success) {
      return { error: stakeData.message || 'Server reported staking error' };
    }

    return { 
      stakingTransaction: stakeData 
    };
  } catch (error) {
    console.error('Error in staking process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Buy and stake tokens in one transaction
 * @param walletAddress User's wallet address
 * @param amount Amount to buy and stake
 * @param wallet Connected wallet object with sendTransaction capability
 * @returns Transaction result or error
 */
export const buyAndStakeTokens = async (
  walletAddress: string,
  amount: number,
  wallet: any,
  referrer?: string
): Promise<{
  error?: string;
  stakingTransaction?: any;
}> => {
  try {
    // Call our backend endpoint to get necessary account info and prepare for staking
    const response = await fetch('/api/buy-and-stake-exact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        amount,
        referrer,
      }),
    });

    if (!response.ok) {
      // Check the content type to properly handle HTML error responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('Buy and stake API error:', errorData);
          return { error: errorData.message || 'Failed to create buy and stake transaction' };
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          return { error: `Server error (${response.status}): Could not parse response` };
        }
      } else {
        // Handle non-JSON responses (like HTML error pages)
        const errorText = await response.text();
        console.error('Buy and stake API returned non-JSON error:', errorText.substring(0, 150) + '...');
        return { error: `Server error (${response.status}): Received HTML instead of JSON` };
      }
    }

    const stakeData = await response.json();
    console.log('Server returned buy and stake data:', stakeData);

    if (!stakeData.success) {
      return { error: stakeData.message || 'Server reported buy and stake error' };
    }

    return { 
      stakingTransaction: stakeData 
    };
  } catch (error) {
    console.error('Error in buy and stake process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};