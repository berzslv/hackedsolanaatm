const { ethers } = require('ethers');
require('dotenv').config();

// Connect to Sepolia testnet
const provider = new ethers.providers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`);

// Use private key to create wallet
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey || privateKey.length !== 64) {
  console.error('Invalid private key. Please make sure your private key is a 64-character hex string without 0x prefix.');
  process.exit(1);
}

async function main() {
  try {
    console.log('Starting Ethereum contract deployment...');
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Deploying contracts with wallet address: ${wallet.address}`);
    
    // Check wallet balance
    const balance = await wallet.getBalance();
    console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    if (balance.lt(ethers.utils.parseEther('0.01'))) {
      console.error('Wallet has insufficient balance for deployment. Please add Sepolia ETH.');
      process.exit(1);
    }
    
    // Deploy token contract
    console.log('Deploying HackedATMToken contract...');
    const tokenAbi = require('./ethereum/artifacts/contracts/HackedATMToken.sol/HackedATMToken.json').abi;
    const tokenBytecode = require('./ethereum/artifacts/contracts/HackedATMToken.sol/HackedATMToken.json').bytecode;
    
    const TokenFactory = new ethers.ContractFactory(tokenAbi, tokenBytecode, wallet);
    const tokenContract = await TokenFactory.deploy(wallet.address);
    await tokenContract.deployed();
    
    console.log(`HackedATMToken deployed to: ${tokenContract.address}`);
    
    // Deploy staking contract
    console.log('Deploying StakingVault contract...');
    const stakingAbi = require('./ethereum/artifacts/contracts/StakingVault.sol/StakingVault.json').abi;
    const stakingBytecode = require('./ethereum/artifacts/contracts/StakingVault.sol/StakingVault.json').bytecode;
    
    const StakingFactory = new ethers.ContractFactory(stakingAbi, stakingBytecode, wallet);
    const stakingContract = await StakingFactory.deploy(tokenContract.address, wallet.address);
    await stakingContract.deployed();
    
    console.log(`StakingVault deployed to: ${stakingContract.address}`);
    
    // Mint some initial tokens for testing
    console.log('Minting initial token supply...');
    const mintAmount = ethers.utils.parseEther('1000000'); // 1 million tokens
    const mintTx = await tokenContract.mint(wallet.address, mintAmount);
    await mintTx.wait();
    
    console.log(`Minted ${ethers.utils.formatEther(mintAmount)} tokens to ${wallet.address}`);
    
    // Print deployment summary
    console.log('\nDeployment completed successfully!');
    console.log('----------------------------------');
    console.log('Contract Addresses:');
    console.log(`- HackedATMToken: ${tokenContract.address}`);
    console.log(`- StakingVault: ${stakingContract.address}`);
    console.log('----------------------------------');
    console.log('Next steps:');
    console.log('1. Update these addresses in client/src/lib/ethereum/config.ts');
    console.log('2. Verify the contracts on Etherscan (optional)');
    
    // Return addresses for use in other scripts
    return {
      token: tokenContract.address,
      stakingVault: stakingContract.address
    };
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
main().then((addresses) => {
  // Write to config file
  console.log('Updating configuration...');
  const fs = require('fs');
  const path = require('path');
  
  const configPath = path.join(__dirname, 'client/src/lib/ethereum/config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Replace sepolia addresses
  configContent = configContent.replace(
    /sepolia: \{\s*token: "[^"]*",\s*stakingVault: "[^"]*"/,
    `sepolia: {\n    token: "${addresses.token}",\n    stakingVault: "${addresses.stakingVault}"`
  );
  
  fs.writeFileSync(configPath, configContent);
  console.log('Configuration updated successfully!');
  
  process.exit(0);
}).catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
});