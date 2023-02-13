const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
    
module.exports = async({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("--------------------------------------")

    await deployments.fixture(["MyVault"])
    vault_contract = await ethers.getContract("MyVault")

    arguments = [vault_contract.address] 
    const GMX_controller = await deploy("GMX_controller", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    //Verify the smart contract 
    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN) {
        log("Verifying...")
        await verify(GMX_controller.address, arguments)
    }
}

module.exports.tags = ["all", "GMX_controller", "main"]