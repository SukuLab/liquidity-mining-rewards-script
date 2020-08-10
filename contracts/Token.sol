// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor() public ERC20("Token", "TKN") {
        uint256 _totalSupply = 1000000 * 10**18;
        _mint(msg.sender, _totalSupply);
    }
}
