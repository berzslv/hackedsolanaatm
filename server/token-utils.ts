import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

export interface MintAuthority {
  keypair: Keypair;
  mintPublicKey: PublicKey;
}

// Create a connection to the Solana devnet
export function getSolanaConnection(): Connection {
  console.log("Creating Solana connection to devnet");
  return new Connection(clusterApiUrl('devnet'), 'confirmed');
}

// Load the mint authority from token-keypair.json
export function getMintAuthority(): MintAuthority {
  const tokenKeypairPath = path.join(process.cwd(), 'token-keypair.json');
  
  if (!fs.existsSync(tokenKeypairPath)) {
    throw new Error(`Token keypair file not found: ${tokenKeypairPath}`);
  }
  
  console.log(`Loading authority from ${tokenKeypairPath}`);
  const tokenData = JSON.parse(fs.readFileSync(tokenKeypairPath, 'utf-8'));
  const authoritySecretKey = new Uint8Array(tokenData.authority.secretKey);
  
  const mintAuthority = {
    keypair: Keypair.fromSecretKey(authoritySecretKey),
    mintPublicKey: new PublicKey(tokenData.mint.publicKey)
  };
  
  console.log(`Mint authority public key: ${mintAuthority.keypair.publicKey.toString()}`);
  console.log(`Mint public key: ${mintAuthority.mintPublicKey.toString()}`);
  
  return mintAuthority;
}

// Request SOL airdrop for an address if its balance is below the threshold
export async function ensureSufficientSol(
  connection: Connection,
  address: PublicKey,
  threshold: number = 0.05
): Promise<boolean> {
  try {
    console.log(`Checking SOL balance for ${address.toString()}`);
    const balance = await connection.getBalance(address);
    const balanceInSol = balance / LAMPORTS_PER_SOL;
    
    console.log(`Current balance: ${balanceInSol} SOL`);
    
    if (balanceInSol < threshold) {
      console.log(`Balance below threshold (${threshold} SOL), requesting airdrop...`);
      const airdropAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
      
      const signature = await connection.requestAirdrop(address, airdropAmount);
      await connection.confirmTransaction(signature);
      
      const newBalance = await connection.getBalance(address);
      console.log(`New balance after airdrop: ${newBalance / LAMPORTS_PER_SOL} SOL`);
      return true;
    }
    
    console.log('SOL balance is sufficient');
    return true;
  } catch (error) {
    console.error('Error ensuring sufficient SOL:', error);
    return false;
  }
}

// Find or create associated token account
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  mintAuthority: MintAuthority,
  walletAddress: PublicKey
): Promise<PublicKey> {
  try {
    console.log(`Getting associated token account for wallet ${walletAddress.toString()}`);
    
    // Get the associated token account address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintAuthority.mintPublicKey,
      walletAddress
    );
    
    console.log(`Associated token address: ${associatedTokenAddress.toString()}`);
    
    try {
      // Check if the token account exists
      await getAccount(connection, associatedTokenAddress);
      console.log('Token account exists');
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log('Token account does not exist, creating...');
        
        // Create a transaction to create the token account
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            mintAuthority.keypair.publicKey, // payer
            associatedTokenAddress, // associated token account
            walletAddress, // owner
            mintAuthority.mintPublicKey // mint
          )
        );
        
        // Send the transaction
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [mintAuthority.keypair]
        );
        
        console.log(`Created token account, signature: ${signature}`);
      } else {
        throw error;
      }
    }
    
    return associatedTokenAddress;
  } catch (error) {
    console.error('Error in getOrCreateAssociatedTokenAccount:', error);
    throw error;
  }
}

// Mint tokens to a wallet
export async function mintTokens(
  connection: Connection,
  mintAuthority: MintAuthority,
  walletAddress: PublicKey,
  amount: number,
  decimals: number = 9
): Promise<string> {
  try {
    console.log(`Minting ${amount} tokens to ${walletAddress.toString()}`);
    
    // Ensure the mint authority has enough SOL
    await ensureSufficientSol(connection, mintAuthority.keypair.publicKey);
    
    // Get or create the associated token account
    const associatedTokenAddress = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      walletAddress
    );
    
    // Calculate the token amount with decimals
    const tokenAmount = BigInt(amount * Math.pow(10, decimals));
    console.log(`Token amount with decimals: ${tokenAmount}`);
    
    // Create a transaction to mint tokens
    const transaction = new Transaction().add(
      createMintToInstruction(
        mintAuthority.mintPublicKey, // mint
        associatedTokenAddress, // destination
        mintAuthority.keypair.publicKey, // authority
        tokenAmount // amount
      )
    );
    
    // Send the transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [mintAuthority.keypair]
    );
    
    console.log(`Minted tokens, signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
}