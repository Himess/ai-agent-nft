// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { ERC721SeaDrop } from "seadrop/ERC721SeaDrop.sol";

/// @title SurvivorsNFT — SURVIVORS collection, guided by the autonomous agent "Ashborn"
/// @notice 1111 supply ERC-721 + ERC-2981 on top of OpenSea SeaDrop. Public + presale stages
///         (GTD / FCFS) are configured on the SeaDrop contract via `updatePublicDrop` and
///         `updateAllowList`. A fixed 100-token reserved allocation is mintable by the owner
///         for the team / vault.
/// @dev    ERC721SeaDrop uses ERC721A and starts token IDs at 1. The max supply must be
///         explicitly set after deploy via `setMaxSupply(1111)` (inherited from
///         ERC721ContractMetadata).
contract AgentNFT is ERC721SeaDrop {
    uint256 public constant RESERVED_ALLOCATION = 100;

    uint256 public reservedMinted;

    error ZeroQuantity();
    error ExceedsReservedAllocation();
    error ExceedsMaxSupply();

    event ReservedMinted(address indexed to, uint256 startTokenId, uint256 quantity);

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory allowedSeaDrop
    ) ERC721SeaDrop(name_, symbol_, allowedSeaDrop) {}

    /// @notice Owner-only mint for the team / vault allocation. Batch-mints `quantity`
    ///         sequential token IDs to `to`. Capped at RESERVED_ALLOCATION total.
    function reservedMint(address to, uint256 quantity) external onlyOwner {
        if (quantity == 0) revert ZeroQuantity();
        if (reservedMinted + quantity > RESERVED_ALLOCATION) revert ExceedsReservedAllocation();
        if (_totalMinted() + quantity > maxSupply()) revert ExceedsMaxSupply();
        uint256 startTokenId = _nextTokenId();
        reservedMinted += quantity;
        _safeMint(to, quantity);
        emit ReservedMinted(to, startTokenId, quantity);
    }
}
