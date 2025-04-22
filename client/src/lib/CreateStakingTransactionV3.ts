/**
 * CreateStakingTransactionV3
 * 
 * Implements simplified direct transaction creation to avoid PublicKey issues
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
// Import BN directly to avoid any reference issues
import BN from 'bn.js';

// Constants
const PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';
const TOKEN_MINT_ADDRESS = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
const GLOBAL_STATE_SEED = "global_state";
const USER_INFO_SEED = "user_info";
const VAULT_SEED = "vault";
const VAULT_AUTH_SEED = "vault_auth";

/**
 * Stake instruction identifier
 * This matches the first 8 bytes of the sha256 hash of "global:stake"
 */
const STAKE_INSTRUCTION_ID = new Uint8Array([106, 49, 183, 94, 227, 18, 218, 113]);

/**
 * Create a staking transaction using direct methods to avoid Anchor-related issues
 * 
 * @param walletAddress User's wallet address
 * @param amount Amount to stake
 * @param wallet Connected wallet (with sendTransaction)
 * @param referrerAddress Optional referrer address
 * @returns Transaction result
 */
export async function createStakingTransaction(
  walletAddress: string,
  amount: number,
  wallet: any,
  referrerAddress?: string
): Promise<{
  signature?: string;
  error?: string;
  transaction?: Transaction;
}> {
  try {
    console.log("🚀 Creating staking transaction with direct method (V3 simplified)");
    console.log(`👛 Wallet: ${walletAddress}`);
    console.log(`💰 Amount: ${amount}`);
    
    if (!walletAddress || !amount) {
      return { error: "Wallet address and amount are required" };
    }
    
    if (!wallet) {
      return { error: "Wallet connection is required" };
    }
    
    console.log("Creating fresh connection to Solana devnet");
    const devnetUrl = clusterApiUrl('devnet'); 
    const stakingConnection = new Connection(devnetUrl, 'confirmed');
    const userPubkey = new PublicKey(walletAddress);
    const programId = new PublicKey(PROGRAM_ID);
    const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
    
    // Find PDA addresses
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_STATE_SEED)],
      programId
    );
    
    const [userStakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(USER_INFO_SEED), userPubkey.toBuffer()],
      programId
    );
    
    const [vaultAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_AUTH_SEED)],
      programId
    );
    
    // Get token accounts
    console.log("🪙 Fetching user token accounts");
    const tokenAccounts = await stakingConnection.getParsedTokenAccountsByOwner(
      userPubkey,
      { mint: tokenMint }
    );
    
    // Check if we have token accounts
    if (tokenAccounts.value.length === 0) {
      console.log("⚠️ No token accounts found, creating one");
      try {
        // Get ATA address
        const ata = await getAssociatedTokenAddress(
          tokenMint,
          userPubkey
        );
        
        // Create ATA instruction
        const ix = createAssociatedTokenAccountInstruction(
          userPubkey,  // payer
          ata,         // associated token account
          userPubkey,  // owner
          tokenMint    // mint
        );
        
        // Send transaction to create ATA
        const tx = new Transaction().add(ix);
        tx.feePayer = userPubkey;
        const { blockhash } = await stakingConnection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        
        const sig = await wallet.sendTransaction(tx);
        await stakingConnection.confirmTransaction(sig, 'confirmed');
        console.log("✅ Created token account:", ata.toString());
      } catch (error) {
        console.error("Error creating token account:", error);
        // Continue anyway, it may already exist
      }
    }
    
    // Find the best token account (with enough balance)
    let userTokenAccount: PublicKey | null = null;
    
    // Fetch token accounts again after potential creation
    const updatedTokenAccounts = await stakingConnection.getParsedTokenAccountsByOwner(
      userPubkey,
      { mint: tokenMint }
    );
    
    for (const account of updatedTokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount || 0;
      console.log(`Token account ${account.pubkey.toString()} has balance: ${balance}`);
      
      if (balance >= amount) {
        userTokenAccount = account.pubkey;
        console.log(`✅ Using token account with sufficient balance: ${userTokenAccount.toString()}`);
        break;
      }
    }
    
    // If no account with sufficient balance, use ATA anyway (will fail on-chain)
    if (!userTokenAccount) {
      const ata = await getAssociatedTokenAddress(
        tokenMint,
        userPubkey
      );
      userTokenAccount = ata;
      console.log(`⚠️ No account with sufficient balance, using ATA: ${ata.toString()}`);
    }
    
    // Get vault token account
    const vaultTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      vaultAuthPda,
      true // Allow off-curve for PDAs
    );
    
    // Verify vault token account exists
    try {
      await getAccount(stakingConnection, vaultTokenAccount);
      console.log("✅ Vault token account verified:", vaultTokenAccount.toString());
    } catch (error) {
      console.error("❌ Vault token account invalid:", error);
      return { error: "Vault token account not found or invalid" };
    }
    
    console.log("🛠️ Building direct transaction instruction");
    
    // Convert amount to proper decimal format (9 decimals for our token)
    const amountInDecimalStr = Math.floor(amount * 1e9).toString();
    console.log("Amount in decimals (string):", amountInDecimalStr);
    const amountWithDecimals = new BN(amountInDecimalStr);
    
    // Create a buffer to hold the instruction data
    // 8 bytes for instruction discriminator + 8 bytes for amount
    const data = Buffer.alloc(16);
    
    // Write instruction discriminator (8 bytes)
    STAKE_INSTRUCTION_ID.forEach((b, i) => {
      data.writeUInt8(b, i);
    });
    
    // Write amount as little-endian 64-bit integer (8 bytes)
    const amountBuffer = amountWithDecimals.toArrayLike(Buffer, 'le', 8);
    amountBuffer.copy(data, 8);
    
    // Create the transaction instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: userPubkey, isSigner: true, isWritable: true }, // owner
        { pubkey: globalStatePda, isSigner: false, isWritable: true }, // globalState
        { pubkey: userStakePda, isSigner: false, isWritable: true }, // stakeAccount
        { pubkey: userTokenAccount, isSigner: false, isWritable: true }, // userTokenAccount
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: true }, // tokenVault
        { pubkey: tokenMint, isSigner: false, isWritable: false }, // tokenMint
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // tokenProgram
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
      ],
      programId,
      data,
    });
    
    // Create transaction
    const transaction = new Transaction();
    transaction.add(instruction);
    
    // Add recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await stakingConnection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPubkey;
    
    console.log("✅ Transaction built successfully");
    
    // Try simulation first
    console.log("🔍 Simulating transaction...");
    try {
      const simulation = await stakingConnection.simulateTransaction(transaction);
      
      if (simulation.value.err) {
        console.error("❌ Simulation failed:", simulation.value.err);
        return { 
          error: `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`,
          transaction 
        };
      }
      
      console.log("✅ Simulation successful");
    } catch (simError) {
      console.warn("⚠️ Simulation error:", simError);
      // Continue anyway as real transactions sometimes succeed despite sim errors
    }
    
    // Return the transaction for signing and submission
    return {
      transaction
    };
  } catch (error) {
    console.error("❌ Error creating staking transaction:", error);
    
    // Enhanced error handling
    let errorMessage = "Unknown error creating staking transaction";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { error: errorMessage };
  }
}

