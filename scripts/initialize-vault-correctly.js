/**
 * Initialize Vault Correctly
 * 
 * This script initializes a staking vault based on our smart contract using a very specific
 * approach for instruction layout to match the Anchor program's expectations.
 */
import { Connection, clusterApiUrl, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

// Program constants
const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
const TOKEN_MINT = new PublicKey('6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4');

// Find PDAs
function findVaultPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  );
}

function findVaultAuthorityPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault_auth')],
    PROGRAM_ID
  );
}

/**
 * Initialize the staking vault
 */
async function initializeVault() {
  try {
    console.log('======= Initialize Staking Vault =======');
    
    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load token information
    const tokenData = JSON.parse(fs.readFileSync('./token-keypair.json', 'utf8'));
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(tokenData.authority.secretKey));
    console.log('Admin Wallet:', adminKeypair.publicKey.toString());
    
    // Find PDAs
    const [vaultPDA, vaultBump] = findVaultPDA();
    const [vaultAuthority, vaultAuthBump] = findVaultAuthorityPDA();
    console.log('Vault PDA:', vaultPDA.toString());
    console.log('Vault Authority PDA:', vaultAuthority.toString());
    
    // Get the associated token account for the vault authority
    const vaultTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      vaultAuthority,
      true // allowOwnerOffCurve - important for PDAs
    );
    console.log('Vault Token Account:', vaultTokenAccount.toString());
    
    // Verify everything before proceeding
    const vaultAccountInfo = await connection.getAccountInfo(vaultPDA);
    const vaultTokenAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
    
    console.log('Vault exists:', vaultAccountInfo !== null);
    console.log('Vault token account exists:', vaultTokenAccountInfo !== null);
    
    if (vaultAccountInfo) {
      console.log('Vault already initialized.');
      return;
    }
    
    // This is the EXACT data format expected by the Anchor program for initializing
    // Important: This must match the exact format the program expects
    const instructionData = Buffer.from([
      175, 175, 109, 31, 13, 152, 155, 237, // Anchor discriminator for "initialize"
    ]);
    
    // Create initialize instruction with keys in the exact order expected by the Anchor program
    const initializeIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true }, // authority (payer)
        { pubkey: vaultPDA, isSigner: false, isWritable: true }, // vault  
        { pubkey: vaultAuthority, isSigner: false, isWritable: false }, // vault_authority
        { pubkey: TOKEN_MINT, isSigner: false, isWritable: false }, // token_mint
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: false }, // token_vault
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
      ],
      data: instructionData
    });
    
    console.log('Creating initialize transaction...');
    console.log('Transaction data:', Array.from(instructionData));
    
    // Create transaction
    const transaction = new Transaction().add(initializeIx);
    
    // Send transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [adminKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('Transaction successful!');
    console.log('Signature:', signature);
    console.log('Explorer link:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Verify created vault
    console.log('Verifying vault...');
    const newVaultInfo = await connection.getAccountInfo(vaultPDA);
    
    if (newVaultInfo) {
      console.log('Vault initialized successfully!');
      console.log('Vault data size:', newVaultInfo.data.length);
      console.log('Vault owner:', newVaultInfo.owner.toString());
    } else {
      console.log('Vault not created. Check the transaction logs for errors.');
    }
    
  } catch (error) {
    console.error('Error initializing vault:', error);
    if (error.logs) {
      console.error('Transaction logs:');
      error.logs.forEach((log, i) => console.error(`${i}: ${log}`));
    }
  }
}

initializeVault().catch(console.error);