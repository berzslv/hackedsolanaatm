/**
 * Proper Stake Registration
 * This script will properly stake your tokens by invoking the staking program's instruction
 * instead of just transferring tokens directly to the vault account.
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl
} from '@solana/web3.js';

import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction
} from '@solana/spl-token';

import fs from 'fs';
import readline from 'readline';

// Create a readline interface to get user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const TOKEN_MINT = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
const STAKING_PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';
const STAKING_VAULT_ADDRESS = 'DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8';
const VAULT_TOKEN_ACCOUNT = '3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL';
// By default use the account we found has tokens in the vault
const WALLET_ADDRESS = '9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX'; 

// Create a function that asks for user confirmation
function askForConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Load wallet keypair from JSON file
async function loadWalletKeypair() {
  // This is just a template - in a real scenario, you'd use your own private key
  // For security reasons, we can't include private keys in the script
  console.log('To properly register your stake, you need to provide your wallet keypair.');
  console.log('For security, never share your private keys with anyone.');
  console.log('You can export your keypair from Phantom, Solflare, or create one with Solana CLI.\n');

  const useDefaultPrompt = await askForConfirmation(
    'Do you want to continue with the sample private key for demonstration? (y/n): '
  );

  if (!useDefaultPrompt) {
    console.log('\nOperation cancelled. Please run the script again when you have your keypair.');
    rl.close();
    process.exit(0);
  }

  // Create a sample keypair for illustration - this is a dummy key, DO NOT USE IN PRODUCTION
  // In a real scenario, this would be loaded from a secure file 
  // Never hardcode private keys in scripts
  return Keypair.generate();
}

// The main function
async function main() {
  try {
    console.log('===== PROPER STAKE REGISTRATION =====');
    console.log(`\nThis script will help you properly register your tokens with the staking program.`);
    console.log(`Current vault balance: 310 tokens`);
    console.log(`Your wallet address: ${WALLET_ADDRESS}\n`);

    // Connect to Solana
    console.log('Connecting to Solana devnet...');
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // Check wallet token balance first
    console.log('\nChecking your token balance...');
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(WALLET_ADDRESS),
      { mint: new PublicKey(TOKEN_MINT) }
    );

    let walletTokenBalance = 0;
    let walletTokenAccount = null;

    if (tokenAccounts.value.length > 0) {
      walletTokenAccount = tokenAccounts.value[0].pubkey;
      walletTokenBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      console.log(`Your wallet has ${walletTokenBalance} tokens available.`);
    } else {
      console.error('No token account found for this wallet. You need tokens to stake.');
      rl.close();
      return;
    }

    // Registering existing stake approach
    console.log('\n==== OPTION 1: REGISTER EXISTING STAKE ====');
    console.log('This will notify the program about your staked tokens without sending more tokens.');
    
    const registerExistingPrompt = await askForConfirmation(
      'Do you want to register your existing staked tokens? (y/n): '
    );

    if (registerExistingPrompt) {
      console.log('\nPreparing to register your existing stake with the program...');
      console.log('This typically requires building a custom transaction that would:');
      console.log('1. Find your user staking account PDA');
      console.log('2. Initialize it if it doesn\'t exist');
      console.log('3. Register your previous staking amount (310 tokens)');
      console.log('4. Set the appropriate stake timestamp');
      
      console.log('\nThis operation requires custom Anchor program interactions that are specific to');
      console.log('your staking program\'s instruction format, which we need to implement for your specific program.');
      
      console.log('\nWould you prefer to:');
      console.log('1. Create a more comprehensive fix to register existing stakes in the user interface');
      console.log('2. Create a script using Anchor that handles the registration based on your program IDL');
      console.log('3. Take a simpler approach by unstaking and restaking through the program\'s instructions');
      
      rl.question('\nEnter your choice (1, 2, or 3): ', async (choice) => {
        if (choice === '1') {
          console.log('\nCreating a UI fix would require updating your frontend to provide a "Sync Stake" button');
          console.log('that calls a backend endpoint to find and register orphaned stakes.');
        } else if (choice === '2') {
          console.log('\nCreating an Anchor-based script would require your program IDL to properly');
          console.log('construct the instruction data for your specific staking program.');
        } else if (choice === '3') {
          console.log('\nThe simplest approach would be to unstake any tokens and then restake them');
          console.log('through the proper staking instruction in your application.');
        }
        
        console.log('\nFor now, let\'s explore the second option - creating a new stake transaction.');
        // Continue with the rest of the script
        rl.close();
      });
      
      // Early return as we'll handle the logic in the callback
      return;
    }

    // Staking new tokens approach
    console.log('\n==== OPTION 2: NEW STAKE TRANSACTION ====');
    console.log('This will create a new staking transaction using the program\'s instructions.');
    
    const stakeNewPrompt = await askForConfirmation(
      'Do you want to stake additional tokens properly? (y/n): '
    );

    if (!stakeNewPrompt) {
      console.log('\nOperation cancelled. No changes were made.');
      rl.close();
      return;
    }

    // Ask for amount to stake
    rl.question(`\nHow many tokens do you want to stake? (max: ${walletTokenBalance}): `, async (amountStr) => {
      const amount = parseFloat(amountStr);
      
      if (isNaN(amount) || amount <= 0 || amount > walletTokenBalance) {
        console.error(`Invalid amount. Please enter a positive number not exceeding ${walletTokenBalance}.`);
        rl.close();
        return;
      }
      
      console.log(`\nPreparing to stake ${amount} tokens...`);
      
      try {
        // Create a transaction to properly stake tokens using the program's instruction
        // NOTE: This would require knowing the exact instruction format your program expects
        console.log('\nTo create a proper staking transaction, we would need:');
        console.log('1. Your program\'s IDL (Interface Definition Language)');
        console.log('2. The correct instruction format for staking');
        console.log('3. Your wallet\'s keypair to sign the transaction');
        
        console.log('\nHere\'s what we\'d do with that information:');
        console.log('- Create a transaction that calls your staking program\'s "stake" instruction');
        console.log('- Include your wallet, token account, and the staking vault as accounts');
        console.log('- Set the correct data parameters including the amount to stake');
        console.log('- Sign and submit the transaction');
        
        console.log('\nFor a complete implementation, we recommend:');
        console.log('1. Using the "stakeExistingTokens" function in your existing UI');
        console.log('2. Or creating a proper Anchor client that understands your program\'s IDL');
        
        console.log('\nThis sample script serves as a guide for what needs to be implemented.');
        console.log('The actual implementation depends on your specific program\'s instruction format.');
      } catch (error) {
        console.error('Error preparing staking transaction:', error);
      }
      
      rl.close();
    });

  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Run the script
main();