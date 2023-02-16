const { network, ethers } = require("hardhat");
const { ABIS, ADDRESS } = require("./@config");

const Impersonate = async (_addr) => {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [_addr],
  });
  a = await ethers.getSigner(_addr);
  return a;
};

///GET DATA
const getPositions = async (_addr, _isLong) => {
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
const PositionInfo = async (GMX_ctrlerContract) => {
  let responseLong = await getPositions(GMX_ctrlerContract.address, true);
  let responseShort = await getPositions(GMX_ctrlerContract.address, false);
  data = {
    long: {
      size: parseInt(responseLong[0].toString()),
      collateral: parseInt(responseLong[1].toString()),
      avg_price: parseInt(responseLong[2].toString()),
      delta: parseInt(responseLong[8].toString()),
      leverage:
        parseInt(responseLong[0].toString()) /
        parseInt(responseLong[1].toString()),
      nav:
        parseInt(responseLong[1].toString()) +
        parseInt(responseLong[8].toString()),
    },
    short: {
      size: parseInt(responseShort[0].toString()),
      collateral: parseInt(responseShort[1].toString()),
      avg_price: parseInt(responseShort[2].toString()),
      delta: parseInt(responseShort[8].toString()),
      leverage:
        parseInt(responseShort[0].toString()) /
        parseInt(responseShort[1].toString()),
      nav:
        parseInt(responseShort[1].toString()) +
        parseInt(responseShort[8].toString()),
    },
  };
  return data;
};

const UserInfo = async (vaultContract, USDCcontract, ...args) => {
  usersData = [args.length];
  totalsupply = parseInt((await vaultContract.totalSupply()).toString());
  for (const user of args) {
    ethBalance = parseInt((await user.getBalance()).toString());
    usdcBalance = parseInt(
      (await USDCcontract.balanceOf(user.address)).toString()
    );
    plpBalance = parseInt(
      (await vaultContract.balanceOf(user.address)).toString()
    );
    data = {
      eth_balance: ethBalance,
      usdc_balance: usdcBalance,
      plp_balance: plpBalance,
      shares: (totalsupply ==0) ? 0: plpBalance / totalsupply,
      // shares: 0
    };
    usersData.push(data)
  }
  return usersData
};
const VaultInfo = async (vaultContract) => {
  totalsupply = parseInt((await vaultContract.totalSupply()).toString());
  await vaultContract.updateNetAssetValue();
  netAssetValue = parseInt((await vaultContract.getNetAssetValue()).toString());
  pricepershare = (totalsupply ==0) ? 0: netAssetValue / totalsupply;
  // pricepershare = 0;
  return {
    share_price: pricepershare,
    total_supply: totalsupply,
    net_asset_value: netAssetValue,
  };
};
const getData = async (
  vaultContract,
  GMX_ctrlerContract,
  usdcContract,
  ...args
) => {
  let _vaultData = await VaultInfo(vaultContract);
  let _userData = await UserInfo(vaultContract, usdcContract, ...args);
  let _PosData = await PositionInfo(GMX_ctrlerContract);
  return {
    vault: _vaultData,
    user: _userData,
    positions: _PosData,
  };
};

//KEEPER AND EXECUTING TRANSACTIONS
const WaitingPositionsLength = async (gmxposrouter, isIncrease) => {
  let a = isIncrease ? 1 : 3;
  return (
    await ("getRequestQueueLengths",
    await gmxposrouter.getRequestQueueLengths())
  )[a].toString();
};
const WaitingPositionsStart = async (gmxposrouter, isIncrease) => {
  let a = isIncrease ? 0 : 2;
  return (
    await ("getRequestQueueLengths",
    await gmxposrouter.getRequestQueueLengths())
  )[a].toString();
};

module.exports = {
  Impersonate,
  getPositions,
  PositionInfo,
  UserInfo,
  VaultInfo,
  WaitingPositionsLength,
  getData,
};
