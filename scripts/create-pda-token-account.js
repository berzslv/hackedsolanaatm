// Create Token Account for PDA Vault
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  sendAndConfirmTransaction,
  clusterApiUrl 
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from "@solana/spl-token";

import fs from "fs";

// Load the token keypair from the file
const loadKeypair = (filePath) => {
  const fileContent = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  
  // Handle different keypair formats
  if (fileContent.mint && fileContent.mint.secretKey) {
    return Keypair.fromSecretKey(
      new Uint8Array(fileContent.mint.secretKey)
    );
  } else if (fileContent.keypair && fileContent.keypair.secretKey) {
    return Keypair.fromSecretKey(
      new Uint8Array(fileContent.keypair.secretKey)
    );
  } else if (Array.isArray(fileContent)) {
    return Keypair.fromSecretKey(new Uint8Array(fileContent));
  } else {
    throw new Error("Unknown keypair format");
  }
};

async function main() {
  // Program ID and token mint
  const programId = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
  const tokenMint = new PublicKey("59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk");
  
  // Calculate the vault PDA
  const [vaultPDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), tokenMint.toBuffer()],
    programId
  );
  
  console.log("Vault PDA:", vaultPDA.toBase58());
  console.log("Bump:", bump);
  
  // Create connection to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Load token mint authority keypair for signing the transaction
  const mintAuthority = loadKeypair("../token-keypair-original.json");
  console.log("Mint authority:", mintAuthority.publicKey.toBase58());
  
  // Calculate the associated token account address for the vault PDA
  const vaultTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    vaultPDA,
    true // This is critical for PDAs - must be true
  );
  
  console.log("Vault token account address:", vaultTokenAccount.toBase58());
  
  // Check if the account already exists
  try {
    const accountInfo = await connection.getAccountInfo(vaultTokenAccount);
    if (accountInfo) {
      console.log("Token account already exists!");
      return;
    }
  } catch (error) {
    console.log("Account doesn't exist, creating it...");
  }
  
  // Create a transaction to initialize the associated token account for the PDA
  const transaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      mintAuthority.publicKey, // Payer (fee payer)
      vaultTokenAccount,       // New associated token account address
      vaultPDA,                // Owner of the new account
      tokenMint,               // Token mint
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );
  
  // Send and confirm the transaction
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [mintAuthority], // Signers
      { commitment: "confirmed" }
    );
    
    console.log("Transaction successful! Signature:", signature);
    console.log("Token account created for vault PDA!");
    console.log(`Check on explorer: https://explorer.solana.com/address/${vaultTokenAccount.toBase58()}?cluster=devnet`);
  } catch (error) {
    console.error("Error creating token account:", error);
  }
}

main().catch(console.error);