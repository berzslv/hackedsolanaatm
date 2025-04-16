/**
 * Check Vault History
 * This script will check the transaction history of the vault token account
 * to see who has sent tokens to it
 */

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Configuration
const VAULT_TOKEN_ACCOUNT = '3UE98oWtqmxHZ8wgjHfbmmmHYPhMBx3JQTRgrPdvyshL';
const TOKEN_MINT = '59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk';
const YOUR_WALLET = '9qELzct4XMLQFG8CoAsN4Zx7vsZHEwBxoVG81tm4ToQX';

async function main() {
  try {
    console.log('Connecting to Solana...');
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    console.log(`Checking transaction history for vault token account: ${VAULT_TOKEN_ACCOUNT}`);
    
    // Get signatures for the vault token account
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(VAULT_TOKEN_ACCOUNT),
      { limit: 20 }
    );
    
    console.log(`Found ${signatures.length} transactions for the vault token account`);
    
    // Analyze each transaction
    for (const sigInfo of signatures) {
      console.log(`\nAnalyzing transaction: ${sigInfo.signature}`);
      
      // Get transaction data
      const txData = await connection.getParsedTransaction(
        sigInfo.signature,
        { maxSupportedTransactionVersion: 0 }
      );
      
      if (!txData) {
        console.log('Could not retrieve transaction data');
        continue;
      }
      
      // Check transaction timestamp
      const timestamp = txData.blockTime 
        ? new Date(txData.blockTime * 1000).toISOString()
        : 'unknown time';
      console.log(`Transaction time: ${timestamp}`);
      
      // Identify sender and check if it was token transfer
      let isTokenTransfer = false;
      let sender = 'unknown';
      let amount = 0;
      
      // Check if the wallet address was involved in this transaction
      const isYourWalletInvolved = txData.transaction.message.accountKeys.some(
        key => key.pubkey === YOUR_WALLET
      );
      
      if (isYourWalletInvolved) {
        console.log(`YOUR WALLET WAS INVOLVED IN THIS TRANSACTION`);
      }
      
      // Look for token program instructions
      if (txData.meta && txData.transaction) {
        // Check account keys
        const accountKeys = txData.transaction.message.accountKeys;
        
        // Check instructions
        const instructions = txData.transaction.message.instructions || [];
        
        for (const ix of instructions) {
          // Check for SPL token program instructions
          if (ix.programId && ix.programId.toString() === TOKEN_PROGRAM_ID.toString()) {
            console.log(`Found token program instruction: ${ix.data}`);
            
            if (ix.parsed && ix.parsed.type === 'transferChecked') {
              isTokenTransfer = true;
              sender = ix.parsed.info.authority;
              amount = ix.parsed.info.tokenAmount.uiAmount;
              
              console.log(`Token transfer detected:`);
              console.log(`- From: ${ix.parsed.info.source}`);
              console.log(`- To: ${ix.parsed.info.destination}`);
              console.log(`- Amount: ${amount}`);
              console.log(`- Authority: ${sender}`);
              
              // Check if this transfer went to our vault token account
              if (ix.parsed.info.destination === VAULT_TOKEN_ACCOUNT) {
                console.log(`⭐ THIS IS A TRANSFER TO THE VAULT ⭐`);
              }
            }
          }
        }
        
        // Check token balance changes as an alternative way to detect transfers
        if (txData.meta.preTokenBalances && txData.meta.postTokenBalances) {
          console.log('\nToken balance changes:');
          
          // Find the vault account in pre/post token balances
          const preVaultBalance = txData.meta.preTokenBalances.find(
            b => b.pubkey === VAULT_TOKEN_ACCOUNT
          );
          
          const postVaultBalance = txData.meta.postTokenBalances.find(
            b => b.pubkey === VAULT_TOKEN_ACCOUNT
          );
          
          if (preVaultBalance && postVaultBalance) {
            const preBal = preVaultBalance.uiTokenAmount.uiAmount || 0;
            const postBal = postVaultBalance.uiTokenAmount.uiAmount || 0;
            
            console.log(`Vault balance before: ${preBal}`);
            console.log(`Vault balance after: ${postBal}`);
            
            if (postBal > preBal) {
              console.log(`⭐ VAULT RECEIVED ${postBal - preBal} TOKENS ⭐`);
              
              // Try to find which account sent the tokens
              for (const pre of txData.meta.preTokenBalances) {
                if (pre.mint === TOKEN_MINT && pre.pubkey !== VAULT_TOKEN_ACCOUNT) {
                  const post = txData.meta.postTokenBalances.find(p => p.pubkey === pre.pubkey);
                  const senderPreBal = pre.uiTokenAmount.uiAmount || 0;
                  const senderPostBal = post ? post.uiTokenAmount.uiAmount || 0 : 0;
                  
                  if (senderPostBal < senderPreBal) {
                    const owner = pre.owner || 'unknown';
                    const ownerAddr = accountKeys[accountKeys.findIndex(k => k.pubkey === owner)]?.pubkey || 'unknown';
                    
                    console.log(`Sender appears to be token account: ${pre.pubkey}`);
                    console.log(`Owned by: ${ownerAddr}`);
                    console.log(`Sent amount: ${senderPreBal - senderPostBal}`);
                    
                    if (ownerAddr === YOUR_WALLET) {
                      console.log(`⭐⭐⭐ THIS IS FROM YOUR WALLET ⭐⭐⭐`);
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // Show logs for additional context
      if (txData.meta && txData.meta.logMessages) {
        console.log('\nTransaction logs:');
        
        // Filter logs for important messages
        const importantLogs = txData.meta.logMessages.filter(log =>
          log.includes('stake') ||
          log.includes('Stake') ||
          log.includes('transfer') ||
          log.includes('Transfer') ||
          log.includes('vault') ||
          log.includes('Vault') ||
          log.includes('Program log:')
        );
        
        // Print either filtered logs or all logs if no important ones found
        const logsToShow = importantLogs.length > 0 ? importantLogs : txData.meta.logMessages;
        logsToShow.slice(0, 10).forEach(log => console.log(`- ${log}`));
        
        if (logsToShow.length > 10) {
          console.log(`... and ${logsToShow.length - 10} more logs`);
        }
      }
    }
    
    // Check your recent transactions
    console.log('\n\nChecking your wallet transactions...');
    const walletSignatures = await connection.getSignaturesForAddress(
      new PublicKey(YOUR_WALLET),
      { limit: 10 }
    );
    
    console.log(`Found ${walletSignatures.length} recent transactions for your wallet`);
    
    for (const sigInfo of walletSignatures) {
      console.log(`\nTransaction: ${sigInfo.signature}`);
      console.log(`Time: ${new Date(sigInfo.blockTime * 1000).toISOString()}`);
      console.log(`Status: ${sigInfo.confirmationStatus}`);
      
      const txData = await connection.getParsedTransaction(
        sigInfo.signature,
        { maxSupportedTransactionVersion: 0 }
      );
      
      if (!txData || !txData.meta) {
        console.log('Could not retrieve full transaction data');
        continue;
      }
      
      // Check if this transaction interacts with our token mint
      const involvesMint = (txData.meta.preTokenBalances || []).some(b => b.mint === TOKEN_MINT) ||
                          (txData.meta.postTokenBalances || []).some(b => b.mint === TOKEN_MINT);
      
      if (involvesMint) {
        console.log(`⭐ THIS TRANSACTION INVOLVES OUR TOKEN MINT ⭐`);
        
        // Check balance changes
        if (txData.meta.preTokenBalances && txData.meta.postTokenBalances) {
          for (const pre of txData.meta.preTokenBalances) {
            if (pre.mint === TOKEN_MINT) {
              const post = txData.meta.postTokenBalances.find(p => p.pubkey === pre.pubkey);
              const preBal = pre.uiTokenAmount.uiAmount || 0;
              const postBal = post ? post.uiTokenAmount.uiAmount || 0 : 0;
              
              if (preBal !== postBal) {
                console.log(`Token account ${pre.pubkey} balance changed:`);
                console.log(`Before: ${preBal}, After: ${postBal}, Change: ${postBal - preBal}`);
              }
            }
          }
          
          // Check for new token accounts that appeared post-transaction
          for (const post of txData.meta.postTokenBalances) {
            if (post.mint === TOKEN_MINT && 
                !txData.meta.preTokenBalances.some(p => p.pubkey === post.pubkey)) {
              
              console.log(`New token account appeared: ${post.pubkey}`);
              console.log(`Balance: ${post.uiTokenAmount.uiAmount || 0}`);
              console.log(`Owner: ${post.owner || 'unknown'}`);
            }
          }
        }
      }
      
      // Show a few relevant logs
      if (txData.meta.logMessages) {
        const relevantLogs = txData.meta.logMessages.filter(log =>
          log.includes('stake') ||
          log.includes('Stake') ||
          log.includes('transfer') ||
          log.includes('Transfer') ||
          log.includes('vault') ||
          log.includes('Vault') ||
          log.includes(VAULT_TOKEN_ACCOUNT.substring(0, 8)) ||
          log.includes('Program log:')
        );
        
        if (relevantLogs.length > 0) {
          console.log('\nRelevant logs:');
          relevantLogs.slice(0, 5).forEach(log => console.log(`- ${log}`));
          
          if (relevantLogs.length > 5) {
            console.log(`... and ${relevantLogs.length - 5} more relevant logs`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();