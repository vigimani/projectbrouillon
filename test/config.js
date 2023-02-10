const ethers = require('ethers');

module.exports = {
    ABIS: {
      GMX_POSITION_ROUTER: require('../abi/gmxPosRouter.json'),
      GMX_ROUTER: require('../abi/gmxRouter.json'),
      GMX_READER: require('../abi/gmxReader.json'),
      GMX_VAULT: require('../abi/gmxVault.json'),
      ERC20: require('../abi/erc20.json'),
    },
    //ARBITRUM NETWORK
    ADDRESS : {
        WHALE_USDC : "0x7B7B957c284C2C227C980d6E2F804311947b84d0",
        WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
        USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        GMX_VAULT : "0x489ee077994B6658eAfA855C308275EAd8097C4A",
        GMX_ROUTER : "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
        GMX_READER : "0x22199a49A999c351eF7927602CFB187ec3cae489",
        GMX_POSITION_ROUTER : "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868",
        STARGATE_ROUTER : "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
        STARGATE_POOL_USDC : "0x892785f33CdeE22A30AEF750F285E18c18040c3e",
    },
  };