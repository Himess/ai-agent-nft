// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRevenueSplitter {
    error ZeroAddress();
    error NoPaymentDue();
    error TransferFailed();

    event PaymentReceived(address indexed from, uint256 amount);
    event PaymentReleased(address indexed to, uint256 amount);

    function release(address payable account) external;
    function releaseAll() external;
    function pendingPayment(address account) external view returns (uint256);
}
