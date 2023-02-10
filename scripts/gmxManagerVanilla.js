const { expect } = require("chai");
const assert = require("chai").assert;
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { ABIS, ADDRESS } = require("../test/config");

const { data } = require("../test/utils");
const { ethers } = require("hardhat");
const depositAmount = ethers.utils.parseUnits("1000", "6");

const openpos = async function () {
  const PROVIDER = new ethers.providers.JsonRpcProvider(
    "https://arb-mainnet.g.alchemy.com/v2/C_KkBkd2w9DlkAgvtdHSRpj1-5VKDKip"
  );
  deployer = new ethers.Wallet(process.env.PK_ARB, PROVIDER);
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

  const tokenAmount = ethers.utils.parseUnits("15", "6");
  console.log(
    "t0 :",
    (await USDC.balanceOf(deployer.address)).toString(),
    " USDC | ",
    (await ethers.provider.getBalance(deployer.address)).toString(),
    " ETH"
  );
  await USDC.connect(deployer).approve(ADDRESS.GMX_ROUTER, tokenAmount, {
    gasLimit: 1000000,
  });
  console.log(
    "allowance : ",
    await USDC.allowance(ADDRESS.GMX_ROUTER, deployer.address)
  );

  let minExecFee = await GMX_POSITION_ROUTER.minExecutionFee();
  const getAllTokenData = await fetch("https://api.gmx.io/tokens").then((res) =>
    res.json()
  );
  const ethData = getAllTokenData.filter(
    (token) => token.id === "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
  );
  let acceptablePrice = ethers.BigNumber.from(
    ((ethData[0].data.minPrice / 1e22) * 10030) / 10000
  )
    .mul(10 ** 11)
    .mul(10 ** 11)
    .toString();

  const tx = await GMX_POSITION_ROUTER.connect(deployer).createIncreasePosition(
    [
      "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
      "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    ],
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "15000000",
    "0",
    "16500000000000000000000000000000",
    true,
    acceptablePrice,
    minExecFee,
    ethers.constants.HashZero,
    "0x0000000000000000000000000000000000000000",
    {
      value: minExecFee,
      gasLimit: 10000000,
    }
  );
  await tx.wait(2);
  // let a = await GMX_READER.getPositions(
  //   ADDRESS.GMX_VAULT,
  //   deployer.address,
  //   ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
  //   ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
  //   [true]
  // );
  console.log(
    "t1 :",
    (await USDC.balanceOf(deployer.address)).toString(),
    " USDC | ",
    (await ethers.provider.getBalance(deployer.address)).toString(),
    " ETH"
  );

  // a.forEach((elem) => console.log(elem.toString()));
};

const closepos = async function () {
  const PROVIDER = new ethers.providers.JsonRpcProvider(
    "https://arb-mainnet.g.alchemy.com/v2/C_KkBkd2w9DlkAgvtdHSRpj1-5VKDKip"
  );
  deployer = new ethers.Wallet(process.env.PK_ARB, PROVIDER);
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
  console.log(
    "t0 :",
    (await USDC.balanceOf(deployer.address)).toString(),
    " USDC | ",
    (await ethers.provider.getBalance(deployer.address)).toString(),
    " ETH"
  );
  let a = await GMX_READER.getPositions(
    ADDRESS.GMX_VAULT,
    deployer.address,
    ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
    ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
    [true]
  );
  let sizeDelta = a[0].toString();
  let collateralDelta = a[1].toString();
  console.log(sizeDelta)
  console.log(collateralDelta)
  console.log(a)  

  let minExecFee = await GMX_POSITION_ROUTER.minExecutionFee();
  const getAllTokenData = await fetch("https://api.gmx.io/tokens").then((res) =>
    res.json()
  );
  const ethData = getAllTokenData.filter(
    (token) => token.id === "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
  );

  let acceptablePrice2 = ethers.BigNumber.from(
    ((ethData[0].data.minPrice / 1e22) * 9900) / 10000
  )
    .mul(10 ** 11)
    .mul(10 ** 11)
    .toString();
  console.log(acceptablePrice2.toString())
  const tx2 = await GMX_POSITION_ROUTER.connect(
    deployer
  ).createDecreasePosition(
    [
      "0x82af49447d8a07e3bd95bd0d56f35241523fbab1"
    ],
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    collateralDelta,
    sizeDelta,
    true,
    deployer.address,
    acceptablePrice2,
    "0",
    minExecFee,
    false,
    "0x0000000000000000000000000000000000000000",
    {
      value: minExecFee,
      gasLimit: 10000000,
    }
  );
};

// openpos();
// closepos();
