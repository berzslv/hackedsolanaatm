/**
 * Test Direct Staking Implementation
 * 
 * This script tests the direct token transfer functionality for staking
 * by transferring tokens directly to the vault token account.
 * 
 * It uses a keypair loaded from a file to sign transactions and performs
 * the exact same operations as the client-side code, so we can diagnose issues.
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
  getAssociatedTokenAddress,
  createTransferInstruction
} from '@solana/spl-token';
import fs from 'fs';

// Constants
const TOKEN_MINT = new PublicKey('6f6GFixp6dh2UeMzDZpgR84rWgHu8oQVPWfrUUV94aj4');
const VAULT_TOKEN_ACCOUNT = new PublicKey('JDeTBTzRsuzXqE1Z7hLT6zmhX5UCA2HiAQDhCLXxaQ44');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const STAKING_AMOUNT = 10; // Amount to stake

async function main() {
  try {
    console.log('======= Testing Direct Token Staking =======');
    
    // Connect to Solana
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load test wallet
    let wallet;
    try {
      const walletData = JSON.parse(fs.readFileSync('./test-wallet.json', 'utf8'));
      wallet = Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));
    } catch (error) {
      console.error('Test wallet file not found. Please run create-test-wallet.js first.');
      return;
    }
    
    console.log('Test wallet public key:', wallet.publicKey.toString());
    
    // Get user token account
    const userTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    console.log('User token account:', userTokenAccount.toString());
    console.log('Vault token account:', VAULT_TOKEN_ACCOUNT.toString());
    
    // Check token balance
    let tokenBalance;
    try {
      const balanceResponse = await connection.getTokenAccountBalance(userTokenAccount);
      tokenBalance = Number(balanceResponse.value.amount) / 1e9;
      console.log('Current token balance:', tokenBalance, 'HATM');
    } catch (error) {
      console.error('Error fetching token balance:', error);
      console.log('Token account may not exist yet');
      tokenBalance = 0;
    }
    
    if (tokenBalance < STAKING_AMOUNT) {
      console.error(`Not enough tokens to stake. Have ${tokenBalance}, need ${STAKING_AMOUNT}`);
      return;
    }
    
    // Create transaction
    const transaction = new Transaction();
    
    // Calculate amount in lamports (9 decimals)
    const amountLamports = Math.floor(STAKING_AMOUNT * Math.pow(10, 9));
    console.log('Amount in lamports:', amountLamports);
    
    // Method 1: Create transfer instruction with simple amount
    try {
      console.log('Method 1: Using number directly');
      const transferInstruction1 = createTransferInstruction(
        userTokenAccount,
        VAULT_TOKEN_ACCOUNT,
        wallet.publicKey,
        amountLamports
      );
      
      // Add to transaction
      transaction.add(transferInstruction1);
      console.log('Method 1 successful');
    } catch (error) {
      console.error('Method 1 failed:', error);
    }
    
    // Clear transaction instructions if Method 1 was added
    transaction.instructions = [];
    
    // Method 2: Using BigInt
    try {
      console.log('Method 2: Using BigInt');
      const bigIntAmount = BigInt(amountLamports);
      console.log(`BigInt amount: ${bigIntAmount}`);
      
      const transferInstruction2 = createTransferInstruction(
        userTokenAccount,
        VAULT_TOKEN_ACCOUNT,
        wallet.publicKey,
        bigIntAmount
      );
      
      // Add to transaction
      transaction.add(transferInstruction2);
      console.log('Method 2 successful');
    } catch (error) {
      console.error('Method 2 failed:', error);
      return;
    }
    
    // Set transaction properties
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Print transaction details
    console.log('Transaction details:');
    console.log('Blockhash:', blockhash);
    console.log('Instructions:', transaction.instructions.length);
    
    // Send transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: 'confirmed' }
    );
    
    console.log('Transaction successful!');
    console.log('Signature:', signature);
    console.log('Explorer link:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Check new balance
    try {
      const newBalanceResponse = await connection.getTokenAccountBalance(userTokenAccount);
      const newBalance = Number(newBalanceResponse.value.amount) / 1e9;
      console.log('New token balance:', newBalance, 'HATM');
      console.log(`Staked ${tokenBalance - newBalance} HATM tokens`);
    } catch (error) {
      console.error('Error fetching updated token balance:', error);
    }
    
  } catch (error) {
    console.error('Error in test-direct-staking:', error);
    if (error.logs) {
      console.error('Transaction logs:');
      error.logs.forEach((log, i) => console.error(`${i}: ${log}`));
    }
  }
}

main().catch(console.error);