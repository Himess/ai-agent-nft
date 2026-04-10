// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SpendingLimits — Spending limit validation for Agent TBA
library SpendingLimits {
    error ExceedsPerTxLimit(uint256 requested, uint256 max);
    error ExceedsDailyLimit(uint256 requested, uint256 remaining);
    error BelowMinBalance(uint256 resultingBalance, uint256 minRequired);
    error RequiresMultisig(uint256 amount, uint256 threshold);
    error TargetNotApproved(address target);

    struct Config {
        uint256 maxPerTx;
        uint256 maxDaily;
        uint256 minBalance;
        uint256 multisigThreshold;
    }

    /// @notice Validate a spending transaction against all limits
    function validate(
        Config storage config,
        uint256 value,
        uint256 currentBalance,
        uint256 dailySpent
    ) internal view {
        // Per-transaction limit
        if (value > config.maxPerTx) {
            revert ExceedsPerTxLimit(value, config.maxPerTx);
        }

        // Daily limit
        uint256 newDailyTotal = dailySpent + value;
        if (newDailyTotal > config.maxDaily) {
            revert ExceedsDailyLimit(value, config.maxDaily - dailySpent);
        }

        // Minimum balance protection
        if (currentBalance - value < config.minBalance) {
            revert BelowMinBalance(currentBalance - value, config.minBalance);
        }

        // Multisig threshold (checked separately in AgentAccount)
        if (value > config.multisigThreshold) {
            revert RequiresMultisig(value, config.multisigThreshold);
        }
    }
}
