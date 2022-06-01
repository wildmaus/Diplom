// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenTestLimited is ERC20 {
    constructor(
        string memory symbol,
        string memory name,
        uint256 amount
    ) ERC20(name, symbol) {
        _mint(msg.sender, amount);
    }
}
