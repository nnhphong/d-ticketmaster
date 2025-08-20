// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Tcoin
 * @dev An ERC20 token contract for the Tcoin token.
 * The contract allows the owner to mint and burn tokens.
 */
contract Tcoin is ERC20, Ownable {
    /**
     * @dev Initializes the contract.
     * - Sets the name of the token to "Tcoin" and the symbol to "TCN".
     * - Mints an initial supply of 1000 Tcoin tokens to the contract deployer.
     */
    constructor() ERC20("Tcoin", "TCN") Ownable(msg.sender) {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }

    /**
     * @dev Allows the owner to mint new tokens and assign them to a specific address.
     * @param to The address to which the new tokens will be minted.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @dev Allows the owner to burn tokens from their own address.
     * @param amount The amount of tokens to burn.
     */
    function burn(uint256 amount) public onlyOwner {
        _burn(msg.sender, amount);
    }
}