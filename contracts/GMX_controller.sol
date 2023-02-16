// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import "./../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "./interface/gmx/IGMXRouter.sol";
import "./interface/gmx/IGMXPositionRouter.sol";
import "./interface/gmx/IGMXVault.sol";
import "./interface/gmx/IGMXReader.sol";
import "./libraries/console.sol";

contract GMX_controller is Ownable {
    address public gmxVault =
        address(0x489ee077994B6658eAfA855C308275EAd8097C4A);
    address public gmxRouter =
        address(0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064);
    address public gmxPositionRouter =
        address(0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868);
    address public gmxReader =
        address(0x22199a49A999c351eF7927602CFB187ec3cae489);
    address public WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address public USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    uint256 public GMXexecutionFee ;
    address public vault;

    constructor(address _vault) {
        vault = _vault;
        IGMXRouter(gmxRouter).approvePlugin(gmxPositionRouter);
        GMXexecutionFee = IGMXPositionRouter(gmxPositionRouter).minExecutionFee();
    }
    modifier onlyMyVault {
        require(msg.sender == vault, "Not vault");
        _;
    }
    function setVaultOwner(address _addr) external onlyOwner {
        vault=_addr;
    }
    function getVaultOwner() public view returns(address) {
        return vault;
    }


    //Basic functions to find in every controller
    function increasePosition(uint256 tokenAmount, bool isLong) external payable onlyMyVault{
        IERC20(USDC).transferFrom(vault, address(this), tokenAmount);
        IERC20(USDC).approve(gmxRouter, tokenAmount);

        // (,int price,,,) = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419).latestRoundData();
        uint256 positionSize = ((tokenAmount * 110) / 100) * 1e24; // 1.1x leverage 
        uint256 acceptablePrice = 0;
        if (isLong) {
            address[] memory path = new address[](2);
            path[0] = USDC;
            path[1] = WETH;
            acceptablePrice = IGMXVault(gmxVault).getMaxPrice(WETH)*10030 / 10000;// GMX uses 30 bps tolerance
            IGMXPositionRouter(gmxPositionRouter).createIncreasePosition{value: msg.value}(
                path,
                WETH,
                tokenAmount,
                0,
                positionSize,
                isLong,
                acceptablePrice,
                10000000000000000,
                0x6d79726566657272616c4d6176696e6967690000000000000000000000000000,
                0x0000000000000000000000000000000000000000
            );            
        } else {
            address[] memory path = new address[](1);
            path[0] = USDC;
            acceptablePrice = IGMXVault(gmxVault).getMinPrice(WETH)*9970/10000;// GMX uses 30 bps tolerance
            IGMXPositionRouter(gmxPositionRouter).createIncreasePosition{value: msg.value}(path, WETH, tokenAmount, 0, positionSize, isLong, acceptablePrice, 10000000000000000, 0x0, address(0));
        }
    }
    function decreasePosition(address _to, uint256 tokenAmount, bool isLong) external payable onlyMyVault {
        uint256 acceptablePrice = 0;
        uint256 collateralDelta = ((tokenAmount * 110) / 100) * 1e24;
        if (isLong) {
            address[] memory path = new address[](2);
            path[0] = WETH;
            path[1] = USDC;
            acceptablePrice = IGMXVault(gmxVault).getMinPrice(WETH)*9970/10000;// 0.3% slippage
            IGMXPositionRouter(gmxPositionRouter).createDecreasePosition{value: msg.value}(path, WETH, tokenAmount* 1e24, collateralDelta, isLong, _to, acceptablePrice, 0, 10000000000000000, false, address(0));
        } else {
            address[] memory path = new address[](1);
            path[0] = USDC;
            acceptablePrice = IGMXVault(gmxVault).getMaxPrice(WETH)*10030/10000;// 0.3% slippage
            IGMXPositionRouter(gmxPositionRouter).createDecreasePosition{value: msg.value}(path, WETH, tokenAmount* 1e24, collateralDelta, isLong,  _to, acceptablePrice, 0, 10000000000000000, false, address(0));

        }
    }
    function liquidatePosition(bool isLong) external payable onlyMyVault {
        uint256 acceptablePrice = 0;
        if (isLong) {
            address[] memory path = new address[](2);
            path[0] = WETH;
            path[1] = USDC;
            (uint256 sizeDelta,,,,,,,) = IGMXVault(gmxVault).getPosition(address(this), WETH, WETH, isLong);

            acceptablePrice = IGMXVault(gmxVault).getMinPrice(WETH)*9970/10000;// 0.3% slippage
            IGMXPositionRouter(gmxPositionRouter).createDecreasePosition{value: msg.value}(path, WETH, 0, sizeDelta, isLong, msg.sender, acceptablePrice, 0, 10000000000000000, false, address(0));
        } else {
            address[] memory path = new address[](1);
            path[0] = USDC;
            (uint256 sizeDelta,,,,,,,) = IGMXVault(gmxVault).getPosition(address(this), USDC, WETH, isLong);
            acceptablePrice = IGMXVault(gmxVault).getMaxPrice(WETH)*10030/10000;// 0.3% slippage
            IGMXPositionRouter(gmxPositionRouter).createDecreasePosition{value: msg.value}(path, WETH, 0, sizeDelta, isLong, msg.sender, acceptablePrice, 0, 10000000000000000, false, address(0));
        }
    }

}
