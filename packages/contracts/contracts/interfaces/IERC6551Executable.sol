// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC6551Executable — Execute operations from a Token Bound Account
interface IERC6551Executable {
    /// @notice Executes a low-level operation from the account
    /// @param to Target address
    /// @param value ETH value to send
    /// @param data Calldata
    /// @param operation 0 = CALL, 1 = DELEGATECALL, 2 = CREATE, 3 = CREATE2
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable returns (bytes memory);
}
