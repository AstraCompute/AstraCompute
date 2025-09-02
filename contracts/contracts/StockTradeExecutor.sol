// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20StockTrade {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IPermit2StockTrade {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

interface IUniversalRouterStockTrade {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

/// @notice Executes an exact-amount USDG -> NVDA Robinhood Stock Token purchase.
/// @dev The explicit method and event make the purchase legible on explorers,
///      while the canonical ERC-20 transfer remains the source of truth.
contract StockTradeExecutor {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct PathKey {
        address intermediateCurrency;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
        bytes hookData;
    }

    struct ExactInputParams {
        address currencyIn;
        PathKey[] path;
        uint256[] minHopPriceX36;
        uint128 amountIn;
        uint128 amountOutMinimum;
    }

    address public constant UNIVERSAL_ROUTER = 0x8876789976dEcBfCbBbe364623C63652db8C0904;
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address public constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address public constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;

    uint24 public constant POOL_FEE = 3000;
    int24 public constant TICK_SPACING = 60;