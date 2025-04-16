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
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Create a connection to the Solana devnet
export function getConnection(): Connection {
  console.log("Creating connection to Solana devnet");
  return new Connection(clusterApiUrl('devnet'), 'confirmed');
}

// Load the mint authority from token-keypair.json
export function getMintAuthority(): { keypair: Keypair, mintPublicKey: PublicKey } {
  try {
    // First try to load the original format from backup
    const tokenKeypairOrigPath = path.join(process.cwd(), 'token-keypair-original.json');
    
    if (fs.existsSync(tokenKeypairOrigPath)) {
      console.log(`Loading authority from ${tokenKeypairOrigPath}`);
      const tokenData = JSON.parse(fs.readFileSync(tokenKeypairOrigPath, 'utf-8'));
      const authoritySecretKey = new Uint8Array(tokenData.authority.secretKey);
      
      const mintAuthority = {
        keypair: Keypair.fromSecretKey(authoritySecretKey),
        mintPublicKey: new PublicKey(tokenData.mint.publicKey)
      };
      
      console.log(`Mint authority public key: ${mintAuthority.keypair.publicKey.toString()}`);
      console.log(`Mint public key: ${mintAuthority.mintPublicKey.toString()}`);
      
      return mintAuthority;
    }
    
    // Fall back to the Anchor format keypair
    const tokenKeypairPath = path.join(process.cwd(), 'token-keypair.json');
    
    if (!fs.existsSync(tokenKeypairPath)) {
      throw new Error(`Token keypair file not found: ${tokenKeypairPath}`);
    }
    
    console.log(`Loading authority from Anchor format keypair: ${tokenKeypairPath}`);
    const secretKeyArray = JSON.parse(fs.readFileSync(tokenKeypairPath, 'utf-8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    
    // In this case, we use a fixed mint address since it's not in the keypair file
    const mintPublicKey = new PublicKey("59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk");
    
    const mintAuthority = {
      keypair: keypair,
      mintPublicKey: mintPublicKey
    };
    
    console.log(`Mint authority public key (Anchor format): ${mintAuthority.keypair.publicKey.toString()}`);
    console.log(`Mint public key (hardcoded): ${mintAuthority.mintPublicKey.toString()}`);
    
    return mintAuthority;
  } catch (error) {
    console.error("Error loading mint authority:", error);
    throw error;
  }
}

// Ensure the payer has enough SOL
export async function ensureSufficientSol(
  connection: Connection,
  address: PublicKey
): Promise<boolean> {
  try {
    const balance = await connection.getBalance(address);
    const balanceInSol = balance / LAMPORTS_PER_SOL;
    console.log(`SOL balance for ${address.toString()}: ${balanceInSol}`);
    
    if (balanceInSol < 0.05) { // Minimum threshold
      console.log(`Balance below threshold, requesting airdrop...`);
      const signature = await connection.requestAirdrop(address, 0.1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature);
      return true;
    }
    
    return true;
  } catch (error) {
    console.error("Error ensuring SOL balance:", error);
    return false;
  }
}

// Get or create the associated token account for the wallet
export async function getOrCreateTokenAccount(
  connection: Connection,
  mintAuthority: Keypair,
  mintPublicKey: PublicKey,
  ownerAddress: PublicKey
): Promise<PublicKey> {
  try {
    // Get the associated token account address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      ownerAddress,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    console.log(`Token account address: ${associatedTokenAddress.toString()}`);
    
    // Check if the token account already exists
    try {
      await getAccount(connection, associatedTokenAddress);
      console.log("Token account exists");
      return associatedTokenAddress;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Token account doesn't exist, creating it...");
        
        // Create the associated token account
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            mintAuthority.publicKey, // payer
            associatedTokenAddress, // associated token account
            ownerAddress, // owner
            mintPublicKey, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
        
        await sendAndConfirmTransaction(
          connection,
          transaction,
          [mintAuthority]
        );
        
        console.log("Token account created successfully");
        return associatedTokenAddress;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in getOrCreateTokenAccount:", error);
    throw error;
  }
}

// Mint tokens to a wallet using SPL token program
export async function mintTokens(
  connection: Connection,
  mintAuthority: Keypair,
  walletPubkey: PublicKey,
  amount: number = 1000
): Promise<string> {
  try {
    // Get mint public key from authority
    const { mintPublicKey } = getMintAuthority();
    
    console.log(`Authority address: ${mintAuthority.publicKey.toString()}`);
    console.log(`Mint address: ${mintPublicKey.toString()}`);
    console.log(`Target wallet: ${walletPubkey.toString()}`);
    console.log(`Amount to mint: ${amount} tokens`);
    
    // Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = amount * Math.pow(10, decimals);
    console.log(`Adjusted amount with decimals: ${adjustedAmount}`);
    
    // Ensure the authority has enough SOL
    await ensureSufficientSol(connection, mintAuthority.publicKey);
    
    // Get or create the associated token account
    const destinationAddress = await getOrCreateTokenAccount(
      connection,
      mintAuthority,
      mintPublicKey,
      walletPubkey
    );
    
    // Create a mint instruction
    const transaction = new Transaction().add(
      createMintToInstruction(
        mintPublicKey, // mint
        destinationAddress, // destination token account
        mintAuthority.publicKey, // mint authority
        BigInt(adjustedAmount), // amount with decimals as bigint
        [mintAuthority.publicKey], // multiSigners (array of publickeys)
        TOKEN_PROGRAM_ID
      )
    );
    
    console.log("Sending transaction to mint tokens...");
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

// Legacy mintTokens function for backward compatibility
export async function mintTokensSimple(walletAddress: string, amount: number = 1000): Promise<string> {
  try {
    // Get connection and mint authority
    const connection = getConnection();
    const { keypair: mintAuthority } = getMintAuthority();
    const walletPubkey = new PublicKey(walletAddress);
    
    // Call the updated mintTokens function
    return await mintTokens(connection, mintAuthority, walletPubkey, amount);
  } catch (error) {
    console.error("Error in mintTokensSimple:", error);
    throw error;
  }
}

// Create a transaction to mint tokens that can be sent to the client
export async function createMintTokensTransaction(
  walletAddress: string,
  amount: number
): Promise<string> {
  try {
    // Get connection and mint authority
    const connection = getConnection();
    const { keypair: mintAuthority, mintPublicKey } = getMintAuthority();
    const ownerAddress = new PublicKey(walletAddress);
    
    console.log(`Creating mint transaction for ${walletAddress}, amount: ${amount}`);
    
    // Calculate token amount with decimals
    const decimals = 9;
    const adjustedAmount = amount * Math.pow(10, decimals);
    
    // Get the associated token account address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      ownerAddress,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Create a transaction
    const transaction = new Transaction();
    
    // Check if the token account exists
    try {
      await getAccount(connection, associatedTokenAddress);
      console.log("Token account exists, adding only mint instruction");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Token account doesn't exist, adding creation instruction");
        // Add instruction to create the associated token account
        transaction.add(
          createAssociatedTokenAccountInstruction(
            mintAuthority.publicKey, // payer
            associatedTokenAddress, // associated token account
            ownerAddress, // owner
            mintPublicKey, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      } else {
        throw error;
      }
    }
    
    // Add the mint instruction
    transaction.add(
      createMintToInstruction(
        mintPublicKey, // mint
        associatedTokenAddress, // destination token account
        mintAuthority.publicKey, // mint authority
        BigInt(adjustedAmount), // amount with decimals as bigint
        [], // multiSigners (empty because we sign elsewhere)
        TOKEN_PROGRAM_ID
      )
    );
    
    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = mintAuthority.publicKey;
    
    // Sign the transaction with the mint authority
    transaction.sign(mintAuthority);
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    // Return base64 encoded transaction
    return Buffer.from(serializedTransaction).toString('base64');
  } catch (error) {
    console.error("Error creating mint transaction:", error);
    throw error;
  }
}

// Get token mint address 
export function getTokenMint(): PublicKey {
  const { mintPublicKey } = getMintAuthority();
  return mintPublicKey;
}

// Get token balance for a wallet
export async function getTokenBalance(walletAddress: string): Promise<number> {
  try {
    const connection = getConnection();
    const { mintPublicKey } = getMintAuthority();
    const ownerAddress = new PublicKey(walletAddress);
    
    // Get the associated token account address
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      ownerAddress,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    try {
      // Get the token account info
      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      const balance = Number(tokenAccount.amount);
      const decimals = 9;
      
      // Convert from raw amount to token amount
      const tokenBalance = balance / Math.pow(10, decimals);
      console.log(`Token balance for ${walletAddress}: ${tokenBalance}`);
      
      return tokenBalance;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log(`No token account found for ${walletAddress}`);
        return 0;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error getting token balance:", error);
    return 0;
  }
}