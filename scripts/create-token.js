import { 
  clusterApiUrl, 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo
} from '@solana/spl-token';
import fs from 'fs';

// Connect to the Devnet
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Generate a new keypair for the mint authority
const mintAuthority = Keypair.generate();
const payer = mintAuthority; // Same keypair for simplicity

async function createToken() {
  console.log('Creating HackATM token on Solana Devnet...');
  
  // Generate a keypair for the mint
  const mintKeypair = Keypair.generate();
  console.log('Mint public key:', mintKeypair.publicKey.toString());
  
  // Save keypair to a file for later use
  const keypairData = {
    mint: {
      publicKey: mintKeypair.publicKey.toString(),
      secretKey: Array.from(mintKeypair.secretKey)
    },
    authority: {
      publicKey: mintAuthority.publicKey.toString(),
      secretKey: Array.from(mintAuthority.secretKey)
    }
  };
  
  fs.writeFileSync('token-keypair.json', JSON.stringify(keypairData, null, 2));
  console.log('Keypair saved to token-keypair.json');
  
  // Request an airdrop for the payer account to pay for the transaction
  console.log('Requesting airdrop of 2 SOL for payer account...');
  const signature = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(signature);
  console.log('Airdrop confirmed');
  
  // Create a new token mint
  console.log('Creating token mint...');
  const mint = await createMint(
    connection,           // connection to use
    payer,                // fee payer
    mintAuthority.publicKey, // mint authority
    mintAuthority.publicKey, // freeze authority (can freeze token accounts)
    9                     // decimals (like 9 decimals for SOL)
  );
  
  console.log('Token mint created:', mint.toString());
  
  // Create an associated token account for the mint authority
  console.log('Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  
  console.log('Token account created:', tokenAccount.address.toString());
  
  // Mint 1,000,000,000 tokens to the token account
  console.log('Minting 1,000,000,000 tokens to your account...');
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    mintAuthority,
    1_000_000_000 * (10 ** 9) // 1 billion tokens with 9 decimals
  );
  
  console.log('Tokens minted successfully');
  console.log('\nHackATM token has been created on Solana Devnet:');
  console.log('----------------------------------------------');
  console.log('Token Mint Address:', mint.toString());
  console.log('Token Account Address:', tokenAccount.address.toString());
  console.log('Mint Authority:', mintAuthority.publicKey.toString());
  console.log('----------------------------------------------');
  console.log('Save these details for interacting with your token!');
}

createToken()
  .catch(err => {
    console.error('Error creating token:', err);
  });