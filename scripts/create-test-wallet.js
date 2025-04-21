/**
 * Create Test Wallet
 * 
 * This script creates a test wallet, airdrops SOL to it, and saves the keypair
 * for use in other scripts.
 */
import { 
  Connection, 
  Keypair, 
  clusterApiUrl,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import fs from 'fs';

async function main() {
  try {
    console.log('======= Creating Test Wallet =======');
    
    // Connect to Solana
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Generate new keypair
    const wallet = Keypair.generate();
    console.log('Generated wallet public key:', wallet.publicKey.toString());
    
    // Request SOL airdrop
    console.log('Requesting SOL airdrop...');
    const signature = await connection.requestAirdrop(
      wallet.publicKey,
      2 * LAMPORTS_PER_SOL // 2 SOL
    );
    
    console.log('Airdrop transaction signature:', signature);
    console.log('Confirming transaction...');
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    // Check SOL balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    // Save keypair to file
    const walletData = {
      publicKey: wallet.publicKey.toString(),
      secretKey: Array.from(wallet.secretKey)
    };
    
    fs.writeFileSync('./test-wallet.json', JSON.stringify(walletData, null, 2));
    console.log('Wallet saved to test-wallet.json');
    
  } catch (error) {
    console.error('Error creating test wallet:', error);
  }
}

main().catch(console.error);