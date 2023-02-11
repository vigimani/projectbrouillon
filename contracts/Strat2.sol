// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interface/stargate/IStargateRouter.sol";
import "./interface/stargate/IStargateLpStaking.sol";
import "./interface/stargate/IStargatePool.sol";

import "./libraries/console.sol";

contract Strat2 {
    using SafeERC20 for IERC20;
    IStargateLpStaking public stargateLpStaking;
    IStargateRouter public stargateRouter = IStargateRouter(0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614);
    
    address public stargateLpToken;
    address public token;
    address public stgToken = address(0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590);

    uint8 public stargateRouterPoolId;
    uint8 public stargateLpStakingPoolId;
    uint8 public poolid;
    uint8 public stargateLpStakingPoolid;

    // constructor (
    //     // address _stargateLPStaking,
    //     // address _stargateLpToken,
    //     // address _token,
    //     uint8 _poolid
    //     // uint8 _stargateLpStakingPoolid
    // ){
    //     // stargateLpStaking = IStargateLpStaking(_stargateLPStaking);
    //     // stargateLpToken = _stargateLpToken;
    //     poolid = _poolid;
    //     // token = _token;
    //     // stargateLpStakingPoolid = _stargateLpStakingPoolid;
    // }

    address public USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address public STGLP_USDC = 0x892785f33CdeE22A30AEF750F285E18c18040c3e;
    address public STGLP_USDT = 0xB6CfcF89a7B22988bfC96632aC2A9D6daB60d641;

    uint256 USDC_stargateRouterPoolId = 1 ;
    uint256 USDCstargateLpStakingPoolId = 0 ; 
    // uint256 stargateRouterUSDTPoolId = 2 ;
    // uint256 USDTstargateLpStakingPoolId = 1 ; 

    function stargateDeposit(uint256 amount) external  {
        IERC20(USDC).safeApprove(address(stargateRouter), amount);
        stargateRouter.addLiquidity(1, amount, address(this));
        // uint256 receivedLpToken = IERC20(STGLP_USDC).balanceOf(address(this));
        // IERC20(STGLP_USDC).safeApprove(address(stargateLpStaking), receivedLpToken);
        // stargateLpStaking.deposit(stargateLpStakingPoolid, receivedLpToken);
    }
}