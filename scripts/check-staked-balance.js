/**
 * Check Staked Balance
 * This script will check the actual staked balance for a wallet by directly querying the staking vault
 */

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import fs from 'fs';

// Configuration
const WALLET_ADDRESS = '9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX'; // Your wallet address
const TOKEN_MINT = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
const STAKING_PROGRAM_ID = 'EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm';
const STAKING_VAULT_ADDRESS = 'DAu6i8n3EkagBNT9B9sFsRL49Swm3H3Nr8A2scNygHS8';
const DECIMALS = 9; // Solana tokens usually have 9 decimals

async function main() {
  try {
    console.log('Connecting to Solana...');
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    console.log(`Checking staked balance for wallet: ${WALLET_ADDRESS}`);
    
    // Step 1: Get the vault token account address (where staked tokens are stored)
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(STAKING_VAULT_ADDRESS),
      { mint: new PublicKey(TOKEN_MINT) }
    );
    
    console.log(`Found ${tokenAccounts.value.length} token accounts owned by the staking vault`);
    
    // Step 2: Look at total balance in the vault
    let totalStaked = 0;
    
    for (const tokenAccount of tokenAccounts.value) {
      const info = tokenAccount.account.data.parsed.info;
      const balance = info.tokenAmount.uiAmount;
      const address = tokenAccount.pubkey.toString();
      console.log(`Token account ${address} balance: ${balance}`);
      totalStaked += balance;
    }
    
    console.log(`Total tokens staked in vault: ${totalStaked}`);
    
    // Step 3: Check token transfer history to this vault from your wallet
    console.log('\nChecking token transfer history to the vault...');
    const walletPubkey = new PublicKey(WALLET_ADDRESS);
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit: 20 });
    
    let transfersToVault = [];
    
    for (const sigInfo of signatures) {
      const txData = await connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 });
      
      // Check if this transaction transferred tokens from the wallet to the vault
      if (txData && txData.meta && txData.meta.postTokenBalances && txData.meta.preTokenBalances) {
        const preBalances = txData.meta.preTokenBalances;
        const postBalances = txData.meta.postTokenBalances;
        
        // Look for balance decreases from our wallet
        for (const pre of preBalances) {
          if (pre.owner === WALLET_ADDRESS && pre.mint === TOKEN_MINT) {
            const post = postBalances.find(p => p.accountIndex === pre.accountIndex);
            const preAmount = pre.uiTokenAmount.uiAmount || 0;
            const postAmount = post ? post.uiTokenAmount.uiAmount || 0 : 0;
            
            if (postAmount < preAmount) {
              // Check if any token accounts owned by vault increased
              for (const postBal of postBalances) {
                // If this is owned by our vault and has our token mint
                if (tokenAccounts.value.some(ta => ta.pubkey.toString() === postBal.pubkey) && 
                    postBal.mint === TOKEN_MINT) {
                  
                  // Find matching pre balance
                  const matchingPre = preBalances.find(pb => pb.accountIndex === postBal.accountIndex);
                  const preVaultAmount = matchingPre ? matchingPre.uiTokenAmount.uiAmount || 0 : 0;
                  const postVaultAmount = postBal.uiTokenAmount.uiAmount || 0;
                  
                  if (postVaultAmount > preVaultAmount) {
                    // This might be a staking transaction
                    transfersToVault.push({
                      signature: sigInfo.signature,
                      date: new Date(txData.blockTime * 1000).toISOString(),
                      amount: preAmount - postAmount,
                      vaultIncrease: postVaultAmount - preVaultAmount
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    if (transfersToVault.length > 0) {
      console.log('\nDetected token transfers to staking vault:');
      transfersToVault.forEach(t => {
        console.log(`- ${t.date}: ${t.amount} tokens (signature: ${t.signature})`);
      });
      
      // Calculate total transferred to vault
      const totalTransferred = transfersToVault.reduce((sum, t) => sum + t.amount, 0);
      console.log(`\nTotal tokens transferred to vault: ${totalTransferred}`);
    } else {
      console.log('\nNo token transfers to the staking vault detected');
    }
    
    // Step 4: Try to query the program to get staking info for this wallet
    console.log('\nAttempting to query the staking program directly...');
    
    // Note: This would require knowing the exact account structure of your staking program
    // The code below is a generic attempt that would need customization based on your program
    
    try {
      // Try to find PDA for user's staking account
      const [userStakingAccount] = await PublicKey.findProgramAddress(
        [
          Buffer.from('user_staking'),
          new PublicKey(WALLET_ADDRESS).toBuffer(),
          new PublicKey(TOKEN_MINT).toBuffer()
        ],
        new PublicKey(STAKING_PROGRAM_ID)
      );
      
      console.log(`User staking account PDA: ${userStakingAccount.toString()}`);
      
      // Try to get account info
      const accountInfo = await connection.getAccountInfo(userStakingAccount);
      
      if (accountInfo) {
        console.log('Found user staking account data (raw):');
        console.log(accountInfo.data);
        
        // This would require parsing based on your program's account structure
        // which is not possible without knowing the exact layout
      } else {
        console.log('No user staking account data found on-chain');
      }
    } catch (error) {
      console.log('Error querying program accounts:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();