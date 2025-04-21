/**
 * Airdrop Tokens to Test Wallet
 * 
 * This script sends tokens from the mint authority to a test wallet
 * for testing staking functionality.
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
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction, 
  getMint
} from '@solana/spl-token';
import fs from 'fs';

// Constants
const TOKEN_MINT = new PublicKey('6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4');
const AIRDROP_AMOUNT = 200; // Number of tokens to send

async function main() {
  try {
    console.log('======= HATM Token Airdrop to Test Wallet =======');
    
    // Load test wallet
    if (!fs.existsSync('./test-wallet.json')) {
      console.error('Test wallet file not found. Please run create-test-wallet.js first.');
      return;
    }
    
    const testWalletData = JSON.parse(fs.readFileSync('./test-wallet.json', 'utf8'));
    const receiverPubkey = new PublicKey(testWalletData.publicKey);
    console.log(`Receiver Wallet: ${receiverPubkey.toString()}`);
    console.log(`Token Mint: ${TOKEN_MINT.toString()}`);
    console.log(`Airdrop Amount: ${AIRDROP_AMOUNT} HATM tokens`);
    
    // Connect to Solana
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load the token creator keypair (mint authority)
    const tokenData = JSON.parse(fs.readFileSync('./token-keypair.json', 'utf8'));
    const senderKeypair = Keypair.fromSecretKey(new Uint8Array(tokenData.authority.secretKey));
    console.log('Sender Wallet (Mint Authority):', senderKeypair.publicKey.toString());
    
    // Get token decimals
    const tokenInfo = await getMint(connection, TOKEN_MINT);
    const decimals = tokenInfo.decimals;
    console.log(`Token decimals: ${decimals}`);
    
    // Create or get sender token account
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      TOKEN_MINT,
      senderKeypair.publicKey
    );
    
    console.log('Sender Token Account:', senderTokenAccount.address.toString());
    
    // Create or get receiver token account
    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair, // payer for creating the account if needed
      TOKEN_MINT,
      receiverPubkey
    );
    
    console.log('Receiver Token Account:', receiverTokenAccount.address.toString());
    
    // Amount to transfer with decimals
    const amount = AIRDROP_AMOUNT * Math.pow(10, decimals);
    console.log(`Transferring ${amount} tokens (with ${decimals} decimals)`);
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount.address,    // source
      receiverTokenAccount.address,  // destination 
      senderKeypair.publicKey,       // owner of source account
      BigInt(amount)                 // amount as BigInt
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    
    console.log('Sending airdrop transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );
    
    console.log('✅ Airdrop successful!');
    console.log('Transaction signature:', signature);
    console.log('Explorer link:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Check balances after transfer
    try {
      const receiverBalance = await connection.getTokenAccountBalance(receiverTokenAccount.address);
      console.log('Test wallet token balance after transfer:', receiverBalance.value.uiAmount);
    } catch (error) {
      console.error('Error getting receiver balance:', error);
    }
    
  } catch (error) {
    console.error('Error in token airdrop:', error);
    if (error.logs) {
      console.error('Transaction logs:');
      error.logs.forEach((log, i) => console.error(`${i}: ${log}`));
    }
  }
}

main().catch(console.error);