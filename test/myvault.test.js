const { assert, expect, expectRevert, withNamedArgs } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("./../helper-hardhat-config");
const { ABIS, ADDRESS } = require("./config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Unit test for the Token", function () {
      let accounts;
      let vote;

      before(async () => {
        //SIGNERS AND ACCOUNTS
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        await deployments.fixture(["MyVault"])
        MyVault = await ethers.getContract("MyVault")

        //EXT CONTRACTS
        USDC = await ethers.getContractAt(ABIS.ERC20, ADDRESS.USDC, deployer);
        WETH = await ethers.getContractAt(ABIS.ERC20, ADDRESS.WETH, deployer);
      });

      describe("deployment test", function(){
        it("my contract should be deployed", async function() {
            expect(MyVault.address).not.to.equal("0x");
        })
        it("should pre-mint PLPToken ", async function() {
            let initialBalance = await MyVault.balanceOf(deployer.address);
            expect(initialBalance).not.to.equal("1000000");
        })
      })
      describe("test actions on token accepted to deposit", function(){
        it("should not accept or remove a token if not the owner", async function() {
            await expect(MyVault.connect(accounts[1]).acceptToken(USDC.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })
        it("should not remove a token if not added", async function() {
            await expect(MyVault.removeToken(USDC.address)).to.be.revertedWith("Token not yet added");
        })
        it("should accept a new token if not already accepted", async function() {
            await expect(MyVault.acceptToken(USDC.address)).to.emit(MyVault, "NewTokenAdded").withArgs(USDC.address);
            await expect(MyVault.acceptToken(USDC.address)).to.be.revertedWith("Token already added");
        })
        it("test if isAccepted return correct value", async function() {
            expect(await MyVault.isAccepted(USDC.address)).to.be.true;
            expect(await MyVault.isAccepted(WETH.address)).to.not.be.true;
        })
        it("should not remove a token if not the owner", async function() {
            await expect(MyVault.connect(accounts[1]).removeToken(USDC.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })
        it("should remove a token", async function() {
            await expect(MyVault.removeToken(USDC.address)).to.emit(MyVault, "TokenRemoved").withArgs(USDC.address);
        })

      })
      describe("test on deposit erc20", function(){
        before(async () => {
            await MyVault.acceptToken(USDC.address);
            depositAmount = ethers.utils.parseUnits("1000", "6");
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [ADDRESS.WHALE_USDC],
              });
              whale = await ethers.getSigner(ADDRESS.WHALE_USDC);
          });
        it("should not deposit a token not accepted", async function() {
            await expect(MyVault.connect(accounts[1]).deposit(WETH.address, depositAmount)).to.be.revertedWith("Token not yet supported");
        })
        it("should not deposit a token if amount <= 0", async function() {
            await expect(MyVault.connect(accounts[1]).deposit(USDC.address, 0)).to.be.revertedWith("Amount to deposit is mandatory");
        })
        it("should deposit and receive LP Token", async function() {
            await USDC.connect(whale).approve(MyVault.address, depositAmount);
            expect(await USDC.allowance(whale.address, MyVault.address)).to.be.eq(depositAmount);
            await MyVault.connect(whale).deposit(USDC.address, depositAmount)
            expect(await MyVault.balanceOf(whale.address)).to.be.eq(depositAmount.mul(100))
        })
        it("should not remove a token if not the owner", async function() {
            await expect(MyVault.connect(accounts[1]).removeToken(USDC.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })
        it("should remove a token", async function() {
            await expect(MyVault.removeToken(USDC.address)).to.emit(MyVault, "TokenRemoved").withArgs(USDC.address);
        })
      })
    //   it("should NOT give voter if not Voter", async function () {
    //     await expect(vote.getVoter(accounts[0].address)).to.be.revertedWith(
    //       "You're not a voter"
    //     );
    //   });
    //   it("should give voter if Voter", async function () {
    //     await vote.addVoter(accounts[1].address);
    //     let x = await vote.connect(accounts[1]).getVoter(accounts[0].address);
    //     let y = await vote.connect(accounts[1]).getVoter(accounts[1].address);
    //     await assert(x.isRegistered === false);
    //     await assert(y.isRegistered === true);
    //   });
    });