/**
 * Execute a staking transaction with the connected wallet
 */
export async function executeStakingTransaction(
  walletAddress: string,
  amount: number,
  wallet: any,
  referrerAddress?: string
): Promise<{
  signature?: string;
  error?: string;
}> {
  try {
    console.log("Executing staking transaction");
    
    const result = await createStakingTransaction(
      walletAddress,
      amount,
      wallet,
      referrerAddress
    );
    
    if (result.error) {
      console.error("Error in creating transaction:", result.error);
      return { error: result.error };
    }
    
    if (!result.transaction) {
      console.error("No transaction was created");
      return { error: "No transaction was created" };
    }
    
    // Create a fresh connection for sending the transaction
    const txnConnection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    console.log("🚀 Sending the transaction...");
    
    try {
      // Send the transaction to the blockchain
      console.log("Sending transaction...");
      let signature;
      
      // Try with wallet's sendTransaction method
      if (wallet.sendTransaction) {
        try {
          console.log("Using wallet.sendTransaction method");
          signature = await wallet.sendTransaction(result.transaction);
          console.log("✅ Transaction sent with signature:", signature);
        } catch (err) {
          console.error("Error with wallet.sendTransaction:", err);
          throw err;
        }
      } else {
        console.error("Wallet does not have sendTransaction method");
        throw new Error("Wallet does not support sendTransaction");
      }
      
      return { signature };
    } catch (sendError) {
      console.error("Error sending transaction:", sendError);
      return {
        error: sendError instanceof Error ? sendError.message : String(sendError)
      };
    }
  } catch (error) {
    console.error("Error executing staking transaction:", error);
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}