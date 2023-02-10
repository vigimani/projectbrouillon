require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("hardhat-gas-reporter")
require("solidity-coverage")
require("hardhat-docgen")


ARB_URL="https://arb-mainnet.g.alchemy.com/v2/"+ process.env.ALCHEMY_ARBITRUM_API



module.exports = {
  defaultNetwork: "hardhat",
  artifacts: "./artifacts",
  networks: {
    hardhat: {
      forking: {
        url: ARB_URL,
      }
      // forking: {
      //   url: "https://api.avax.network/ext/bc/C/rpc",
      // },
    },
    goerli: {
      url: `${process.env.ALCHEMY_GOERLI}`,
      accounts: [`0x${process.env.PK}`],
      chainId: 5,
      blockConfirmations: 6
    },
  },
  solidity : {
    // compilers: [
    //   {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },}
  //     },
  //     // {
  //     // version: "0.6.12",
  //     // settings: {
  //     //   optimizer: {
  //     //     enabled: true,
  //     //     runs: 100,
  //     //   },}
  //     // }
  // ]
  },
  etherscan: {
    apiKey: {
      goerli: `${process.env.ETHERSCAN}`,
    }
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0,
    }
  },

  docgen: {
    path:"./docs",
    clear: true,
  },

  gasReporter: {
    enabled: true
  }
};
