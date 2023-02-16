const { assert, expect, expectRevert, withNamedArgs } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { ABIS, ADDRESS } = require("./@config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Test transactions from user on Vault on LONG exposition", function () {
      let accounts;
      before(async () => {
        //SIGNERS AND ACCOUNTS
        accounts = await ethers.getSigners();
        provider = await ethers.provider;
        deployer = accounts[0];
        keeper = accounts[9];
        user = accounts[1];
        user2 = accounts[2]
        user3 = accounts[3]
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
        deposit1 = "100000000"
        deposit2 = "150000000"
        deposit3 = "250000000"

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
        positionInfo = async() => {
          let response = await getPositions(GMX_controller.address, true)
          data = []
          response.forEach((elem) => data.push(parseInt((elem.toString()))))
          leverage = data[0] / data[1];
          nav = data[1] + data[8];
          data.push(leverage)
          data.push(nav)
          return(data)
        }
        userInfo = async(_user) => {
          ethBalance = parseInt((await _user.getBalance()).toString());
          usdcBalance = parseInt((await USDC.balanceOf(_user.address)).toString());
          plpBalance = parseInt((await MyVault.balanceOf(_user.address)).toString());
          totalsupply = parseInt((await MyVault.totalSupply()).toString());
          return([ethBalance, usdcBalance, plpBalance, plpBalance/totalsupply])
        }
        vaultInfo = async() => {
          totalsupply = parseInt((await MyVault.totalSupply()).toString());
          await MyVault.updateNetAssetValue();
          netAssetValue = parseInt((await MyVault.getNetAssetValue()).toString())
          pricepershare = netAssetValue / totalsupply;
          return([pricepershare, totalsupply, netAssetValue])
        }
        depositStrat = async(_user, amount) => {
          depositAmount = amount;
          let txapprove = await USDC.connect(_user).approve(
            MyVault.address,
            depositAmount
          );
          txr1 = await txapprove.wait();
          let txopenpos = await MyVault.connect(_user).deposit(
            ADDRESS.USDC,
            depositAmount,
            {
              value: keepersFee,
              gasLimit: 10000000,
            }
          );
          txr2 = await txopenpos.wait();
          await executeIncreasePositions();
        }
        withdrawStrat = async(_user, amount) => {
          let txclosepos = await MyVault.connect(_user).withdraw(
            amount,
            {
              value: keepersFee,
              gasLimit: 10000000,
            }
          );
          txr2 = await txclosepos.wait();
          await executeDecreasePositions();
        }
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

      describe("Full test on LONG position", function () {
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
          await USDC.connect(whale).transfer(
            user3.address,
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
            ethBalanceT0 = (await user.getBalance()).toString();
            usdcBalanceT0 = (await USDC.balanceOf(user.address)).toString();

            await depositStrat(user, deposit1)

            ethBalanceT1 = (await user.getBalance()).toString();
            usdcBalanceT1 = (await USDC.balanceOf(user.address)).toString();
          });
          it("should have spend USDC accordingly", async function () {
            await expect(parseInt(usdcBalanceT1)).to.be.eq(
              parseInt(usdcBalanceT0) - parseInt(deposit1)
            );
          });
          it("should have open a position", async function () {
            positiont0 = await getPositions(GMX_controller.address, true);
            await expect(parseInt(positiont0[0].toString())/1e24).to.be.eq(parseInt(parseInt(deposit1).toFixed(0)*1.1))
          });
          it("should have received 100% supply of PLP Token ", async function () {
            let plptoken = await MyVault.balanceOf(user.address)
            await expect(plptoken).to.be.eq(await MyVault.totalSupply())
          });
        });
        describe("Second deposit", function () {
          before(async () => {
            beforePos = await positionInfo()
            beforeUser = await userInfo(user)
            beforeUser2 = await userInfo(user2)
            beforeVault = await vaultInfo()
            await depositStrat(user2, deposit2)
            afterPos = await positionInfo()
            afterUser = await userInfo(user)
            afterUser2 = await userInfo(user2)
            afterVault = await vaultInfo()
          });
          it("should have spend USDC accordingly", async function () {
            await expect(afterUser2[1]).to.be.eq(beforeUser2[1]-parseInt(deposit2));
          });
          it("should have increase the open position", async function () {
            await expect(afterPos[0]/1e24).to.be.eq(beforePos[0]/1e24+1.1*parseInt(deposit2));
          });
          it("should have received adquate amount of PLP Token ", async function () {
            console.log("Vault")
            console.log("Pre op leverage", beforePos[9])
            console.log("Pre money price per share :", beforeVault[0])

            console.log("Post money price per share :", afterVault[0])
            console.log("Post op leverage", afterPos[9])
            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeUser[2] )
            console.log("Fees paid :", (deposit1-beforeUser[2]*beforeVault[0])/deposit1)
            console.log("Pre op value :", beforeUser[2]*beforeVault[0])
            console.log("Pre op shares :", parseInt(100*beforeUser[3]).toFixed(1),"%")
            console.log("Post op value :", afterUser[2]*afterVault[0])
            console.log("Post op shares :", parseInt(100*afterUser[3]).toFixed(1),"%")
            console.log("--")
            console.log("User 2")
            console.log("Amount invested : ", deposit2)
            console.log("Acq. price of PLP :", deposit2/afterUser2[2] )
            console.log("PLP received : ", afterUser2[2])
            console.log("Value of investment : ", afterUser2[2]*afterVault[0])
            console.log("share :", parseInt(100*afterUser2[3]).toFixed(1),"%")
            console.log("Fees paid :", (deposit2-afterUser2[2]*afterVault[0])/deposit2)
          });
        });
        describe("Third deposit", function () {
          before(async () => {
            beforePos = await positionInfo()
            beforeUser = await userInfo(user)
            beforeUser2 = await userInfo(user2)
            beforeUser3 = await userInfo(user3)
            beforeVault = await vaultInfo()
            await depositStrat(user3, deposit3)
            afterPos = await positionInfo()
            afterUser = await userInfo(user)
            afterUser2 = await userInfo(user2)
            afterUser3 = await userInfo(user3)
            afterVault = await vaultInfo()
          });
          it("should have received adquate amount of PLP Token ", async function () {
            console.log("Vault")
            console.log("Pre op leverage", beforePos[9])
            console.log("Pre money price per share :", beforeVault[0])

            console.log("Post money price per share :", afterVault[0])
            console.log("Post op leverage", afterPos[9])
            console.log("--")
            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeUser[2] )
            console.log("Pre op value :", beforeUser[2]*beforeVault[0])
            console.log("Pre op shares :", parseInt(100*beforeUser[3]).toFixed(1),"%")
            console.log("Post op value :", afterUser[2]*afterVault[0])
            console.log("Post op shares :", parseInt(100*afterUser[3]).toFixed(1),"%")
            console.log("--")

            console.log("User 2")
            console.log("Acq. price of PLP :", deposit2/beforeUser2[2] )
            console.log("Pre op value :", beforeUser2[2]*beforeVault[0])
            console.log("Pre op shares :", parseInt(100*beforeUser2[3]).toFixed(1),"%")
            console.log("Post op value :", afterUser2[2]*afterVault[0])
            console.log("Post op shares :", parseInt(100*afterUser2[3]).toFixed(1),"%")
            console.log("--")

            console.log("User 3")
            console.log("Amount invested : ", deposit3)
            console.log("Acq. price of PLP :", deposit3/afterUser3[2] )
            console.log("PLP received : ", afterUser3[2])
            console.log("Value of investment : ", afterUser3[2]*afterVault[0])
            console.log("share :", parseInt(100*afterUser3[3]).toFixed(1),"%")
            console.log("Fees paid :", (deposit3-afterUser3[2]*afterVault[0])/deposit3)
          });
        });
        describe("Full withdraw of a user", function () {
          before(async () => {
            beforePos = await positionInfo()
            beforeUser = await userInfo(user)
            beforeUser2 = await userInfo(user2)
            beforeUser3 = await userInfo(user3)
            beforeVault = await vaultInfo()
            await withdrawStrat(user3, (parseInt(deposit3)/10).toString())
            afterPos = await positionInfo()
            afterUser = await userInfo(user)
            afterUser2 = await userInfo(user2)
            afterUser3 = await userInfo(user3)
            afterVault = await vaultInfo()

            console.log(beforePos)
            console.log(afterPos)
          });
          it("should have received adquate amount of PLP Token ", async function () {
            console.log("Vault")
            console.log("Pre op leverage", beforePos[9])
            console.log("Pre money price per share :", beforeVault[0])
            console.log("Post money price per share :", afterVault[0])
            console.log("Post op leverage", afterPos[9])
            console.log("Delta nav :", beforeVault[2]-afterVault[2])

            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeUser[2] )
            console.log("Pre op value :", beforeUser[2]*beforeVault[0])
            console.log("Pre op shares :", parseInt(100*beforeUser[3]).toFixed(1),"%")
            console.log("Post op value :", afterUser[2]*afterVault[0])
            console.log("Post op shares :", parseInt(100*afterUser[3]).toFixed(1),"%")
            console.log("--")

            console.log("User 2")
            console.log("Acq. price of PLP :", deposit2/beforeUser2[2] )
            console.log("Pre op value :", beforeUser2[2]*beforeVault[0])
            console.log("Pre op shares :", parseInt(100*beforeUser2[3]).toFixed(1),"%")
            console.log("Post op value :", afterUser2[2]*afterVault[0])
            console.log("Post op shares :", parseInt(100*afterUser2[3]).toFixed(1),"%")
            console.log("--")

            console.log("User 3")
            console.log("Acq. price of PLP :", deposit3/beforeUser3[2] )
            console.log("PLP before op :", beforeUser3[2])
            console.log("Value before op :", beforeUser3[2]*beforeVault[0])

            console.log("PLP remaining : ", afterUser3[2])
            console.log("Value of investment : ", afterUser3[2]*afterVault[0])

            console.log("PLP Sold :", beforeUser3[2]-afterUser3[2])
            console.log("Value sold :", beforeUser3[2]*beforeVault[0]-afterUser3[2]*afterVault[0])
            console.log("Value per PLP sold : ", (beforeUser3[2]*beforeVault[0]-afterUser3[2]*afterVault[0])/(beforeUser3[2]-afterUser3[2]))
          });
        });
      });
    });
