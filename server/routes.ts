import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, MemStorage } from "./storage";
import { insertUserSchema, insertStakingSchema, insertReferralSchema, type Staking, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
        // Verify transaction status
        console.log(`Checking transaction status for: ${solTransferSignature}`);
        const statusResponse = await connection.getSignatureStatus(solTransferSignature, {
          searchTransactionHistory: true,
        });
        
        const status = statusResponse.value;
        if (!status || status.err) {
          return res.status(400).json({ 
            error: status ? "SOL transfer failed" : "Transaction not found",
            details: status?.err || "Transaction may still be processing"
          });
        }
        
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
        
        // Return the successful response
        return res.json({
          success: true,
          message: `${parsedTokenAmount} HATM tokens have been purchased and staked on-chain`,
          tokenAmount: parsedTokenAmount,
          solAmount: parseFloat(solAmount),
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
        console.log(`Checking transaction status for: ${solTransferSignature}`);
        // Check the transaction status with retry for pending transactions
        let status;
        let retries = 0;
        const maxRetries = 5;
        
        while (retries < maxRetries) {
          try {
            const statusResponse = await connection.getSignatureStatus(solTransferSignature, {
              searchTransactionHistory: true,
            });
            status = statusResponse.value;
            console.log(`Transaction status (attempt ${retries + 1}):`, status);
            
            // If we have a status and no error, break the loop
            if (status && !status.err) {
              break;
            }
            
            // If status is null (transaction not found yet) or in a pending state, wait and retry
            if (!status || 
                status.confirmationStatus === 'processed' || 
                !status.confirmationStatus || 
                status.confirmationStatus === undefined) {
              console.log(`Transaction still processing, waiting to retry...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
              retries++;
              continue;
            }
            
            // If we have an error, break the loop to handle it
            if (status && status.err) {
              console.error(`Transaction error detected:`, status.err);
              break;
            }
          } catch (error) {
            console.error(`Error checking transaction status:`, error);
            retries++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retrying
          }
        }
        
        // After retries, check if we have a valid transaction
        if (!status) {
          return res.status(400).json({ 
            error: "SOL transfer transaction not found after multiple attempts", 
            details: "Transaction may still be processing - please try again in a moment" 
          });
        }
        
        if (status.err) {
          return res.status(400).json({ 
            error: "SOL transfer transaction failed", 
            details: status.err 
          });
        }
        
        console.log(`SOL transfer verified: ${solTransferSignature}`);
        
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
          // Record staking in database
          const staking = await storage.stakeTokens({
            walletAddress,
            amountStaked: tokenAmount,
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

  // Endpoint to get staking info
  app.get("/api/staking-info/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Get staking info from storage
      const stakingInfo = await storage.getStakingInfo(walletAddress);
      
      return res.json({
        success: true,
        stakingInfo,
      });
    } catch (error) {
      console.error("Error fetching staking info:", error);
      return res.status(500).json({
        error: "Failed to fetch staking information",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to stake tokens
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
  
  // Endpoint to unstake tokens
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
        // First, process unstaking with potential fees in our database
        const unstakeResult = await storage.unstakeTokens(walletAddress, parsedAmount);
        
        // Now, transfer the tokens back to the user's wallet from the staking vault
        const simpleTokenModule = await import('./simple-token');
        const tokenTransferModule = await import('./token-transfer');
        const { keypair: authorityKeypair } = simpleTokenModule.getMintAuthority();
        
        // The net amount after fees
        const netAmount = unstakeResult.netAmount;
        
        // Transfer the net amount back to the user
        const transferSignature = await tokenTransferModule.authorityTransferTokens(
          walletAddress,  // destination (user wallet)
          netAmount       // amount after fees
        );
        
        console.log(`Unstaked and transferred ${netAmount} tokens to ${walletAddress}: ${transferSignature}`);
        
        // Get updated staking info
        const stakingInfo = await storage.getStakingInfo(walletAddress);
        
        // Prepare response with details
        return res.json({
          success: true,
          message: `${parsedAmount} HATM tokens have been unstaked (${netAmount} after fees)`,
          stakingInfo,
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
  
  // Endpoint to confirm staking after successful transaction 
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
        // Create staking entry
        const stakingEntry = await storage.stakeTokens({
          walletAddress,
          amountStaked: parsedAmount
        });
        
        // Get updated staking info
        const stakingInfo = await storage.getStakingInfo(walletAddress);
        
        return res.json({
          success: true,
          message: `${parsedAmount} HATM tokens have been staked successfully`,
          stakingInfo,
          stakingEntry,
          transactionSignature
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

  // Endpoint to claim staking rewards
  app.post("/api/claim-rewards", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      console.log(`Processing reward claim for wallet: ${walletAddress}`);
      
      // Get current staking info to check pending rewards
      const stakingInfo = await storage.getStakingInfo(walletAddress);
      
      if (stakingInfo.pendingRewards <= 0) {
        return res.status(400).json({ 
          error: "No pending rewards to claim",
          pendingRewards: stakingInfo.pendingRewards
        });
      }
      
      try {
        // Mint the reward tokens to the user's wallet
        const simpleToken = await import('./simple-token');
        
        // This will create a token transaction to mint the rewards
        const rewardSignature = await simpleToken.mintTokens(walletAddress, stakingInfo.pendingRewards);
        
        // We've already minted the tokens to the user's wallet
        // Now we need to "reset" their pending rewards
        // In a real application, we would have a more robust API for this
        // For now, we'll use a workaround by "unstaking" 0 tokens, which updates the staking record
        
        try {
          // This is a bit of a hack, but it will force the staking record to update
          // In a real application, we would have a proper API for claiming rewards
          const dummyUnstake = await storage.unstakeTokens(walletAddress, 0);
          console.log("Reset pending rewards via dummy unstake:", dummyUnstake);
        } catch (error) {
          // If this fails, we'll log it but continue - the tokens were already minted
          console.warn("Failed to reset pending rewards, but tokens were minted:", error);
        }
        
        // Get updated staking info
        const updatedStakingInfo = await storage.getStakingInfo(walletAddress);
        
        // Get updated token balance
        const tokenBalance = await simpleToken.getTokenBalance(walletAddress);
        
        return res.json({
          success: true,
          message: `${stakingInfo.pendingRewards} HATM reward tokens have been claimed`,
          stakingInfo: updatedStakingInfo,
          tokenBalance,
          transactionSignature: rewardSignature,
          explorerUrl: `https://explorer.solana.com/tx/${rewardSignature}?cluster=devnet`
        });
      } catch (error) {
        console.error("Error in reward claiming process:", error);
        return res.status(500).json({
          error: "Failed to claim rewards",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing reward claim request:", error);
      return res.status(500).json({
        error: "Failed to process reward claim",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Referral System Routes
  
  // Register a referral code
  app.post("/api/register-referral-code", async (req, res) => {
    try {
      const { walletAddress, referralCode } = req.body;
      
      if (!walletAddress || !referralCode) {
        return res.status(400).json({ error: "Wallet address and referral code are required" });
      }
      
      if (referralCode.length < 3 || referralCode.length > 10) {
        return res.status(400).json({ error: "Referral code must be between 3-10 characters" });
      }
      
      // Check if code is already in use
      const isCodeValid = await storage.validateReferralCode(referralCode);
      if (isCodeValid) {
        return res.status(400).json({ error: "Referral code already in use" });
      }
      
      // Get the user by wallet address
      const user = await storage.getUserByWalletAddress(walletAddress);

      if (user) {
        // Update the user with the referral code
        await storage.updateUserReferralCode(walletAddress, referralCode);
      } else {
        // Create the user if they don't exist
        await storage.createUser({
          walletAddress,
          referralCode
        });
      }
      
      return res.json({
        success: true,
        message: `Referral code "${referralCode}" registered successfully`,
        referralCode
      });
    } catch (error) {
      console.error("Error registering referral code:", error);
      return res.status(500).json({
        error: "Failed to register referral code",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get referral code for wallet address
  app.get("/api/referral-code/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Get referral stats for this wallet to find the code
      const stats = await storage.getReferralStats(walletAddress);
      
      if (stats.referralCode) {
        return res.json({
          success: true,
          referralCode: stats.referralCode
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "No referral code found for this wallet"
        });
      }
    } catch (error) {
      console.error("Error getting referral code:", error);
      return res.status(500).json({
        error: "Failed to get referral code",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get referrer address by code
  app.get("/api/referrer/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ error: "Referral code is required" });
      }
      
      const referrerAddress = await storage.getReferrerAddressByCode(code);
      
      if (referrerAddress) {
        return res.json({
          success: true,
          referrerAddress
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Referral code not found"
        });
      }
    } catch (error) {
      console.error("Error getting referrer address:", error);
      return res.status(500).json({
        error: "Failed to get referrer address",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Claim referral rewards
  app.post("/api/claim-referral-rewards", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
      }
      
      // Get referral stats to see if there are rewards to claim
      const stats = await storage.getReferralStats(walletAddress);
      
      if (!stats.claimableRewards || stats.claimableRewards <= 0) {
        return res.status(400).json({ error: "No rewards available to claim" });
      }
      
      // In the future, this would be an on-chain transaction
      // For now, mint the tokens directly
      const simpleToken = await import('./simple-token');
      const signature = await simpleToken.mintTokens(walletAddress, stats.claimableRewards);
      
      return res.json({
        success: true,
        message: `Claimed ${stats.claimableRewards} HATM tokens`,
        amount: stats.claimableRewards,
        signature
      });
    } catch (error) {
      console.error("Error claiming referral rewards:", error);
      return res.status(500).json({
        error: "Failed to claim referral rewards",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}