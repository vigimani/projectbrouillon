require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("hardhat-gas-reporter")
require("solidity-coverage")
require("hardhat-docgen")
// require('hardhat-ethernal')

ARB_URL="https://arb-mainnet.g.alchemy.com/v2/"+ process.env.ALCHEMY_ARBITRUM_API
ETH_URL="https://eth-mainnet.g.alchemy.com/v2/"+ process.env.ALCHEMY_MAINNET_API

module.exports = {
  defaultNetwork: "hardhat",
  artifacts: "./artifacts",
  networks: {
    hardhat: {
      forking: {
        url: ARB_URL
      }
      // ,
      // mining: {
      //   auto: false,ETHERNAL_EMAIL=limaniscrow@protonmail.com ETHERNAL_PASSWORD=jUkR2rd3jzfxeuq yarn hardhat node
      //   interval: 5000
      // }
    },
    goerli: {
      url: `${process.env.ALCHEMY_GOERLI}`,
      accounts: [`0x${process.env.PK}`],
      chainId: 5,
      blockConfirmations: 6
    },
    arbitrum: {
      url: ARB_URL,
      accounts: [`0x${process.env.PK_ARB}`],
      chainId: 42161,
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
      arbitrum: `${process.env.ARBISCAN}`,
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
  },
//   ethernal: {
//     email: process.env.ETHERNAL_EMAIL,
//     password: process.env.ETHERNAL_PASSWORD,
//     uploadAst: true,
//     resetOnStart: true,
// }
};
