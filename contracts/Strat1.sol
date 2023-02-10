// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../node_modules/@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interface/gmx/IGMXRouter.sol";
import "./interface/gmx/IGMXPositionRouter.sol";
import "./interface/gmx/IGMXVault.sol";
import "./interface/gmx/IGMXReader.sol";
import "./libraries/console.sol";
import "./../node_modules/@openzeppelin/contracts/access/Ownable.sol";


contract Strat1 is Ownable {
    address public USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address public vault;
    address public gmxVault =
        address(0x489ee077994B6658eAfA855C308275EAd8097C4A);
    address public gmxRouter =
        address(0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064);
    address public gmxPositionRouter =
        address(0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868);
    address public gmxReader =
        address(0x22199a49A999c351eF7927602CFB187ec3cae489);
    address private constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

    uint256 exposition; 
    event Log(string message);
    mapping(address => address) public oracles;

    constructor() {
        IGMXRouter(gmxRouter).approvePlugin(gmxPositionRouter);
        oracles[
            0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
        ] = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    }
    
    function openPosition(
        // address indexToken,
        uint256 tokenAmount,
        bool isLong
    ) external payable {
        IERC20(USDC).transferFrom(msg.sender, address(this), tokenAmount);
        IERC20(USDC).approve(gmxRouter, tokenAmount);
        (, int256 price, , , ) = AggregatorV3Interface(oracles[WETH])
            .latestRoundData();
        uint256 positionSize = ((tokenAmount * 110) / 100) * 1e24; // 1.1x leverage (1e12 for normalization + 1e12 for GMX precision)
        // address cb = 0x0000000000000000000000000000000000000000;
        uint256 acceptablePrice = 0;
        console.log("bug ici");
        if (isLong) {
            address[] memory path = new address[](2);
            path[0] = USDC;
            path[1] = WETH;
            acceptablePrice = ((uint256(price) * 15030) / 10000) * 1e22; // GMX uses 30 bps tolerance
            console.log("Params :");
            console.log("path0 :", path[0]);
            console.log("path1 :", path[1]);
            console.log("indexToken :", WETH);
            console.log("tokenAmount :", tokenAmount);
            console.log("positionsize :", positionSize);
            console.log("isLong :", isLong);
            console.log("acceptablePrice :", acceptablePrice);
            IGMXPositionRouter(gmxPositionRouter).createIncreasePosition{
                value: msg.value
            }(
                path,
                WETH,
                tokenAmount,
                0,
                positionSize,
                isLong,
                acceptablePrice,
                20000000000000000,
                0x0,
                address(0)
            );            
        }
    }

    function closePosition(bool isLong) external payable {
        (,int price,,,) = AggregatorV3Interface(oracles[WETH]).latestRoundData();
        uint256 acceptablePrice = 0;
        if (isLong) {
            (uint256 sizeDelta, uint256 collateralDelta,,,,,,) = IGMXVault(gmxVault).getPosition(address(this), WETH, WETH, isLong);
            console.log("closing long");
            console.log(sizeDelta);
            address[] memory path = new address[](1);
            path[0] = WETH;
            // path[1] = USDC;
            acceptablePrice = uint256(price) * 9970 / 10000 * 1e22; // GMX uses 30 bps tolerance

            IGMXPositionRouter(gmxPositionRouter).createDecreasePosition{value: msg.value}(path, WETH, collateralDelta, sizeDelta, isLong, address(this), acceptablePrice, 0, 20000000000000000, false, address(0));
        }
    }

    // function getOpenPosition() external returns(uint256 a){
    //     address[] memory _indexTokens = new address[](1);
    //     address[] memory _collateralTokens = new address[](1);
    //     bool[] memory _isLong = new bool[](1);
    //     _indexTokens[0] = WETH;
    //     _collateralTokens[0]= WETH;
    //     _isLong[0] = true;
    //     // return IGMXReader(gmxReader).getPositions(gmxVault, address(this), _indexTokens, _collateralTokens, _isLong);
    //     (uint256 size,
    //          uint256 collateral,
    //          uint256 averagePrice,
    //          uint256 entryFundingRate,
    //          /* reserveAmount */,
    //          uint256 realisedPnl,
    //          bool hasRealisedProfit,
    //          uint256 lastIncreasedTime) = IGMXVault(gmxVault).getPosition(address(this), WETH, WETH, true);
    //     return (size);
    // }

}
