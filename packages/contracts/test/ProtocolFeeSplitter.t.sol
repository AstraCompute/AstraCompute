// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {BaseTest} from "./utils/BaseTest.sol";
import {ProtocolFeeSplitter} from "../src/ProtocolFeeSplitter.sol";

contract ProtocolFeeSplitterTest is BaseTest {
    ProtocolFeeSplitter internal splitter;
    address internal treasury = makeAddr("treasury");
    address internal flywheelSink = makeAddr("flywheelSink");
    address internal token;

    uint256 internal constant TREASURY_BPS = 7500; // 75% of the protocol's 40% = 30% of total

    function setUp() public override {
        super.setUp();
        splitter = new ProtocolFeeSplitter(
            address(locker),
            treasury,
            flywheelSink,
            TREASURY_BPS
        );
        vm.prank(admin);
        locker.setProtocolFeeRecipient(address(splitter));
        token = launchDefault();
        vm.roll(block.number + RESTRICTION_BLOCKS + 1);
    }

    function _tradeAndCollect() internal {
        buy(trader, token, 5 ether, 0);
        sell(trader, token, IERC20(token).balanceOf(trader) / 2, 0);
        locker.collectFees(token);
    }

    function test_constructorValidation() public {
        vm.expectRevert(ProtocolFeeSplitter.ZeroAddress.selector);
        new ProtocolFeeSplitter(address(0), treasury, flywheelSink, TREASURY_BPS);
        vm.expectRevert(abi.encodeWithSelector(ProtocolFeeSplitter.BadBps.selector, 10_001));
        new ProtocolFeeSplitter(address(locker), treasury, flywheelSink, 10_001);
    }

    function test_sweepPushesFlywheelHoldsTreasury() public {
        _tradeAndCollect();
        uint256 accrued = locker.claimable(address(splitter), address(wnative));
        assertGt(accrued, 0, "protocol share should accrue to the splitter");

        uint256 toFlywheel = splitter.sweep(address(wnative));
        uint256 expectedTreasury = (accrued * TREASURY_BPS) / 10_000;
        assertEq(toFlywheel, accrued - expectedTreasury, "flywheel cut pushed immediately");
        assertEq(IERC20(address(wnative)).balanceOf(flywheelSink), toFlywheel);
        // treasury cut is HELD, not sent
        assertEq(IERC20(address(wnative)).balanceOf(treasury), 0, "nothing pushed to treasury");