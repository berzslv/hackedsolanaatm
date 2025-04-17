// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Hacked ATM Token
 * @dev ERC20 token with burning and minting capabilities
 */
contract HackedATMToken is ERC20, ERC20Burnable, Ownable {
    // Token has 18 decimals (standard for ERC20)
    uint8 private constant _decimals = 18;

    // Events
    event TokensBought(address indexed buyer, uint256 amount);
    event TokensBurned(address indexed burner, uint256 amount);

    /**
     * @dev Constructor that gives the msg.sender all of existing tokens.
     */
    constructor(address initialOwner) 
        ERC20("Hacked ATM Token", "HATM") 
        Ownable(initialOwner)
    {
        // No initial supply - tokens are minted when purchased
    }

    /**
     * @dev Function to mint tokens when purchasing with ETH
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        _mint(to, amount);
        emit TokensBought(to, amount);
        return true;
    }

    /**
     * @dev Buy tokens with ETH (1 ETH = 1000 HATM)
     */
    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        
        // Calculate token amount (1 ETH = 1000 HATM)
        uint256 tokenAmount = msg.value * 1000;
        
        // Mint tokens to the buyer
        _mint(msg.sender, tokenAmount);
        
        emit TokensBought(msg.sender, tokenAmount);
    }

    /**
     * @dev Burn tokens with a penalty
     * 20% of burned tokens go to marketing wallet, 80% are permanently burned
     * @param amount Amount of tokens to burn
     */
    function burnWithPenalty(uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Not enough tokens");
        
        // Calculate the amounts
        uint256 burnAmount = amount * 80 / 100; // 80% actually burned
        uint256 marketingAmount = amount - burnAmount; // 20% to marketing
        
        // Transfer the marketing portion to the owner (marketing wallet)
        _transfer(msg.sender, owner(), marketingAmount);
        
        // Burn the rest
        _burn(msg.sender, burnAmount);
        
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Withdraw ETH from the contract
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Override decimals to use 18
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Fallback function to receive ETH and mint tokens
     */
    receive() external payable {
        buyTokens();
    }
}