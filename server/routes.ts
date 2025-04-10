import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertStakingSchema, insertReferralSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Solana imports for airdrop functionality
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  getAccount,
  getMint,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

// Helper function to get a Solana connection
function getSolanaConnection() {
  return new Connection(clusterApiUrl("devnet"), "confirmed");
}

// Helper function to load mint authority
function getMintAuthority() {
  const tokenKeypairPath = path.join(process.cwd(), "token-keypair.json");
  if (!fs.existsSync(tokenKeypairPath)) {
    throw new Error("Token keypair file not found: " + tokenKeypairPath);
  }
  
  const tokenData = JSON.parse(fs.readFileSync(tokenKeypairPath, "utf-8"));
  const authoritySecretKey = new Uint8Array(tokenData.authority.secretKey);
  return {
    keypair: Keypair.fromSecretKey(authoritySecretKey),
    mintPublicKey: new PublicKey(tokenData.mint.publicKey)
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // Get token stats
  app.get("/api/token-stats", async (req, res) => {
    try {
      const stats = await storage.getTokenStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get token stats" });
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
  
  // RESTful endpoint for validating referral codes
  app.get("/api/validate-referral/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ valid: false, message: "Referral code is required" });
      }
      
      // Find a user with this referral code
      const isValid = await storage.validateReferralCode(code);
      console.log("Validating referral code:", code, "Result:", isValid);
      
      // Always return JSON with consistent format, don't use 404 status
      return res.json({ 
        valid: isValid, 
        message: isValid ? "Valid referral code" : "Invalid referral code" 
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ valid: false, message: "Failed to validate referral code" });
    }
  });

  // Keep the /validate endpoint for backward compatibility
  app.get("/api/referrals/validate", async (req, res) => {
    try {
      const code = req.query.code as string;
      
      if (!code) {
        return res.status(400).json({ valid: false, message: "Referral code is required" });
      }
      
      console.log("Received referral code validation request for:", code);
      const isValid = await storage.validateReferralCode(code);
      console.log("Database validation result for code", code, ":", isValid);
      
      return res.json({ 
        valid: isValid, 
        message: isValid ? "Valid referral code" : "Invalid referral code" 
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ valid: false, message: "Failed to validate referral code", error: String(error) });
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

  // Get staking info for a user
  app.get("/api/staking/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const stakingInfo = await storage.getStakingInfo(walletAddress);
      res.json(stakingInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to get staking info" });
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

  // Unstake tokens
  app.post("/api/unstake", async (req, res) => {
    try {
      const { walletAddress, amount } = req.body;
      const result = await storage.unstakeTokens(walletAddress, amount);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to unstake tokens" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard/:type/:period", async (req, res) => {
    try {
      const { type, period } = req.params;
      
      // Validate type and period
      const validTypes = ['referrers', 'stakers'];
      const validPeriods = ['weekly', 'monthly'];
      
      if (!validTypes.includes(type) || !validPeriods.includes(period)) {
        return res.status(400).json({ message: "Invalid leaderboard type or period" });
      }
      
      const leaderboard = await storage.getLeaderboard(type, period);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaderboard" });
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
      
      // Get Solana connection and mint authority
      const connection = getSolanaConnection();
      const { keypair: mintAuthority, mintPublicKey } = getMintAuthority();
      
      console.log(`Using mint: ${mintPublicKey.toString()}`);
      console.log(`Authority: ${mintAuthority.publicKey.toString()}`);
      
      // Recipient's wallet
      const recipientWallet = new PublicKey(walletAddress);
      
      try {
        // Request SOL airdrop for the authority to pay for transaction fees if needed
        const authorityBalance = await connection.getBalance(mintAuthority.publicKey);
        if (authorityBalance < 0.05 * LAMPORTS_PER_SOL) {
          console.log("Requesting SOL airdrop for authority to pay fees");
          const airdropSignature = await connection.requestAirdrop(
            mintAuthority.publicKey,
            0.1 * LAMPORTS_PER_SOL
          );
          await connection.confirmTransaction(airdropSignature);
        }
        
        // Find or create the associated token account
        let associatedTokenAddress: PublicKey;
        
        try {
          // Try to find the recipient's token account
          associatedTokenAddress = await getAssociatedTokenAddress(
            mintPublicKey,
            recipientWallet
          );
          
          console.log(`Checking for token account: ${associatedTokenAddress.toString()}`);
          
          try {
            await getAccount(connection, associatedTokenAddress);
            console.log("Token account exists");
          } catch (error) {
            if (error instanceof TokenAccountNotFoundError) {
              console.log("Creating associated token account...");
              const tx = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                  mintAuthority.publicKey, // payer
                  associatedTokenAddress, // associated token account
                  recipientWallet, // owner
                  mintPublicKey // mint
                )
              );
              
              const createAccountSignature = await sendAndConfirmTransaction(
                connection,
                tx,
                [mintAuthority]
              );
              
              console.log(`Created token account: ${createAccountSignature}`);
            } else {
              throw error;
            }
          }
        } catch (error) {
          console.error("Error with token account:", error);
          return res.status(500).json({
            error: "Failed to create token account",
            details: error instanceof Error ? error.message : String(error)
          });
        }
        
        // Now mint tokens to the associated token account
        console.log("Minting tokens...");
        const amount = BigInt(1000 * Math.pow(10, 9)); // 1000 tokens with 9 decimals
        
        const mintTx = new Transaction().add(
          createMintToInstruction(
            mintPublicKey, // mint
            associatedTokenAddress, // destination
            mintAuthority.publicKey, // authority
            amount // amount
          )
        );
        
        const signature = await sendAndConfirmTransaction(
          connection,
          mintTx,
          [mintAuthority]
        );
        
        console.log(`Tokens minted! Signature: ${signature}`);
        
        // Return success with the transaction signature
        return res.json({
          success: true,
          message: "1000 HATM tokens have been airdropped to your wallet",
          amount: 1000,
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
  
  // Buy tokens endpoint
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
          
          // Record the referral
          try {
            // Create a referral record
            const referralData = {
              referrerAddress: "simulated-referrer-address", // Placeholder for demo
              buyerAddress: walletAddress,
              transactionHash: "devnet-" + Date.now(),
              amount: parsedSolAmount,
              reward: parsedSolAmount * 0.02 // 2% reward for referrer
            };
            
            await storage.createReferral(referralData);
            console.log(`Referral recorded for code: ${referralCode}`);
          } catch (error) {
            console.error("Error creating referral:", error);
            // Continue with the purchase even if referral recording fails
          }
        }
      }
      
      // Get Solana connection and mint authority
      const connection = getSolanaConnection();
      const { keypair: mintAuthority, mintPublicKey } = getMintAuthority();
      
      // Recipient's wallet
      const recipientWallet = new PublicKey(walletAddress);
      
      // Calculate token amount
      const tokenPrice = 0.01; // 1 HATM = 0.01 SOL
      const tokenAmount = Math.floor(parsedSolAmount / tokenPrice);
      const tokenAmountWithDecimals = BigInt(tokenAmount * Math.pow(10, 9)); // 9 decimals
      
      // Find or create the associated token account
      let associatedTokenAddress: PublicKey;
      
      try {
        // Get the associated token account address
        associatedTokenAddress = await getAssociatedTokenAddress(
          mintPublicKey,
          recipientWallet
        );
        
        console.log(`Checking for token account: ${associatedTokenAddress.toString()}`);
        
        try {
          // Check if the token account exists
          await getAccount(connection, associatedTokenAddress);
          console.log("Token account exists");
        } catch (error) {
          if (error instanceof TokenAccountNotFoundError) {
            console.log("Creating associated token account...");
            
            // Create a transaction to create the token account
            const createTx = new Transaction().add(
              createAssociatedTokenAccountInstruction(
                mintAuthority.publicKey, // payer
                associatedTokenAddress, // associated token account
                recipientWallet, // owner
                mintPublicKey // mint
              )
            );
            
            // Send and confirm the transaction
            const createAccountSignature = await sendAndConfirmTransaction(
              connection,
              createTx,
              [mintAuthority]
            );
            
            console.log(`Created token account: ${createAccountSignature}`);
          } else {
            throw error;
          }
        }
        
        // Now mint tokens to the token account
        console.log(`Minting ${tokenAmount} tokens...`);
        
        // Create a transaction to mint tokens
        const mintTx = new Transaction().add(
          createMintToInstruction(
            mintPublicKey, // mint
            associatedTokenAddress, // destination
            mintAuthority.publicKey, // authority
            tokenAmountWithDecimals // amount
          )
        );
        
        // Send and confirm the transaction
        const signature = await sendAndConfirmTransaction(
          connection,
          mintTx,
          [mintAuthority]
        );
        
        console.log(`Buy transaction successful! Signature: ${signature}`);
        
        // Return success with transaction details
        return res.json({
          success: true,
          message: `Successfully purchased ${tokenAmount} HATM tokens`,
          solAmount: parsedSolAmount,
          tokenAmount,
          feePercentage: feePercentage * 100,
          referralApplied: feePercentage === 0.06,
          signature,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
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

  const httpServer = createServer(app);
  return httpServer;
}
