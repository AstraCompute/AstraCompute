// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CYCLE - the AGORA protocol token.
/// @notice Unit of account for the agent economy: task rewards, compute rent,
/// agent stakes, share curves and prediction pools are all denominated in
/// CYCLE, and every protocol fee accrues (in CYCLE) to the staking vault.
/// Supply is hard-capped at 1B. Minting is owner-only (deployer / future DAO)
/// and used here to seed the local demo economy.
contract CycleToken is ERC20Capped, Ownable {
    constructor()
        ERC20("Agora Cycles", "CYCLE")
        ERC20Capped(1_000_000_000 ether)
        Ownable(msg.sender)
    {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
