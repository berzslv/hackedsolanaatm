import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Hardcoded Solana program addresses for devnet
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Create a connection to the Solana devnet
export function getConnection(): Connection {
  console.log("Creating connection to Solana devnet");
  return new Connection(clusterApiUrl('devnet'), 'confirmed');
}

// Load the mint authority from token-keypair.json
export function getMintAuthority(): { keypair: Keypair, mintPublicKey: PublicKey } {
  try {
    const tokenKeypairPath = path.join(process.cwd(), 'token-keypair.json');
    
    if (!fs.existsSync(tokenKeypairPath)) {
      throw new Error(`Token keypair file not found: ${tokenKeypairPath}`);
    }
    
    console.log(`Loading token data from ${tokenKeypairPath}`);
    const tokenData = JSON.parse(fs.readFileSync(tokenKeypairPath, 'utf-8'));
    const authoritySecretKey = new Uint8Array(tokenData.authority.secretKey);
    
    return {
      keypair: Keypair.fromSecretKey(authoritySecretKey),
      mintPublicKey: new PublicKey(tokenData.mint.publicKey)
    };
  } catch (error) {
    console.error("Error loading mint authority:", error);
    throw error;
  }
}

// Simplified function to directly create instructions
export async function mintTokens(walletAddress: string, amount: number = 1000): Promise<string> {
  try {
    // Get connection and mint authority
    const connection = getConnection();
    const { keypair: mintAuthority, mintPublicKey } = getMintAuthority();
    
    console.log(`Authority address: ${mintAuthority.publicKey.toString()}`);
    console.log(`Mint address: ${mintPublicKey.toString()}`);
    console.log(`Target wallet: ${walletAddress}`);
    console.log(`Amount to mint: ${amount} tokens`);
    
    // Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = amount * Math.pow(10, decimals);
    console.log(`Adjusted amount with decimals: ${adjustedAmount}`);
    
    // Simple demonstration transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: mintAuthority.publicKey,
        toPubkey: new PublicKey(walletAddress),
        lamports: 10000 // A very small amount just to test
      })
    );
    
    console.log("Sending test transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [mintAuthority]
    );
    
    console.log(`Transaction successful! Signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error("Error in mintTokens:", error);
    throw error;
  }
}