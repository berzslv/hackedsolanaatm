/**
 * Direct Token Transfer
 * 
 * This script performs a direct token transfer to the vault token account
 * to verify that tokens can be sent to the vault.
 */
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  createTransferInstruction,
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import fs from 'fs';

// Constants
const TOKEN_MINT = new PublicKey('6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4');
const VAULT_AUTHORITY = new PublicKey('BE2tDJyNnyjHrdDXWWD2EhaQgFqJ4tBMUBVpTKn4FpBE');
const VAULT_TOKEN_ACCOUNT = new PublicKey('JDeTBTzRsuzXqE1Z7hLT6zmhX5UCA2HiAQDhCLXxaQ44');

async function main() {
  try {
    console.log('======= Direct Token Transfer Test =======');
    
    // Connect to Solana
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load the token creator keypair which has tokens
    const tokenData = JSON.parse(fs.readFileSync('./token-keypair.json', 'utf8'));
    const senderKeypair = Keypair.fromSecretKey(new Uint8Array(tokenData.authority.secretKey));
    console.log('Sender Wallet:', senderKeypair.publicKey.toString());
    
    // Get the sender's associated token account
    const senderTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      senderKeypair.publicKey
    );
    console.log('Sender Token Account:', senderTokenAccount.toString());
    
    // Get the vault's token account (destination)
    console.log('Vault Authority:', VAULT_AUTHORITY.toString());
    console.log('Vault Token Account:', VAULT_TOKEN_ACCOUNT.toString());
    
    // Check token balances before transfer
    try {
      const senderBalance = await connection.getTokenAccountBalance(senderTokenAccount);
      console.log('Sender token balance before transfer:', senderBalance.value.uiAmount);
    } catch (error) {
      console.error('Error getting sender balance:', error);
    }
    
    try {
      const vaultBalance = await connection.getTokenAccountBalance(VAULT_TOKEN_ACCOUNT);
      console.log('Vault token balance before transfer:', vaultBalance.value.uiAmount);
    } catch (error) {
      console.error('Error getting vault balance:', error);
    }
    
    // Amount to transfer (1000 tokens with 9 decimals)
    const amount = 1000 * 10**9;
    console.log(`Transferring ${amount / 10**9} tokens...`);
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,     // source
      VAULT_TOKEN_ACCOUNT,    // destination 
      senderKeypair.publicKey, // owner of source account
      amount                  // amount (in smallest units)
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    
    console.log('Sending token transfer transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );
    
    console.log('✅ Transaction successful!');
    console.log('Transaction signature:', signature);
    console.log('Explorer link:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Check balances after transfer
    try {
      const newSenderBalance = await connection.getTokenAccountBalance(senderTokenAccount);
      console.log('Sender token balance after transfer:', newSenderBalance.value.uiAmount);
    } catch (error) {
      console.error('Error getting sender balance:', error);
    }
    
    try {
      const newVaultBalance = await connection.getTokenAccountBalance(VAULT_TOKEN_ACCOUNT);
      console.log('Vault token balance after transfer:', newVaultBalance.value.uiAmount);
    } catch (error) {
      console.error('Error getting vault balance:', error);
    }
    
  } catch (error) {
    console.error('Error in direct token transfer:', error);
    if (error.logs) {
      console.error('Transaction logs:');
      error.logs.forEach((log, i) => console.error(`${i}: ${log}`));
    }
  }
}

main().catch(console.error);