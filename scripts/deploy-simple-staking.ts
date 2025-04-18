/**
 * Deploy Simple Staking Program
 * 
 * This script deploys the simple staking program to Solana Devnet
 * and initializes the vault.
 */
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createAssociatedTokenAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// Load configuration
const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');

async function main() {
  try {
    console.log("🚀 Deploying Simple Staking Program to Devnet...");
    
    // Load deployer wallet from file
    const deployer = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync('./token-keypair.json', 'utf-8')))
    );
    console.log("Deployer public key:", deployer.publicKey.toString());
    
    // Connect to Devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Check deployer balance
    const balance = await connection.getBalance(deployer.publicKey);
    console.log(`Deployer balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      console.log("⚠️ Warning: Low balance for deployment. Requesting airdrop...");
      const signature = await connection.requestAirdrop(
        deployer.publicKey, 
        1 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature);
      console.log("Airdrop confirmed. New balance:", 
        await connection.getBalance(deployer.publicKey) / LAMPORTS_PER_SOL, 
        "SOL");
    }
    
    // Create Anchor provider
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: deployer.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(deployer);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs.map(tx => {
            tx.partialSign(deployer);
            return tx;
          });
        },
      },
      { commitment: 'confirmed' }
    );
    
    // ===== Calculate PDAs =====
    const programId = new PublicKey('SimplStakVau1t111111111111111111111111111111');
    
    // Find the vault PDA
    const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault')], 
      programId
    );
    
    // Find the vault authority PDA
    const [vaultAuthority, vaultAuthBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault_auth')], 
      programId
    );
    
    console.log("Program ID:", programId.toString());
    console.log("Vault PDA:", vaultPDA.toString(), "with bump", vaultBump);
    console.log("Vault Authority PDA:", vaultAuthority.toString(), "with bump", vaultAuthBump);
    
    // ===== Create Token Account for Vault =====
    console.log("Creating token account for vault authority...");
    
    try {
      // Get the associated token account address for the vault authority
      const vaultTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT_ADDRESS,
        vaultAuthority,
        true // allowOwnerOffCurve - true for PDAs
      );
      
      console.log("Vault token account address:", vaultTokenAccount.toString());
      
      // Check if the vault token account already exists
      const accountInfo = await connection.getAccountInfo(vaultTokenAccount);
      
      if (!accountInfo) {
        console.log("Creating vault token account...");
        // Create the token account for the vault authority
        await createAssociatedTokenAccount(
          connection,
          deployer,
          TOKEN_MINT_ADDRESS,
          vaultAuthority,
          { commitment: 'confirmed' }
        );
        console.log("Vault token account created successfully!");
      } else {
        console.log("Vault token account already exists");
      }
      
      console.log(`✅ Simple Staking program setup complete.`);
      console.log(`Program ID: ${programId.toString()}`);
      console.log(`Vault Address: ${vaultPDA.toString()}`);
      console.log(`Vault Authority: ${vaultAuthority.toString()}`);
      console.log(`Vault Token Account: ${vaultTokenAccount.toString()}`);
      
      // Save the information to a file for easy access
      const deployInfo = {
        programId: programId.toString(),
        vault: vaultPDA.toString(),
        vaultAuthority: vaultAuthority.toString(),
        vaultTokenAccount: vaultTokenAccount.toString(),
        tokenMint: TOKEN_MINT_ADDRESS.toString(),
        network: 'devnet',
        deployedAt: new Date().toISOString(),
      };
      
      fs.writeFileSync(
        './simple-staking-deploy-info.json', 
        JSON.stringify(deployInfo, null, 2)
      );
      console.log("Deployment info saved to simple-staking-deploy-info.json");
      
    } catch (error) {
      console.error("Error setting up vault token account:", error);
    }
    
  } catch (error) {
    console.error("Deployment failed:", error);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);