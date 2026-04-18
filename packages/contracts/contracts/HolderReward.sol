// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title HolderReward — Merkle-claim epoch distribution for SURVIVORS holders
/// @notice Each epoch seeds the contract with ETH and a merkle root of
///         (holder, amount) leaves. Holders claim once per epoch with a proof.
///         Unclaimed funds become reclaimable by the owner after CLAIM_WINDOW.
///         Leaf format: keccak256(abi.encodePacked(holder, amount)).
contract HolderReward is Ownable, ReentrancyGuard {
    uint256 public constant CLAIM_WINDOW = 60 days;

    struct Epoch {
        bytes32 merkleRoot;
        uint256 totalAmount;
        uint256 totalClaimed;
        uint64 createdAt;
        uint64 expiresAt;
    }

    uint256 public nextEpochId;
    mapping(uint256 => Epoch) public epochs;
    mapping(uint256 => mapping(address => bool)) public claimed;

    error ZeroRoot();
    error ZeroAmount();
    error EpochMissing();
    error AlreadyClaimed();
    error InvalidProof();
    error NotExpired();
    error NothingToReclaim();
    error TransferFailed();

    event EpochCreated(uint256 indexed epochId, bytes32 root, uint256 amount, uint64 expiresAt);
    event Claimed(uint256 indexed epochId, address indexed holder, uint256 amount);
    event Reclaimed(uint256 indexed epochId, uint256 amount);

    constructor(address owner_) Ownable(owner_) {}

    /// @notice Create a new epoch, funded by msg.value. Callable by owner only.
    ///         Owner is expected to be the team wallet or AgentAccount (TBA) via execute().
    function createEpoch(bytes32 root) external payable onlyOwner returns (uint256 epochId) {
        if (root == bytes32(0)) revert ZeroRoot();
        if (msg.value == 0) revert ZeroAmount();

        epochId = nextEpochId++;
        epochs[epochId] = Epoch({
            merkleRoot: root,
            totalAmount: msg.value,
            totalClaimed: 0,
            createdAt: uint64(block.timestamp),
            expiresAt: uint64(block.timestamp + CLAIM_WINDOW)
        });
        emit EpochCreated(epochId, root, msg.value, uint64(block.timestamp + CLAIM_WINDOW));
    }

    /// @notice Claim a holder's share of an epoch.
    function claim(uint256 epochId, uint256 amount, bytes32[] calldata proof) external nonReentrant {
        Epoch storage e = epochs[epochId];
        if (e.merkleRoot == bytes32(0)) revert EpochMissing();
        if (claimed[epochId][msg.sender]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        if (!MerkleProof.verifyCalldata(proof, e.merkleRoot, leaf)) revert InvalidProof();

        claimed[epochId][msg.sender] = true;
        e.totalClaimed += amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Claimed(epochId, msg.sender, amount);
    }

    /// @notice Owner reclaims unclaimed funds after the claim window closes.
    function reclaimExpired(uint256 epochId) external onlyOwner nonReentrant {
        Epoch storage e = epochs[epochId];
        if (e.merkleRoot == bytes32(0)) revert EpochMissing();
        if (block.timestamp < e.expiresAt) revert NotExpired();

        uint256 remaining = e.totalAmount - e.totalClaimed;
        if (remaining == 0) revert NothingToReclaim();

        // Mark the epoch as fully drained so subsequent claims revert and
        // this function cannot be replayed on the same epoch.
        e.totalClaimed = e.totalAmount;

        (bool success, ) = owner().call{value: remaining}("");
        if (!success) revert TransferFailed();

        emit Reclaimed(epochId, remaining);
    }

    /// @notice View: amount remaining for claim in the given epoch.
    function epochRemaining(uint256 epochId) external view returns (uint256) {
        Epoch storage e = epochs[epochId];
        if (e.merkleRoot == bytes32(0)) return 0;
        return e.totalAmount - e.totalClaimed;
    }

    /// @notice Accept ETH top-ups between epochs (e.g., direct splitter releases).
    receive() external payable {}
}
