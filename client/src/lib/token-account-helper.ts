/**
 * Token Account Helper
 * 
 * Utilities to handle token account validation, lookup and creation
 * for Solana token operations.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

/**
 * Find a token account with sufficient balance for a specific mint
 * 
 * @param connection Solana connection
 * @param owner The wallet public key
 * @param mint The token mint address
 * @param requiredAmount The minimum amount needed (will be compared against UI amount)
 * @returns The found token account's public key or null if none with sufficient balance
 */
export async function findTokenAccountWithBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  requiredAmount: number
): Promise<PublicKey | null> {
  // Get all token accounts for this owner and mint
  console.log(`Finding token accounts for ${owner.toString()} and mint ${mint.toString()}`);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint }
  );
  
  console.log(`Found ${tokenAccounts.value.length} token accounts for mint`);
  
  // Find an account with sufficient balance
  for (const account of tokenAccounts.value) {
    const parsedInfo = account.account.data.parsed.info;
    const balance = parsedInfo.tokenAmount.uiAmount;
    console.log(`Token account ${account.pubkey.toString()} has balance: ${balance}`);
    
    if (balance >= requiredAmount) {
      console.log(`Using token account ${account.pubkey.toString()} with sufficient balance (${balance})`);
      return account.pubkey;
    }
  }
  
  console.log("No token account with sufficient balance found");
  return null;
}

/**
 * Verify the token account exists and create it if needed
 * 
 * @param connection Solana connection
 * @param payer The fee payer (usually wallet)
 * @param owner The token account owner
 * @param mint The token mint
 * @param sendTransaction Function to send a transaction
 * @returns The token account address
 */
export async function getOrCreateTokenAccount(
  connection: Connection,
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  sendTransaction: (transaction: Transaction) => Promise<string>
): Promise<PublicKey> {
  try {
    // Get the associated token address
    const tokenAddress = await getAssociatedTokenAddress(
      mint,
      owner,
      false // We don't want to look off-curve for user accounts
    );
    
    console.log(`Associated token address: ${tokenAddress.toString()}`);
    
    // Check if the account already exists
    const accountInfo = await connection.getAccountInfo(tokenAddress);
    
    if (accountInfo) {
      console.log("Token account already exists");
      return tokenAddress;
    }
    
    console.log("Token account does not exist - creating it now");
    
    // Create the token account instruction
    const createTokenAccountIx = createAssociatedTokenAccountInstruction(
      payer, // payer
      tokenAddress, // associated token account address
      owner, // owner
      mint, // mint
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Create transaction
    const transaction = new Transaction().add(createTokenAccountIx);
    transaction.feePayer = payer;
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    
    // Send transaction using the provided function
    const signature = await sendTransaction(transaction);
    
    console.log(`Created token account with signature: ${signature}`);
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    if (confirmation.value.err) {
      throw new Error(`Token account creation failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    return tokenAddress;
  } catch (error) {
    console.error("Error creating token account:", error);
    throw error;
  }
}

/**
 * Verify the vault token account exists
 * 
 * @param connection Solana connection
 * @param vaultAuthority The vault authority PDA
 * @param mint The token mint
 * @returns True if the vault token account exists
 */
export async function verifyVaultTokenAccount(
  connection: Connection,
  vaultAuthority: PublicKey,
  mint: PublicKey
): Promise<boolean> {
  try {
    // Get the vault token address (allow off-curve since it's a PDA)
    const vaultTokenAddress = await getAssociatedTokenAddress(
      mint,
      vaultAuthority,
      true // Allow off-curve for PDAs
    );
    
    console.log(`Vault token address: ${vaultTokenAddress.toString()}`);
    
    // Check if the account exists
    const accountInfo = await connection.getAccountInfo(vaultTokenAddress);
    
    if (!accountInfo) {
      console.error("Vault token account does not exist");
      return false;
    }
    
    console.log("Vault token account exists and is valid");
    return true;
  } catch (error) {
    console.error("Error verifying vault token account:", error);
    return false;
  }
}