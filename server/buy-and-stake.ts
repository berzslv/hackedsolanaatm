import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { createCombinedBuyAndStakeTransaction } from './token-transfer';

/**
 * Handler for the buy-and-stake endpoint
 * This creates a transaction that buys and stakes tokens in one step
 * with integration to on-chain referral system
 */
export async function handleBuyAndStake(req: Request, res: Response) {
  try {
    const { walletAddress, amount, referralAddress } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ error: "Wallet address and amount are required" });
    }
    
    // Parse token amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }
    
    console.log(`Processing combined buy and stake request for wallet: ${walletAddress}, amount: ${parsedAmount}, referral: ${referralAddress || 'none'}`);
    
    try {
      // Validate referral address if provided
      let validReferralAddress: string | undefined = undefined;
      let referralMessage = '';
      
      if (referralAddress) {
        try {
          // Validate that the referral address is a valid Solana address
          new PublicKey(referralAddress);
          validReferralAddress = referralAddress;
          referralMessage = `Using referral from ${referralAddress}`;
          console.log(`Valid referral address: ${referralAddress}`);
        } catch (error) {
          console.error("Invalid referral address format:", error);
          // Continue even if validation fails, but don't pass the referral
        }
      }
      
      // Create the combined transaction with the validated referral address
      const serializedTransaction = await createCombinedBuyAndStakeTransaction(
        walletAddress,
        parsedAmount,
        validReferralAddress
      );
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to buy and stake ${parsedAmount} HATM tokens. ${referralMessage}`,
        transaction: serializedTransaction,
        amount: parsedAmount,
        referralValid: !!validReferralAddress,
        isStaking: true
      });
    } catch (error) {
      console.error("Error in buy and stake process:", error);
      return res.status(500).json({
        error: "Failed to create buy and stake transaction",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error("Error processing buy and stake request:", error);
    return res.status(500).json({
      error: "Failed to process buy and stake request",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}