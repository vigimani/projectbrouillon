// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGMXRouter {
    function approvePlugin(address _plugin) external;
    function increasePosition(address _account, address _collateralToken, address _indexToken, uint256 _sizeDelta, bool _isLong) external payable ;
}