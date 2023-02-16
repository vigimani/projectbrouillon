const { expect } = require("chai");
const assert = require("chai").assert;
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { ABIS, ADDRESS } = require("./config");
const { ethers } = require("hardhat");
const depositAmount = ethers.utils.parseUnits("1000", "6");

// describe("PolyPlus Investment", () => {
//   before(async function () {
//     //SIGNERS AND ACCOUNTS
//     accounts = await ethers.getSigners();
//     deployer = accounts[0];

//     await network.provider.request({
//       method: "hardhat_impersonateAccount",
//       params: [ADDRESS.WHALE_USDC],
//     });
//     whale = await ethers.getSigner(ADDRESS.WHALE_USDC);

//     await network.provider.request({
//       method: "hardhat_impersonateAccount",
//       params: ["0xB4d2603B2494103C90B2c607261DD85484b49eF0"],
//     });
//     gmxAdmin = await ethers.getSigner(
//       "0xB4d2603B2494103C90B2c607261DD85484b49eF0"
//     );

//     await deployments.fixture(["Strat1"]);
//     Strat1 = await ethers.getContract("Strat1");

//     //CONTRACTS
//     USDC = await ethers.getContractAt(ABIS.ERC20, ADDRESS.USDC, deployer);
//     WETH = await ethers.getContractAt(ABIS.ERC20, ADDRESS.WETH, deployer);
//     GMX_ROUTER = await ethers.getContractAt(
//       ABIS.GMX_ROUTER,
//       ADDRESS.GMX_ROUTER,
//       deployer
//     );
//     GMX_POSITION_ROUTER = await ethers.getContractAt(
//       ABIS.GMX_POSITION_ROUTER,
//       ADDRESS.GMX_POSITION_ROUTER,
//       deployer
//     );
//     GMX_READER = await ethers.getContractAt(
//       ABIS.GMX_READER,
//       ADDRESS.GMX_READER,
//       deployer
//     );
//     GMX_VAULT = await ethers.getContractAt(
//       ABIS.GMX_VAULT,
//       ADDRESS.GMX_VAULT,
//       deployer
//     );

//     //UTILS
//     getPositions = async (_addr, _isLong) => {
//       let response = await GMX_READER.getPositions(
//         ADDRESS.GMX_VAULT,
//         _addr,
//         ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//         ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//         [_isLong]
//       );
//       return response;
//     };
//   });

