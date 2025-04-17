import { Request, Response } from 'express';

/**
 * Ethereum configuration endpoint
 * This provides configuration to the frontend without exposing secrets in the client code
 */
export async function handleEthereumConfig(req: Request, res: Response) {
  // Send Ethereum configuration to the client
  try {
    const config = {
      infuraApiKey: process.env.INFURA_API_KEY || 'INFURA_KEY_PLACEHOLDER',
      contracts: {
        sepolia: {
          token: "0x1234567890AbCdEf1234567890AbCdEf12345678", // Demo token address
          stakingVault: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12" // Demo staking address
        },
        goerli: {
          token: "0x0000000000000000000000000000000000000000",
          stakingVault: "0x0000000000000000000000000000000000000000"
        }
      }
    };
    
    res.status(200).json(config);
  } catch (error) {
    console.error('Error sending Ethereum configuration:', error);
    res.status(500).json({ error: 'Failed to retrieve Ethereum configuration' });
  }
}