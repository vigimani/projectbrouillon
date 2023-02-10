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

    await deployments.fixture(["Strat2"])
    Strat2 = await ethers.getContract("Strat2")

    //CONTRACTS
    USDC = await ethers.getContractAt(ABIS.ERC20, ADDRESS.USDC, deployer);
    WETH = await ethers.getContractAt(ABIS.ERC20, ADDRESS.WETH, deployer);
    STGLP_USDC = await ethers.getContractAt(ABIS.ERC20, "0x892785f33CdeE22A30AEF750F285E18c18040c3e", deployer);
    });

  describe("Deployment", function () {
    it("Should deploy the contracts", async () => {
      expect(Strat2.address).not.to.equal("0x");
      // expect(GMXPOSITIONMANAGER.address).not.to.equal("0x");
    });
  });
  describe("Initialisation", function () {
    before(async function () {
      //TRANSFER USDC FROM WHALE TO THE CONTRACT
      await USDC
        .connect(whale)
        .transfer(Strat2.address, depositAmount.mul(10), {
          gasLimit: 100000,
        });
    });
    it("Should have USDC", async () => {
      expect(await USDC.balanceOf(Strat2.address)).to.not.be.equal(0);
    });
  describe("Stargate transaction", function () {
    it("Should deposit on Stargate", async function () {
        // USDC.approve(Strat2.address, depositAmount)
        await Strat2.stargateDeposit(depositAmount, {gasLimit:100000})
        console.log((await STGLP_USDC.balanceOf(Strat2.address)).toString())
    });

  });
});
})
