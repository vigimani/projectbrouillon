const { assert, expect, expectRevert, withNamedArgs } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { ABIS, ADDRESS } = require("./@config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Gas fees tests", function () {
      let accounts;
      before(async () => {
        //SIGNERS AND ACCOUNTS
        accounts = await ethers.getSigners();
        provider = await ethers.provider;
        deployer = accounts[0];
        user = accounts[1];
        keeper = accounts[2];
        user2 = accounts[3]
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
        netValueOfPosition = async (_isLong) => {
          let collateralToken = _isLong ? ADDRESS.WETH : ADDRESS.USDC;
          let response = await GMX_VAULT.getPosition(
            GMX_controller.address,
            collateralToken,
            ADDRESS.WETH,
            _isLong
          );
          let delta = await GMX_VAULT.getPositionDelta(
            GMX_controller.address,
            collateralToken,
            ADDRESS.WETH,
            _isLong
          );
          let netNAV = response[1] + delta[1];
          return netNAV;
        };

      });
      describe("First USDC deposit with exposition set to 1", function () {
        before(async () => {
          //Initialisation parameters
          await MyVault.setGMX_controller(GMX_controller.address);
          await MyVault.acceptToken(USDC.address);
          await USDC.connect(whale).transfer(
            user.address,
            ethers.utils.parseUnits("10", "6").mul(100),
            { gasLimit: 100000 }
          );
          await USDC.connect(whale).transfer(
            user2.address,
            ethers.utils.parseUnits("10", "6").mul(100),
            { gasLimit: 100000 }
          );
          await GMX_POSITION_ROUTER.connect(gmxAdmin).setPositionKeeper(
            keeper.address,
            true
          );
          await MyVault.setExposition(1);
        });
        describe("First deposit", function () {
          before(async () => {
            depositAmount = "120000000";
            ethBalanceT0 = (await user.getBalance()).toString();
            usdcBalanceT0 = (await USDC.balanceOf(user.address)).toString();
            let txapprove = await USDC.connect(user).approve(
              MyVault.address,
              depositAmount
            );
            txr1 = await txapprove.wait();
            let txopenpos = await MyVault.connect(user).deposit(
              ADDRESS.USDC,
              depositAmount,
              {
                value: keepersFee,
                gasLimit: 10000000,
              }
            );
            txr2 = await txopenpos.wait();
            await executeIncreasePositions();
            ethBalanceT1 = (await user.getBalance()).toString();
            usdcBalanceT1 = (await USDC.balanceOf(user.address)).toString();
          });
          it("should have spend gas accordingly (including keepersfee)", async function () {
            gasCost1 = txr1.gasUsed.mul(txr1.effectiveGasPrice);
            gasCost2 = txr2.gasUsed.mul(txr2.effectiveGasPrice);
            await expect(parseInt(ethBalanceT0)).to.be.eq(
              parseInt(ethBalanceT1) + parseInt(gasCost1)+parseInt(gasCost2)+parseInt(keepersFee)
            );
          });
          it("should have spend USDC accordingly", async function () {
            await expect(parseInt(usdcBalanceT1)).to.be.eq(
              parseInt(usdcBalanceT0) - parseInt(depositAmount)
            );
          });
          it("should have open a position", async function () {
            positiont0 = await getPositions(GMX_controller.address, true);
            await expect(positiont0[0].toString()).to.be.eq("132000000000000000000000000000000")
          });
          it("should have received 100% supply of PLP Token ", async function () {
            let plptoken = await MyVault.balanceOf(user.address)
            await expect(plptoken).to.be.eq(await MyVault.totalSupply())
          });
          // it("should have spent gas for the transaction and keepersfee", async function () {
          // });
        });
        describe("Second deposit", function () {
          before(async () => {
            depositAmount = "100000000";
            ethBalanceT0 = (await user2.getBalance()).toString();
            usdcBalanceT0 = (await USDC.balanceOf(user2.address)).toString();
            let txapprove = await USDC.connect(user2).approve(
              MyVault.address,
              depositAmount
            );
            txr1 = await txapprove.wait();
            let txopenpos = await MyVault.connect(user2).deposit(
              ADDRESS.USDC,
              depositAmount,
              {
                value: keepersFee,
                gasLimit: 10000000,
              }
            );
            txr2 = await txopenpos.wait();
            await executeIncreasePositions();
            ethBalanceT1 = (await user2.getBalance()).toString();
            usdcBalanceT1 = (await USDC.balanceOf(user2.address)).toString();
          });

          it("should have spend USDC accordingly", async function () {
            await expect(parseInt(usdcBalanceT1)).to.be.eq(
              parseInt(usdcBalanceT0) - parseInt(depositAmount)
            );
          });
          it("should have increase the open position", async function () {
            let a = await getPositions(GMX_controller.address, true);
            // await expect(a[0].toString()).to.be.eq("132000000000000000000000000000000")
          });
          it("should have received 100% supply of PLP Token ", async function () {
            let plptoken = await MyVault.balanceOf(user2.address)
            // await expect(plptoken).to.be.eq(await MyVault.totalSupply())
          });
        });
      });
    });
