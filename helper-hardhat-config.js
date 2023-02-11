const networkConfig = {
    31337: {
        name: "localhost"
    },
    5: {
        name: "goerli"
    },
    42161: {
        name: "arbitrum"
    }
}

const developmentChains = ["hardhat", "localhost", "arbitrum"]

module.exports = {
    networkConfig,
    developmentChains
}