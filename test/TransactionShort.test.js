const { assert, expect, expectRevert, withNamedArgs } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { ABIS, ADDRESS } = require("./@config");
const {getData, WaitingPositionsLength, VaultInfo, UserInfo, PositionInfo, Impersonate } = require("./@utils");

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
        whale = await Impersonate(ADDRESS.WHALE_USDC) //to fund hardhat account with real USDC
        gmxAdmin = await Impersonate(ADDRESS.GMX_ADMIN_ACCOUNT) //to athorize a keepers for validating tx

        //VARIABLE
        keepersFee = ethers.utils.parseEther("0.01");
        deposit1 = "100000000" //100 USDC
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
        positionInfo = async(_isLong) => {
          return await PositionInfo(GMX_controller.address, _isLong)
        }
        userInfo = async(_user) => {
          return await UserInfo(MyVault, _user)
        }
        vaultInfo = async() => {
          return await VaultInfo(MyVault)
        }
        executeIncreasePositions = async () => {
          await GMX_POSITION_ROUTER.connect(keeper).executeIncreasePositions(
            parseInt(await WaitingPositionsLength(GMX_POSITION_ROUTER, true)),
            GMX_controller.address
          );
        };
        executeDecreasePositions = async () => {
          await GMX_POSITION_ROUTER.connect(keeper).executeDecreasePositions(
            parseInt(await WaitingPositionsLength(GMX_POSITION_ROUTER, false)),
            GMX_controller.address
          );
        };

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

      });
      
      describe("Full test on Short position", function () {
        before(async () => {
          //Initialisation parameters
          await MyVault.setGMX_controller(GMX_controller.address);
          await MyVault.acceptToken(USDC.address);
          await USDC.connect(whale).transfer(
            user.address,
            ethers.utils.parseUnits("10", "6").mul(1000), //10 000 USDC
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
          await MyVault.setExposition(2); //1 for Long | 2 for short
        });
        describe("First deposit", function () {
          before(async () => {
            //user, vault contract, GMX_controller contract, USDC contract
            beforeTx = await getData(MyVault, GMX_controller, USDC, user)
            await depositStrat(user, deposit1)
            afterTx = await getData(MyVault, GMX_controller, USDC, user)
            console.log(beforeTx)
            console.log(afterTx)
          });
          it("tests on user balances", async function () {
            await expect(afterTx["user"][1]["usdc_balance"]).to.be.eq(beforeTx["user"][1]["usdc_balance"]-deposit1)
            await expect(afterTx["user"][1]["shares"]).to.be.eq(1)
            await expect(afterTx["user"][1]["plp_balance"]).to.be.eq(parseInt(deposit1))
            console.log("Deposit 1 :", deposit1)
            console.log("Acq. price of PLP :", deposit1/afterTx["user"][1]["plp_balance"])
            console.log("# PLP received :", afterTx["user"][1]["plp_balance"])
            console.log("Post - Price per share :", afterTx["vault"]["share_price"])
            console.log("Fees paid :", deposit1-afterTx["user"][1]["plp_balance"]*afterTx["vault"]["share_price"]) 
            console.log("Total value of investment :", afterTx["user"][1]["plp_balance"]*afterTx["vault"]["share_price"])
          });
          it("tests on positions", async function () {
            await expect(afterTx["positions"]["long"]["size"]).to.be.eq(0)
            await expect(afterTx["positions"]["short"]["size"]/10**24).to.be.eq(parseInt(parseInt(deposit1*1.1).toFixed(0)))
            await expect(afterTx["positions"]["short"]["leverage"]).to.be.within(1.09, 1.11)
          });
        });
        describe("Second deposit", function () {
          before(async () => {
            beforeTx = await getData(MyVault, GMX_controller, USDC, user, user2)
            await depositStrat(user2, deposit2)
            afterTx = await getData(MyVault, GMX_controller, USDC, user, user2)
            console.log(beforeTx)
            console.log(afterTx)
          });
          it("tests on user 2", async function () {
            await expect(afterTx["user"][2]["usdc_balance"]).to.be.eq(beforeTx["user"][2]["usdc_balance"]-parseInt(deposit2));
          });
          it("tests on position", async function () {
            await expect(afterTx["positions"]["short"]["size"]/10**24).to.be.eq(beforeTx["positions"]["short"]["size"]/10**24+parseInt(parseInt(deposit2*1.1).toFixed(0)))
            await expect(afterTx["positions"]["short"]["leverage"]).to.be.within(1.09, 1.11)
          });
          it("tests on vault", async function () {
            await expect(afterTx["vault"]["share_price"]).to.be.within( beforeTx["vault"]["share_price"], beforeTx["vault"]["share_price"]*1.01)
            await expect( afterTx["vault"]["net_asset_value"]/10**6).to.be.within(beforeTx["vault"]["net_asset_value"]/10**6+0.9*parseInt(deposit2)/10**6, beforeTx["vault"]["net_asset_value"]/10**6+parseInt(deposit2)/10**6)
          });
          it("report", async function () {
            console.log("Deposit #2 :", deposit2)
            console.log("Pre price per share :", beforeTx["vault"]["share_price"])
            console.log("Post price per share :", afterTx["vault"]["share_price"])
            console.log("var. :", parseInt((afterTx["vault"]["share_price"]-beforeTx["vault"]["share_price"])/(beforeTx["vault"]["share_price"])).toFixed(2),"%")
            console.log("Pre nav :", beforeTx["vault"]["net_asset_value"]/10**6)
            console.log("Post nav:", afterTx["vault"]["net_asset_value"]/10**6)
            console.log("var. :", afterTx["vault"]["net_asset_value"]-beforeTx["vault"]["net_asset_value"])
            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeTx["user"][1]["plp_balance"] )
            console.log("Fees paid :", (deposit1-beforeTx["user"][1]["plp_balance"]*beforeTx["vault"]["share_price"])/deposit1)
            console.log("Pre op value :", (beforeTx["user"][1]["plp_balance"]*beforeTx["vault"]["share_price"])/10**6)
            console.log("Post op value :", (afterTx["user"][1]["plp_balance"]*afterTx["vault"]["share_price"])/10**6)
            console.log("Post op shares :", parseInt(100*afterTx["user"][1]["shares"]).toFixed(1),"%")
            console.log("--")
            console.log("User 2")
            console.log("Amount invested : ", deposit2)
            console.log("Acq. price of PLP :", deposit2/afterTx["user"][2]["plp_balance"] )
            console.log("PLP received : ", afterTx["user"][2]["plp_balance"])
            console.log("Value of investment : ", afterTx["user"][2]["plp_balance"]*afterTx["vault"]["share_price"])
            console.log("share :", parseInt(100*afterTx["user"][2]["shares"]).toFixed(1),"%")
            console.log("Fees paid :", (deposit2-afterTx["user"][2]["plp_balance"]*afterTx["vault"]["share_price"])/deposit2)
          });
        });
        describe("Third deposit", function () {
          before(async () => {
            beforeTx = await getData(MyVault, GMX_controller, USDC, user, user2, user3)
            await depositStrat(user3, deposit3)
            afterTx = await getData(MyVault, GMX_controller, USDC, user, user2, user3)
          });
          it("tests on user 3", async function () {
            await expect(afterTx["user"][3]["usdc_balance"]).to.be.eq(beforeTx["user"][3]["usdc_balance"]-parseInt(deposit3));
          });
          it("tests on position", async function () {
            await expect(afterTx["positions"]["short"]["size"]/10**24).to.be.eq(beforeTx["positions"]["short"]["size"]/10**24+parseInt(parseInt(deposit3*1.1).toFixed(0)))
            await expect(afterTx["positions"]["short"]["leverage"]).to.be.within(1.09, 1.12)
            console.log("Leverage :", afterTx["positions"]["short"]["leverage"])
          });
          it("report", async function () {
            console.log("Deposit #3 :", deposit3)
            console.log("Pre money price per share :", beforeTx["vault"]["share_price"])
            console.log("Post money price per share :", afterTx["vault"]["share_price"])
            console.log("var. :", parseInt((afterTx["vault"]["share_price"]-beforeTx["vault"]["share_price"])/(beforeTx["vault"]["share_price"])).toFixed(2),"%")
            console.log("Pre nav :", beforeTx["vault"]["net_asset_value"]/10**6)
            console.log("Post nav:", afterTx["vault"]["net_asset_value"]/10**6)
            console.log("var. :", afterTx["vault"]["net_asset_value"]-beforeTx["vault"]["net_asset_value"])

            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeTx["user"][1]["plp_balance"] )
            console.log("Pre op value :", beforeTx["user"][1]["plp_balance"]*beforeTx["vault"]["share_price"])
            console.log("Post op value :", afterTx["user"][1]["plp_balance"]*afterTx["vault"]["share_price"])
            console.log("--")

            console.log("User 2")
            console.log("Acq. price of PLP :", deposit2/beforeTx["user"][2]["plp_balance"] )
            console.log("Pre op value :", beforeTx["user"][2]["plp_balance"]*beforeTx["vault"]["share_price"])
            console.log("Post op value :", afterTx["user"][2]["plp_balance"]*afterTx["vault"]["share_price"])
            console.log("--")

            console.log("User 3")
            console.log("Amount invested : ", deposit3)
            console.log("Acq. price of PLP :", deposit3/afterTx["user"][3]["plp_balance"] )
            console.log("PLP received : ", afterTx["user"][3]["plp_balance"])
            console.log("Value of investment : ", afterTx["user"][3]["plp_balance"]*afterTx["vault"]["share_price"])
            console.log("Fees paid :", (deposit3-afterTx["user"][3]["plp_balance"]*afterTx["vault"]["share_price"])/deposit3)
          });
        });
        describe("Withdraw of a user", function () {
          before(async () => {
            beforeTx = await getData(MyVault, GMX_controller, USDC, user, user2, user3)
            let a =  await parseInt(await WaitingPositionsLength(GMX_POSITION_ROUTER, false))
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
            let b =  await parseInt(await WaitingPositionsLength(GMX_POSITION_ROUTER, false))
            console.log("a:",a)
            console.log(b)
            afterTx = await getData(MyVault, GMX_controller, USDC, user, user2, user3)
            console.log(beforeTx)
            console.log(afterTx)
          });
          it("test on position", async function () {
            console.log(beforeTx["positions"]["short"])
            console.log(afterTx["positions"]["short"])
            await expect(beforeTx["positions"]["short"]["collateral"]).to.be.equal(afterTx["positions"]["short"]["collateral"]+0.99*parseInt(withdrawamount)*10**24)
            await expect(afterTx["positions"]["short"]["leverage"]).to.be.within(1.09, 1.11)
          });
          it("test on users", async function () {
            await expect((afterTx["user"][3]["usdc_balance"]-beforeTx["user"][3]["usdc_balance"])/10**6).to.be.within(98,100)
            await expect(afterTx["user"][1]["plp_balance"]*afterTx["vault"]["share_price"]).to.be.within(beforeTx["user"][1]["plp_balance"]*beforeTx["vault"]["share_price"], beforeTx["user"][1]["plp_balance"]*beforeTx["vault"]["share_price"]*1.01)
            await expect(afterTx["user"][2]["plp_balance"]*afterTx["vault"]["share_price"]).to.be.within(beforeTx["user"][2]["plp_balance"]*beforeTx["vault"]["share_price"], beforeTx["user"][2]["plp_balance"]*beforeTx["vault"]["share_price"]*1.01)

          });
          it("report", async function () {
            console.log("Withdraw :", (parseInt("100000000")))
            console.log("Pre op leverage", beforeTx["positions"]["leverage"])
            console.log("Pre money price per share :", beforeTx["vault"]["share_price"])
            console.log("Post money price per share :", afterTx["vault"]["share_price"])
            console.log("Post op leverage", afterTx["positions"]["short"]["leverage"])
            console.log("Delta nav :", beforeTx["vault"]["net_asset_value"]-afterTx["vault"]["net_asset_value"])

            console.log("--")
            console.log("User 1")
            console.log("Acq. price of PLP :", deposit1/beforeTx["user"][1]["plp_balance"] )
            console.log("Pre op value :", beforeTx["user"][1]["plp_balance"]*beforeTx["vault"]["share_price"])
            console.log("Post op value :", afterTx["user"][1]["plp_balance"]*afterTx["vault"]["share_price"])
            console.log("--")

            console.log("User 2")
            console.log("Acq. price of PLP :", deposit2/beforeTx["user"][2]["plp_balance"] )
            console.log("Pre op value :", beforeTx["user"][2]["plp_balance"]*beforeTx["vault"]["share_price"])
            console.log("Post op value :", afterTx["user"][2]["plp_balance"]*afterTx["vault"]["share_price"])
            console.log("--")

            console.log("User 3")
            console.log("Acq. price of PLP :", deposit3/beforeTx["user"][3]["plp_balance"] )
            console.log("PLP before op :", beforeTx["user"][3]["plp_balance"]/10**6)
            console.log("Value before op :", beforeTx["user"][3]["plp_balance"]*beforeTx["vault"]["share_price"]/10**6)

            console.log("PLP remaining : ", afterTx["user"][3]["plp_balance"]/10**6)
            console.log("Post op Value of investment : ", afterTx["user"][3]["plp_balance"]*afterTx["vault"]["share_price"]/10**6)

            console.log("PLP Sold :", (beforeTx["user"][3]["plp_balance"]-afterTx["user"][3]["plp_balance"])/10**6)
            console.log("Value sold :", beforeTx["user"][3]["plp_balance"]*beforeTx["vault"]["share_price"]-afterTx["user"][3]["plp_balance"]*afterTx["vault"]["share_price"])
            console.log("Value per PLP sold : ", (beforeTx["user"][3]["plp_balance"]*beforeTx["vault"]["share_price"]-afterTx["user"][3]["plp_balance"]*afterTx["vault"]["share_price"])/(beforeTx["user"][3]["plp_balance"]-afterTx["user"][3]["plp_balance"]))
            console.log("USDC en + :", (afterTx["user"][3]["usdc_balance"]-beforeTx["user"][3]["usdc_balance"])/10**6)
          });
        });
      });
    });
