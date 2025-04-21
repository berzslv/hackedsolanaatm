/**
 * Initialize Simple Staking Vault
 * 
 * This script initializes the vault for the simplified staking contract.
 * It builds the instruction exactly as the contract expects.
 */
import { 
  Connection, 
  Keypair, 
  Transaction, 
  PublicKey, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import fs from 'fs';

// Constants
const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
const TOKEN_MINT = new PublicKey('6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4');

// PDA seeds
const VAULT_SEED = 'vault';
const VAULT_AUTH_SEED = 'vault_auth';

// Helper function to find vault PDA
function findVaultPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED)],
    PROGRAM_ID
  );
}

// Helper function to find vault authority PDA
function findVaultAuthorityPDA() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_AUTH_SEED)],
    PROGRAM_ID
  );
}

async function main() {
  try {
    console.log('======= Initializing Simple Staking Vault =======');
    
    // Connect to Solana
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load admin keypair (token authority)
    const tokenData = JSON.parse(fs.readFileSync('./token-keypair.json', 'utf8'));
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(tokenData.authority.secretKey));
    console.log('Admin Wallet:', adminKeypair.publicKey.toString());
    
    // Get PDAs
    const [vault, vaultBump] = findVaultPDA();
    const [vaultAuthority, vaultAuthBump] = findVaultAuthorityPDA();
    console.log('Vault PDA:', vault.toString());
    console.log('Vault Authority PDA:', vaultAuthority.toString());
    
    // Get vault token account
    const vaultTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      vaultAuthority,
      true // allowOwnerOffCurve - important for PDAs
    );
    console.log('Vault Token Account:', vaultTokenAccount.toString());
    
    // Check if account already exists
    const vaultAccountInfo = await connection.getAccountInfo(vault);
    if (vaultAccountInfo) {
      console.log('✅ Vault is already initialized');
      return;
    }
    
    console.log('Vault needs to be initialized');
    
    // Create the initialize instruction 
    const anchorDiscriminator = [175, 175, 109, 31, 13, 152, 155, 237]; // Anchor discriminator for "initialize"
    const initializeIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true }, // Payer
        { pubkey: vault, isSigner: false, isWritable: true }, // Vault
        { pubkey: vaultAuthority, isSigner: false, isWritable: false }, // Vault Authority 
        { pubkey: TOKEN_MINT, isSigner: false, isWritable: false }, // Token Mint
        { pubkey: vaultTokenAccount, isSigner: false, isWritable: false }, // Vault Token Account
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System Program
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // Rent
      ],
      data: Buffer.from(anchorDiscriminator)
    });
    
    console.log('Created initialize instruction with discriminator:', anchorDiscriminator);
    
    // Create transaction
    const transaction = new Transaction().add(initializeIx);
    
    // Send and confirm transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [adminKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Transaction successful!');
    console.log('Transaction signature:', signature);
    console.log('Explorer link:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Verify account creation
    const newVaultInfo = await connection.getAccountInfo(vault);
    if (newVaultInfo) {
      console.log('✅ Vault successfully initialized!');
      console.log('Vault data size:', newVaultInfo.data.length);
      console.log('Vault owner:', newVaultInfo.owner.toString());
    } else {
      console.log('❌ Failed to initialize vault');
    }
  } catch (error) {
    console.error('Error initializing vault:', error);
    if (error.logs) {
      console.error('Transaction logs:');
      error.logs.forEach((log, i) => console.error(`${i}: ${log}`));
    }
  }
}

main().catch(console.error);