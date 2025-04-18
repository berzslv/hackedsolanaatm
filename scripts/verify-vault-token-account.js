/**
 * Verify and Create Vault Token Account
 * 
 * This script checks if the staking vault token account is valid and exists
 * If not, it will create a new one
 */
import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants from the deployed program
const PROGRAM_ID = new PublicKey('EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm');
const VAULT_ADDRESS = new PublicKey('EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu');
const VAULT_TOKEN_ACCOUNT = new PublicKey('3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL');
const TOKEN_MINT_ADDRESS = new PublicKey('59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk');

async function main() {
  try {
    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    console.log('Checking if staking vault token account exists and is valid...');
    
    // First, check if the vault account exists
    console.log(`Checking vault account: ${VAULT_ADDRESS.toString()}`);
    const vaultAccountInfo = await connection.getAccountInfo(VAULT_ADDRESS);
    
    if (!vaultAccountInfo) {
      console.error('Staking vault PDA does not exist on chain.');
      console.log('Vault needs to be created first by deploying the staking program.');
      return;
    } else {
      console.log('✅ Staking vault PDA exists');
    }
    
    // Next, check if the token account exists
    console.log(`Checking vault token account: ${VAULT_TOKEN_ACCOUNT.toString()}`);
    let vaultTokenAccountInfo;
    
    try {
      vaultTokenAccountInfo = await connection.getAccountInfo(VAULT_TOKEN_ACCOUNT);
      
      if (!vaultTokenAccountInfo) {
        console.error('Vault token account does not exist on chain');
        // Will create a new one below
      } else {
        console.log('✅ Vault token account exists on chain');
        
        // Check if it's a valid token account
        console.log('Checking if it is a valid token account...');
        const tokenAccountInfo = await connection.getParsedAccountInfo(VAULT_TOKEN_ACCOUNT);
        
        if (tokenAccountInfo.value) {
          const parsedInfo = tokenAccountInfo.value.data.parsed?.info;
          
          if (parsedInfo && parsedInfo.mint) {
            console.log(`Token account mint: ${parsedInfo.mint}`);
            console.log(`Expected mint: ${TOKEN_MINT_ADDRESS.toString()}`);
            
            if (parsedInfo.mint === TOKEN_MINT_ADDRESS.toString()) {
              console.log('✅ Vault token account is valid and has the correct mint');
              console.log(`Owner: ${parsedInfo.owner}`);
              console.log(`Current token balance: ${parsedInfo.tokenAmount.uiAmount}`);
              
              // Everything is good
              return;
            } else {
              console.error('❌ Vault token account has the wrong mint');
            }
          } else {
            console.error('❌ Could not parse token account data properly');
          }
        } else {
          console.error('❌ Could not get parsed account info');
        }
      }
    } catch (error) {
      console.error('Error checking vault token account:', error.message);
      // Will try to create a new one below
    }
    
    // If we get here, we need to create a new token account for the vault
    console.log('\nCreating a new token account for the vault...');
    
    // First, load the vault authority keypair (should be the program deployer)
    console.log('Loading authority keypair...');
    let authorityKeypair;
    
    try {
      const keypairPath = path.resolve(process.cwd(), 'token-keypair-original.json');
      const keypairData = fs.readFileSync(keypairPath, 'utf-8');
      const keypairJson = JSON.parse(keypairData);
      authorityKeypair = Keypair.fromSecretKey(new Uint8Array(keypairJson));
      
      console.log(`Loaded keypair with public key: ${authorityKeypair.publicKey.toString()}`);
    } catch (error) {
      console.error('Could not load authority keypair:', error.message);
      console.log('Please make sure the token-keypair-original.json file exists and has the correct format');
      return;
    }
    
    // Now create a new token account for the vault
    try {
      // Create a token instance
      const token = new Token(
        connection,
        TOKEN_MINT_ADDRESS,
        TOKEN_PROGRAM_ID,
        authorityKeypair
      );
      
      // Calculate the PDA for the token account
      console.log('Finding PDA for vault token account...');
      const [vaultTokenAccountPDA, vaultTokenAccountBump] = await PublicKey.findProgramAddress(
        [VAULT_ADDRESS.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), TOKEN_MINT_ADDRESS.toBuffer()],
        TOKEN_PROGRAM_ID
      );
      
      console.log(`Calculated vault token account PDA: ${vaultTokenAccountPDA.toString()}`);
      console.log(`Bump: ${vaultTokenAccountBump}`);
      
      // Create the token account
      console.log('Creating token account...');
      const newTokenAccount = await token.createAssociatedTokenAccount(VAULT_ADDRESS);
      
      console.log(`New vault token account created: ${newTokenAccount.toString()}`);
      console.log('\nUpdate the following constant in your code:');
      console.log(`VAULT_TOKEN_ACCOUNT = new PublicKey('${newTokenAccount.toString()}');`);
    } catch (error) {
      console.error('Error creating new vault token account:', error.message);
      console.log('You may need to create the token account manually through another method');
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main()
  .then(() => console.log('Done'))
  .catch(err => console.error(err));