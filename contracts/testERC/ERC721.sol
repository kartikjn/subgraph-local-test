// SPDX-License-Identifier: None
pragma solidity =0.8.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract token721 is ERC721{

    address public admin;
    uint256 public id = 0;

    constructor() ERC721("tokenA", "A") {
        admin = msg.sender;
    }

    function mint() external {
        id++;
        _mint(msg.sender, id);
    }
}