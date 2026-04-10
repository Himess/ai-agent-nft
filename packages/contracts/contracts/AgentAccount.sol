// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC6551Account} from "./interfaces/IERC6551Account.sol";
import {IERC6551Executable} from "./interfaces/IERC6551Executable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SpendingLimits} from "./libraries/SpendingLimits.sol";

/// @title AgentAccount — ERC-6551 Token Bound Account with spending limits
/// @notice The AI Agent's on-chain wallet with per-tx, daily, and min-balance limits
contract AgentAccount is IERC6551Account, IERC6551Executable, IERC165, IERC1271 {
    using SpendingLimits for SpendingLimits.Config;

    // ─── Errors ──────────────────────────────────────────────────────

    error NotOwner();
    error InvalidOperation();
    error ExecutionFailed();
    error TargetNotApproved(address target);
    error AlreadyApproved(address target);
    error NotApproved(address target);
    error AlreadySigner(address signer);
    error NotSigner(address signer);
    error InsufficientApprovals(uint256 have, uint256 need);
    error ZeroAddress();
    error ApprovalExpired();

    // ─── Events ──────────────────────────────────────────────────────

    event Executed(address indexed target, uint256 value, bytes4 selector);
    event TargetApproved(address indexed target);
    event TargetRemoved(address indexed target);
    event MultisigSignerAdded(address indexed signer);
    event MultisigSignerRemoved(address indexed signer);
    event MultisigApproval(bytes32 indexed txHash, address indexed signer);
    event DailyLimitReset(uint256 day);

    // ─── State ───────────────────────────────────────────────────────

    uint256 public state;
    SpendingLimits.Config public spendingConfig;

    // Approved targets whitelist
    mapping(address => bool) public approvedTargets;
    uint256 public approvedTargetCount;

    // Multisig
    mapping(address => bool) public isMultisigSigner;
    uint256 public multisigSignerCount;
    uint256 public multisigRequired;

    // Multisig approvals: txHash => signer => approved
    mapping(bytes32 => mapping(address => bool)) public multisigApprovals;
    mapping(bytes32 => uint256) public approvalCount;

    // Daily spending tracking
    uint256 public dailySpent;
    uint256 public lastResetDay;

    // Immutable token binding (set once via ERC-6551 registry proxy pattern)
    uint256 private immutable _chainId;
    address private immutable _tokenContract;
    uint256 private immutable _tokenId;

    // ─── Constants ───────────────────────────────────────────────────

    bytes4 constant MAGIC_VALUE = IERC6551Account.isValidSigner.selector; // 0x523e3260
    bytes4 constant ERC1271_MAGIC = IERC1271.isValidSignature.selector;   // 0x1626ba7e

    constructor(
        uint256 chainId_,
        address tokenContract_,
        uint256 tokenId_,
        uint256 maxPerTx_,
        uint256 maxDaily_,
        uint256 minBalance_,
        uint256 multisigThreshold_
    ) {
        _chainId = chainId_;
        _tokenContract = tokenContract_;
        _tokenId = tokenId_;

        spendingConfig = SpendingLimits.Config({
            maxPerTx: maxPerTx_,
            maxDaily: maxDaily_,
            minBalance: minBalance_,
            multisigThreshold: multisigThreshold_
        });

        lastResetDay = block.timestamp / 1 days;
    }

    receive() external payable {}

    // ─── ERC-6551 Account ────────────────────────────────────────────

    function token()
        public
        view
        returns (uint256 chainId, address tokenContract, uint256 tokenId)
    {
        return (_chainId, _tokenContract, _tokenId);
    }

    function isValidSigner(
        address signer,
        bytes calldata
    ) external view returns (bytes4) {
        if (_isOwner(signer)) {
            return MAGIC_VALUE;
        }
        return bytes4(0);
    }

    // ─── ERC-1271 ────────────────────────────────────────────────────

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view returns (bytes4) {
        address recovered = ECDSA.recover(hash, signature);
        if (_isOwner(recovered)) {
            return ERC1271_MAGIC;
        }
        return bytes4(0);
    }

    // ─── Execute ─────────────────────────────────────────────────────

    /// @notice Execute a transaction from this TBA
    /// @dev Only the NFT owner can call. Enforces spending limits and target whitelist.
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable returns (bytes memory) {
        if (!_isOwner(msg.sender)) revert NotOwner();
        if (operation != 0) revert InvalidOperation(); // Only CALL supported

        // Reset daily spending if new day
        _resetDailyIfNeeded();

        // If sending ETH, enforce spending limits and target whitelist
        if (value > 0) {
            if (!approvedTargets[to]) revert TargetNotApproved(to);

            // Check if multisig required (>threshold) — handled separately via approveAndExecute
            if (value > spendingConfig.multisigThreshold) {
                revert SpendingLimits.RequiresMultisig(value, spendingConfig.multisigThreshold);
            }

            spendingConfig.validate(value, address(this).balance, dailySpent);
            dailySpent += value;
        }

        // Execute
        (bool success, bytes memory result) = to.call{value: value}(data);
        if (!success) revert ExecutionFailed();

        state++;
        emit Executed(to, value, bytes4(data.length >= 4 ? bytes4(data[:4]) : bytes4(0)));

        return result;
    }

    /// @notice Approve a multisig transaction (does not execute)
    function approveTransaction(
        address to,
        uint256 value,
        bytes calldata data
    ) external {
        if (!isMultisigSigner[msg.sender] && !_isOwner(msg.sender)) revert NotOwner();

        bytes32 txHash = keccak256(abi.encodePacked(to, value, data, state));

        if (!multisigApprovals[txHash][msg.sender]) {
            multisigApprovals[txHash][msg.sender] = true;
            approvalCount[txHash]++;
            emit MultisigApproval(txHash, msg.sender);
        }
    }

    /// @notice Execute a multisig-approved transaction
    function executeMultisig(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bytes memory) {
        if (!isMultisigSigner[msg.sender] && !_isOwner(msg.sender)) revert NotOwner();

        bytes32 txHash = keccak256(abi.encodePacked(to, value, data, state));

        // Check if enough approvals
        if (approvalCount[txHash] < multisigRequired) {
            revert InsufficientApprovals(approvalCount[txHash], multisigRequired);
        }

        // All checks for target and limits
        _resetDailyIfNeeded();
        if (value > 0 && !approvedTargets[to]) revert TargetNotApproved(to);

        // For multisig, skip per-tx limit but enforce daily and min-balance
        if (dailySpent + value > spendingConfig.maxDaily) {
            revert SpendingLimits.ExceedsDailyLimit(value, spendingConfig.maxDaily - dailySpent);
        }
        if (address(this).balance - value < spendingConfig.minBalance) {
            revert SpendingLimits.BelowMinBalance(
                address(this).balance - value,
                spendingConfig.minBalance
            );
        }

        dailySpent += value;

        (bool success, bytes memory result) = to.call{value: value}(data);
        if (!success) revert ExecutionFailed();

        state++;
        emit Executed(to, value, bytes4(data.length >= 4 ? bytes4(data[:4]) : bytes4(0)));

        return result;
    }

    // ─── Admin (Owner Only) ──────────────────────────────────────────

    function addApprovedTarget(address target) external {
        if (!_isOwner(msg.sender)) revert NotOwner();
        if (target == address(0)) revert ZeroAddress();
        if (approvedTargets[target]) revert AlreadyApproved(target);

        approvedTargets[target] = true;
        approvedTargetCount++;
        emit TargetApproved(target);
    }

    function removeApprovedTarget(address target) external {
        if (!_isOwner(msg.sender)) revert NotOwner();
        if (!approvedTargets[target]) revert NotApproved(target);

        approvedTargets[target] = false;
        approvedTargetCount--;
        emit TargetRemoved(target);
    }

    function addMultisigSigner(address signer) external {
        if (!_isOwner(msg.sender)) revert NotOwner();
        if (signer == address(0)) revert ZeroAddress();
        if (isMultisigSigner[signer]) revert AlreadySigner(signer);

        isMultisigSigner[signer] = true;
        multisigSignerCount++;
        emit MultisigSignerAdded(signer);
    }

    function removeMultisigSigner(address signer) external {
        if (!_isOwner(msg.sender)) revert NotOwner();
        if (!isMultisigSigner[signer]) revert NotSigner(signer);

        isMultisigSigner[signer] = false;
        multisigSignerCount--;
        emit MultisigSignerRemoved(signer);
    }

    function setMultisigRequired(uint256 required) external {
        if (!_isOwner(msg.sender)) revert NotOwner();
        multisigRequired = required;
    }

    // ─── ERC-165 ─────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC6551Account).interfaceId ||
            interfaceId == type(IERC6551Executable).interfaceId ||
            interfaceId == type(IERC1271).interfaceId;
    }

    // ─── Internal ────────────────────────────────────────────────────

    function _isOwner(address caller) internal view returns (bool) {
        return IERC721(_tokenContract).ownerOf(_tokenId) == caller;
    }

    function _resetDailyIfNeeded() internal {
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            dailySpent = 0;
            lastResetDay = today;
            emit DailyLimitReset(today);
        }
    }

    // ─── Views ───────────────────────────────────────────────────────

    function getRemainingDailyBudget() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            return spendingConfig.maxDaily;
        }
        if (dailySpent >= spendingConfig.maxDaily) return 0;
        return spendingConfig.maxDaily - dailySpent;
    }

    function owner() public view returns (address) {
        return IERC721(_tokenContract).ownerOf(_tokenId);
    }
}
