//SPDX-License-Identifier: MIT

pragma solidity 0.8.17;
import "./../node_modules/@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./../node_modules/@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "./../node_modules/@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "./../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/console.sol";
import "./../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

///Arbitrum project
contract MyVault is Ownable, ERC20 {
    
    uint256 public vaultValue;

    mapping(address => bool) public tokenAccepted;

    event NewTokenAdded (address tokenAddress);
    event TokenRemoved (address tokenAddress);

    constructor()  ERC20("Polyplus", "PLP") {
          _mint(msg.sender, 100 * 10 ** uint(decimals()));
    }

    function acceptToken(address tokenAddress) external onlyOwner {
        require(!tokenAccepted[tokenAddress], "Token already added");
        tokenAccepted[tokenAddress] = true; 
        emit NewTokenAdded(tokenAddress);
    }
    function removeToken(address tokenAddress) external onlyOwner {
        require(tokenAccepted[tokenAddress], "Token not yet added");
        tokenAccepted[tokenAddress] = false; 
        emit TokenRemoved(tokenAddress);
    }
    function isAccepted(address tokenAddress) external view returns(bool){
        return tokenAccepted[tokenAddress];
    }
    /// @notice function for depositing ana ccepted token on the vault
    /// token address to deposit [to implement later]
    function deposit(address tokenAddress, uint256 _amount) external  {
        require(tokenAccepted[tokenAddress], "Token not yet supported");
        require(_amount >0, "Amount to deposit is mandatory");
        uint256 amountToken = _amount;
        uint256 supplyPLPToken = this.totalSupply();
        uint256 amountPLPToken;
        if (supplyPLPToken == 0) {
            amountPLPToken = amountToken;
        } else {
            //update la value de la vault and harvest
            vaultValue = 10 ** 18;
            amountPLPToken = (amountToken * supplyPLPToken) / vaultValue;
        }
        _mint(msg.sender, amountPLPToken);
        //changer address(this) par addresse de la stratégie ?
        //Transform en Weth ?
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amountToken);
    }

    // function withdraw(uint256 _amount) external {
    //     require(_amount > 0);
    //     uint256 amountPLPToken = _amount;
    //     uint256 supplyPLPToken = this.totalSupply();
    //     //update la value de la vault and harvest
    //     uint256 amountToken = (amountPLPToken * vaultValue) / supplyPLPToken;
    //     _burn(msg.sender, amountPLPToken);
    //     //Calcul pour savoir si les tokens qui sortent sont plus nombreux que ceux qui rentrent si oui fees
    //     token.transfer(msg.sender, amountToken);
    // }

}
