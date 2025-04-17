const hre = require("hardhat");

async function main() {
  console.log("Starting deployment process...");

  // Get the contract factories
  const HackedATMToken = await hre.ethers.getContractFactory("HackedATMToken");
  const StakingVault = await hre.ethers.getContractFactory("StakingVault");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Deploy the token
  console.log("Deploying HackedATMToken...");
  const token = await HackedATMToken.deploy(deployer.address);
  await token.deployed();
  console.log(`HackedATMToken deployed to: ${token.address}`);

  // Deploy the staking vault
  console.log("Deploying StakingVault...");
  const stakingVault = await StakingVault.deploy(token.address, deployer.address);
  await stakingVault.deployed();
  console.log(`StakingVault deployed to: ${stakingVault.address}`);

  // Mint some initial tokens to the deployer for testing
  const mintAmount = hre.ethers.utils.parseEther("1000000"); // 1 million tokens
  console.log(`Minting ${hre.ethers.utils.formatEther(mintAmount)} tokens to deployer...`);
  await token.mint(deployer.address, mintAmount);

  console.log("Deployment completed!");
  console.log("-------------------------------------");
  console.log("Contract Addresses:");
  console.log(`HackedATMToken: ${token.address}`);
  console.log(`StakingVault: ${stakingVault.address}`);
  console.log("-------------------------------------");
  console.log("Next steps:");
  console.log("1. Verify contracts on Etherscan");
  console.log("2. Update contract addresses in your frontend");
  console.log("3. Test staking functionality");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });