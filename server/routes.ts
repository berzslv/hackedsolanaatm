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
  TokenAccountNotFoundError
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

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
      
      // Load token keypair from the file
      const tokenKeypairPath = path.join(process.cwd(), "token-keypair.json");
      if (!fs.existsSync(tokenKeypairPath)) {
        console.error("Token keypair file not found:", tokenKeypairPath);
        return res.status(500).json({ error: "Token keypair not found on server" });
      }
      
      const tokenData = JSON.parse(fs.readFileSync(tokenKeypairPath, "utf-8"));
      
      // Create the mint authority keypair from the secret key
      const authoritySecretKey = new Uint8Array(tokenData.authority.secretKey);
      const mintAuthority = Keypair.fromSecretKey(authoritySecretKey);
      
      // Get the mint public key
      const mintPublicKey = new PublicKey(tokenData.mint.publicKey);
      
      console.log(`Using mint: ${mintPublicKey.toString()}`);
      console.log(`Authority: ${mintAuthority.publicKey.toString()}`);
      
      // Connect to Solana devnet
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      
      // Recipient's wallet
      const recipientWallet = new PublicKey(walletAddress);
      
      // Get the associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        recipientWallet
      );
      
      console.log(`Token account for recipient: ${associatedTokenAddress.toString()}`);
      
      // Check if the token account exists
      let createAta = false;
      try {
        await getAccount(connection, associatedTokenAddress);
        console.log("Token account exists");
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          console.log("Token account does not exist, will create it");
          createAta = true;
        } else {
          console.error("Error checking token account:", error);
          throw error;
        }
      }
      
      // Create the transaction
      const transaction = new Transaction();
      
      // First get a SOL airdrop for the authority if needed to pay for the transaction
      try {
        const authorityBalance = await connection.getBalance(mintAuthority.publicKey);
        if (authorityBalance < 0.02 * LAMPORTS_PER_SOL) {
          console.log("Requesting SOL airdrop for authority to pay fees");
          const airdropSignature = await connection.requestAirdrop(
            mintAuthority.publicKey,
            0.1 * LAMPORTS_PER_SOL
          );
          await connection.confirmTransaction(airdropSignature);
        }
      } catch (error) {
        console.error("Error with SOL airdrop for authority:", error);
        // Continue anyway, might still have enough balance
      }
      
      // If the token account doesn't exist, add instruction to create it
      if (createAta) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            mintAuthority.publicKey, // payer
            associatedTokenAddress, // associated token account address
            recipientWallet, // owner
            mintPublicKey // mint
          )
        );
      }
      
      // Mint 1000 tokens to the recipient (with 9 decimals)
      const amount = 1000 * Math.pow(10, 9); // 1000 tokens assuming 9 decimals
      
      transaction.add(
        createMintToInstruction(
          mintPublicKey, // mint
          associatedTokenAddress, // destination
          mintAuthority.publicKey, // authority
          BigInt(amount) // amount
        )
      );
      
      // Sign and send the transaction
      console.log("Sending transaction...");
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [mintAuthority] // signers
      );
      
      console.log(`Transaction sent! Signature: ${signature}`);
      
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
  });

  const httpServer = createServer(app);
  return httpServer;
}
