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
import "./interface/IGMXController.sol";
import "./interface/gmx/IGMXVault.sol";

///Arbitrum project
contract MyVault is Ownable, ERC20 {

    // ::::::::::::: VARIABLE ::::::::::::: //
    uint256 public vaultValue;
    address public GMX_controller;

    //Position parameters
    uint8 public exposition; //0 neutral - 1 Long ETH - 2 short ETH
    uint256 public collateral;
    uint256 public deltavalue;
    uint256 public netAssetValue; 

    bool isInit;

    address public WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address public USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address public gmxVault = 0x489ee077994B6658eAfA855C308275EAd8097C4A;

    mapping(address => bool) public tokenAccepted;

    event NewTokenAdded(address tokenAddress);
    event TokenRemoved(address tokenAddress);
    // event ExpositionChanged();
    // event Deposit();
    // event Withdrawal(); 

    constructor() ERC20("Polyplus", "PLP") {
        _mint(msg.sender, 100 * 10**uint256(decimals()));
        exposition = 0;
        isInit = false;
    }

    modifier isInitialized() {
        require(isInit == true, "Not initialized, first you have to set GMX controller");
        _;
    }

    function setNetAssetValue() external onlyOwner isInitialized{
        bool isLong = (exposition == 1? true : false );
        if (exposition == 0) {
            collateral = 0;
            deltavalue = 0;
            netAssetValue = ERC20(USDC).balanceOf(address(this));
        } else if (exposition == 1 ) {
            (,uint256 _collateral,,,,,,uint256 _deltavalue) = IGMXVault(gmxVault).getPosition(GMX_controller, WETH, WETH, isLong);
            collateral = _collateral;
            deltavalue = _deltavalue;
            netAssetValue = _collateral+_deltavalue;
        } else {
            (,uint256 _collateral,,,,,,uint256 _deltavalue) = IGMXVault(gmxVault).getPosition(GMX_controller, USDC, WETH, isLong);
            collateral = _collateral;
            deltavalue = _deltavalue;
            netAssetValue = _collateral-_deltavalue;
        }
    }
    function getNetAssetValue() external view returns(uint256){
        return netAssetValue;
    }
    //Gestion des tokens acceptés [until now stable only with USDC]
    /// @notice whitelist the token accepted in the vault, allow a better control
    /// @dev until now, only USDC deposit are handled
    /// @param tokenAddress arbitrum address of the ERC20 token
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
    function isAccepted(address tokenAddress) external view returns (bool) {
        return tokenAccepted[tokenAddress];
    }

    /// @notice function that sets the exposition of the contract (Long Short or Neutral and rebalance assets accordingly)
    /// @dev only the owner can call this function 
    /// @param _addr address of the controller to add
    function setGMX_controller(address _addr) external onlyOwner {
        GMX_controller = _addr;
        isInit = true;
    }
    function getGMX_controller() public view returns (address) {
        return GMX_controller;
    }

    /// @notice function that sets the exposition of the contract (Long Short or Neutral and rebalance assets accordingly)
    /// @dev only the owner can call this function 
    /// @param _exposition 0 for neutral | 1 Long | 2 Short
    function setExposition(uint8 _exposition) external onlyOwner {
        require(
            _exposition == 0 || _exposition== 1 || _exposition == 2,
            "Value must be 0 for neutral, 1 for Long or 2 for Short"
        );
        require(exposition != _exposition, "Reverted because exposition has not changed");
        exposition = _exposition;
    }

    function liquidatePositions() external payable onlyOwner isInitialized {
        require(exposition != 0, "Exposition is 0 you should not have a position to liquidate");
        bool isLong = (exposition == 1? true : false );
        IGMXController(GMX_controller).liquidatePosition{value: msg.value}(isLong);
    }

    ///Check du 15 avec le bon nombre de décimal
    function openPosition() external payable onlyOwner isInitialized {
        require(IERC20(USDC).balanceOf(address(this)) > 15, "Amount to small to open a position, minimum 15$");
        bool isLong = (exposition == 1? true : false );
        IERC20(USDC).approve(GMX_controller,IERC20(USDC).balanceOf(address(this)));
        IGMXController(GMX_controller).increasePosition{value: msg.value}(IERC20(USDC).balanceOf(address(this)), isLong);
    }
    function getExposition() external view returns (uint8) {
        return exposition;
    }


    /// @notice function for depositing ana ccepted token on the vault
    /// token address to deposit [to implement later]
    function deposit(address tokenAddress, uint256 _amount) external payable {
        require(tokenAccepted[tokenAddress], "Token not yet supported");
        require(_amount > 0, "Amount to deposit is mandatory");
        uint256 amountToken = _amount;
        uint256 supplyPLPToken = this.totalSupply();
        uint256 amountPLPToken;
        if (supplyPLPToken == 0) {
            amountPLPToken = amountToken;
        } else {
            //update la value de la vault and harvest
            vaultValue = 10**18;
            amountPLPToken = (amountToken * supplyPLPToken) / vaultValue;
        }
        _mint(msg.sender, amountPLPToken);
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amountToken
        );
        IERC20(tokenAddress).approve(GMX_controller, _amount);
        if (exposition == 1) {
            IGMXController(GMX_controller).increasePosition{value: msg.value}(
                _amount,
                true
            );
        } else if (exposition == 2) {
            IGMXController(GMX_controller).increasePosition{value: msg.value}(
                _amount,
                false
            );
        }
        // emit Deposit
    }


    // function getPositions() public isInitialized {
    //     return IGMXController(GMX_controller).getLongPosition();
    // }
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
