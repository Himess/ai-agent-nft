// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentNFT {
    enum Phase { Closed, GTD, FCFS, Public }

    error MintNotActive();
    error WrongPhase();
    error ExceedsMaxSupply();
    error ExceedsReservedAllocation();
    error InsufficientPayment();
    error ZeroQuantity();
    error AlreadyMintedInPhase();
    error InvalidProof();
    error MerkleRootNotSet();
    error SplitterAlreadySet();
    error ZeroAddress();
    error WithdrawFailed();

    event PhaseChanged(Phase phase);
    event GTDMerkleRootSet(bytes32 root);
    event FCFSMerkleRootSet(bytes32 root);
    event RevenueSplitterSet(address indexed splitter);
    event Minted(address indexed to, uint256 tokenId, Phase phase);
    event ReservedMinted(address indexed to, uint256 startTokenId, uint256 quantity);

    function gtdMint(bytes32[] calldata proof) external payable;
    function fcfsMint(bytes32[] calldata proof) external payable;
    function publicMint() external payable;
    function setPhase(Phase phase) external;
    function setGTDMerkleRoot(bytes32 root) external;
    function setFCFSMerkleRoot(bytes32 root) external;
    function setRevenueSplitter(address splitter, uint96 royaltyBps) external;
    function setBaseURI(string calldata baseURI) external;
    function withdraw() external;
    function totalMinted() external view returns (uint256);
}
