// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentIdentity — ERC-8004 Agent Identity and Reputation interface
interface IAgentIdentity {
    struct AgentInfo {
        string name;
        address walletAddress;
        uint256 reputationScore;
        uint256 totalDecisions;
        uint256 registeredAt;
        bool verified;
    }

    struct ReputationEntry {
        uint256 timestamp;
        uint8 score; // 0-100
        bytes32 tag; // e.g. keccak256("wl_decision"), keccak256("outreach")
        string reason;
    }

    error AgentNotFound(uint256 agentId);
    error NotAuthorized();
    error InvalidScore(uint8 score);
    error ZeroAddress();

    event AgentRegistered(uint256 indexed agentId, string name, address indexed wallet);
    event ReputationUpdated(
        uint256 indexed agentId,
        uint8 score,
        bytes32 indexed tag,
        string reason
    );
    event AgentVerified(uint256 indexed agentId);
    event AgentUnverified(uint256 indexed agentId);
    event AuthorizedUpdaterAdded(address indexed updater);
    event AuthorizedUpdaterRemoved(address indexed updater);

    function registerAgent(
        string calldata name,
        string calldata agentURI,
        address walletAddress
    ) external returns (uint256 agentId);

    function updateReputation(
        uint256 agentId,
        uint8 score,
        bytes32 tag,
        string calldata reason
    ) external;

    function getAgentInfo(uint256 agentId) external view returns (AgentInfo memory);
    function verifyAgent(uint256 agentId) external;
    function getReputationHistory(
        uint256 agentId,
        uint256 offset,
        uint256 limit
    ) external view returns (ReputationEntry[] memory);
    function getReputationCount(uint256 agentId) external view returns (uint256);
}
