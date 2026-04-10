// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IERC6551Account — ERC-6551 Token Bound Account interface
interface IERC6551Account {
    receive() external payable;

    /// @notice Returns the identifier of the non-fungible token which owns the account
    function token()
        external
        view
        returns (uint256 chainId, address tokenContract, uint256 tokenId);

    /// @notice Returns a value that SHOULD be modified each time the account changes state
    function state() external view returns (uint256);

    /// @notice Returns a magic value indicating whether a given signer is authorized to act
    function isValidSigner(
        address signer,
        bytes calldata context
    ) external view returns (bytes4 magicValue);
}
