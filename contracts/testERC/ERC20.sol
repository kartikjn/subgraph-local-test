// SPDX-License-Identifier: MIT
pragma solidity =0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract tokenA is ERC20 {

    constructor() ERC20("TokenA", "A") {}

    function mint() public {
        _mint(msg.sender, 1000**decimals());
    }
}