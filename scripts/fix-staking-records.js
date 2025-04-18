/**
 * Fix Staking Records
 * This script helps fix staking records by using the IDL to properly interact with the staking program
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  clusterApiUrl
} from '@solana/web3.js';

import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount
} from '@solana/spl-token';

import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
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
const STAKING_VAULT_ADDRESS = 'EvhJjv9Azx1Ja5BHAE7zBuxv1fdSQZciLYGWAxUUJ2Qu';
const VAULT_TOKEN_ACCOUNT = '3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL';
const WALLET_ADDRESS = '9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX';

// Load IDL
const loadIDL = () => {
  try {
    const idlFile = fs.readFileSync('./idl/staking_vault.json', 'utf-8');
    return JSON.parse(idlFile);
  } catch (error) {
    console.error('Error loading IDL file:', error);
    console.log('Trying to use attached_assets/idl.json fallback...');
    
    try {
      const fallbackIdl = fs.readFileSync('./attached_assets/idl.json', 'utf-8');
      return JSON.parse(fallbackIdl);
    } catch (fallbackError) {
      console.error('Error loading fallback IDL:', fallbackError);
      throw new Error('Could not load IDL file. Please ensure your IDL is available.');
    }
  }
};

// Function to prompt for user input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to find the user's staking account PDA
async function findStakingAccountPDA(program, walletAddress) {
  const [stakingAccountPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from('user_staking'),
      new PublicKey(walletAddress).toBuffer(),
      new PublicKey(TOKEN_MINT).toBuffer()
    ],
    program.programId
  );
  
  return stakingAccountPDA;
}

// Main function
async function main() {
  try {
    console.log('===== FIX STAKING RECORDS =====');
    console.log('This script will help fix your staking records by properly registering with the program');
    
    // Connect to Solana
    console.log('\nConnecting to Solana...');
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Check vault token balance
    console.log('\nChecking vault token balance...');
    try {
      const vaultTokenAccountInfo = await connection.getParsedAccountInfo(
        new PublicKey(VAULT_TOKEN_ACCOUNT)
      );
      
      const vaultBalance = vaultTokenAccountInfo.value?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
      console.log(`Vault token balance: ${vaultBalance} tokens`);
      
      if (vaultBalance < 310) {
        console.warn('Warning: Vault balance is less than expected 310 tokens.');
      }
    } catch (error) {
      console.error('Error checking vault balance:', error);
    }
    
    // Initialize Anchor and load the IDL
    console.log('\nInitializing Anchor and loading program IDL...');
    
    // Load IDL
    let idl;
    try {
      idl = loadIDL();
      console.log('Successfully loaded program IDL');
    } catch (error) {
      console.error('Failed to load IDL:', error);
      rl.close();
      return;
    }
    
    // Set up Anchor provider
    const provider = new anchor.AnchorProvider(
      connection,
      // We need to provide a wallet - for now we'll create a dummy one since we're just exploring
      {
        publicKey: new PublicKey(WALLET_ADDRESS),
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
      },
      { commitment: 'confirmed' }
    );
    
    // Create program instance
    const program = new Program(idl, new PublicKey(STAKING_PROGRAM_ID), provider);
    
    // Find the user's staking account PDA
    console.log('\nFinding your staking account PDA...');
    const stakingAccountPDA = await findStakingAccountPDA(program, WALLET_ADDRESS);
    console.log(`Your staking account PDA: ${stakingAccountPDA.toString()}`);
    
    // Check if the staking account exists
    const stakingAccountInfo = await connection.getAccountInfo(stakingAccountPDA);
    
    if (stakingAccountInfo) {
      console.log('Your staking account exists! Fetching current data...');
      
      try {
        // Try to fetch account data using Anchor
        const accountData = await program.account.userStaking.fetch(stakingAccountPDA);
        console.log('Your staking account data:', accountData);
        
        console.log('\nYour staking record exists but might need updating to match the actual tokens in the vault.');
      } catch (error) {
        console.error('Error fetching staking account data:', error);
        console.log('Cannot parse staking account - the account might be using a different structure.');
      }
    } else {
      console.log('Your staking account does not exist yet. We need to create it.');
    }
    
    // Explore program instructions
    console.log('\nExploring available program instructions...');
    const instructions = idl.instructions || [];
    
    console.log(`Found ${instructions.length} instructions in the IDL:`);
    instructions.forEach((ix, i) => {
      console.log(`${i + 1}. ${ix.name}`);
    });
    
    // Find stake and initialize instructions
    const initializeIx = instructions.find(ix => ix.name.toLowerCase().includes('initialize'));
    const stakeIx = instructions.find(ix => ix.name.toLowerCase() === 'stake');
    const syncStakeIx = instructions.find(ix => 
      ix.name.toLowerCase().includes('sync') && 
      ix.name.toLowerCase().includes('stake')
    );
    
    console.log('\nKey instructions identified:');
    console.log(`- Initialize: ${initializeIx ? 'Found' : 'Not found'}`);
    console.log(`- Stake: ${stakeIx ? 'Found' : 'Not found'}`);
    console.log(`- Sync Stake: ${syncStakeIx ? 'Found' : 'Not found'}`);
    
    // Ask what action to take
    console.log('\nBased on the available instructions and your current state, we have these options:');
    console.log('1. Create a transaction to properly record your 310 tokens as staked');
    console.log('2. Unstake your tokens and stake them again through the proper program instruction');
    console.log('3. Just show the instructions needed to fix this (for reference)');
    
    const option = await askQuestion('\nWhich option would you like to proceed with? (1/2/3): ');
    
    if (option === '1') {
      console.log('\nTo create a transaction that records your tokens as staked, we need:');
      console.log('1. Your wallet keypair to sign transactions');
      console.log('2. The correct instruction format for syncing/registering your stake');
      
      console.log('\nThis would require implementing the following:');
      
      if (syncStakeIx) {
        console.log('- Using the "syncStake" instruction in your program');
        console.log('- Accounts needed:', syncStakeIx.accounts.map(acc => acc.name).join(', '));
        console.log('- Arguments needed:', syncStakeIx.args.map(arg => `${arg.name}: ${arg.type}`).join(', '));
      } else if (stakeIx) {
        console.log('- Using the "stake" instruction with the current vault balance');
        console.log('- Accounts needed:', stakeIx.accounts.map(acc => acc.name).join(', '));
        console.log('- Arguments needed:', stakeIx.args.map(arg => `${arg.name}: ${arg.type}`).join(', '));
      } else {
        console.log('No suitable instruction found in the IDL for recording existing stakes.');
      }
      
      console.log('\nThe best way to implement this would be to:');
      console.log('1. Create an endpoint in your backend that calls this instruction');
      console.log('2. Add a button in your UI called "Sync Staking Records" that calls this endpoint');
      console.log('3. Have users click this button to fix their staking records');
    } else if (option === '2') {
      console.log('\nTo unstake and restake your tokens through the proper program:');
      console.log('1. We would first need to implement the "unstake" instruction');
      console.log('2. Then implement the "stake" instruction');
      console.log('3. Perform both operations in sequence');
      
      console.log('\nHowever, this would incur network fees and might reset your staking timestamp.');
      console.log('This could affect lock periods and rewards calculations.');
    } else if (option === '3') {
      console.log('\nHere are the instructions needed to fix this issue:');
      
      console.log('\n1. Create a new API endpoint in server/routes.ts:');
      console.log(`
  app.post("/api/sync-staking", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: "Wallet address is required" });
      }
      
      // Get vault token account balance to determine actual staked amount
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const vaultTokenAccount = new PublicKey('${VAULT_TOKEN_ACCOUNT}');
      
      const accountInfo = await connection.getParsedAccountInfo(vaultTokenAccount);
      const tokenAmount = accountInfo.value?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
      
      // Load the program IDL
      const idl = JSON.parse(fs.readFileSync('./idl/staking_vault.json', 'utf8'));
      
      // Initialize Anchor provider for signing transactions
      const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(
        fs.readFileSync('./token-keypair.json', 'utf8')
      )));
      
      const wallet = {
        publicKey: keypair.publicKey,
        signTransaction: (tx) => Promise.resolve(tx.partialSign(keypair)),
        signAllTransactions: (txs) => Promise.resolve(txs.map(tx => tx.partialSign(keypair))),
      };
      
      const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
      });
      
      // Initialize the program
      const program = new Program(idl, new PublicKey('${STAKING_PROGRAM_ID}'), provider);
      
      // Find the user's staking account PDA
      const [stakingAccountPDA] = await PublicKey.findProgramAddress(
        [
          Buffer.from('user_staking'),
          new PublicKey(walletAddress).toBuffer(),
          new PublicKey('${TOKEN_MINT}').toBuffer()
        ],
        program.programId
      );
      
      // Check if the staking account exists
      const accountExists = await connection.getAccountInfo(stakingAccountPDA);
      
      let tx;
      
      if (!accountExists) {
        // Create and initialize staking account
        tx = await program.methods
          .initialize()
          .accounts({
            userStaking: stakingAccountPDA,
            user: new PublicKey(walletAddress),
            tokenMint: new PublicKey('${TOKEN_MINT}'),
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }
      
      // Create sync stake transaction - adjust based on your actual program structure
      tx = await program.methods
        .syncStake(new anchor.BN(tokenAmount * 1e9)) // Adjust for decimals
        .accounts({
          userStaking: stakingAccountPDA,
          user: new PublicKey(walletAddress),
          tokenMint: new PublicKey('${TOKEN_MINT}'),
          stakingVault: new PublicKey('${STAKING_VAULT_ADDRESS}'),
          vaultTokenAccount: new PublicKey('${VAULT_TOKEN_ACCOUNT}'),
        })
        .rpc();
      
      return res.json({
        success: true,
        message: "Staking records synchronized successfully",
        transaction: tx
      });
    } catch (error) {
      console.error("Error syncing staking records:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to sync staking records"
      });
    }
  });
`);

      console.log('\n2. Add a button to your UI in DirectStakingWidget.tsx:');
      console.log(`
  // Add this function to your component
  const handleSyncStaking = async () => {
    if (!connected || !publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to sync staking records',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSyncing(true);
    
    try {
      toast({
        title: 'Syncing staking records',
        description: 'Please wait while we sync your staking records...',
      });
      
      const response = await fetch('/api/sync-staking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync staking records');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Staking records synced',
          description: 'Your staking records have been successfully synchronized',
          variant: 'default'
        });
        
        // Refresh data
        refreshAllData();
        refreshBalance();
      }
    } catch (error) {
      console.error('Error syncing staking records:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sync staking records',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Add this to your JSX near the other buttons
  <Button
    onClick={handleSyncStaking}
    disabled={!connected || isSyncing}
    variant="outline"
    className="w-full mb-2"
  >
    {isSyncing ? (
      <>
        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
        Syncing...
      </>
    ) : (
      <>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Sync Staking Records
      </>
    )}
  </Button>
`);
    }
    
    console.log('\nAdditional notes:');
    console.log('1. The exact implementation depends on your specific program\'s instruction format');
    console.log('2. You may need to adjust account seeds and arguments based on your program\'s design');
    console.log('3. Testing on a devnet wallet with small amounts is recommended before fixing production stakes');
    
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Run the main function
main();