//   describe("Deployment", function () {
//     it("Should deploy the contracts", async () => {
//       expect(Strat1.address).not.to.equal("0x");
//     });
//   });
//   describe("Vanilla interraction with GMX", function () {
//     before(async function () {});
//     it("Should fund USDC on deployer", async () => {
//       //TRANSFER USDC FROM WHALE TO SIGNER
//       await USDC.connect(whale).transfer(
//         deployer.address,
//         depositAmount.mul(10),
//         {
//           gasLimit: 100000,
//         }
//       );
//       expect(await USDC.balanceOf(deployer.address)).to.not.be.equal(0);
//     });
//     it("Should give allowance to GMX Router", async () => {
//       await USDC.connect(deployer).approve(
//         ADDRESS.GMX_ROUTER,
//         depositAmount.mul(10),
//         {
//           gasLimit: 1000000,
//         }
//       );
//       expect(
//         await USDC.allowance(deployer.address, ADDRESS.GMX_ROUTER)
//       ).to.be.eq(depositAmount.mul(10));
//     });
//     it("Should approve the Router plugin", async function () {
//       await GMX_ROUTER.approvePlugin(GMX_POSITION_ROUTER.address);
//       expect(
//         await GMX_ROUTER.approvedPlugins(
//           deployer.address,
//           ADDRESS.GMX_POSITION_ROUTER
//         )
//       ).to.be.true;
//     });
//     it("Should set a Keeper (account to validate transaction)", async function () {
//       await GMX_POSITION_ROUTER.connect(gmxAdmin).setPositionKeeper(
//         deployer.address,
//         true
//       );
//       expect(await GMX_POSITION_ROUTER.isPositionKeeper(deployer.address)).to.be
//         .true;
//     });
//     describe("Test increase a long ETH/USDC", function () {
//       before(async function () {
//         positiont0 = await getPositions(deployer.address, true);
//       });
//       it("Should increase a long position", async function () {
//         let QueueLengthsT0 = (
//           await ("getRequestQueueLengths",
//           await GMX_POSITION_ROUTER.getRequestQueueLengths())
//         )[1].toString();
//         //Parameters for transaction
//         let USDCtodeposit = "15000000";
//         let minExecFee = await GMX_POSITION_ROUTER.minExecutionFee();
//         //Take MIN in real life with 3% slippage
//         let acceptablePrice = (
//           await GMX_VAULT.getMaxPrice(ADDRESS.WETH)
//         ).toString();
//         //Call ETH transaction
//         const tx = await GMX_POSITION_ROUTER.connect(
//           deployer
//         ).createIncreasePosition(
//           [
//             "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
//             "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
//           ],
//           "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
//           USDCtodeposit,
//           "0",
//           "16500000000000000000000000000000",
//           true,
//           acceptablePrice,
//           minExecFee,
//           ethers.constants.HashZero,
//           "0x0000000000000000000000000000000000000000",
//           {
//             value: minExecFee,
//             gasLimit: 10000000,
//           }
//         );
//         let QueueLengthsT1 = (
//           await ("getRequestQueueLengths",
//           await GMX_POSITION_ROUTER.getRequestQueueLengths())
//         )[1].toString();
//         expect(parseInt(QueueLengthsT0)).to.be.equal(QueueLengthsT1 - 1);
//       });
//       it("Should validate increase positions", async () => {
//         let getRequestQueueLengths = await ("getRequestQueueLengths",
//         await GMX_POSITION_ROUTER.getRequestQueueLengths());
//         await GMX_POSITION_ROUTER.executeIncreasePositions(
//           parseInt(getRequestQueueLengths[1].toString()),
//           deployer.address
//         );
//         let getRequestQueueLengths2 = await ("getRequestQueueLengths",
//         await GMX_POSITION_ROUTER.getRequestQueueLengths());
//         await expect(getRequestQueueLengths2[0]).to.be.eq(
//           getRequestQueueLengths2[1]
//         );
//       });
//       it("Should be a valid position", async () => {
//         let positiont1 = await getPositions(deployer.address, true);
//         expect(parseInt(positiont1[0].toString())).to.be.equal(
//           parseInt(positiont0[0].toString()) + 1.65 * 10 ** 31
//         );
//       });

//       // it("Should open an ETH/USD long position on GMX", async function () {

//       //   console.log(indexINCREASEtxgmx)
//       //   console.log(lengthINCREASEtxgmx)

//       //   const tokenAmount = ethers.utils.parseUnits("15", "6");
//       //   await USDC
//       //     .connect(whale)
//       //     .transfer(deployer.address, depositAmount.mul(100), {
//       //       gasLimit: 100000,
//       //     });

//       //   console.log("Deployer balance t0 :", (await USDC.balanceOf(deployer.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(deployer.address)).toString(), 'ETH')
//       //   console.log("Contract balance t0 :", (await USDC.balanceOf(Strat1.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(Strat1.address)).toString(), 'ETH')

//       //   await USDC.approve(Strat1.address, depositAmount.mul(100))
//       //   await USDC.approve(ADDRESS.GMX_ROUTER, depositAmount.mul(100))
//       //   const keepersFee = ethers.utils.parseEther("0.02");

//       //   const tx = await Strat1.openPosition(tokenAmount, true, {
//       //     value: keepersFee,
//       //     gasLimit: 10000000,
//       //   });
//       //   console.log(tx)
//       //   await tx.wait(1)
//       //   console.log("Deployer balance t1 :", (await USDC.balanceOf(deployer.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(deployer.address)).toString(), 'ETH')
//       //   console.log("Contract balance t1 :", (await USDC.balanceOf(Strat1.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(Strat1.address)).toString(), 'ETH')

//       //   await expect(tx).not.to.be.reverted;

//       //   const result = await GMX_READER.getPositions(
//       //     ADDRESS.GMX_VAULT,
//       //     accounts[0].address,
//       //     ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//       //     ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//       //     [true]
//       //   )
//       //   result.forEach((elem) => console.log(elem.toString()));

