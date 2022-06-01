// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenTest is ERC20, Ownable {
    constructor(string memory symbol, string memory name) ERC20(name, symbol) {}

    function mint(address _to, uint256 amount) external onlyOwner {
        _mint(_to, amount);
    }

    function burn(address _from, uint256 amount) external onlyOwner {
        _burn(_from, amount);
    }
}
