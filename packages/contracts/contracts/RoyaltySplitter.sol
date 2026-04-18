// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RoyaltySplitter — Immutable 30/70 royalty split (agent / team)
/// @notice Used as the ERC-2981 royalty recipient for SurvivorsNFT secondary sales.
///         Primary-mint proceeds go directly to the team wallet via SeaDrop's
///         creator payout config and never touch this contract. Pull-based to
///         keep marketplace transfers resilient if a payee reverts.
contract RoyaltySplitter is ReentrancyGuard {
    uint256 public constant AGENT_BPS = 3000; // 30%
    uint256 public constant TEAM_BPS = 7000; // 70%
    uint256 private constant TOTAL_BPS = 10000;

    address public immutable agent;
    address public immutable team;

    uint256 public totalReceived;
    mapping(address => uint256) public released;

    error ZeroAddress();
    error NoPaymentDue();
    error TransferFailed();

    event PaymentReceived(address indexed from, uint256 amount);
    event PaymentReleased(address indexed to, uint256 amount);

    constructor(address agent_, address team_) {
        if (agent_ == address(0) || team_ == address(0)) revert ZeroAddress();
        agent = agent_;
        team = team_;
    }

    receive() external payable {
        totalReceived += msg.value;
        emit PaymentReceived(msg.sender, msg.value);
    }

    /// @notice Pending payment for a payee.
    function pendingPayment(address account) public view returns (uint256) {
        uint256 shares = _sharesOf(account);
        if (shares == 0) return 0;
        uint256 earned = (totalReceived * shares) / TOTAL_BPS;
        return earned - released[account];
    }

    /// @notice Release pending payment to a payee.
    function release(address payable account) public nonReentrant {
        uint256 amount = pendingPayment(account);
        if (amount == 0) revert NoPaymentDue();
        released[account] += amount;
        (bool success, ) = account.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit PaymentReleased(account, amount);
    }

    /// @notice Release both payees in one tx.
    function releaseAll() external {
        if (pendingPayment(agent) > 0) release(payable(agent));
        if (pendingPayment(team) > 0) release(payable(team));
    }

    function _sharesOf(address account) internal view returns (uint256) {
        if (account == agent) return AGENT_BPS;
        if (account == team) return TEAM_BPS;
        return 0;
    }
}
