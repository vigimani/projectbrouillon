const { expect } = require("chai");
const { ABIS, ADDRESS } = require("./config");
const { ethers, network, userConfig } = require("hardhat");

describe("GMX controller unit tests", () => {
  before(async function () {
    //SIGNERS AND ACCOUNTS
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ADDRESS.WHALE_USDC],
    });
    whale = await ethers.getSigner(ADDRESS.WHALE_USDC);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xB4d2603B2494103C90B2c607261DD85484b49eF0"],
    });
    gmxAdmin = await ethers.getSigner(
      "0xB4d2603B2494103C90B2c607261DD85484b49eF0"
    );

    // CONTRACTS

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
      await GMX_POSITION_ROUTER.executeIncreasePositions(
        parseInt(await waitingPositionsLength(true)),
        GMX_controller.address
      );
    };
    executeDecreasePositions = async () => {
      await GMX_POSITION_ROUTER.executeDecreasePositions(
        parseInt(await waitingPositionsLength(false)),
        GMX_controller.address
      );
    };
  });
  describe("Deployment", function () {
    it("Should deploy the contracts", async () => {
      expect(GMX_controller.address).not.to.equal("0x");
      console.log(GMX_controller.address)
    });
    it("Should NOT give ownership of the controller", async () => {
      await expect(GMX_controller.connect(accounts[1]).setVaultOwner(deployer.address)).to.be.revertedWith('Ownable: caller is not the owner')
    });
    it("Should give deployer the ownership of the controller", async () => {
      await GMX_controller.setVaultOwner(deployer.address);
      await expect(await GMX_controller.getVaultOwner()).to.be.eq(deployer.address)
    });
  });
  describe("Contract interraction with GMX", function () {
    before(async function () {
      keepersFee = ethers.utils.parseEther("0.01");
    });
    describe("Initialisation", function () {
      it("Should approved GMX Router in constructor", async () => {
        expect(
          await GMX_ROUTER.approvedPlugins(
            GMX_controller.address,
            ADDRESS.GMX_POSITION_ROUTER
          )
        ).to.be.true;
      });
      it("Should fund deployer with USDC", async () => {
        //TRANSFER USDC FROM WHALE TO SIGNER
        await USDC.connect(whale).transfer(
          deployer.address,
          ethers.utils.parseUnits("1000", "6").mul(10),
          {
            gasLimit: 100000,
          }
        );
        expect(await USDC.balanceOf(deployer.address)).to.not.be.equal(0);
      });
      it("Should set a Keeper (account to validate transaction)", async function () {
        await GMX_POSITION_ROUTER.connect(gmxAdmin).setPositionKeeper(
          deployer.address,
          true
        );
        expect(await GMX_POSITION_ROUTER.isPositionKeeper(deployer.address)).to
          .be.true;
      });
    });
    describe("Test LONG ETH/USDC", function () {
      before(async function () {
        positiont0 = await getPositions(GMX_controller.address, true);
      });
      describe("should open a LONG ETH/USDC", function () {
        before(async function () {
          tokenAmount = "15000000";
        });
        it("should add a request", async function () {
          waitingPositionsT0 = await waitingPositionsLength(true);
          await USDC.approve(GMX_controller.address, parseInt(tokenAmount));
          await GMX_controller.increasePosition(tokenAmount, true, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          waitingPositionsT1 = await waitingPositionsLength(true);
          await expect(parseInt(waitingPositionsT1)).to.be.eq(
            parseInt(waitingPositionsT0) + 1
          );
        });
        it("should validate the request", async function () {
          await executeIncreasePositions();
          await expect(await waitingPositionsStart(true)).to.be.equal(
            await waitingPositionsLength(true)
          );
        });
        it("should have a position", async function () {
          positiont1 = await getPositions(GMX_controller.address, true);
          await expect(positiont1[0]).to.be.eq(
            "16500000000000000000000000000000"
          );
        });
        it("should be possible to increase the long position", async function () {
          tokenAmount2 = "20000000";
          await USDC.approve(GMX_controller.address, parseInt(tokenAmount2));
          await GMX_controller.increasePosition(tokenAmount2, true, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await executeIncreasePositions();
          positiont2 = await getPositions(GMX_controller.address, true);
          await expect(positiont2[0]).to.be.eq(
            "38500000000000000000000000000000"
          );
        });
      });
      describe("should close a LONG ETH/USDC", function () {
        before(async function () {
          tokenAmount = "25000000";
          positiont0 = await getPositions(GMX_controller.address, true);
        });
        it("should add a request", async function () {
          waitingPositionsT0 = await waitingPositionsLength(false);
          await GMX_controller.decreasePosition(tokenAmount, true, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          waitingPositionsT1 = await waitingPositionsLength(false);
          await expect(parseInt(waitingPositionsT1)).to.be.eq(
            parseInt(waitingPositionsT0) + 1
          );
        });
        it("should validate the request", async function () {
          await executeDecreasePositions();
          await expect(await waitingPositionsStart(false)).to.be.equal(
            await waitingPositionsLength(false)
          );
        });
        it("should having reduced the position", async function () {
          positiont1 = await getPositions(GMX_controller.address, true);
          await expect(positiont1[0]).to.be.eq(
            "13500000000000000000000000000000"
          );
        });
      });
      describe("should liquidate the LONG ETH/USDC", function () {
        before(async function () {
          tokenAmount3 = "55000000";
          await USDC.approve(GMX_controller.address, parseInt(tokenAmount3));
          await GMX_controller.increasePosition(tokenAmount3, true, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await executeIncreasePositions();
        });
        it("should add a request", async function () {
          waitingPositionsT0 = await waitingPositionsLength(false);
          await GMX_controller.liquidatePosition(true, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await expect(parseInt(await waitingPositionsLength(false))).to.be.eq(
            parseInt(waitingPositionsT0) + 1
          );
        });
        it("should validate the request", async function () {
          await executeDecreasePositions();
          await expect(await waitingPositionsStart(false)).to.be.equal(
            await waitingPositionsLength(false)
          );
        });
        it("should liquidate the position", async function () {
          await expect((await getPositions(GMX_controller.address, true))[0]).to.be.eq("0");
        });
      });
    });
    describe("Test SHORT ETH/USDC", function () {
      before(async function () {
        positiont0 = await getPositions(GMX_controller.address, false);
      });
      describe("should open a SHORT ETH/USDC", function () {
        before(async function () {
          tokenAmount = "15000000";
        });
        it("should add a request", async function () {
          waitingPositionsT0 = await waitingPositionsLength(true);
          await USDC.approve(GMX_controller.address, parseInt(tokenAmount));
          await GMX_controller.increasePosition(tokenAmount, false, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          waitingPositionsT1 = await waitingPositionsLength(true);
          await expect(parseInt(waitingPositionsT1)).to.be.eq(
            parseInt(waitingPositionsT0) + 1
          );
        });
        it("should validate the request", async function () {
          await executeIncreasePositions();
          await expect(await waitingPositionsStart(true)).to.be.equal(
            await waitingPositionsLength(true)
          );
        });
        it("should have a position", async function () {
          positiont1 = await getPositions(GMX_controller.address, false);
          await expect(parseInt(positiont1[0])).to.be.eq(
            parseInt(positiont0[0]) + parseInt(tokenAmount) * 10 ** 24 * 1.1
          );
          // positiont1.forEach((elem)=> console.log(elem.toString()))
        });
        it("should be possible to increase the short position", async function () {
          tokenAmount2 = "20000000";
          await USDC.approve(GMX_controller.address, parseInt(tokenAmount2));
          await GMX_controller.increasePosition(tokenAmount2, false, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await executeIncreasePositions();
          positiont2 = await getPositions(GMX_controller.address, false);
          // positiont2.forEach((elem)=> console.log(elem.toString()))
          await expect(positiont2[0].toString()).to.be.eq(
            "38500000000000000000000000000000"
          );
        });
      });
      describe("should close a SHORT ETH/USDC", function () {
        before(async function () {
          tokenAmount = "25000000";
          positiont0 = await getPositions(GMX_controller.address, false);
          // positiont0.forEach((elem) => console.log(elem.toString()));
        });
        it("should add a request", async function () {
          waitingPositionsT0 = await waitingPositionsLength(false);
          await GMX_controller.decreasePosition(tokenAmount, false, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          waitingPositionsT1 = await waitingPositionsLength(false);
          await expect(parseInt(waitingPositionsT1)).to.be.eq(
            parseInt(waitingPositionsT0) + 1
          );
        });
        it("should validate the request", async function () {
          await executeDecreasePositions();
          await expect(await waitingPositionsStart(false)).to.be.equal(
            await waitingPositionsLength(false)
          );
        });
        it("should having reduced the position", async function () {
          positiont1 = await getPositions(GMX_controller.address, false);
          // positiont1.forEach((elem) => console.log(elem.toString()));
          await expect(positiont1[0]).to.be.eq(
            "13500000000000000000000000000000"
          );
        });
      });
      describe("should liquidate the SHORT ETH/USDC", function () {
        before(async function () {
          tokenAmount3 = "55000000";
          await USDC.approve(GMX_controller.address, parseInt(tokenAmount3));
          await GMX_controller.increasePosition(tokenAmount3, false, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await executeIncreasePositions();
        });
        it("should add a request", async function () {
          waitingPositionsT0 = await waitingPositionsLength(false);
          await GMX_controller.liquidatePosition(false, {
            value: keepersFee,
            gasLimit: 10000000,
          });
          await expect(parseInt(await waitingPositionsLength(false))).to.be.eq(
            parseInt(waitingPositionsT0) + 1
          );
        });
        it("should validate the request", async function () {
          await executeDecreasePositions();
          await expect(await waitingPositionsStart(false)).to.be.equal(
            await waitingPositionsLength(false)
          );
        });
        it("should liquidate the position", async function () {
          expect((await getPositions(GMX_controller.address, false))[0]).to.be.eq("0");
        });
      });
    });
  });
});
