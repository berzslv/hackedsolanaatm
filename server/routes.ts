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
      
      // In a real implementation, we'd handle the actual token purchase here
      // For now, we'll simulate the purchase by minting tokens
      
      // Get Solana connection and mint authority
      const connection = getSolanaConnection();
      const { keypair: mintAuthority, mintPublicKey } = getMintAuthority();
      
      // Recipient's wallet
      const recipientWallet = new PublicKey(walletAddress);
      
      // Get the associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        recipientWallet
      );
      
      // Check if the token account exists
      let createAta = false;
      try {
        await getAccount(connection, associatedTokenAddress);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          createAta = true;
        } else {
          throw error;
        }
      }
      
      // Create the transaction
      const transaction = new Transaction();
      
      // If the token account doesn't exist, add instruction to create it
      if (createAta) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            mintAuthority.publicKey, // payer
            associatedTokenAddress, // associated token account
            recipientWallet, // owner
            mintPublicKey // mint
          )
        );
      }
      
      // Calculate token amount (for now, a simple 1 SOL = 100 HATM ratio)
      const tokenPrice = 0.01; // 1 HATM = 0.01 SOL
      const tokenAmount = Math.floor(parsedSolAmount / tokenPrice);
      const tokenAmountWithDecimals = tokenAmount * Math.pow(10, 9); // 9 decimals
      
      // Calculate fee based on referral code
      let feePercentage = 0.08; // 8% default fee
      let referrerWallet = null;
      
      if (referralCode) {
        // Check if referral code is valid
        const isValid = await storage.validateReferralCode(referralCode);
        if (isValid) {
          feePercentage = 0.06; // 6% fee with valid referral
          
          // In a real implementation, we'd send a portion of the fee to the referrer
          // For this demo, we'll just record the referral
          
          // Find referrer user by code
          // We need to get the wallet address for the referral code
          try {
            // For simplicity in this demo, we'll find the user with this referral code
            // In a real app, we'd have proper user lookup
            const allUsers = await storage.getAllUsers();
            const referrer = allUsers.find(user => user.referralCode === referralCode);
            
            if (referrer) {
              // Create referral record
              const referralData = {
                referrerAddress: referrer.walletAddress,
                buyerAddress: walletAddress,
                transactionHash: "devnet-" + Date.now(), // For demo purposes
                amount: parsedSolAmount,
                reward: parsedSolAmount * 0.02 // 2% reward for referrer
              };
              
              await storage.createReferral(referralData);
            }
          } catch (error) {
            console.error("Error creating referral:", error);
            // Continue with the purchase even if referral recording fails
          }
        }
      }
      
      // Mint tokens to recipient (simulating the purchase)
      transaction.add(
        createMintToInstruction(
          mintPublicKey, // mint
          associatedTokenAddress, // destination
          mintAuthority.publicKey, // authority
          BigInt(tokenAmountWithDecimals) // amount
        )
      );
      
      // Sign and send the transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [mintAuthority] // signers
      );
      
      console.log(`Buy transaction sent! Signature: ${signature}`);
      
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
