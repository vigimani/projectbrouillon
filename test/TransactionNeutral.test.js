const { assert, expect, expectRevert, withNamedArgs } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { ABIS, ADDRESS } = require("./@config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Test transactions from user on Vault on SHORT exposition", function () {
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
        positionInfo = async(_isLong) => {
          let response = await getPositions(GMX_controller.address, _isLong)
          data = {
            size : parseInt((response[0].toString())),
            collateral : parseInt((response[1].toString())),
            avg_price : parseInt((response[2].toString())),
            delta : parseInt((response[8].toString())),
            leverage : parseInt((response[0].toString())) / parseInt((response[1].toString())),
            nav : parseInt((response[1].toString()))+parseInt((response[8].toString()))
          }
          return(data)
        }
        userInfo = async(_user) => {
          ethBalance = parseInt((await _user.getBalance()).toString());
          usdcBalance = parseInt((await USDC.balanceOf(_user.address)).toString());
          plpBalance = parseInt((await MyVault.balanceOf(_user.address)).toString());
          totalsupply = parseInt((await MyVault.totalSupply()).toString());
          return({
            eth_balance : ethBalance, 
            usdc_balance : usdcBalance, 
            plp_balance : plpBalance, 
            shares : plpBalance/totalsupply
          })
        }
        vaultInfo = async() => {
          totalsupply = parseInt((await MyVault.totalSupply()).toString());
          await MyVault.updateNetAssetValue();
          netAssetValue = parseInt((await MyVault.getNetAssetValue()).toString())
          pricepershare = netAssetValue / totalsupply;
          return({
            price_per_share: pricepershare, 
            total_supply: totalsupply, 
            net_asset_value: netAssetValue
          })
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
      describe("Full test on Short position", function () {
        before(async () => {
          //Initialisation parameters
          await MyVault.setGMX_controller(GMX_controller.address);
          await MyVault.acceptToken(USDC.address);

          await USDC.connect(whale).transfer(
            user.address,
            ethers.utils.parseUnits("10", "6").mul(1000),
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
        //   await MyVault.setExposition(0); //1 for Long | 2 for short | 0 for neutral
        });
        describe("First deposit", function () {
          before(async () => {

            beforeUser = await userInfo(user)
            beforeVault = await vaultInfo()

            await depositStrat(user, deposit1)

            afterPosS = await positionInfo(false) //true for long false for short
            afterPosL = await positionInfo(true)
            afterUser = await userInfo(user)
            afterVault = await vaultInfo()
          });
          it("tests on user balances", async function () {
            await expect(afterUser["usdc_balance"]).to.be.eq(beforeUser["usdc_balance"]-deposit1)
            await expect(afterUser["shares"]).to.be.eq(1)
            await expect(afterUser["plp_balance"]).to.be.eq(parseInt(deposit1))
            console.log("Deposit 1 :", deposit1)
            console.log("Acq. price of PLP :", deposit1/afterUser["plp_balance"])
            console.log("# PLP received :", afterUser["plp_balance"])
            console.log("Post - Price per share :", afterVault["price_per_share"])
            console.log("Fees paid :", deposit1-afterUser["plp_balance"]*afterVault["price_per_share"]) 
            console.log("Total value of investment :", afterUser["plp_balance"]*afterVault["price_per_share"])
          });
          it("tests on positions", async function () {
            await expect(afterPosS["size"]).to.be.eq(0)
            await expect(afterPosL["size"]).to.be.eq(0)
            await expect(afterVault["net_asset_value"]).to.be.equal(parseInt(deposit1))
          });
        });
        describe("Second deposit", function () {
          before(async () => {
            beforeUser = await userInfo(user)
            beforeUser2 = await userInfo(user2)
            beforeVault = await vaultInfo()
            await depositStrat(user2, deposit2)

            afterPosS = await positionInfo(false)
            afterPosL = await positionInfo(true)
            afterUser = await userInfo(user)
            afterUser2 = await userInfo(user2)
            afterVault = await vaultInfo()
          });
          it("tests on user 2", async function () {
            await expect(afterUser2["usdc_balance"]).to.be.eq(beforeUser2["usdc_balance"]-parseInt(deposit2));
          });
          it("tests on position", async function () {
            await expect(afterPosS["size"]).to.be.eq(0)
            await expect(afterPosL["size"]).to.be.eq(0)
            await expect(afterVault["net_asset_value"]).to.be.equal(parseInt(deposit1)+parseInt(deposit2))
          });
          it("report", async function () {
            console.log("Deposit #2 :", deposit2)
            console.log("Pre price per share :", beforeVault["price_per_share"])
            console.log("Post price per share :", afterVault["price_per_share"])
            console.log("var. :", parseInt((afterVault["price_per_share"]-beforeVault["price_per_share"])/(beforeVault["price_per_share"])).toFixed(2),"%")
            console.log("Pre nav :", beforeVault["net_asset_value"]/10**6)
            console.log("Post nav:", afterVault["net_asset_value"]/10**6)
            console.log("var. :", afterVault["net_asset_value"]-beforeVault["net_asset_value"])
            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeUser["plp_balance"] )
            console.log("Fees paid :", (deposit1-beforeUser["plp_balance"]*beforeVault["price_per_share"])/deposit1)
            console.log("Pre op value :", (beforeUser["plp_balance"]*beforeVault["price_per_share"])/10**6)
            console.log("Post op value :", (afterUser["plp_balance"]*afterVault["price_per_share"])/10**6)
            console.log("Post op shares :", parseInt(100*afterUser["shares"]).toFixed(1),"%")
            console.log("--")
            console.log("User 2")
            console.log("Amount invested : ", deposit2)
            console.log("Acq. price of PLP :", deposit2/afterUser2["plp_balance"] )
            console.log("PLP received : ", afterUser2["plp_balance"])
            console.log("Value of investment : ", afterUser2["plp_balance"]*afterVault["price_per_share"])
            console.log("share :", parseInt(100*afterUser2["shares"]).toFixed(1),"%")
            console.log("Fees paid :", (deposit2-afterUser2["plp_balance"]*afterVault["price_per_share"])/deposit2)
          });
        });
        describe("Third deposit", function () {
          before(async () => {

            beforeUser = await userInfo(user)
            beforeUser2 = await userInfo(user2)
            beforeUser3 = await userInfo(user3)
            beforeVault = await vaultInfo()
            await depositStrat(user3, deposit3)
            afterPosS = await positionInfo(false) 
            afterPosL = await positionInfo(true)
            afterUser = await userInfo(user)
            afterUser2 = await userInfo(user2)
            afterUser3 = await userInfo(user3)
            afterVault = await vaultInfo()
          });
          it("tests on user 3", async function () {
            await expect(afterUser3["usdc_balance"]).to.be.eq(beforeUser3["usdc_balance"]-parseInt(deposit3));
          });
          it("tests on position", async function () {
            await expect(afterPosS["size"]).to.be.eq(0)
            await expect(afterPosL["size"]).to.be.eq(0)
            await expect(afterVault["net_asset_value"]).to.be.equal(parseInt(deposit1)+parseInt(deposit2)+parseInt(deposit3))
          });
          it("report", async function () {
            console.log("Deposit #3 :", deposit3)
            console.log("Pre money price per share :", beforeVault["price_per_share"])
            console.log("Post money price per share :", afterVault["price_per_share"])
            console.log("var. :", parseInt((afterVault["price_per_share"]-beforeVault["price_per_share"])/(beforeVault["price_per_share"])).toFixed(2),"%")
            console.log("Pre nav :", beforeVault["net_asset_value"]/10**6)
            console.log("Post nav:", afterVault["net_asset_value"]/10**6)
            console.log("var. :", afterVault["net_asset_value"]-beforeVault["net_asset_value"])

            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeUser["plp_balance"] )
            console.log("Pre op value :", beforeUser["plp_balance"]*beforeVault["price_per_share"])
            console.log("Post op value :", afterUser["plp_balance"]*afterVault["price_per_share"])
            console.log("--")

            console.log("User 2")
            console.log("Acq. price of PLP :", deposit2/beforeUser2["plp_balance"] )
            console.log("Pre op value :", beforeUser2["plp_balance"]*beforeVault["price_per_share"])
            console.log("Post op value :", afterUser2["plp_balance"]*afterVault["price_per_share"])
            console.log("--")

            console.log("User 3")
            console.log("Amount invested : ", deposit3)
            console.log("Acq. price of PLP :", deposit3/afterUser3["plp_balance"] )
            console.log("PLP received : ", afterUser3["plp_balance"])
            console.log("Value of investment : ", afterUser3["plp_balance"]*afterVault["price_per_share"])
            console.log("Fees paid :", (deposit3-afterUser3["plp_balance"]*afterVault["price_per_share"])/deposit3)
          });
        });
        describe("Withdraw of a user", function () {
          before(async () => {

            beforeUser = await userInfo(user)
            beforeUser2 = await userInfo(user2)
            beforeUser3 = await userInfo(user3)
            beforeVault = await vaultInfo()
            withdrawamount = "100000000"
            let txclosepos = await MyVault.connect(user3).withdraw(
              withdrawamount,
              {
                value: keepersFee,
                gasLimit: 10000000,
              }
            );
            txr2 = await txclosepos.wait();
            await executeDecreasePositions();


            afterPosS = await positionInfo(false) 
            afterPosL = await positionInfo(true)
            afterUser = await userInfo(user)
            afterUser2 = await userInfo(user2)
            afterUser3 = await userInfo(user3)
            afterVault = await vaultInfo()
          });
          it("test on position", async function () {
            await expect(afterPosS["size"]).to.be.eq(0)
            await expect(afterPosL["size"]).to.be.eq(0)
            await expect(afterVault["net_asset_value"]).to.be.equal(parseInt(deposit1)+parseInt(deposit2)+parseInt(deposit3)-parseInt(withdrawamount))
          });
          it("test on users", async function () {
            await expect(afterUser["plp_balance"]*afterVault["price_per_share"]).to.be.within(beforeUser["plp_balance"]*beforeVault["price_per_share"], beforeUser["plp_balance"]*beforeVault["price_per_share"]*1.01)
            await expect(afterUser2["plp_balance"]*afterVault["price_per_share"]).to.be.within(beforeUser2["plp_balance"]*beforeVault["price_per_share"], beforeUser2["plp_balance"]*beforeVault["price_per_share"]*1.01)

          });
          it("report", async function () {
            console.log("Withdraw :", (parseInt("100000000")))
            console.log("Pre money price per share :", beforeVault["price_per_share"])
            console.log("Post money price per share :", afterVault["price_per_share"])
            console.log("Delta nav :", beforeVault["net_asset_value"]-afterVault["net_asset_value"])

            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeUser["plp_balance"] )
            console.log("Pre op value :", beforeUser["plp_balance"]*beforeVault["price_per_share"])
            console.log("Post op value :", afterUser["plp_balance"]*afterVault["price_per_share"])
            console.log("--")

            console.log("User 2")
            console.log("Acq. price of PLP :", deposit2/beforeUser2["plp_balance"] )
            console.log("Pre op value :", beforeUser2["plp_balance"]*beforeVault["price_per_share"])
            console.log("Post op value :", afterUser2["plp_balance"]*afterVault["price_per_share"])
            console.log("--")

            console.log("User 3")
            console.log("Acq. price of PLP :", deposit3/beforeUser3["plp_balance"] )
            console.log("PLP before op :", beforeUser3["plp_balance"]/10**6)
            console.log("Value before op :", beforeUser3["plp_balance"]*beforeVault["price_per_share"]/10**6)

            console.log("PLP remaining : ", afterUser3["plp_balance"]/10**6)
            console.log("Post op Value of investment : ", afterUser3["plp_balance"]*afterVault["price_per_share"]/10**6)

            console.log("PLP Sold :", (beforeUser3["plp_balance"]-afterUser3["plp_balance"])/10**6)
            console.log("Value sold :", beforeUser3["plp_balance"]*beforeVault["price_per_share"]-afterUser3["plp_balance"]*afterVault["price_per_share"])
            console.log("Value per PLP sold : ", (beforeUser3["plp_balance"]*beforeVault["price_per_share"]-afterUser3["plp_balance"]*afterVault["price_per_share"])/(beforeUser3["plp_balance"]-afterUser3["plp_balance"]))
            console.log("USDC en + :", (afterUser3["usdc_balance"]-beforeUser3["usdc_balance"])/10**6)
          });
        });
      });
    });
