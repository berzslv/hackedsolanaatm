/**
 * Initialize Vault For New Token
 * 
 * This script initializes the staking vault for our new token implementation.
 * It's needed because we're using a new token with the existing program.
 */
import { Connection, Keypair, Transaction, SystemProgram, clusterApiUrl, PublicKey, sendAndConfirmTransaction, TransactionInstruction, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

// Program constants
const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
const TOKEN_MINT = new PublicKey('6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4');
const INITIALIZE_DISCRIMINATOR = [175, 175, 109, 31, 13, 152, 155, 237]; // Anchor discriminator for "initialize"

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

async function initializeVault() {
  try {
    console.log('Initializing staking vault for new token...');
    
    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load the admin keypair - uses the authority in token-keypair.json
    const tokenData = JSON.parse(fs.readFileSync('./token-keypair.json', 'utf8'));
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(tokenData.authority.secretKey));
    console.log('Admin public key:', adminKeypair.publicKey.toString());
    
    // Get PDAs
    const [vaultPDA, vaultBump] = findVaultPDA();
    const [vaultAuthority, vaultAuthBump] = findVaultAuthorityPDA();
    console.log('Vault PDA:', vaultPDA.toString());
    console.log('Vault Authority PDA:', vaultAuthority.toString());
    
    // Get or create the vault token account (associated token account for the vault authority)
    let vaultTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      vaultAuthority,
      true // allowOwnerOffCurve - must be true for PDAs
    );
    console.log('Vault Token Account:', vaultTokenAccount.toString());
    
    // Create a transaction to create the token account if it doesn't exist
    const transaction = new Transaction();
    
    // Check if the vault token account exists
    const vaultTokenAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
    if (!vaultTokenAccountInfo) {
      console.log('Creating vault token account...');
      
      // Create associated token account instruction
      transaction.add(
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey, // payer
          vaultTokenAccount, // associated token account
          vaultAuthority, // owner
          TOKEN_MINT, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    } else {
      console.log('Vault token account already exists.');
    }
    
    // Check if the vault already exists
    const vaultInfo = await connection.getAccountInfo(vaultPDA);
    if (vaultInfo) {
      console.log('Vault already initialized.');
      return;
    }
    
    console.log('Creating initialize vault instruction...');
    
    // Create the initialize instruction
    const initializeIx = new TransactionInstruction({
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true }, // Payer
        { pubkey: vaultPDA, isSigner: false, isWritable: true }, // Vault
        { pubkey: vaultAuthority, isSigner: false, isWritable: false }, // Vault Authority
        { pubkey: TOKEN_MINT, isSigner: false, isWritable: false }, // Token Mint
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: false }, // Vault Token Account
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: Buffer.from(new Uint8Array(INITIALIZE_DISCRIMINATOR))
    });
    
    // Add initialize instruction to the transaction
    transaction.add(initializeIx);
    
    // Send and confirm the transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [adminKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('Transaction successful!');
    console.log('Signature:', signature);
    console.log('Vault initialized successfully for the new token.');
    
  } catch (error) {
    console.error('Error initializing vault:', error);
  }
}

// Run the initialization
initializeVault();