const { assert, expect, expectRevert, withNamedArgs } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { ABIS, ADDRESS } = require("./@config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Vault unit tests", function () {
      let accounts;
      before(async () => {
        //SIGNERS AND ACCOUNTS
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        user = accounts[1];
        keeper = accounts[2];
        //whale USDC
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [ADDRESS.WHALE_USDC],
        });
        whale = await ethers.getSigner(ADDRESS.WHALE_USDC);
        //GMX Admin
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: ["0xB4d2603B2494103C90B2c607261DD85484b49eF0"],
        });
        gmxAdmin = await ethers.getSigner(
          "0xB4d2603B2494103C90B2c607261DD85484b49eF0"
        );

        //VARIABLE
        keepersFee = ethers.utils.parseEther("0.01");

        //CONTRACTS
        await deployments.fixture(["MyVault"]);
        MyVault = await ethers.getContract("MyVault");
        await deployments.fixture(["GMX_controller"]);
        GMX_controller = await ethers.getContract("GMX_controller");

        USDC = await ethers.getContractAt(ABIS.ERC20, ADDRESS.USDC, deployer);
        WETH = await ethers.getContractAt(ABIS.ERC20, ADDRESS.WETH, deployer);
        GMX_ROUTER = await ethers.getContractAt(
          ABIS.GMX_ROUTER,
          ADDRESS.GMX_ROUTER,
          deployer
        );
        GMX_POSITION_ROUTER = await ethers.getContractAt(
          ABIS.GMX_POSITION_ROUTER,
          ADDRESS.GMX_POSITION_ROUTER,
          deployer
        );
        GMX_READER = await ethers.getContractAt(
          ABIS.GMX_READER,
          ADDRESS.GMX_READER,
          deployer
        );
        GMX_VAULT = await ethers.getContractAt(
          ABIS.GMX_VAULT,
          ADDRESS.GMX_VAULT,
          deployer
        );

        //UTILS FONCTIONS
        getPositions = async (_addr, _isLong) => {
          let collateralToken = _isLong ? ADDRESS.WETH : ADDRESS.USDC;
          let response = await GMX_READER.getPositions(
            ADDRESS.GMX_VAULT,
            _addr,
            [collateralToken],
            ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
            [_isLong]
          );
          return response;
        };
        waitingPositionsLength = async (isIncrease) => {
          let a = isIncrease ? 1 : 3;
          return (
            await ("getRequestQueueLengths",
            await GMX_POSITION_ROUTER.getRequestQueueLengths())
          )[a].toString();
        };
        waitingPositionsStart = async (isIncrease) => {
          let a = isIncrease ? 0 : 2;
          return (
            await ("getRequestQueueLengths",
            await GMX_POSITION_ROUTER.getRequestQueueLengths())
          )[a].toString();
        };
        executeIncreasePositions = async () => {
          await GMX_POSITION_ROUTER.connect(keeper).executeIncreasePositions(
            parseInt(await waitingPositionsLength(true)),
            GMX_controller.address
          );
        };
        executeDecreasePositions = async () => {
          await GMX_POSITION_ROUTER.connect(keeper).executeDecreasePositions(
            parseInt(await waitingPositionsLength(false)),
            GMX_controller.address
          );
        };
      });
      describe("deployment test", function () {
        it("my contract should be deployed", async function () {
          expect(MyVault.address).not.to.equal("0x");
        });
        it("should pre-mint PLPToken ", async function () {
          let initialBalance = await MyVault.balanceOf(deployer.address);
          expect(initialBalance).not.to.equal("1000000");
        });
      });
      describe("basic tests on setter and getter", function () {
        it("should NOT set GMX controller", async function () {
          await expect(
            MyVault.connect(user).setGMX_controller(GMX_controller.address)
          ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("should set GMX controller", async function () {
          await MyVault.setGMX_controller(GMX_controller.address);
          expect(await MyVault.getGMX_controller()).to.be.eq(
            GMX_controller.address
          );
        });
        it("should NOT set the wanted exposition", async function () {
          await expect(
            MyVault.connect(user).setExposition(1)
          ).to.be.revertedWith("Ownable: caller is not the owner");
          await expect(
            MyVault.setExposition(3)
          ).to.be.revertedWith(
            "Value must be 0 for neutral, 1 for Long or 2 for Short"
          );
        });
        it("should set the net asset value to 0", async function () {
            await MyVault.updateNetAssetValue()
            await expect(await MyVault.getNetAssetValue()).to.be.eq(0);
        });
        it("should set the wanted exposition", async function () {
          await MyVault.setExposition(1);
          expect(await MyVault.getExposition()).to.be.eq(1);
        });
        it("should NOT set the exposition if same exposition", async function () {
            await expect(MyVault.setExposition(1)).to.be.revertedWith("Reverted because exposition has not changed");
          });
      });
      describe("Initialisation", function () {
        before(async () => {
          //initialized the vault
          await MyVault.setGMX_controller(GMX_controller.address);
          await MyVault.acceptToken(USDC.address);
        });
        it("should fund user with USDC", async function () {
          //Fund user with USDC
          await USDC.connect(whale).transfer(
            user.address,
            ethers.utils.parseUnits("10", "6").mul(100),
            { gasLimit: 100000 }
          );
          expect(await USDC.balanceOf(user.address)).to.not.be.equal(0);
        });
        it("should set a keeper", async function () {
          //Set a Keeper to simulate the validation of transaction
          await GMX_POSITION_ROUTER.connect(gmxAdmin).setPositionKeeper(
            keeper.address,
            true
          );
        });
      });
      describe("GMX deposit Long expo", function () {

        before(async () => {
          depositAmount = "15000000";
          gmxPositionT0 = await getPositions(GMX_controller.address, true);
          USDC_vaultBalanceT0 = (
            await USDC.balanceOf(MyVault.address)
          ).toString();
          USDC_userBalanceT0 = (await USDC.balanceOf(user.address)).toString();
          PLP_userBalanceT0 = (
            await MyVault.balanceOf(user.address)
          ).toString();

          await USDC.connect(user).approve(MyVault.address, depositAmount);
          await MyVault.connect(user).deposit(ADDRESS.USDC, depositAmount, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await executeIncreasePositions();
        });
        it("should have received USDC from user", async function () {
          USDC_userBalanceT1 = (await USDC.balanceOf(user.address)).toString();
          expect(parseInt(USDC_userBalanceT0)).to.be.eq(
            parseInt(USDC_userBalanceT1) + parseInt(depositAmount)
          );
        });
        it("should have sent back LP Token", async function () {
          PLP_userBalanceT1 = (
            await MyVault.balanceOf(user.address)
          ).toString();
          expect(parseInt(PLP_userBalanceT1)).to.be.eq(parseInt(PLP_userBalanceT0)+parseInt(depositAmount));
        });
        it("should have open long position", async function () {
          gmxPositionT1 = await getPositions(GMX_controller.address, true);
          expect(gmxPositionT1[0].toString()).to.be.eq(
            "16500000000000000000000000000000"
          );
        });
        it("should be possible to increase the long position", async function () {
          await USDC.connect(user).approve(MyVault.address, depositAmount);
          await MyVault.connect(user).deposit(ADDRESS.USDC, depositAmount, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await executeIncreasePositions();
          USDC_userBalanceT2 = (await USDC.balanceOf(user.address)).toString();
          expect(parseInt(USDC_userBalanceT1)).to.be.eq(
            parseInt(USDC_userBalanceT2) + parseInt(depositAmount)
          );
          PLP_userBalanceT2 = (
            await MyVault.balanceOf(user.address)
          ).toString();
          gmxPositionT2 = await getPositions(GMX_controller.address, true);
          expect(gmxPositionT2[0].toString()).to.be.eq(
            "33000000000000000000000000000000"
          );
        });
        it("should liquidate positions", async function () {
            await MyVault.liquidatePositions({
                value: keepersFee,
                gasLimit: 10000000,
              });
            await executeDecreasePositions();
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).to.be.eq("0");
            expect(gmxPositionShort[0].toString()).to.be.eq("0");
        });
        it("should change exposition from 1 to 0", async function () {
            await MyVault.setExposition(0);
            expect(await MyVault.getExposition()).to.be.eq(0);
            await console.log((await USDC.balanceOf(MyVault.address)).toString())
        });
      });
      describe("GMX deposit Short expo", function () {
        before(async () => {
          await MyVault.setExposition(2);
          await MyVault.openPosition({value: keepersFee, gasLimit: 10000000})
          await executeIncreasePositions();
          depositAmount = "15000000";
          keepersFee = ethers.utils.parseEther("0.01");

          gmxPositionT0 = await getPositions(GMX_controller.address, false);
          USDC_vaultBalanceT0 = (
            await USDC.balanceOf(MyVault.address)
          ).toString();
          USDC_userBalanceT0 = (await USDC.balanceOf(user.address)).toString();
          PLP_userBalanceT0 = (
            await MyVault.balanceOf(user.address)
          ).toString();

          await USDC.connect(user).approve(MyVault.address, depositAmount);
          await MyVault.connect(user).deposit(ADDRESS.USDC, depositAmount, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await executeIncreasePositions();
        });
        it("should have received USDC from user", async function () {
          USDC_userBalanceT1 = (await USDC.balanceOf(user.address)).toString();
          expect(parseInt(USDC_userBalanceT0)).to.be.eq(
            parseInt(USDC_userBalanceT1) + parseInt(depositAmount)
          );
        });
        it("should have increase short position", async function () {
          gmxPositionT1 = await getPositions(GMX_controller.address, false);
          // expect(gmxPositionT1[0].toString()).to.be.eq(
          //   "49200891000000000000000000000000"
          // );
        });
        it("should be possible to increase the short position", async function () {
            await USDC.connect(user).approve(MyVault.address, depositAmount);
            await MyVault.connect(user).deposit(ADDRESS.USDC, depositAmount, {
              value: keepersFee,
              gasLimit: 10000000,
            });
            await executeIncreasePositions();
            USDC_userBalanceT2 = (await USDC.balanceOf(user.address)).toString();
            expect(parseInt(USDC_userBalanceT1)).to.be.eq(
              parseInt(USDC_userBalanceT2) + parseInt(depositAmount)
            );
            PLP_userBalanceT2 = (
              await MyVault.balanceOf(user.address)
            ).toString();
            gmxPositionT2 = await getPositions(GMX_controller.address, false);
            // expect(gmxPositionT2[0].toString()).to.be.eq(
            //   "65700891000000000000000000000000"
            // );
        });
        it("should liquidate positions", async function () {
            await MyVault.liquidatePositions({
                value: keepersFee,
                gasLimit: 10000000,
              });
            await executeDecreasePositions();
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).to.be.eq("0");
            expect(gmxPositionShort[0].toString()).to.be.eq("0");
        });
        it("should change exposition from 2 to 0", async function () {
            await MyVault.setExposition(0);
            expect(await MyVault.getExposition()).to.be.eq(0);
        });
      });
      describe("Rebalancing of position and test of net asset value", function () {
        it("should rebalance the position after exposition changed from 0 to 1", async function () {
            await MyVault.setExposition(1);
            await MyVault.openPosition({value: keepersFee, gasLimit: 10000000})
            await executeIncreasePositions();
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).not.to.eq("0");
            expect(gmxPositionShort[0].toString()).to.be.eq("0");
        });
        it("should rebalance the position of exposition changed from 1 to 2", async function () {
            await MyVault.liquidatePositions({
                value: keepersFee,
                gasLimit: 10000000,
              });
            await executeDecreasePositions();
            await MyVault.setExposition(2);
            await MyVault.openPosition({value: keepersFee, gasLimit: 10000000})
            await executeIncreasePositions();
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).to.be.eq("0");
            expect(gmxPositionShort[0].toString()).not.to.eq("0");
        });
        it("should rebalance the position of exposition changed from 2 to 1", async function () {
            await MyVault.liquidatePositions({
                value: keepersFee,
                gasLimit: 10000000,
              });
            await executeDecreasePositions();
            await MyVault.setExposition(1);
            await MyVault.openPosition({value: keepersFee, gasLimit: 10000000})
            await executeIncreasePositions();
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).not.to.eq("0");
            expect(gmxPositionShort[0].toString()).to.be.eq("0");
        });
        it("should rebalance the position of exposition changed from 1 to 0", async function () {
            await MyVault.liquidatePositions({
                value: keepersFee,
                gasLimit: 10000000,
              });
            await executeDecreasePositions();
            await MyVault.setExposition(0);
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).to.be.eq("0");
            expect(gmxPositionShort[0].toString()).to.be.eq("0");
        });
        it("should rebalance the position of exposition changed from 0 to 2", async function () {
            await MyVault.setExposition(2);
            await console.log((await USDC.balanceOf(MyVault.address)).toString())
            await MyVault.openPosition({value: keepersFee, gasLimit: 10000000})
            await executeIncreasePositions();
            gmxPositionLong = await getPositions(GMX_controller.address, true);
            gmxPositionShort = await getPositions(GMX_controller.address, false);
            expect(gmxPositionLong[0].toString()).to.be.eq("0");
            expect(gmxPositionShort[0].toString()).not.to.eq("0");
        });
      });
    });




