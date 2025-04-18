/**
 * API Client for token staking operations
 */
import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';

/**
 * Register user for staking
 * Creates a user staking account in preparation for staking
 * 
 * @param walletAddress User's wallet address
 * @param wallet Connected wallet object with sendTransaction capability
 * @returns Registration result or error
 */
export const registerUserForStaking = async (
  walletAddress: string,
  wallet: any
): Promise<{
  error?: string;
  success?: boolean;
  message?: string;
  signature?: string;
}> => {
  try {
    console.log("🔧 Starting staking account registration for:", walletAddress);
    
    // First check if the user is already registered
    const accountInfoResponse = await fetch('/api/staking-accounts-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        amount: 1 // Just need a value here
      }),
    });
    
    if (!accountInfoResponse.ok) {
      console.error("Failed to get staking account info");
      return { error: "Failed to get staking account information" };
    }
    
    const accountInfo = await accountInfoResponse.json();
    console.log("Staking account info:", accountInfo);
    
    // If already registered, no need to continue
    if (accountInfo.isRegistered) {
      console.log("User already registered for staking");
      return { 
        success: true, 
        message: "Already registered for staking" 
      };
    }
    
    // Call our backend endpoint to get a registration transaction
    console.log("Creating registration transaction");
    const response = await fetch('/api/register-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('Registration API error:', errorData);
          return { error: errorData.message || 'Failed to create registration transaction' };
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          return { error: `Server error (${response.status}): Could not parse response` };
        }
      } else {
        const errorText = await response.text();
        console.error('Registration API returned non-JSON error:', errorText.substring(0, 150) + '...');
        return { error: `Server error (${response.status}): Received HTML instead of JSON` };
      }
    }

    const registrationData = await response.json();
    console.log('Server returned registration data:', registrationData);

    if (!registrationData.success) {
      return { error: registrationData.message || 'Server reported registration error' };
    }
    
    // If we have a serialized transaction, we need to deserialize, sign and send it
    if (registrationData.transaction) {
      try {
        console.log("Deserializing and sending registration transaction");
        
        // Deserialize the transaction
        const transactionBuffer = Buffer.from(registrationData.transaction, 'base64');
        const transaction = Transaction.from(transactionBuffer);
        
        // Get the connected wallet's pubkey
        const publicKey = new PublicKey(walletAddress);
        
        // Connect to devnet
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Send the transaction
        const signature = await wallet.sendTransaction(transaction, connection);
        console.log("Registration transaction sent:", signature);
        
        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        console.log("Registration transaction confirmed!");
        
        return {
          success: true,
          message: "Successfully registered for staking",
          signature
        };
      } catch (error) {
        console.error("Error sending registration transaction:", error);
        return {
          error: `Failed to send registration transaction: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // If server processed the transaction for us
    return { 
      success: true,
      message: registrationData.message || "Successfully registered for staking",
      signature: registrationData.signature
    };
  } catch (error) {
    console.error('Error in registration process:', error);
    return { 
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

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