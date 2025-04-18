/**
 * Deploy Simple Staking Program
 * 
 * This script deploys and initializes the simplified staking program that
 * avoids the complexity of the original contract to isolate and test issues.
 */

import { 
  Connection, 
  Keypair, 
  clusterApiUrl, 
  PublicKey,
  Transaction
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import {
  PROGRAM_ID,
  TOKEN_MINT_ADDRESS,
  initializeVault,
  findVaultPDA,
  findVaultAuthorityPDA
} from '../server/simple-staking-utils';

async function main() {
  try {
    console.log("Starting simple staking deployment...");
    
    // Load the mint authority keypair for token operations
    const tokenKeypairData = JSON.parse(fs.readFileSync('./token-keypair.json', 'utf-8'));
    const tokenKeypair = Keypair.fromSecretKey(new Uint8Array(tokenKeypairData));
    
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    console.log("Connected to Solana devnet");
    console.log(`Admin wallet: ${tokenKeypair.publicKey.toString()}`);
    console.log(`Simple staking program ID: ${PROGRAM_ID.toString()}`);
    console.log(`Token mint: ${TOKEN_MINT_ADDRESS.toString()}`);
    
    // Create a provider with the admin wallet
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: tokenKeypair.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(tokenKeypair);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs.map(tx => {
            tx.partialSign(tokenKeypair);
            return tx;
          });
        },
      },
      { commitment: 'confirmed' }
    );
    
    // Find the vault PDAs
    const [vaultPDA] = findVaultPDA();
    const [vaultAuthority] = findVaultAuthorityPDA();
    
    console.log(`Vault PDA: ${vaultPDA.toString()}`);
    console.log(`Vault authority PDA: ${vaultAuthority.toString()}`);
    
    // Get associated token account for the vault authority
    const vaultTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT_ADDRESS,
      vaultAuthority,
      true // allowOwnerOffCurve - true for PDAs
    );
    
    console.log(`Vault token account: ${vaultTokenAccount.toString()}`);
    
    // Check if vault token account exists
    const vaultTokenAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
    
    if (!vaultTokenAccountInfo) {
      console.log("Vault token account doesn't exist. Creating it...");
      
      // Create a transaction to initialize the associated token account
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          tokenKeypair.publicKey, // payer
          vaultTokenAccount, // associatedToken
          vaultAuthority, // owner
          TOKEN_MINT_ADDRESS, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      
      // Send the transaction
      const signature = await connection.sendTransaction(tx, [tokenKeypair]);
      console.log(`Created vault token account. Signature: ${signature}`);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log("Vault token account creation confirmed");
    } else {
      console.log("Vault token account already exists");
    }
    
    // Initialize the vault
    console.log("Initializing vault...");
    const { vault, vaultAuthority: authPDA, vaultTokenAccount: tokenAccount } = await initializeVault(connection, tokenKeypair);
    
    console.log("Simple staking vault initialized successfully");
    console.log(`Vault address: ${vault.toString()}`);
    console.log(`Vault authority: ${authPDA.toString()}`);
    console.log(`Vault token account: ${tokenAccount.toString()}`);
    
    console.log("Deployment completed successfully!");
  } catch (error) {
    console.error("Error deploying simple staking program:", error);
  }
}

main();