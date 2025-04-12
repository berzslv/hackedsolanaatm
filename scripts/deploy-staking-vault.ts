import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PublicKey, Keypair, Connection, SystemProgram } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getMint, 
  getOrCreateAssociatedTokenAccount 
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Token mint address 
const TOKEN_MINT_ADDRESS = "59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk";

async function main() {
  // Load the wallet keypair from token-keypair.json
  const keyPairFilePath = path.resolve('./token-keypair.json');
  const keyPairString = fs.readFileSync(keyPairFilePath, 'utf8');
  const keyPairData = JSON.parse(keyPairString);
  const keyPair = Keypair.fromSecretKey(Uint8Array.from(keyPairData));
  
  console.log('Deployer wallet:', keyPair.publicKey.toString());
  
  // Connect to devnet
  const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl('devnet'), 'confirmed');
  
  // Create provider
  const wallet = new anchor.Wallet(keyPair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'processed',
  });
  
  // Set provider as default
  anchor.setProvider(provider);
  
  // Load the program IDL
  const idlPath = path.resolve('./target/idl/staking_vault.json');
  const idlString = fs.readFileSync(idlPath, 'utf8');
  const idl = JSON.parse(idlString);
  
  // Program ID from IDL
  const programId = new PublicKey(idl.metadata.address);
  console.log('Program ID:', programId.toString());
  
  // Initialize program
  const program = new Program(idl, programId);
  
  try {
    console.log('Initializing staking vault...');
    
    // Find PDAs for the vault
    const [stakingVaultPDA, _] = await PublicKey.findProgramAddress(
      [Buffer.from('staking-vault')],
      program.programId
    );
    console.log('Staking Vault PDA:', stakingVaultPDA.toString());
    
    // Find the vault authority PDA (for signing token transfers)
    const [vaultAuthority, vaultAuthorityBump] = await PublicKey.findProgramAddress(
      [stakingVaultPDA.toBuffer()],
      program.programId
    );
    console.log('Vault Authority PDA:', vaultAuthority.toString());
    
    // Create token accounts for the vault
    const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
    
    // Get or create associated token account for the vault
    const vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      keyPair,  // Payer
      tokenMint,
      vaultAuthority,
      true // Allowing off-curve addresses (PDAs)
    );
    console.log('Vault Token Account:', vaultTokenAccount.address.toString());
    
    // Initialize the staking vault
    const tx = await program.methods
      .initialize(vaultAuthorityBump)
      .accounts({
        authority: keyPair.publicKey,
        stakingVault: stakingVaultPDA,
        tokenMint: tokenMint,
        tokenVault: vaultTokenAccount.address,
        vaultAuthority: vaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([keyPair])
      .rpc();
    
    console.log('Staking vault initialized successfully!');
    console.log('Transaction signature:', tx);
    
    // Save deployment info
    const deploymentInfo = {
      programId: programId.toString(),
      stakingVault: stakingVaultPDA.toString(),
      vaultAuthority: vaultAuthority.toString(),
      vaultAuthorityBump,
      vaultTokenAccount: vaultTokenAccount.address.toString(),
      tokenMint: tokenMint.toString(),
    };
    
    fs.writeFileSync(
      './staking-vault-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('Deployment info saved to staking-vault-deployment.json');
    
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});