//       //   // const tx2 = await Strat1.closePosition(true, {
//       //   //   value: keepersFee,
//       //   //   gasLimit: 10000000,
//       //   // });

//       //   // await tx2.wait(1)
//       //   // console.log("Deployer balance t2 :", (await USDC.balanceOf(deployer.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(deployer.address)).toString(), 'ETH')
//       //   // console.log("Contract balance t2 :", (await USDC.balanceOf(Strat1.address)).div(10**5).toString(), "USDC | ", (await ethers.provider.getBalance(Strat1.address)).toString(), 'ETH')

//       // });
//       // it("Should open an ETH/USD long position on GMX", async function () {
//       //   const axz = await USDC.balanceOf(MYCONTRACT.address)
//       //   console.log(axz.toString())
//       //   const tokenAmount = ethers.utils.parseUnits("15", "6");
//       //   await USDC
//       //     .connect(whale)
//       //     .transfer(MYCONTRACT.address, depositAmount.mul(100), {
//       //       gasLimit: 100000,
//       //     });
//       //     await USDC
//       //     .connect(whale)
//       //     .transfer(GMXPOSITIONMANAGER.address, depositAmount.mul(100), {
//       //       gasLimit: 100000,
//       //     });
//       //   const vaultBalance2 = await USDC.balanceOf(MYCONTRACT.address)
//       //   console.log(vaultBalance2.toString())

//       //   await MYCONTRACT.setGMXPositionManager(GMXPOSITIONMANAGER.address)

//       //   const positionManagerBalance = await USDC.balanceOf(GMXPOSITIONMANAGER.address);
//       //   const keepersFee = ethers.utils.parseEther("0.02");

//       //   const tx = MYCONTRACT.openPosition("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", tokenAmount, true, {
//       //     value: keepersFee,
//       //     gasLimit: 10000000,
//       //   });
//       //   const vaultBalance3 = await USDC.balanceOf(MYCONTRACT.address)
//       //   console.log(vaultBalance3.toString())

//       //   // const response = tx.wait(1);
//       //   await expect(tx).not.to.be.reverted;
//       //   let a = await GMX_READER.getPositions(
//       //     ADDRESS.GMX_VAULT,
//       //     GMXPOSITIONMANAGER.address,
//       //     ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//       //     ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//       //     [true]
//       //   );
//       //   a.forEach((elem) => console.log(elem.toString()));
//       // });
//     });
//     // describe("Test decrease a long ETH/USDC", function () {
//     //   before(async function () {
//     //     positiont0 = await GMX_READER.getPositions(
//     //       ADDRESS.GMX_VAULT,
//     //       deployer.address,
//     //       ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//     //       ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//     //       [true]
//     //     );
//     //   });
//     //   it("Should decrease a long position", async function () {
//     //     let QueueLengthsT0 = (
//     //       await ("getRequestQueueLengths",
//     //       await GMX_POSITION_ROUTER.getRequestQueueLengths())
//     //     )[1].toString();
//     //     //Parameters for transaction
//     //     let USDCtodeposit = "15000000";
//     //     let minExecFee = await GMX_POSITION_ROUTER.minExecutionFee();
//     //     //Take MIN in real life with 3% slippage
//     //     let acceptablePrice = (await GMX_VAULT.getMaxPrice(ADDRESS.WETH)).toString()
//     //     //Call ETH transaction
//     //     const tx = await GMX_POSITION_ROUTER.connect(
//     //       deployer
//     //     ).createIncreasePosition(
//     //       [
//     //         "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
//     //         "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
//     //       ],
//     //       "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
//     //       USDCtodeposit,
//     //       "0",
//     //       "16500000000000000000000000000000",
//     //       true,
//     //       acceptablePrice,
//     //       minExecFee,
//     //       ethers.constants.HashZero,
//     //       "0x0000000000000000000000000000000000000000",
//     //       {
//     //         value: minExecFee,
//     //         gasLimit: 10000000,
//     //       }
//     //     );
//     //     let QueueLengthsT1 = (
//     //       await ("getRequestQueueLengths",
//     //       await GMX_POSITION_ROUTER.getRequestQueueLengths())
//     //     )[1].toString();
//     //     expect(parseInt(QueueLengthsT0)).to.be.equal(QueueLengthsT1 - 1);
//     //   });
//     //   it("Should validate increase positions", async () => {
//     //     let getRequestQueueLengths = await ("getRequestQueueLengths",
//     //     await GMX_POSITION_ROUTER.getRequestQueueLengths());
//     //     await GMX_POSITION_ROUTER.executeIncreasePositions(
//     //       parseInt(getRequestQueueLengths[1].toString()),
//     //       deployer.address
//     //     );
//     //     let getRequestQueueLengths2 = await ("getRequestQueueLengths",
//     //     await GMX_POSITION_ROUTER.getRequestQueueLengths());
//     //     await expect(getRequestQueueLengths2[0]).to.be.eq(
//     //       getRequestQueueLengths2[1]
//     //     );
//     //   });
//     //   it("Should be a valid position", async () => {
//     //     let positiont1 = await GMX_READER.getPositions(
//     //       ADDRESS.GMX_VAULT,
//     //       deployer.address,
//     //       ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//     //       ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
//     //       [true]
//     //     );
//     //     expect(parseInt(positiont1[0].toString())).to.be.equal(parseInt(positiont0[0].toString()) + 1.65*10**31);
//     //   });
//     // });
//     describe("Test liquidate a long ETH/USDC", function () {
//       before(async function () {
//         positiont0 = await getPositions(deployer.address, true);
//       });
//       it("Should open a decrease order", async function () {
//         let QueueLengthsT0 = (
//           await ("getRequestQueueLengths",
//           await GMX_POSITION_ROUTER.getRequestQueueLengths())
//         )[3].toString();

