// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IGMXController {
    function increasePosition(uint256 tokenAmount, bool isLong) external payable ; 
    function decreasePosition(uint256 tokenAmount, bool isLong) external payable ; 
    function liquidatePosition(bool isLong) external payable ; 
    // function setUpdateExecFees(uint256 _fee) external ;
}