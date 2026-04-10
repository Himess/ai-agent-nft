// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRevenueSplitter} from "./interfaces/IRevenueSplitter.sol";

/// @title RevenueSplitter — Immutable 50/20/30 revenue split
/// @notice Splits incoming ETH between AI Agent TBA, Founder 1, and Founder 2
contract RevenueSplitter is ReentrancyGuard, IRevenueSplitter {
    uint256 private constant TOTAL_SHARES = 10000; // basis points

    struct Payee {
        address account;
        uint256 shares; // basis points
    }

    Payee[3] private _payees;
    uint256 public totalReceived;
    uint256 public totalReleased;
    mapping(address => uint256) public released;

    constructor(
        address agentTBA,
        address founder1,
        address founder2
    ) {
        if (agentTBA == address(0) || founder1 == address(0) || founder2 == address(0))
            revert ZeroAddress();

        _payees[0] = Payee(agentTBA, 5000); // 50%
        _payees[1] = Payee(founder1, 2000); // 20%
        _payees[2] = Payee(founder2, 3000); // 30%
    }

    receive() external payable {
        totalReceived += msg.value;
        emit PaymentReceived(msg.sender, msg.value);
    }

    /// @notice Release pending payment for a specific payee
    function release(address payable account) public nonReentrant {
        uint256 payment = pendingPayment(account);
        if (payment == 0) revert NoPaymentDue();

        released[account] += payment;
        totalReleased += payment;

        (bool success, ) = account.call{value: payment}("");
        if (!success) revert TransferFailed();

        emit PaymentReleased(account, payment);
    }

    /// @notice Release pending payments for all payees
    function releaseAll() external {
        for (uint256 i = 0; i < 3; i++) {
            uint256 payment = pendingPayment(_payees[i].account);
            if (payment > 0) {
                release(payable(_payees[i].account));
            }
        }
    }

    /// @notice Calculate pending payment for a payee
    function pendingPayment(address account) public view returns (uint256) {
        uint256 shares = _getShares(account);
        if (shares == 0) return 0;

        uint256 totalEarned = (totalReceived * shares) / TOTAL_SHARES;
        return totalEarned - released[account];
    }

    // ─── Views ───────────────────────────────────────────────────────

    function getPayee(uint256 index) external view returns (address account, uint256 shares) {
        require(index < 3, "Invalid index");
        return (_payees[index].account, _payees[index].shares);
    }

    // ─── Internal ────────────────────────────────────────────────────

    function _getShares(address account) internal view returns (uint256) {
        for (uint256 i = 0; i < 3; i++) {
            if (_payees[i].account == account) {
                return _payees[i].shares;
            }
        }
        return 0;
    }
}
