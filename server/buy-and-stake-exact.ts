/**
 * Buy And Stake - Exact Implementation for the Staking Vault Contract
 * 
 * This creates a transaction that buys and stakes tokens in one step
 * using the exact account structure required by the staking vault contract
 */
import { Request, Response } from 'express';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createMintToInstruction, createAssociatedTokenAccountInstruction, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { getConnection, getMintAuthority } from './simple-token';
import * as stakingVault from './staking-vault-exact';

/**
 * Handler for the buy-and-stake endpoint
 * This creates a transaction that buys and stakes tokens in one step
 * using the proper staking vault program
 */
export async function handleBuyAndStake(req: Request, res: Response) {
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
    
    console.log(`Processing combined buy and stake request for wallet: ${walletAddress}, amount: ${parsedAmount}`);
    
    try {
      // Create the combined transaction
      const serializedTransaction = await createCombinedBuyAndStakeTransaction(
        walletAddress,
        parsedAmount
      );
      
      // Return the transaction to be signed by the user
      return res.json({
        success: true,
        message: `Transaction created to buy and stake ${parsedAmount} HATM tokens.`,
        transaction: serializedTransaction,
        amount: parsedAmount,
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

/**
 * Create a combined transaction for buying and staking tokens in one step
 * that exactly matches the account structure required by the staking vault contract
 * 
 * @param userWalletAddress The user's wallet address
 * @param amount The amount of tokens to buy and stake
 * @returns The serialized transaction as base64 string
 */
export async function createCombinedBuyAndStakeTransaction(
  userWalletAddress: string,
  amount: number
): Promise<string> {
  try {
    console.log(`Creating combined buy and stake transaction for ${userWalletAddress}, amount: ${amount}`);
    
    const connection = getConnection();
    const { mintPublicKey, keypair: mintAuthority } = getMintAuthority();
    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Create transaction object
    let transaction = new Transaction();
    
    // 1. Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    // 2. Check if user's token account exists, create if needed
    try {
      await getAccount(connection, userTokenAccount);
      console.log("User token account exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("User token account doesn't exist, will create it");
        
        // Create the associated token account for the user
        const createAtaInstruction = createAssociatedTokenAccountInstruction(
          userPublicKey,           // payer
          userTokenAccount,        // associated token account to create
          userPublicKey,           // owner of the token account
          mintPublicKey,           // token mint
          TOKEN_PROGRAM_ID
        );
        
        transaction.add(createAtaInstruction);
      } else {
        throw error;
      }
    }
    
    // 3. Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = BigInt(amount * Math.pow(10, decimals));
    
    // 4. Add mint instruction to send tokens to user
    const mintInstruction = createMintToInstruction(
      mintPublicKey,
      userTokenAccount,
      mintAuthority.publicKey,
      adjustedAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    
    transaction.add(mintInstruction);

    // 5. Add staking instruction using the proper staking vault program with exact account layout
    console.log(`Creating staking instruction for ${amount} tokens using exact smart contract layout`);
    const stakeInstruction = stakingVault.createStakingInstruction(
      userPublicKey,
      adjustedAmount,
      userTokenAccount
    );
    
    transaction.add(stakeInstruction);
    
    // 6. Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    // 7. Partially sign with mint authority (for the mint instruction)
    transaction.partialSign(mintAuthority);
    
    // 8. Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');
    
    console.log(`Combined buy and stake transaction created for ${amount} tokens`);
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating combined buy and stake transaction:", error);
    throw error;
  }
}