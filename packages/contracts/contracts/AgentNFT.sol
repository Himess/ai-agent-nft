// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAgentNFT} from "./interfaces/IAgentNFT.sol";

/// @title AgentNFT — AI Agent managed NFT collection
/// @notice 1000 supply ERC-721 with ERC-2981 royalty and batch mint
contract AgentNFT is ERC721, ERC721Enumerable, ERC2981, Ownable, ReentrancyGuard, IAgentNFT {
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_BATCH = 20;

    uint256 public mintPrice;
    address public revenueSplitter;
    bool public mintActive;
    string private _baseTokenURI;
    uint256 private _nextTokenId;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 mintPrice_,
        uint96 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        mintPrice = mintPrice_;
        // Royalty receiver will be set to revenueSplitter once it's deployed
        _setDefaultRoyalty(msg.sender, royaltyBps_);
    }

    // ─── Mint ────────────────────────────────────────────────────────

    function mint(uint256 quantity) external payable nonReentrant {
        if (!mintActive) revert MintNotActive();
        if (quantity == 0) revert ZeroQuantity();
        if (quantity > MAX_BATCH) revert MaxBatchExceeded();
        if (_nextTokenId + quantity > MAX_SUPPLY) revert ExceedsMaxSupply();
        if (msg.value < mintPrice * quantity) revert InsufficientPayment();

        uint256 startId = _nextTokenId;
        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, _nextTokenId);
            _nextTokenId++;
        }

        emit BatchMinted(msg.sender, startId, quantity);
    }

    /// @notice Owner can mint (for agent NFT token #0 before public sale)
    function ownerMint(address to, uint256 quantity) external onlyOwner {
        if (quantity == 0) revert ZeroQuantity();
        if (_nextTokenId + quantity > MAX_SUPPLY) revert ExceedsMaxSupply();

        uint256 startId = _nextTokenId;
        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(to, _nextTokenId);
            _nextTokenId++;
        }

        emit BatchMinted(to, startId, quantity);
    }

    // ─── Admin ───────────────────────────────────────────────────────

    function setMintActive(bool active) external onlyOwner {
        mintActive = active;
        emit MintActiveChanged(active);
    }

    /// @notice Set revenue splitter address — can only be called once
    function setRevenueSplitter(address splitter, uint96 royaltyBps) external onlyOwner {
        if (splitter == address(0)) revert ZeroAddress();
        if (revenueSplitter != address(0)) revert SplitterAlreadySet();
        revenueSplitter = splitter;
        _setDefaultRoyalty(splitter, royaltyBps);
        emit RevenueSplitterSet(splitter);
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setRoyalty(address receiver, uint96 royaltyBps) external onlyOwner {
        _setDefaultRoyalty(receiver, royaltyBps);
    }

    /// @notice Withdraw contract balance to revenue splitter (or owner if not set)
    function withdraw() external onlyOwner {
        address recipient = revenueSplitter != address(0) ? revenueSplitter : owner();
        uint256 balance = address(this).balance;
        (bool success, ) = recipient.call{value: balance}("");
        if (!success) revert WithdrawFailed();
    }

    // ─── Views ───────────────────────────────────────────────────────

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ─── Overrides ───────────────────────────────────────────────────

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
