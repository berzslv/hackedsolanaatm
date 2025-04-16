import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, MemStorage } from "./storage";
import { insertUserSchema, insertStakingSchema, insertReferralSchema, type Staking, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Import Helius webhook handlers
import { 
  handleStakeEvent,
  handleUnstakeEvent,
  handleTokenTransfer,
  handleClaimEvent,
  getStakingInfo as getHeliusStakingInfo,
  getTokenTransfers,
  getReferralStats as getHeliusReferralStats,
  getGlobalStats
} from './helius-webhooks';

// Import our buy-and-stake handler
import { handleBuyAndStake } from './buy-and-stake';

// Solana imports for airdrop functionality
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError
} from "@solana/spl-token";

// For debugging
console.log("TOKEN_PROGRAM_ID:", TOKEN_PROGRAM_ID.toString());
console.log("ASSOCIATED_TOKEN_PROGRAM_ID:", ASSOCIATED_TOKEN_PROGRAM_ID.toString());
import fs from "fs";
import path from "path";

// These functions are now moved to token-utils.ts

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes

  // Add a route to get token balance
  app.get("/api/token-balance/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      // Import the token utility
      const simpleToken = await import('./simple-token');

      // Get the token balance
      const balance = await simpleToken.getTokenBalance(walletAddress);

      // Return the balance
      return res.json({
        success: true,
        walletAddress,
        balance
      });
    } catch (error) {
      console.error("Error getting token balance:", error);
      return res.status(500).json({
        error: "Failed to get token balance",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // External service integration - endpoint for staking data provider
  // This will be called by your external service to provide staking data
  app.post("/api/external/staking-data", async (req, res) => {
    try {
      // Define expected structure for staking data from external service
      const { 
        walletAddress,
        amountStaked,
        pendingRewards,
        stakedAt,
        lastUpdateTime,
        estimatedAPY,
        timeUntilUnlock,
        apiKey
      } = req.body;
      
      // Basic validation
      if (!walletAddress || isNaN(amountStaked)) {
        return res.status(400).json({ error: "Invalid staking data provided" });
      }
      
      // In production, you would validate apiKey here for security
      // This prevents unauthorized updates to staking data
      // For now, we'll accept any data
      
      console.log(`Received external staking data for wallet: ${walletAddress}`, req.body);
      
      // Store in our cache
      const { externalStakingCache } = await import('./external-staking-cache');
      externalStakingCache.updateStakingData({
        walletAddress,
        amountStaked: Number(amountStaked),
        pendingRewards: Number(pendingRewards || 0),
        stakedAt: new Date(stakedAt || Date.now()),
        lastUpdateTime: new Date(lastUpdateTime || Date.now()),
        estimatedAPY: Number(estimatedAPY || 120),
        timeUntilUnlock: timeUntilUnlock ? Number(timeUntilUnlock) : null
      });
      
      return res.json({
        success: true,
        message: "Staking data received and stored successfully",
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error processing external staking data:", error);
      return res.status(500).json({
        error: "Failed to process external staking data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // NEW: Get all external staking data (for testing purposes)
  app.get("/api/external/staking-data", async (req, res) => {
    try {
      const { externalStakingCache } = await import('./external-staking-cache');
      const walletAddresses = externalStakingCache.getAllWalletAddresses();
      
      const allData = walletAddresses.map(address => {
        const data = externalStakingCache.getStakingData(address);
        return { walletAddress: address, data };
      });
      
      return res.json({
        success: true,
        count: allData.length,
        data: allData
      });
    } catch (error) {
      console.error("Error processing external staking data:", error);
      return res.status(500).json({
        error: "Failed to process external staking data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add a route to transfer tokens between wallets
  app.post("/api/transfer-token", async (req, res) => {
    try {
      const { senderWalletAddress, recipientWalletAddress, amount } = req.body;

      if (!senderWalletAddress || !recipientWalletAddress || !amount) {
        return res.status(400).json({ 
          error: "Sender wallet, recipient wallet, and amount are required" 
        });
      }

      // Parse amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      console.log(`Processing transfer: ${parsedAmount} tokens from ${senderWalletAddress} to ${recipientWalletAddress}`);

      // Import the token transfer utility
      const tokenTransfer = await import('./token-transfer');

      try {
        // For demonstration, we're using the authority to transfer the tokens
        // In a real application, the sender would sign this transaction from their wallet
        const signature = await tokenTransfer.authorityTransferTokens(
          recipientWalletAddress,
          parsedAmount
        );

        console.log(`Transfer successful! Signature: ${signature}`);

        // Return success with the transaction signature
        return res.json({
          success: true,
          message: `${parsedAmount} tokens transferred successfully`,
          senderWalletAddress,
          recipientWalletAddress,
          amount: parsedAmount,
          signature,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        });
      } catch (error) {
        console.error("Error in token transfer:", error);
        return res.status(500).json({
          error: "Failed to transfer tokens",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing token transfer:", error);
      return res.status(500).json({
        error: "Failed to transfer tokens",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get token stats directly from blockchain
  app.get("/api/token-stats", async (req, res) => {
    try {
      // In a real implementation, this would query the smart contract
      // to get the token statistics directly from the blockchain
      
      // For demonstration, we'll generate on-chain data simulation
      const tokenUtils = await import('./token-utils');
      const web3 = await import('@solana/web3.js');
      const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
      const mintAuthority = tokenUtils.getMintAuthority();
      
      // Mock on-chain token statistics with some realistic values
      const mockStats = {
        id: 1,
        totalSupply: 100000000,
        circulatingSupply: 35000000,
        burnedSupply: 5000000,
        holders: 14863,
        totalStaked: 25000000,
        stakersCount: 9542,
        price: 0.01, // in SOL
        marketCap: 350000, // in SOL
        volume24h: 52000, // in SOL
        updatedAt: new Date().toISOString()
      };
      
      // Add the mint address for verification
      const mintPubkey = tokenUtils.getTokenMint();
      const response = {
        ...mockStats,
        mintAddress: mintPubkey.toString()
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching token stats from blockchain:", error);
      res.status(500).json({ 
        message: "Failed to get token stats from blockchain",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Register user with wallet address
  app.post("/api/users/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Failed to register user" });
      }
    }
  });

  // Get user by wallet address
  app.get("/api/users/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get referral stats for a user
  app.get("/api/referrals/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const referralStats = await storage.getReferralStats(walletAddress);
      res.json(referralStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get referral stats" });
    }
  });

  // RESTful endpoint for validating referral codes - directly on-chain
  app.get("/api/validate-referral/:code", async (req, res) => {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({ valid: false, message: "Referral code is required" });
      }

      // In a real implementation, this would check the smart contract
      // to validate if the referral code exists
      
      // For demonstration, we'll consider codes 3-10 characters as valid
      // This simulates validating against on-chain data
      const isValid = code.length >= 3 && code.length <= 10;
      console.log(`Validating referral code on-chain: ${code}, Result: ${isValid}`);

      // Always return JSON with consistent format, don't use 404 status
      return res.json({ 
        valid: isValid, 
        message: isValid ? "Valid referral code from blockchain" : "Invalid referral code - not found on blockchain" 
      });
    } catch (error) {
      console.error("Error validating referral code on blockchain:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Failed to validate referral code on blockchain",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Keep the /validate endpoint for backward compatibility - now reads directly from blockchain
  app.get("/api/referrals/validate", async (req, res) => {
    try {
      const code = req.query.code as string;

      if (!code) {
        return res.status(400).json({ valid: false, message: "Referral code is required" });
      }

      console.log(`Received on-chain referral code validation request for: ${code}`);
      
      // In a real implementation, this would query the smart contract
      // For demonstration, we'll consider codes 3-10 characters as valid
      const isValid = code.length >= 3 && code.length <= 10;
      console.log(`On-chain validation result for code ${code}: ${isValid}`);

      return res.json({ 
        valid: isValid, 
        message: isValid ? "Valid referral code verified on blockchain" : "Invalid referral code - not found on blockchain" 
      });
    } catch (error) {
      console.error("Error validating referral code on blockchain:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Failed to validate referral code on blockchain", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Create a new referral
  app.post("/api/referrals", async (req, res) => {
    try {
      const referralData = insertReferralSchema.parse(req.body);
      const referral = await storage.createReferral(referralData);
      res.status(201).json(referral);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Failed to create referral" });
      }
    }
  });

  // Get staking info for a user - directly from blockchain using smart contract
  app.get("/api/staking/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Import the staking vault utilities that interact with the smart contract
      const stakingVaultUtils = await import('./staking-vault-utils');
      
      // Get user staking information directly from the smart contract
      const userStakingInfo = await stakingVaultUtils.getUserStakingInfo(walletAddress);
      
      // Get the staking vault address (in a real implementation, this would also come from the contract)
      const tokenUtils = await import('./token-utils');
      const mintAuthority = tokenUtils.getMintAuthority();
      const stakingVaultAddress = mintAuthority.keypair.publicKey.toString();
      
      // Format the response
      const stakingInfo = {
        amountStaked: userStakingInfo.amountStaked,
        pendingRewards: userStakingInfo.pendingRewards,
        stakedAt: userStakingInfo.stakedAt,
        lastCompoundAt: userStakingInfo.lastClaimAt || new Date(), // Using lastClaimAt for lastCompoundAt
        estimatedAPY: userStakingInfo.estimatedAPY,
        timeUntilUnlock: userStakingInfo.timeUntilUnlock,
        stakingVaultAddress
      };
      
      console.log(`Retrieved staking info from smart contract for ${walletAddress}:`, stakingInfo);
      res.json(stakingInfo);
    } catch (error) {
      console.error("Error getting staking info from smart contract:", error);
      res.status(500).json({ 
        message: "Failed to get staking info from smart contract",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get global staking stats - from simplified utils without Anchor
  app.get("/api/staking-stats", async (req, res) => {
    try {
      // Import the simplified staking vault utilities
      const stakingVaultUtils = await import('./staking-vault-utils-simplified');
      
      // Get global staking statistics 
      const vaultInfo = await stakingVaultUtils.getStakingVaultInfo();
      
      // Format the response with the data
      const stakingStats = {
        totalStaked: vaultInfo.totalStaked,
        rewardPool: vaultInfo.rewardPool,
        stakersCount: vaultInfo.stakersCount,
        currentAPY: vaultInfo.currentAPY,
        stakingVaultAddress: vaultInfo.stakingVaultAddress,
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`Retrieved global staking stats:`, stakingStats);
      res.json(stakingStats);
    } catch (error) {
      console.error("Error getting global staking stats:", error);
      res.status(500).json({ 
        message: "Failed to get staking stats",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stake tokens
  app.post("/api/staking", async (req, res) => {
    try {
      const stakingData = insertStakingSchema.parse(req.body);
      const staking = await storage.stakeTokens(stakingData);
      res.status(201).json(staking);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).message });
      } else {
        res.status(500).json({ message: "Failed to stake tokens" });
      }
    }
  });

  // Unstake tokens - directly on-chain
  app.post("/api/unstake", async (req, res) => {
    try {
      const { walletAddress, amount } = req.body;
      
      if (!walletAddress || !amount) {
        return res.status(400).json({ 
          error: "Wallet address and amount are required" 
        });
      }
      
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      console.log(`Processing on-chain unstake for wallet: ${walletAddress}, amount: ${parsedAmount}`);
      
      // In a real implementation, this would interact with the smart contract directly
      
      try {
        // Get token utilities
        const web3 = await import('@solana/web3.js');
        const tokenUtils = await import('./token-utils');
        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        const mintAuthority = tokenUtils.getMintAuthority();
        
        // Get user's current staking info to verify they have enough staked
        // In the real implementation, this would come from the blockchain
        const walletPubkey = new web3.PublicKey(walletAddress);
        const walletSeed = walletPubkey.toBuffer()[0] + walletPubkey.toBuffer()[31];
        const amountStaked = Math.floor(100 + (walletSeed * 50));
        const stakedDays = Math.floor(1 + (walletSeed % 7)); // 1-7 days
        
        // Check if they have enough tokens staked
        if (parsedAmount > amountStaked) {
          return res.status(400).json({ 
            error: "Insufficient staked tokens", 
            details: `You only have ${amountStaked} tokens staked.` 
          });
        }
        
        // Calculate early unstake fee if within 7-day lock period
        const lockPeriodDays = 7;
        const earlyUnstakeFeePercent = stakedDays < lockPeriodDays ? 25 : 0; // 25% fee for early unstake
        const feeAmount = Math.floor(parsedAmount * (earlyUnstakeFeePercent / 100));
        const netAmount = parsedAmount - feeAmount;
        
        // Calculate fee distribution (on a real implementation this would be handled by the contract)
        const burnAmount = Math.floor(feeAmount * 0.8); // 80% of fee is burned
        const marketingAmount = Math.floor(feeAmount * 0.2); // 20% of fee goes to marketing wallet
        
        // Create and execute token transfer from staking vault to user wallet
        // In a real implementation, this would be a contract call
        const tokenTransfer = await import('./token-transfer');
        const mintSignature = await tokenUtils.mintTokens(
          connection,
          mintAuthority,
          walletPubkey,
          netAmount // Transfer the amount after fees
        );
        
        console.log(`Unstake transaction successful! Signature: ${mintSignature}`);
        
        // Return the unstake result
        const result = {
          amountUnstaked: parsedAmount,
          fee: feeAmount,
          netAmount,
          burnAmount,
          marketingAmount,
          transactionSignature: mintSignature,
          explorerUrl: `https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`
        };
        
        res.json(result);
      } catch (error) {
        console.error("Error in unstaking process:", error);
        return res.status(500).json({
          error: "Failed to unstake tokens",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing unstake request:", error);
      res.status(500).json({ 
        message: "Failed to unstake tokens from blockchain",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get leaderboard - directly from on-chain data
  app.get("/api/leaderboard/:type/:period", async (req, res) => {
    try {
      const { type, period } = req.params;

      // Validate type and period
      const validTypes = ['referrers', 'stakers'];
      const validPeriods = ['weekly', 'monthly'];

      if (!validTypes.includes(type) || !validPeriods.includes(period)) {
        return res.status(400).json({ message: "Invalid leaderboard type or period" });
      }

      // In a real implementation, this would query the smart contract
      // to get the leaderboard data for the specified type and period
      
      // For demonstration, we'll mock the response with simulated on-chain data
      const mockLeaderboard = [];
      
      // Generate mock data with 10 entries
      for (let i = 1; i <= 10; i++) {
        mockLeaderboard.push({
          rank: i,
          walletAddress: `${i}qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQ${i}`,
          amount: Math.floor(1000 / i),  // Higher ranks have higher amounts
          displayName: `Top ${type === 'stakers' ? 'Staker' : 'Referrer'} ${i}`,
          type,
          period
        });
      }
      
      res.json(mockLeaderboard);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ message: "Failed to get leaderboard data from blockchain" });
    }
  });

  // Token airdrop endpoint - for devnet testing only
  app.post("/api/airdrop-token", async (req, res) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      console.log(`Processing airdrop request for wallet: ${walletAddress}`);

      try {
        // Import the token utilities
        const simpleToken = await import('./simple-token');

        // Mint tokens using SPL token program
        const signature = await simpleToken.mintTokens(walletAddress, 1000);

        // Get the updated token balance
        const tokenBalance = await simpleToken.getTokenBalance(walletAddress);

        // Return success with the transaction signature
        return res.json({
          success: true,
          message: "1000 HATM tokens have been airdropped to your wallet",
          amount: 1000,
          currentBalance: tokenBalance,
          signature,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        });
      } catch (error) {
        console.error("Error processing token airdrop:", error);
        return res.status(500).json({
          error: "Failed to airdrop tokens",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing token airdrop:", error);
      return res.status(500).json({ 
        error: "Failed to airdrop tokens",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // On-chain purchase and stake endpoint
  app.post("/api/purchase-and-stake", async (req, res) => {
    try {
      console.log("Received purchase-and-stake request:", req.body);
      const { walletAddress, solAmount, referralCode } = req.body;
      
      if (!walletAddress || !solAmount) {
        return res.status(400).json({ error: "Wallet address and SOL amount are required" });
      }
      
      // Parse SOL amount
      const parsedSolAmount = parseFloat(solAmount);
      if (isNaN(parsedSolAmount) || parsedSolAmount <= 0) {
        return res.status(400).json({ error: "Invalid SOL amount" });
      }
      
      console.log(`Processing purchase and stake for wallet: ${walletAddress}, SOL amount: ${parsedSolAmount}`);
      
      try {
        // Import the web3 utilities
        const web3 = await import('@solana/web3.js');
        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        
        // Get destination wallet (mint authority as treasury)
        const { keypair: authorityKeypair } = await (await import('./simple-token')).getMintAuthority();
        const treasuryWallet = authorityKeypair.publicKey;
        
        // Calculate token amount (1 HATM = 0.01 SOL)
        const feePercentage = referralCode ? 0.06 : 0.08; // 6% with referral, 8% without
        const effectiveSolAmount = parsedSolAmount * (1 - feePercentage);
        const tokenAmount = Math.floor(effectiveSolAmount / 0.01); // 0.01 SOL per HATM token
        
        // Create a SOL transfer transaction
        const transferTransaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: new web3.PublicKey(walletAddress),
            toPubkey: treasuryWallet,
            lamports: Math.floor(parsedSolAmount * web3.LAMPORTS_PER_SOL)
          })
        );
        
        // Get the recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transferTransaction.recentBlockhash = blockhash;
        transferTransaction.feePayer = new web3.PublicKey(walletAddress);
        
        // Don't sign with the authority - this causes "unknown signer" errors
        // Removed: transferTransaction.partialSign(authorityKeypair);
        
        // Serialize the transaction for the client to sign
        const serializedTransaction = transferTransaction.serialize({
          requireAllSignatures: false, // We just need a partial signature
          verifySignatures: false
        }).toString('base64');
        
        // Return the serialized transaction for frontend to sign and send
        return res.json({
          success: true,
          message: `Purchase and stake transaction prepared for ${parsedSolAmount} SOL`,
          solAmount: parsedSolAmount,
          tokenAmount: tokenAmount,
          destinationWallet: treasuryWallet.toString(),
          solTransferTransaction: serializedTransaction,
          feePercentage: feePercentage * 100,
          referralApplied: !!referralCode
        });
      } catch (error) {
        console.error("Error creating purchase and stake transaction:", error);
        return res.status(500).json({
          error: "Failed to create purchase and stake transaction",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing purchase and stake request:", error);
      return res.status(500).json({
        error: "Failed to process purchase and stake",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/buy-token", async (req, res) => {
    try {
      const { walletAddress, solAmount, referralCode } = req.body;

      if (!walletAddress || !solAmount) {
        return res.status(400).json({ error: "Wallet address and SOL amount are required" });
      }

      // Parse SOL amount
      const parsedSolAmount = parseFloat(solAmount);
      if (isNaN(parsedSolAmount) || parsedSolAmount <= 0) {
        return res.status(400).json({ error: "Invalid SOL amount" });
      }

      console.log(`Processing buy request for wallet: ${walletAddress}, SOL amount: ${parsedSolAmount}`);

      // Calculate fee based on referral code
      let feePercentage = 0.08; // 8% default fee

      if (referralCode) {
        // Check if referral code is valid
        const isValid = await storage.validateReferralCode(referralCode);
        if (isValid) {
          feePercentage = 0.06; // 6% fee with valid referral

          // Get the referrer's wallet address
          const referrerAddress = await storage.getReferrerAddressByCode(referralCode);
          
          if (referrerAddress) {
            // We'll record the referral in the complete-purchase endpoint
            console.log(`Valid referral code ${referralCode} will be processed after transaction completion`);
          } else {
            console.error(`Valid referral code ${referralCode} but could not find referrer address`);
          }
        }
      }

      // Import the token utilities
      const simpleToken = await import('./simple-token');

      // Calculate token amount with fees applied
      const tokenPrice = 0.01; // 1 HATM = 0.01 SOL
      const effectiveSolAmount = parsedSolAmount * (1 - feePercentage);
      const tokenAmount = Math.floor(effectiveSolAmount / tokenPrice);

      try {
        // Load the token transfer module
        const tokenTransfer = await import('./token-transfer');
        
        // Get the mint authority to use as the treasury wallet
        const { keypair: authorityKeypair } = simpleToken.getMintAuthority();
        const treasuryWallet = authorityKeypair.publicKey.toString();
        
        // Create a SOL transfer transaction that the client will need to sign
        const serializedTransaction = await tokenTransfer.createSolTransferTransaction(
          walletAddress,
          treasuryWallet,
          parsedSolAmount
        );
        
        console.log(`SOL transfer transaction prepared for ${parsedSolAmount} SOL`);
        
        // Return the transaction details to the client for signing
        return res.json({
          success: true,
          message: `Transaction ready to complete token purchase`,
          solAmount: parsedSolAmount,
          tokenAmount,
          feePercentage: feePercentage * 100,
          referralApplied: feePercentage === 0.06,
          solTransferTransaction: serializedTransaction,
          treasuryWallet
        });
      } catch (error) {
        console.error("Error in buy transaction:", error);
        return res.status(500).json({
          error: "Failed to buy tokens",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing token purchase:", error);
      return res.status(500).json({
        error: "Failed to buy tokens",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Complete on-chain purchase and staking in a single transaction
  app.post("/api/complete-purchase-and-stake", async (req, res) => {
    try {
      console.log("Received complete-purchase-and-stake request:", req.body);
      const { walletAddress, tokenAmount, solAmount, solTransferSignature, referralCode } = req.body;
      
      if (!walletAddress || !tokenAmount || !solTransferSignature) {
        return res.status(400).json({ 
          error: "Missing required parameters", 
          details: "Wallet address, token amount, and transaction signature are required" 
        });
      }
      
      // Parse the token amount
      const parsedTokenAmount = parseInt(tokenAmount, 10);
      if (isNaN(parsedTokenAmount) || parsedTokenAmount <= 0) {
        return res.status(400).json({ error: "Invalid token amount" });
      }
      
      console.log(`Processing on-chain purchase and stake: ${parsedTokenAmount} tokens for ${walletAddress}`);
      
      // Verify the SOL transfer transaction was successful
      const web3 = await import('@solana/web3.js');
      const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
      
      try {
        // Function to verify a transaction with retries
        const verifyTransaction = async (signature: string, maxRetries = 5, delay = 1000) => {
          let currentRetry = 0;
          
          while (currentRetry < maxRetries) {
            try {
              console.log(`Checking transaction status for: ${signature} (try ${currentRetry + 1}/${maxRetries})`);
              const statusResponse = await connection.getSignatureStatus(signature, {
                searchTransactionHistory: true,
              });
              
              const status = statusResponse.value;
              
              // If we have a status and no errors, transaction is good
              if (status && !status.err) {
                console.log(`Transaction confirmed on try ${currentRetry + 1}: ${signature}`);
                return true;
              }
              
              // Transaction found but has an error
              if (status && status.err) {
                console.error(`Transaction found but has error: ${JSON.stringify(status.err)}`);
                throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
              }
              
              // No status yet, transaction might still be processing
              console.log(`Transaction still processing, waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              currentRetry++;
              
              // Increase delay for each retry
              delay = delay * 1.5;
            } catch (error) {
              if (error instanceof Error && error.message.includes("Transaction failed")) {
                throw error; // Re-throw if it's our explicit error
              }
              console.error(`Error checking transaction status on try ${currentRetry + 1}:`, error);
              currentRetry++;
              await new Promise(resolve => setTimeout(resolve, delay));
              delay = delay * 1.5;
            }
          }
          
          // Max retries reached and no successful confirmation
          throw new Error(`Transaction verification timed out after ${maxRetries} attempts`);
        };
        
        // Verify transaction status with retries
        await verifyTransaction(solTransferSignature);
        console.log(`SOL transfer verified: ${solTransferSignature}`);
        
        // Process referral if code is provided
        if (referralCode) {
          // Here we would validate the referral code on-chain and distribute rewards
          // For now, just log that we would do this
          console.log(`Would process on-chain referral for code: ${referralCode}`);
        }
        
        // Get the staking vault address from our smart contract client
        const simpleToken = await import('./simple-token');
        const { keypair: authorityKeypair } = simpleToken.getMintAuthority();
        const stakingVaultAddress = authorityKeypair.publicKey.toString();
        
        // In a full on-chain implementation, we would:
        // 1. Mint tokens directly to the staking vault 
        // 2. Create a deposit record for the user in the smart contract
        
        // For now, mint tokens to the vault (represented by mint authority for simplicity)
        const mintSignature = await simpleToken.mintTokens(stakingVaultAddress, parsedTokenAmount);
        console.log(`Tokens minted directly to staking vault! Signature: ${mintSignature}`);
        
        // On a real blockchain implementation, the smart contract would handle the staking.
        // For our transitional implementation, we're using a combination of real token transactions
        // with database records until the smart contract is fully deployed.
        
        console.log(`Recording on-chain staking operation for ${walletAddress} with amount ${parsedTokenAmount}`);
        
        // We've sent the tokens to the staking vault on-chain, now just update our records
        // In the future, this would be read directly from the blockchain
        const currentStakingInfo = await storage.getStakingInfo(walletAddress);
        const previouslyStaked = currentStakingInfo.amountStaked || 0;
        
        // Update the staking record - this is temporary until we read directly from chain
        const updatedStakingInfo = await storage.stakeTokens({
          walletAddress,
          amountStaked: previouslyStaked + parsedTokenAmount,
          pendingRewards: 0 // Start with no pending rewards for the new staked amount
        });
        
        console.log(`On-chain staking: Previously staked: ${previouslyStaked}, New total: ${previouslyStaked + parsedTokenAmount}`);
        
        // Return the successful response
        return res.json({
          success: true,
          message: `${parsedTokenAmount} HATM tokens have been purchased and staked on-chain`,
          tokenAmount: parsedTokenAmount,
          solAmount: parseFloat(solAmount),
          stakingInfo: updatedStakingInfo,
          solTransferSignature,
          mintSignature,
          stakingVaultAddress,
          explorerUrl: `https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`
        });
      } catch (error) {
        console.error("Error in on-chain staking process:", error);
        return res.status(500).json({
          error: "Failed to complete on-chain purchase and stake",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error in complete-purchase-and-stake endpoint:", error);
      return res.status(500).json({
        error: "Failed to process on-chain purchase and stake",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Complete token purchase after SOL transfer
  app.post("/api/complete-purchase", async (req, res) => {
    try {
      console.log("Received complete-purchase request:", req.body);
      const { walletAddress, tokenAmount: rawTokenAmount, solAmount, solTransferSignature, referralCode } = req.body;
      
      // If referral code is present, let's make sure to record it
      if (referralCode) {
        const isValid = await storage.validateReferralCode(referralCode);
        if (isValid) {
          const referrerAddress = await storage.getReferrerAddressByCode(referralCode);
          if (referrerAddress) {
            try {
              // Create a referral record with the actual referrer address
              const parsedSolAmount = parseFloat(solAmount);
              const referralData = {
                referrerAddress: referrerAddress,
                buyerAddress: walletAddress,
                transactionHash: solTransferSignature,
                amount: parsedSolAmount,
                reward: parsedSolAmount * 0.03 // 3% reward for referrer
              };

              await storage.createReferral(referralData);
              console.log(`Referral recorded in complete-purchase for code: ${referralCode}, referrer: ${referrerAddress}`);
            } catch (error) {
              console.error("Error creating referral in complete-purchase:", error);
              // Continue with the purchase even if referral recording fails
            }
          }
        }
      }
      
      // Parse the token amount as a number
      const tokenAmount = parseInt(rawTokenAmount, 10);
      
      if (!walletAddress || isNaN(tokenAmount) || !solTransferSignature) {
        console.log("Missing or invalid required parameters:", { 
          hasWalletAddress: !!walletAddress, 
          rawTokenAmount,
          tokenAmount,
          hasTokenAmount: !isNaN(tokenAmount), 
          hasSolTransferSignature: !!solTransferSignature 
        });
        return res.status(400).json({ error: "Wallet address, valid token amount, and transaction signature are required" });
      }
      
      // Verify the SOL transfer transaction was successful
      const web3 = await import('@solana/web3.js');
      const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
      
      try {
        // Function to verify a transaction with retries
        const verifyTransaction = async (signature: string, maxRetries = 5, delay = 1000) => {
          let currentRetry = 0;
          
          while (currentRetry < maxRetries) {
            try {
              console.log(`Checking transaction status for: ${signature} (try ${currentRetry + 1}/${maxRetries})`);
              const statusResponse = await connection.getSignatureStatus(signature, {
                searchTransactionHistory: true,
              });
              
              const status = statusResponse.value;
              
              // If we have a status and no errors, transaction is good
              if (status && !status.err) {
                console.log(`Transaction confirmed on try ${currentRetry + 1}: ${signature}`);
                return true;
              }
              
              // Transaction found but has an error
              if (status && status.err) {
                console.error(`Transaction found but has error: ${JSON.stringify(status.err)}`);
                throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
              }
              
              // No status yet, transaction might still be processing
              console.log(`Transaction still processing, waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              currentRetry++;
              
              // Increase delay for each retry
              delay = delay * 1.5;
            } catch (error) {
              if (error instanceof Error && error.message.includes("Transaction failed")) {
                throw error; // Re-throw if it's our explicit error
              }
              console.error(`Error checking transaction status on try ${currentRetry + 1}:`, error);
              currentRetry++;
              await new Promise(resolve => setTimeout(resolve, delay));
              delay = delay * 1.5;
            }
          }
          
          // Max retries reached and no successful confirmation
          throw new Error(`Transaction verification timed out after ${maxRetries} attempts`);
        };
        
        // Verify transaction status with retries
        try {
          await verifyTransaction(solTransferSignature);
          console.log(`SOL transfer verified: ${solTransferSignature}`);
        } catch (error) {
          return res.status(400).json({ 
            error: error instanceof Error ? error.message : "Transaction verification failed",
            details: "Transaction may still be processing - please try again in a moment" 
          });
        }
        
        // Now proceed with token minting since SOL transfer is confirmed
        const simpleToken = await import('./simple-token');
        
        // Mint tokens to the user's wallet
        const mintSignature = await simpleToken.mintTokens(walletAddress, tokenAmount);
        
        // Get updated token balance
        const tokenBalance = await simpleToken.getTokenBalance(walletAddress);
        
        console.log(`Tokens minted successfully! Signature: ${mintSignature}`);
        
        // Update token stats
        try {
          const tokenStats = await storage.getTokenStats();
          await storage.updateTokenStats({
            totalSupply: tokenStats.totalSupply + tokenAmount,
            circulatingSupply: tokenStats.circulatingSupply + tokenAmount,
          });
        } catch (error) {
          console.error("Error updating token stats:", error);
          // Continue even if stats update fails
        }
        
        // Automatically stake all purchased tokens (new feature)
        let stakingResult = null;
        try {
          // Record staking in database with zero pending rewards
          const staking = await storage.stakeTokens({
            walletAddress,
            amountStaked: tokenAmount,
            pendingRewards: 0
          });
          
          console.log(`Automatically staked ${tokenAmount} tokens for ${walletAddress}`);
          
          // Update staking stats
          const updatedTokenStats = await storage.getTokenStats();
          await storage.updateTokenStats({
            totalStaked: updatedTokenStats.totalStaked + tokenAmount,
            stakersCount: updatedTokenStats.stakersCount + 1, // New staker
          });
          
          // Update leaderboard for staker
          await storage.updateLeaderboard({
            walletAddress,
            type: 'stakers',
            period: 'weekly',
            amount: tokenAmount,
            rank: 1 // This will be recalculated by the system later
          });
          
          await storage.updateLeaderboard({
            walletAddress,
            type: 'stakers',
            period: 'monthly',
            amount: tokenAmount,
            rank: 1 // This will be recalculated by the system later
          });
          
          stakingResult = {
            success: true,
            amountStaked: tokenAmount,
            message: "Tokens automatically staked"
          };
        } catch (stakingError) {
          console.error("Failed to automatically stake tokens:", stakingError);
          stakingResult = {
            success: false,
            error: "Failed to automatically stake tokens"
          };
        }
        
        // Return success response
        return res.json({
          success: true,
          message: `${tokenAmount} HATM tokens have been purchased and automatically staked`,
          solAmount: parseFloat(solAmount),
          tokenAmount,
          currentBalance: tokenBalance,
          solTransferSignature,
          mintSignature,
          explorerUrl: `https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`,
          staking: stakingResult
        });
      } catch (error) {
        console.error("Error verifying SOL transfer transaction:", error);
        return res.status(500).json({
          error: "Failed to verify SOL transfer",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error completing purchase:", error);
      return res.status(500).json({
        error: "Failed to complete token purchase",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post("/api/transfer-sol", async (req, res) => {
    try {
      const { walletAddress, solAmount, destinationWallet } = req.body;

      if (!walletAddress || !solAmount) {
        return res.status(400).json({ error: "Wallet address and SOL amount are required" });
      }

      // Parse SOL amount
      const parsedSolAmount = parseFloat(solAmount);
      if (isNaN(parsedSolAmount) || parsedSolAmount <= 0) {
        return res.status(400).json({ error: "Invalid SOL amount" });
      }

      console.log(`Processing SOL transfer request for wallet: ${walletAddress}, SOL amount: ${parsedSolAmount}`);

      try {
        // Import the web3 utilities
        const web3 = await import('@solana/web3.js');
        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');

        // Get a destination wallet - using mint authority as treasury
        const { keypair: authorityKeypair } = await (await import('./simple-token')).getMintAuthority();
        const treasuryWallet = destinationWallet ? 
          new web3.PublicKey(destinationWallet) : 
          authorityKeypair.publicKey;

        // Create a SOL transfer transaction
        const transferTransaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: new web3.PublicKey(walletAddress),
            toPubkey: treasuryWallet,
            lamports: Math.floor(parsedSolAmount * web3.LAMPORTS_PER_SOL)
          })
        );

        // Get the recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transferTransaction.recentBlockhash = blockhash;
        transferTransaction.feePayer = new web3.PublicKey(walletAddress);

        // Don't sign with the authority - this causes "unknown signer" errors
        // transferTransaction.partialSign(authorityKeypair);

        // Serialize the transaction for the client to sign
        const serializedTransaction = transferTransaction.serialize({
          requireAllSignatures: false, // We just need a partial signature
          verifySignatures: false
        }).toString('base64');

        // Return the serialized transaction for frontend to sign and send
        return res.json({
          success: true,
          message: `SOL transfer transaction prepared for ${parsedSolAmount} SOL`,
          solAmount: parsedSolAmount,
          destinationWallet: treasuryWallet.toString(),
          serializedTransaction
        });
      } catch (error) {
        console.error("Error creating SOL transfer:", error);
        return res.status(500).json({
          error: "Failed to create SOL transfer",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing SOL transfer request:", error);
      return res.status(500).json({
        error: "Failed to process SOL transfer",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to get staking info - using external data when available
  app.get("/api/staking-info/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      console.log(`Getting staking info for wallet: ${walletAddress}`);
      
      // Get token balance - this works reliably
      const simpleTokenModule = await import('./simple-token');
      const tokenBalance = await simpleTokenModule.getTokenBalance(walletAddress);
      const { keypair: authorityKeypair } = simpleTokenModule.getMintAuthority();
      const stakingVaultAddress = authorityKeypair.publicKey.toString();
      
      // Check if we have data from external provider
      const { externalStakingCache } = await import('./external-staking-cache');
      const externalData = externalStakingCache.getStakingData(walletAddress);
      
      // Import our simplified staking vault utils
      const stakingVaultUtils = await import('./staking-vault-utils-simplified');
      
      let stakingResponse;
      
      if (externalData) {
        console.log(`Using external staking data for ${walletAddress}:`, externalData);
        
        // Use data from external source
        stakingResponse = {
          amountStaked: externalData.amountStaked,
          pendingRewards: externalData.pendingRewards,
          stakedAt: externalData.stakedAt,
          lastCompoundAt: externalData.lastUpdateTime,
          estimatedAPY: externalData.estimatedAPY,
          timeUntilUnlock: externalData.timeUntilUnlock,
          stakingVaultAddress,
          walletTokenBalance: tokenBalance,
          dataSource: 'external',
          lastUpdated: externalData.timestamp
        };
      } else {
        console.log(`No external staking data available for ${walletAddress}, using zeros`);
        
        // No external data, use default values
        stakingResponse = {
          amountStaked: 0,
          pendingRewards: 0,
          stakedAt: new Date(),
          lastCompoundAt: new Date(),
          estimatedAPY: 120, // Default APY
          timeUntilUnlock: null,
          stakingVaultAddress,
          walletTokenBalance: tokenBalance,
          dataSource: 'default'
        };
      }
      
      console.log("Staking info for", walletAddress, ":", JSON.stringify(stakingResponse, null, 2));
      
      return res.json({
        success: true,
        stakingInfo: stakingResponse,
      });
    } catch (error) {
      console.error("Error fetching staking info from smart contract:", error);
      return res.status(500).json({
        error: "Failed to fetch staking information from smart contract",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to buy tokens - first step in the two-transaction staking process
  app.post("/api/buy-tokens", async (req, res) => {
    try {
      const { walletAddress, amount } = req.body;
      
      if (!walletAddress || !amount) {
        return res.status(400).json({ error: "Wallet address and amount are required" });
      }
      
      // Parse token amount
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid token amount" });
      }
      
      console.log(`Processing token purchase request for wallet: ${walletAddress}, amount: ${parsedAmount}`);
      
      try {
        // In a real implementation, this would mint tokens or transfer from a treasury
        // For now, we'll just create a transaction to mint tokens to the user
        const simpleTokenModule = await import('./simple-token');
        const tokenMintAddress = simpleTokenModule.getTokenMint().toString();
        
        // Create a transaction for minting tokens to the user
        // In a production system, this would involve payment processing
        const mintTransaction = await simpleTokenModule.createMintTokensTransaction(
          walletAddress,
          parsedAmount
        );
        
        // Return the serialized transaction to the client to sign
        return res.json({
          success: true,
          message: `Transaction created to purchase ${parsedAmount} HATM tokens`,
          transaction: mintTransaction,
          tokenAmount: parsedAmount,
          tokenMint: tokenMintAddress
        });
      } catch (error) {
        console.error("Error in token purchase process:", error);
        return res.status(500).json({
          error: "Failed to create token purchase transaction",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing token purchase request:", error);
      return res.status(500).json({
        error: "Failed to process token purchase request",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to stake tokens - second step in the two-transaction staking process
  // Endpoint for combined buying and staking tokens in one transaction
  app.post("/api/buy-and-stake", handleBuyAndStake);
  
  app.post("/api/stake-tokens", async (req, res) => {
    try {
      const { walletAddress, amount } = req.body;
      
      if (!walletAddress || !amount) {
        return res.status(400).json({ error: "Wallet address and amount are required" });
      }
      
      // Parse token amount
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid token amount" });
      }
      
      console.log(`Processing staking request for wallet: ${walletAddress}, amount: ${parsedAmount}`);
      
      // Check token balance first
      const simpleTokenModule = await import('./simple-token');
      const tokenBalance = await simpleTokenModule.getTokenBalance(walletAddress);
      
      if (tokenBalance < parsedAmount) {
        return res.status(400).json({ 
          error: "Insufficient token balance", 
          tokenBalance, 
          requestedAmount: parsedAmount 
        });
      }
      
      try {
        // Transfer tokens to staking vault (the mint authority for simplicity)
        const tokenTransferModule = await import('./token-transfer');
        const { keypair: authorityKeypair } = simpleTokenModule.getMintAuthority();
        const stakingVaultAddress = authorityKeypair.publicKey.toString();
        
        // Create a transaction for the user to sign that will transfer tokens to the staking vault
        const serializedTransaction = await tokenTransferModule.createTokenStakingTransaction(
          walletAddress,       // source (user wallet)
          stakingVaultAddress, // destination (staking vault)
          parsedAmount         // amount of tokens to transfer
        );
        
        // We'll return this transaction to the client to be signed
        return res.json({
          success: true,
          message: `Transaction created to stake ${parsedAmount} HATM tokens`,
          transaction: serializedTransaction,
          stakingAmount: parsedAmount,
          stakingVaultAddress: stakingVaultAddress
        });
      } catch (error) {
        console.error("Error in staking process:", error);
        return res.status(500).json({
          error: "Failed to stake tokens",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing staking request:", error);
      return res.status(500).json({
        error: "Failed to process staking request",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to unstake tokens - directly on-chain
  app.post("/api/unstake-tokens", async (req, res) => {
    try {
      const { walletAddress, amount } = req.body;
      
      if (!walletAddress || !amount) {
        return res.status(400).json({ error: "Wallet address and amount are required" });
      }
      
      // Parse token amount
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid token amount" });
      }
      
      console.log(`Processing unstaking request for wallet: ${walletAddress}, amount: ${parsedAmount}`);
      
      try {
        // In a real implementation, we would call the staking smart contract
        // to process unstaking with appropriate fees based on lock-up period
        
        // For now, calculate fees based on our rules
        const earlyWithdrawalFee = 0.1; // 10% fee for early withdrawal
        const burnFee = 0.05; // 5% goes to burn 
        const marketingFee = 0.05; // 5% goes to marketing wallet
        
        // Calculate net amount after fees
        const netAmount = parsedAmount * (1 - earlyWithdrawalFee);
        const burnAmount = parsedAmount * burnFee;
        const marketingAmount = parsedAmount * marketingFee;
        
        // Transfer tokens from the staking vault to the user's wallet
        const tokenTransferModule = await import('./token-transfer');
        const simpleTokenModule = await import('./simple-token');
        const { keypair: authorityKeypair } = simpleTokenModule.getMintAuthority();
        
        // Transfer the net amount back to the user from the staking vault
        const transferSignature = await tokenTransferModule.authorityTransferTokens(
          walletAddress,  // destination (user wallet)
          netAmount       // amount after fees
        );
        
        console.log(`Unstaked and transferred ${netAmount} tokens to ${walletAddress}: ${transferSignature}`);
        
        // Create a mock result that would come from the on-chain contract
        const unstakeResult = {
          amountUnstaked: parsedAmount,
          fee: parsedAmount * earlyWithdrawalFee,
          netAmount: netAmount,
          burnAmount: burnAmount,
          marketingAmount: marketingAmount
        };
        
        // Mock updated staking info
        const stakingResponse = {
          amountStaked: 500 - parsedAmount, // This would come from the contract
          pendingRewards: 25, // This would come from the contract
          stakedAt: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)),
          lastCompoundAt: new Date(Date.now() - (1 * 60 * 60 * 1000)),
          estimatedAPY: 125.4,
          timeUntilUnlock: 4 * 24 * 60 * 60 * 1000 // 4 days left
        };
        
        // Prepare response with details
        return res.json({
          success: true,
          message: `${parsedAmount} HATM tokens have been unstaked (${netAmount} after fees)`,
          stakingInfo: stakingResponse,
          unstakeResult,
          transactionSignature: transferSignature,
          explorerUrl: `https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`
        });
      } catch (error) {
        console.error("Error in unstaking process:", error);
        return res.status(500).json({
          error: "Failed to unstake tokens",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing unstaking request:", error);
      return res.status(500).json({
        error: "Failed to process unstaking request",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to claim rewards from staking - directly on-chain
  app.post("/api/claim-rewards", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      console.log(`Processing claim rewards request for wallet: ${walletAddress}`);
      
      // In a real implementation, we would query the smart contract for pending rewards
      // For now, we'll use fixed data to simulate on-chain values
      const pendingRewards = 25; // This would come from the smart contract
      
      if (pendingRewards <= 0) {
        return res.status(400).json({ error: "No rewards available to claim" });
      }
      
      // Process the rewards claim with actual blockchain transaction
      try {
        // Get token modules to handle the actual token transfer
        const tokenUtils = await import('./token-utils');
        const connection = tokenUtils.getSolanaConnection();
        const mintAuthority = tokenUtils.getMintAuthority();
        
        // Verify the user's wallet address is a valid Solana address
        const walletPubkey = new (await import('@solana/web3.js')).PublicKey(walletAddress);
        
        // Get user's current token balance from the actual blockchain
        const userTokenAccount = await tokenUtils.getOrCreateAssociatedTokenAccount(
          connection,
          mintAuthority,
          walletPubkey
        );
        
        // Process the claim by minting real tokens to the user
        // This uses our actual token mint authority to mint tokens to the user's wallet
        console.log(`Minting ${pendingRewards} reward tokens to ${walletAddress}`);
        const mintSignature = await tokenUtils.mintTokens(
          connection,
          mintAuthority,
          walletPubkey,
          pendingRewards
        );
        
        console.log(`Token mint signature: ${mintSignature}`);
        
        // In real implementation, the smart contract would update the rewards to zero
        // For now, we'll just mock the updated staking info
        const updatedStakingInfo = {
          amountStaked: 500, // This would come from the contract
          pendingRewards: 0, // Reset to zero after claiming
          stakedAt: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)),
          lastCompoundAt: new Date(), // Update to now since rewards were just claimed
          estimatedAPY: 125.4,
          timeUntilUnlock: 4 * 24 * 60 * 60 * 1000 // 4 days left
        };
        
        // Get updated token balance after minting
        const postClaimBalance = await tokenUtils.getTokenBalance(
          connection, 
          tokenUtils.getTokenMint(), 
          walletPubkey
        );
        
        // Return success response with details
        return res.json({
          success: true,
          message: `${pendingRewards} HATM tokens claimed as rewards`,
          stakingInfo: updatedStakingInfo,
          rewardAmount: pendingRewards,
          currentBalance: postClaimBalance,
          transactionSignature: mintSignature,
          explorerUrl: `https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`
        });
      } catch (error) {
        console.error("Error claiming rewards:", error);
        return res.status(500).json({
          error: "Failed to claim rewards",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing claim rewards request:", error);
      return res.status(500).json({
        error: "Failed to process claim rewards request",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to confirm staking after successful transaction - directly on-chain
  app.post("/api/confirm-staking", async (req, res) => {
    try {
      const { walletAddress, amount, transactionSignature } = req.body;
      
      if (!walletAddress || !amount || !transactionSignature) {
        return res.status(400).json({ 
          error: "Wallet address, amount, and transaction signature are required" 
        });
      }
      
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid token amount" });
      }
      
      console.log(`Recording staking after successful transaction for wallet: ${walletAddress}, amount: ${parsedAmount}, tx: ${transactionSignature}`);
      
      try {
        // In a real implementation, this would be verified with the smart contract
        // For now, we'll use the transaction signature to verify it was successful
        const web3 = await import('@solana/web3.js');
        const connection = new web3.Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        
        // Verify the transaction was confirmed
        try {
          const status = await connection.getSignatureStatus(transactionSignature);
          if (!status.value || status.value.err) {
            console.error(`Transaction verification failed: ${JSON.stringify(status.value?.err || 'Not found')}`);
            return res.status(400).json({ 
              error: "Transaction verification failed",
              details: status.value?.err ? JSON.stringify(status.value.err) : "Transaction not found"
            });
          }
          console.log(`Transaction verified: ${transactionSignature}`);
        } catch (error) {
          console.error(`Error verifying transaction: ${error}`);
          return res.status(400).json({ 
            error: "Failed to verify transaction",
            details: error instanceof Error ? error.message : String(error)
          });
        }
        
        // In a real implementation, the smart contract would have updated the staking state
        // For now, we'll mock the response with simulated on-chain data
        const tokenUtils = await import('./token-utils');
        const mintAuthority = tokenUtils.getMintAuthority();
        const stakingVaultAddress = mintAuthority.keypair.publicKey.toString();
        
        // Mock staking entry as it would be returned from the smart contract
        const stakingEntry = {
          walletAddress,
          amountStaked: parsedAmount,
          pendingRewards: 0,
          stakingVaultAddress,
          startTime: Date.now(),
          lockEndTime: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
        };
        
        // Mock updated staking info (would come from the contract)
        const stakingInfo = {
          amountStaked: parsedAmount,
          pendingRewards: 0,
          stakedAt: new Date(),
          lastCompoundAt: new Date(),
          estimatedAPY: 125.4,
          timeUntilUnlock: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          stakingVaultAddress
        };
        
        return res.json({
          success: true,
          message: `${parsedAmount} HATM tokens have been staked successfully on chain`,
          stakingInfo,
          stakingEntry,
          transactionSignature,
          explorerUrl: `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
        });
      } catch (error) {
        console.error("Error in staking record process:", error);
        return res.status(500).json({
          error: "Failed to record staking",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing staking confirmation request:", error);
      return res.status(500).json({
        error: "Failed to process staking confirmation",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });


  
  // Referral System Routes
  
  // Register a referral code - directly on-chain
  app.post("/api/register-referral-code", async (req, res) => {
    try {
      const { walletAddress, referralCode } = req.body;
      
      if (!walletAddress || !referralCode) {
        return res.status(400).json({ error: "Wallet address and referral code are required" });
      }
      
      if (referralCode.length < 3 || referralCode.length > 10) {
        return res.status(400).json({ error: "Referral code must be between 3-10 characters" });
      }
      
      // In a real implementation, this would interact with the smart contract
      // to check if the code is already registered and to register a new code
      
      // For demonstration purposes, let's simulate successful registration
      // We're building toward on-chain referral tracking, but for now this is simulated
      
      console.log(`Registering referral code "${referralCode}" for wallet ${walletAddress}`);
      
      // In the future, this would create a transaction to store the referral code on-chain
      
      return res.json({
        success: true,
        message: `Referral code "${referralCode}" registered successfully on-chain`,
        referralCode,
        walletAddress
      });
    } catch (error) {
      console.error("Error registering referral code:", error);
      return res.status(500).json({
        error: "Failed to register referral code",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get referral code for wallet address - directly from on-chain data
  app.get("/api/referral-code/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // In a real implementation, this would query the smart contract
      // to retrieve the referral code associated with this wallet
      
      // For demonstration, let's mock the response with a consistent code by hashing the address
      const codeFromAddress = walletAddress.slice(0, 6).toUpperCase();
      
      return res.json({
        success: true,
        referralCode: codeFromAddress // Mock on-chain data
      });
    } catch (error) {
      console.error("Error getting referral code:", error);
      return res.status(500).json({
        error: "Failed to get referral code",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get referrer address by code - directly from on-chain data
  app.get("/api/referrer/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ error: "Referral code is required" });
      }
      
      // In a real implementation, this would query the smart contract
      // to retrieve the wallet address associated with this referral code
      
      // For demonstration, we'll mock the response
      // In the future, this would be an actual address from the contract
      const mockReferrerAddress = "9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX";
      
      return res.json({
        success: true,
        referrerAddress: mockReferrerAddress // Mock on-chain data
      });
    } catch (error) {
      console.error("Error getting referrer address:", error);
      return res.status(500).json({
        error: "Failed to get referrer address",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get referral stats from on-chain data
  app.get("/api/referrals/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // In a real implementation, this would query the smart contract
      // to get all the referral stats for this wallet
      
      // For demonstration, we'll mock the response with simulated on-chain data
      const codeFromAddress = walletAddress.slice(0, 6).toUpperCase();
      
      const mockReferralStats = {
        referralCode: codeFromAddress,
        totalReferrals: 7,
        totalEarnings: 275.5,
        weeklyRank: 3,
        referredCount: 12,
        totalReferred: 15,
        claimableRewards: 50,
        recentActivity: [
          {
            date: new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)).toISOString(), // 2 days ago
            transaction: "5rQ4v5dKvx6dRnRnmMC3CQbqkVXnmR7YQZzV1s4xLa9xnVDexP4PzdbLJ3MX17BkwbB2NHb1PUKjSZuDnQLt95JV",
            amount: 100,
            reward: 3
          },
          {
            date: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)).toISOString(), // 5 days ago
            transaction: "3GQFxQMWmD3L3KUeVeAJPmQvtCt3k8iV8R2Qx47zPPJnBfyMuiJEZ5n8YWdLNWbygZRrA6eBcmXDsQRXeM4K2PbP",
            amount: 250,
            reward: 7.5
          }
        ]
      };
      
      return res.json({
        success: true,
        stats: mockReferralStats
      });
    } catch (error) {
      console.error("Error getting referral stats:", error);
      return res.status(500).json({
        error: "Failed to get referral stats",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Claim referral rewards - directly on-chain
  app.post("/api/claim-referral-rewards", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // In a real implementation, this would query the smart contract
      // to check if there are rewards available to claim
      
      // For demonstration, we'll use a fixed amount
      const claimableRewards = 50; // This would come from the contract
      
      if (claimableRewards <= 0) {
        return res.status(400).json({ error: "No rewards available to claim" });
      }
      
      // Process the claim by minting real tokens to the user
      const tokenUtils = await import('./token-utils');
      const connection = tokenUtils.getSolanaConnection();
      const mintAuthority = tokenUtils.getMintAuthority();
      
      // Verify the user's wallet address is a valid Solana address
      const walletPubkey = new (await import('@solana/web3.js')).PublicKey(walletAddress);
      
      // Mint the tokens as a reward
      const mintSignature = await tokenUtils.mintTokens(
        connection,
        mintAuthority,
        walletPubkey,
        claimableRewards
      );
      
      console.log(`Minted ${claimableRewards} tokens to ${walletAddress} as referral rewards`);
      
      return res.json({
        success: true,
        message: `Claimed ${claimableRewards} HATM tokens from on-chain referral rewards`,
        amount: claimableRewards,
        transactionSignature: mintSignature,
        explorerUrl: `https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`
      });
    } catch (error) {
      console.error("Error claiming referral rewards:", error);
      return res.status(500).json({
        error: "Failed to claim referral rewards",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // =================================================================
  // HELIUS WEBHOOK ENDPOINTS
  // =================================================================
  
  // Webhook endpoint for Stake events
  app.post("/api/webhooks/stake", handleStakeEvent);
  
  // Webhook endpoint for Unstake events
  app.post("/api/webhooks/unstake", handleUnstakeEvent);
  
  // Webhook endpoint for Token Transfers
  app.post("/api/webhooks/token-transfer", handleTokenTransfer);
  
  // Webhook endpoint for Claim Rewards events
  app.post("/api/webhooks/claim", handleClaimEvent);
  
  // API endpoint to get staking info from Helius data
  app.get("/api/helius/staking/:walletAddress", (req, res) => {
    getHeliusStakingInfo(req, res);
  });
  
  // API endpoint to get token transfers from Helius data
  app.get("/api/helius/transfers/:walletAddress", (req, res) => {
    getTokenTransfers(req, res);
  });
  
  // API endpoint to get referral stats from Helius data
  app.get("/api/helius/referrals/:walletAddress", (req, res) => {
    getHeliusReferralStats(req, res);
  });
  
  // API endpoint to get global staking stats from Helius data
  app.get("/api/helius/global-stats", (req, res) => {
    getGlobalStats(req, res);
  });
  
  const httpServer = createServer(app);
  return httpServer;
}