//         let sizeDelta = positiont0[0].toString();
//         let collateralDelta = positiont0[1].toString();
//         let minExecFee = await GMX_POSITION_ROUTER.minExecutionFee();
//         // let acceptablePrice = positiont0[2].toString()
//         //A changer sur vrai network
//         // const getAllTokenData = await fetch("https://api.gmx.io/tokens").then(
//         //   (res) => res.json()
//         // );
//         // const ethData = getAllTokenData.filter(
//         //   (token) => token.id === "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
//         // );

//         // let acceptablePrice = ethers.BigNumber.from(
//         //   ((ethData[0].data.minPrice / 1e22) * 9970) / 10000
//         // )
//         //   .mul(10 ** 11)
//         //   .mul(10 ** 11)
//         //   .toString();
//         let acceptablePrice = (await GMX_VAULT.getMaxPrice(ADDRESS.WETH))
//           .mul(000)
//           .div(10000)
//           .toString();

//         //Call ETH transaction
//         const tx = await GMX_POSITION_ROUTER.connect(
//           deployer
//         ).createDecreasePosition(
//           ["0x82af49447d8a07e3bd95bd0d56f35241523fbab1"],
//           "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
//           collateralDelta,
//           sizeDelta,
//           true,
//           deployer.address,
//           acceptablePrice,
//           "0",
//           minExecFee,
//           false,
//           "0x0000000000000000000000000000000000000000",
//           {
//             value: minExecFee,
//             gasLimit: 10000000,
//           }
//         );
//         let QueueLengthsT1 = (
//           await ("getRequestQueueLengths",
//           await GMX_POSITION_ROUTER.getRequestQueueLengths())
//         )[3].toString();
//         expect(parseInt(QueueLengthsT0)).to.be.equal(QueueLengthsT1 - 1);
//       });
//       it("Should validate decrease positions", async () => {
//         let getRequestQueueLengths = await ("getRequestQueueLengths",
//         await GMX_POSITION_ROUTER.getRequestQueueLengths());
//         await GMX_POSITION_ROUTER.executeDecreasePositions(
//           parseInt(getRequestQueueLengths[3].toString()),
//           deployer.address
//         );
//         let getRequestQueueLengths2 = await ("getRequestQueueLengths",
//         await GMX_POSITION_ROUTER.getRequestQueueLengths());
//         await expect(getRequestQueueLengths2[2]).to.be.eq(
//           getRequestQueueLengths2[3]
//         );
//       });
//       it("Should be a valid order", async () => {
//         let positiont1 = await getPositions(deployer.address, true);
//         expect(parseInt(positiont1[0].toString())).to.be.equal(0);
//       });
//     });
//   });
// });
