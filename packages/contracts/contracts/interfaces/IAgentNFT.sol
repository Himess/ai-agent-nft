// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentNFT {
    error MintNotActive();
    error ExceedsMaxSupply();
    error InsufficientPayment();
    error ZeroQuantity();
    error MaxBatchExceeded();
    error SplitterAlreadySet();
    error ZeroAddress();
    error WithdrawFailed();

    event MintActiveChanged(bool active);
    event RevenueSplitterSet(address indexed splitter);
    event BatchMinted(address indexed to, uint256 startTokenId, uint256 quantity);

    function mint(uint256 quantity) external payable;
    function setMintActive(bool active) external;
    function setRevenueSplitter(address splitter, uint96 royaltyBps) external;
    function setBaseURI(string calldata baseURI) external;
    function withdraw() external;
    function totalMinted() external view returns (uint256);
}
