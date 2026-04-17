// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IAgentNFT} from "./interfaces/IAgentNFT.sol";

/// @title SurvivorsNFT — SURVIVORS collection, guided by the autonomous agent "The Seventh"
/// @notice 888 supply ERC-721 + ERC-2981. Mint phases: Closed → GTD (merkle) → FCFS (merkle) → Public.
///         1 mint per wallet per phase. Reserved allocation of 88 for the team vault.
contract AgentNFT is ERC721, ERC721Enumerable, ERC2981, Ownable, ReentrancyGuard, IAgentNFT {
    uint256 public constant MAX_SUPPLY = 888;
    uint256 public constant RESERVED_ALLOCATION = 88; // team / vault seats, owner-minted

    uint256 public mintPrice;
    address public revenueSplitter;
    Phase public currentPhase;
    bytes32 public gtdMerkleRoot;
    bytes32 public fcfsMerkleRoot;
    string private _baseTokenURI;
    uint256 private _nextTokenId;

    uint256 public gtdMinted;
    uint256 public fcfsMinted;
    uint256 public publicMinted;
    uint256 public reservedMinted;

    mapping(address => bool) public mintedInGTD;
    mapping(address => bool) public mintedInFCFS;
    mapping(address => bool) public mintedInPublic;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 mintPrice_,
        uint96 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        mintPrice = mintPrice_;
        _setDefaultRoyalty(msg.sender, royaltyBps_);
    }

    // ─── Mint ────────────────────────────────────────────────────────

    /// @notice Merkle-gated GTD mint (guaranteed whitelist). 1 per wallet.
    function gtdMint(bytes32[] calldata proof) external payable nonReentrant {
        if (currentPhase != Phase.GTD) revert WrongPhase();
        if (gtdMerkleRoot == bytes32(0)) revert MerkleRootNotSet();
        if (mintedInGTD[msg.sender]) revert AlreadyMintedInPhase();
        if (msg.value < mintPrice) revert InsufficientPayment();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verifyCalldata(proof, gtdMerkleRoot, leaf)) revert InvalidProof();

        mintedInGTD[msg.sender] = true;
        gtdMinted++;
        _mintOne(msg.sender, Phase.GTD);
    }

    /// @notice Merkle-gated FCFS mint (race for remaining supply). 1 per wallet.
    function fcfsMint(bytes32[] calldata proof) external payable nonReentrant {
        if (currentPhase != Phase.FCFS) revert WrongPhase();
        if (fcfsMerkleRoot == bytes32(0)) revert MerkleRootNotSet();
        if (mintedInFCFS[msg.sender]) revert AlreadyMintedInPhase();
        if (msg.value < mintPrice) revert InsufficientPayment();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verifyCalldata(proof, fcfsMerkleRoot, leaf)) revert InvalidProof();

        mintedInFCFS[msg.sender] = true;
        fcfsMinted++;
        _mintOne(msg.sender, Phase.FCFS);
    }

    /// @notice Open public mint. 1 per wallet.
    function publicMint() external payable nonReentrant {
        if (currentPhase != Phase.Public) revert WrongPhase();
        if (mintedInPublic[msg.sender]) revert AlreadyMintedInPhase();
        if (msg.value < mintPrice) revert InsufficientPayment();

        mintedInPublic[msg.sender] = true;
        publicMinted++;
        _mintOne(msg.sender, Phase.Public);
    }

    /// @notice Owner mint for the team / vault allocation (up to RESERVED_ALLOCATION total).
    function reservedMint(address to, uint256 quantity) external onlyOwner {
        if (quantity == 0) revert ZeroQuantity();
        if (reservedMinted + quantity > RESERVED_ALLOCATION) revert ExceedsReservedAllocation();
        if (_nextTokenId + quantity > MAX_SUPPLY) revert ExceedsMaxSupply();

        uint256 startId = _nextTokenId;
        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(to, _nextTokenId);
            _nextTokenId++;
        }
        reservedMinted += quantity;
        emit ReservedMinted(to, startId, quantity);
    }

    function _mintOne(address to, Phase phase) internal {
        if (_nextTokenId >= MAX_SUPPLY) revert ExceedsMaxSupply();
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        _safeMint(to, tokenId);
        emit Minted(to, tokenId, phase);
    }

    // ─── Admin ───────────────────────────────────────────────────────

    function setPhase(Phase phase) external onlyOwner {
        currentPhase = phase;
        emit PhaseChanged(phase);
    }

    function setGTDMerkleRoot(bytes32 root) external onlyOwner {
        gtdMerkleRoot = root;
        emit GTDMerkleRootSet(root);
    }

    function setFCFSMerkleRoot(bytes32 root) external onlyOwner {
        fcfsMerkleRoot = root;
        emit FCFSMerkleRootSet(root);
    }

    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
    }

    /// @notice Set revenue splitter address — can only be called once.
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

    /// @notice Withdraw contract balance to revenue splitter (or owner if not set).
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
