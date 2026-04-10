// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentIdentity} from "./IAgentIdentity.sol";

/// @title AgentIdentity — ERC-8004 Agent Identity and Reputation Registry
/// @notice Registers AI agents on-chain with identity NFTs and tracks reputation scores
contract AgentIdentity is ERC721, ERC721URIStorage, Ownable, IAgentIdentity {
    uint256 private _nextAgentId;

    // Agent data
    mapping(uint256 => AgentInfo) private _agents;
    mapping(uint256 => ReputationEntry[]) private _reputationHistory;

    // Authorized reputation updaters (agent's TBA, backend signer, etc.)
    mapping(address => bool) public authorizedUpdaters;

    constructor() ERC721("Agent Identity", "AGENTID") Ownable(msg.sender) {}

    // ─── Registration ────────────────────────────────────────────────

    /// @notice Register a new AI agent identity (mints an identity NFT)
    function registerAgent(
        string calldata name,
        string calldata agentURI,
        address walletAddress
    ) external onlyOwner returns (uint256 agentId) {
        if (walletAddress == address(0)) revert ZeroAddress();

        agentId = _nextAgentId;
        _nextAgentId++;

        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);

        _agents[agentId] = AgentInfo({
            name: name,
            walletAddress: walletAddress,
            reputationScore: 0,
            totalDecisions: 0,
            registeredAt: block.timestamp,
            verified: false
        });

        emit AgentRegistered(agentId, name, walletAddress);
    }

    // ─── Reputation ──────────────────────────────────────────────────

    /// @notice Record a reputation entry for an agent
    /// @param agentId The agent's token ID
    /// @param score Score from 0-100
    /// @param tag Category tag (e.g. keccak256("wl_decision"))
    /// @param reason Description or IPFS hash of the decision
    function updateReputation(
        uint256 agentId,
        uint8 score,
        bytes32 tag,
        string calldata reason
    ) external {
        if (!_isAuthorized(msg.sender)) revert NotAuthorized();
        if (_ownerOf(agentId) == address(0)) revert AgentNotFound(agentId);
        if (score > 100) revert InvalidScore(score);

        AgentInfo storage agent = _agents[agentId];

        // Update cumulative average: ((old * count) + new) / (count + 1)
        uint256 totalScore = agent.reputationScore * agent.totalDecisions + uint256(score);
        agent.totalDecisions++;
        agent.reputationScore = totalScore / agent.totalDecisions;

        _reputationHistory[agentId].push(
            ReputationEntry({
                timestamp: block.timestamp,
                score: score,
                tag: tag,
                reason: reason
            })
        );

        emit ReputationUpdated(agentId, score, tag, reason);
    }

    // ─── Verification ────────────────────────────────────────────────

    function verifyAgent(uint256 agentId) external onlyOwner {
        if (_ownerOf(agentId) == address(0)) revert AgentNotFound(agentId);
        _agents[agentId].verified = true;
        emit AgentVerified(agentId);
    }

    function unverifyAgent(uint256 agentId) external onlyOwner {
        if (_ownerOf(agentId) == address(0)) revert AgentNotFound(agentId);
        _agents[agentId].verified = false;
        emit AgentUnverified(agentId);
    }

    // ─── Authorized Updaters ─────────────────────────────────────────

    function addAuthorizedUpdater(address updater) external onlyOwner {
        if (updater == address(0)) revert ZeroAddress();
        authorizedUpdaters[updater] = true;
        emit AuthorizedUpdaterAdded(updater);
    }

    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
        emit AuthorizedUpdaterRemoved(updater);
    }

    // ─── Views ───────────────────────────────────────────────────────

    function getAgentInfo(uint256 agentId) external view returns (AgentInfo memory) {
        if (_ownerOf(agentId) == address(0)) revert AgentNotFound(agentId);
        return _agents[agentId];
    }

    function getReputationHistory(
        uint256 agentId,
        uint256 offset,
        uint256 limit
    ) external view returns (ReputationEntry[] memory) {
        if (_ownerOf(agentId) == address(0)) revert AgentNotFound(agentId);

        ReputationEntry[] storage history = _reputationHistory[agentId];
        uint256 total = history.length;

        if (offset >= total) {
            return new ReputationEntry[](0);
        }

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 resultLength = end - offset;

        ReputationEntry[] memory result = new ReputationEntry[](resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = history[offset + i];
        }

        return result;
    }

    function getReputationCount(uint256 agentId) external view returns (uint256) {
        if (_ownerOf(agentId) == address(0)) revert AgentNotFound(agentId);
        return _reputationHistory[agentId].length;
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId;
    }

    // ─── Internal ────────────────────────────────────────────────────

    function _isAuthorized(address caller) internal view returns (bool) {
        return caller == owner() || authorizedUpdaters[caller];
    }

    // ─── Overrides ───────────────────────────────────────────────────

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
