import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PublicKey, Keypair, Connection, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Token mint address 
const TOKEN_MINT_ADDRESS = "59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk";

// Marketing wallet (can be updated to an actual wallet)
const MARKETING_WALLET = "8Lg7TowFuMQoGiTsLE8J1KBJm4FLCJzQjbL97aiRJjkF";

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
  const idlPath = path.resolve('./target/idl/referral_tracker.json');
  const idlString = fs.readFileSync(idlPath, 'utf8');
  const idl = JSON.parse(idlString);
  
  // Program ID from IDL
  const programId = new PublicKey(idl.metadata.address);
  console.log('Program ID:', programId.toString());
  
  // Initialize program
  const program = new Program(idl, programId);
  
  try {
    console.log('Initializing referral tracker...');
    
    // Get staking vault from saved deployment info, or use a default
    let stakingVaultAddress;
    try {
      const stakingDeploymentPath = path.resolve('./staking-vault-deployment.json');
      const stakingDeploymentString = fs.readFileSync(stakingDeploymentPath, 'utf8');
      const stakingDeployment = JSON.parse(stakingDeploymentString);
      stakingVaultAddress = new PublicKey(stakingDeployment.stakingVault);
      console.log('Using staking vault from deployment:', stakingVaultAddress.toString());
    } catch (error) {
      console.warn('Staking vault deployment not found, using default address');
      stakingVaultAddress = keyPair.publicKey; // Using deployer as fallback
    }
    
    // Find the referral program PDA
    const [referralProgramPDA, _] = await PublicKey.findProgramAddress(
      [Buffer.from('referral-program')],
      program.programId
    );
    console.log('Referral Program PDA:', referralProgramPDA.toString());
    
    // Find the admin authority PDA (for signing token transfers)
    const [adminAuthority, adminAuthorityBump] = await PublicKey.findProgramAddress(
      [Buffer.from('admin-authority'), referralProgramPDA.toBuffer()],
      program.programId
    );
    console.log('Admin Authority PDA:', adminAuthority.toString());
    
    // Token mint
    const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
    console.log('Token Mint:', tokenMint.toString());
    
    // Marketing wallet
    const marketingWallet = new PublicKey(MARKETING_WALLET);
    console.log('Marketing Wallet:', marketingWallet.toString());
    
    // Initialize the referral program
    const tx = await program.methods
      .initialize(adminAuthorityBump)
      .accounts({
        authority: keyPair.publicKey,
        referralProgram: referralProgramPDA,
        tokenMint: tokenMint,
        stakingVault: stakingVaultAddress,
        marketingWallet: marketingWallet,
        adminAuthority: adminAuthority,
        systemProgram: SystemProgram.programId,
      })
      .signers([keyPair])
      .rpc();
    
    console.log('Referral tracker initialized successfully!');
    console.log('Transaction signature:', tx);
    
    // Save deployment info
    const deploymentInfo = {
      programId: programId.toString(),
      referralProgram: referralProgramPDA.toString(),
      adminAuthority: adminAuthority.toString(),
      adminAuthorityBump,
      tokenMint: tokenMint.toString(),
      stakingVault: stakingVaultAddress.toString(),
      marketingWallet: marketingWallet.toString(),
    };
    
    fs.writeFileSync(
      './referral-tracker-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('Deployment info saved to referral-tracker-deployment.json');
    
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});