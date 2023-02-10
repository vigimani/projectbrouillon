const { expect } = require("chai");
const assert = require("chai").assert;
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { ABIS, ADDRESS } = require("./config");


const { ethers } = require("hardhat");
const depositAmount = ethers.utils.parseUnits("1000", "6");

describe("PolyPlus Investment", () => {
  before(async function () {
    //SIGNERS AND ACCOUNTS
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ADDRESS.WHALE_USDC],
    });
    whale = await ethers.getSigner(ADDRESS.WHALE_USDC);

    await deployments.fixture(["Strat1"])
    Strat1 = await ethers.getContract("Strat1")

    //CONTRACTS
    USDC = await ethers.getContractAt(ABIS.ERC20, ADDRESS.USDC, deployer);
    WETH = await ethers.getContractAt(ABIS.ERC20, ADDRESS.WETH, deployer);
    GMX_ROUTER = await ethers.getContractAt(ABIS.GMX_ROUTER,ADDRESS.GMX_ROUTER, deployer);
    GMX_POSITION_ROUTER = await ethers.getContractAt(ABIS.GMX_POSITION_ROUTER,ADDRESS.GMX_POSITION_ROUTER, deployer);
    GMX_READER = await ethers.getContractAt(ABIS.GMX_READER,ADDRESS.GMX_READER, deployer);
    GMX_VAULT = await ethers.getContractAt(ABIS.GMX_VAULT,ADDRESS.GMX_VAULT, deployer);
  });

  describe("Deployment", function () {
    it("Should deploy the contracts", async () => {
      expect(Strat1.address).not.to.equal("0x");
      // expect(GMXPOSITIONMANAGER.address).not.to.equal("0x");
    });
  });
  describe("Initialisation", function () {
    before(async function () {
      //TRANSFER USDC FROM WHALE TO SIGNER
      await USDC
        .connect(whale)
        .transfer(deployer.address, depositAmount.mul(10), {
          gasLimit: 100000,
        });
    });
    it("Should have USDC", async () => {
      expect(await USDC.balanceOf(deployer.address)).to.not.be.equal(0);
    });
  describe("GMX transactions", function () {
    it("Should approve the plugin", async function () {
      expect(
        await GMX_ROUTER.approvedPlugins(
          Strat1.address,
          ADDRESS.GMX_POSITION_ROUTER
        )
      ).to.be.true;
    });
    it("Should open an ETH/USD long position on GMX", async function () {
      const tokenAmount = ethers.utils.parseUnits("15", "6");
      await USDC
        .connect(whale)
        .transfer(deployer.address, depositAmount.mul(100), {
          gasLimit: 100000,
        });
        
      console.log("Deployer balance t0 :", (await USDC.balanceOf(deployer.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(deployer.address)).toString(), 'ETH')
      console.log("Contract balance t0 :", (await USDC.balanceOf(Strat1.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(Strat1.address)).toString(), 'ETH')

      await USDC.approve(Strat1.address, tokenAmount)

      const keepersFee = ethers.utils.parseEther("0.02");

      const tx = await Strat1.openPosition(tokenAmount, true, {
        value: keepersFee,
        gasLimit: 10000000,
      });

      await tx.wait(1)
      console.log("Deployer balance t1 :", (await USDC.balanceOf(deployer.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(deployer.address)).toString(), 'ETH')
      console.log("Contract balance t1 :", (await USDC.balanceOf(Strat1.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(Strat1.address)).toString(), 'ETH')

      await expect(tx).not.to.be.reverted;

      const result = await GMX_READER.getPositions(
        ADDRESS.GMX_VAULT,
        Strat1.address,
        ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
        ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
        [true]
      )
      result.forEach((elem) => console.log(elem.toString()));

      const tx2 = await Strat1.closePosition(true, {
        value: keepersFee,
        gasLimit: 10000000,
      });

      await tx2.wait(1)
      console.log("Deployer balance t2 :", (await USDC.balanceOf(deployer.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(deployer.address)).toString(), 'ETH')
      console.log("Contract balance t2 :", (await USDC.balanceOf(Strat1.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(Strat1.address)).toString(), 'ETH')

      
    });
    // it("Should open an ETH/USD long position on GMX", async function () {
    //   const axz = await USDC.balanceOf(MYCONTRACT.address)
    //   console.log(axz.toString())
    //   const tokenAmount = ethers.utils.parseUnits("15", "6");
    //   await USDC
    //     .connect(whale)
    //     .transfer(MYCONTRACT.address, depositAmount.mul(100), {
    //       gasLimit: 100000,
    //     });
    //     await USDC
    //     .connect(whale)
    //     .transfer(GMXPOSITIONMANAGER.address, depositAmount.mul(100), {
    //       gasLimit: 100000,
    //     });
    //   const vaultBalance2 = await USDC.balanceOf(MYCONTRACT.address)
    //   console.log(vaultBalance2.toString())

    //   await MYCONTRACT.setGMXPositionManager(GMXPOSITIONMANAGER.address)

   
    //   const positionManagerBalance = await USDC.balanceOf(GMXPOSITIONMANAGER.address);
    //   const keepersFee = ethers.utils.parseEther("0.02");

    //   const tx = MYCONTRACT.openPosition("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", tokenAmount, true, {
    //     value: keepersFee,
    //     gasLimit: 10000000,
    //   });
    //   const vaultBalance3 = await USDC.balanceOf(MYCONTRACT.address)
    //   console.log(vaultBalance3.toString())

    //   // const response = tx.wait(1);
    //   await expect(tx).not.to.be.reverted;
    //   let a = await GMX_READER.getPositions(
    //     ADDRESS.GMX_VAULT,
    //     GMXPOSITIONMANAGER.address,
    //     ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
    //     ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
    //     [true]
    //   );
    //   a.forEach((elem) => console.log(elem.toString()));
    // });
  });
});
})
