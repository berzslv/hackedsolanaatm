import { Request, Response } from 'express';
import { storage } from './storage';
import { createCombinedBuyAndStakeTransaction } from './token-transfer';

/**
 * Handler for the buy-and-stake endpoint
 * This creates a transaction that buys and stakes tokens in one step
 */
export async function handleBuyAndStake(req: Request, res: Response) {
  try {
    const { walletAddress, amount, referralCode } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ error: "Wallet address and amount are required" });
    }
    
    // Parse token amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid token amount" });
    }
    
    console.log(`Processing combined buy and stake request for wallet: ${walletAddress}, amount: ${parsedAmount}, referral: ${referralCode || 'none'}`);
    
    try {
      // Create the combined transaction
      const serializedTransaction = await createCombinedBuyAndStakeTransaction(
        walletAddress,
        parsedAmount,
        referralCode
      );
      
      // If there's a referral code, validate it
      let referralMessage = '';
      let referralValid = false;
      
      if (referralCode) {
        try {
          // Simple validation for now - in production this would check on-chain
          referralValid = await storage.validateReferralCode(referralCode);
          if (referralValid) {
            const referrerAddress = await storage.getReferrerAddressByCode(referralCode);
            if (referrerAddress) {
              referralMessage = `Using referral from ${referrerAddress}`;
              console.log(`Valid referral code: ${referralCode} from ${referrerAddress}`);
            }
          } else {
            console.log(`Invalid referral code: ${referralCode}`);
          }
        } catch (error) {
          console.error("Error validating referral code:", error);
          // Continue even if validation fails
        }
      }
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to buy and stake ${parsedAmount} HATM tokens. ${referralMessage}`,
        transaction: serializedTransaction,
        amount: parsedAmount,
        referralValid,
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