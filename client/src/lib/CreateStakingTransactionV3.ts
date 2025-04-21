/**
 * CreateStakingTransactionV3
 * 
 * Implements proper Anchor-based staking transaction creation
 * following Solana standards and best practices.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
  SystemProgram,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
// Import BN from bn.js directly to ensure it's the correct version
import BN_Direct from 'bn.js';

// Constants
const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');
const GLOBAL_STATE_SEED = "global_state";
const USER_INFO_SEED = "user_info";
const VAULT_SEED = "vault";
const VAULT_AUTH_SEED = "vault_auth";

/**
 * Create a staking transaction using Anchor
 * 
 * @param walletAddress User's wallet address
 * @param amount Amount to stake
 * @param wallet Connected wallet (with signTransaction and sendTransaction)
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
    console.log("🚀 Creating staking transaction with Anchor v3");
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
    const freshConnection = new Connection(devnetUrl, 'confirmed');
    const userPubkey = new PublicKey(walletAddress);
    
    console.log("Creating AnchorProvider with wallet");
    // Create a fresh provider with our clean objects
    const freshProvider = new AnchorProvider(
      freshConnection,
      wallet as any, // Type casting to overcome LSP issues
      AnchorProvider.defaultOptions()
    );
    
    // Set the provider as the global Anchor provider
    anchor.setProvider(freshProvider);
    
    console.log("📡 Fetching IDL for program:", PROGRAM_ID.toString());
    // Fetch IDL directly from the blockchain
    const idl = await Program.fetchIdl(PROGRAM_ID, freshProvider);
    if (!idl) {
      return { error: "Failed to fetch program IDL" };
    }
    // Use the Program constructor with our fresh provider
    console.log("Creating program with IDL and fresh provider");
    const program = new Program(idl, PROGRAM_ID, freshProvider);
    
    // Find PDA addresses
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_STATE_SEED)],
      program.programId
    );
    
    const [userStakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(USER_INFO_SEED), userPubkey.toBuffer()],
      program.programId
    );
    
    const [vaultAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_AUTH_SEED)],
      program.programId
    );
    
    // Get token accounts
    console.log("🪙 Fetching user token accounts");
    const tokenAccounts = await freshConnection.getParsedTokenAccountsByOwner(
      userPubkey,
      { mint: TOKEN_MINT_ADDRESS }
    );
    
    // Check if we have token accounts
    if (tokenAccounts.value.length === 0) {
      console.log("⚠️ No token accounts found, creating one");
      try {
        // Get ATA address
        const ata = await getAssociatedTokenAddress(
          TOKEN_MINT_ADDRESS,
          userPubkey
        );
        
        // Create ATA instruction
        const ix = createAssociatedTokenAccountInstruction(
          userPubkey,  // payer
          ata,         // associated token account
          userPubkey,  // owner
          TOKEN_MINT_ADDRESS // mint
        );
        
        // Send transaction to create ATA
        const tx = new Transaction().add(ix);
        tx.feePayer = userPubkey;
        const { blockhash } = await freshConnection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        
        const sig = await wallet.sendTransaction(tx, freshConnection);
        await freshConnection.confirmTransaction(sig, 'confirmed');
        console.log("✅ Created token account:", ata.toString());
      } catch (error) {
        console.error("Error creating token account:", error);
        // Continue anyway, it may already exist
      }
    }
    
    // Find the best token account (with enough balance)
    let userTokenAccount: PublicKey | null = null;
    
    // Fetch token accounts again after potential creation
    const updatedTokenAccounts = await freshConnection.getParsedTokenAccountsByOwner(
      userPubkey,
      { mint: TOKEN_MINT_ADDRESS }
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
        TOKEN_MINT_ADDRESS,
        userPubkey
      );
      userTokenAccount = ata;
      console.log(`⚠️ No account with sufficient balance, using ATA: ${ata.toString()}`);
    }
    
    // Get vault token account
    const vaultTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT_ADDRESS,
      vaultAuthPda,
      true // Allow off-curve for PDAs
    );
    
    // Verify vault token account exists
    try {
      await getAccount(freshConnection, vaultTokenAccount);
      console.log("✅ Vault token account verified:", vaultTokenAccount.toString());
    } catch (error) {
      console.error("❌ Vault token account invalid:", error);
      return { error: "Vault token account not found or invalid" };
    }
    
    console.log("🛠️ Building transaction with program.methods");
    // Convert amount to proper decimal format (9 decimals for our token)
    // Use direct BN implementation to avoid _bn undefined issues
    const amountInDecimalStr = Math.floor(amount * 1e9).toString();
    console.log("Amount in decimals (string):", amountInDecimalStr);
    const amountWithDecimals = new BN_Direct(amountInDecimalStr);
    
    // Create transaction with Anchor methods
    const transaction = await program.methods
      .stake(amountWithDecimals)
      .accounts({
        owner: userPubkey,
        globalState: globalStatePda,
        stakeAccount: userStakePda,
        userTokenAccount: userTokenAccount || new PublicKey("11111111111111111111111111111111"), // Fallback if null
        tokenVault: vaultTokenAccount,
        tokenMint: TOKEN_MINT_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
    
    // Add recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await freshConnection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPubkey;
    
    console.log("✅ Transaction built successfully");
    
    // Try simulation first
    console.log("🔍 Simulating transaction...");
    try {
      const simulation = await freshConnection.simulateTransaction(transaction);
      
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
    
    // Send transaction
    console.log("🚀 Sending transaction...");
    const signature = await wallet.sendTransaction(transaction, freshConnection);
    console.log("✅ Transaction sent:", signature);
    
    // Return successful result
    return {
      signature,
      transaction
    };
  } catch (error) {
    console.error("❌ Error creating staking transaction:", error);
    
    // Enhanced error handling
    let errorMessage = "Unknown error creating staking transaction";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific Anchor errors
      if (error.message.includes("custom program error:")) {
        const errorCodeMatch = error.message.match(/custom program error: (\d+)/i);
        if (errorCodeMatch && errorCodeMatch[1]) {
          const errorCode = parseInt(errorCodeMatch[1]);
          
          // Map known error codes
          if (errorCode === 101) {
            errorMessage = "Invalid token account. Please check your token accounts.";
          }
        }
      }
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
    const result = await createStakingTransaction(
      walletAddress,
      amount,
      wallet,
      referrerAddress
    );
    
    if (result.error) {
      return { error: result.error };
    }
    
    return { signature: result.signature };
  } catch (error) {
    console.error("Error executing staking transaction:", error);
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}