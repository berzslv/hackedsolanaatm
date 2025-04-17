require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337
    },
    sepolia: {
      url: process.env.ETHEREUM_TESTNET_URL || "https://sepolia.infura.io/v3/your-infura-key",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    goerli: {
      url: process.env.ETHEREUM_TESTNET_URL || "https://goerli.infura.io/v3/your-infura-key",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: {
    root: "./ethereum",
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};