import { ethers } from "ethers";
import { getConfig } from "../config.js";
import { getSigner } from "./provider.js";

// Minimal ABIs — only the functions the agent needs
const AGENT_ACCOUNT_ABI = [
  "function execute(address to, uint256 value, bytes data, uint8 operation) payable returns (bytes)",
  "function dailySpent() view returns (uint256)",
  "function getRemainingDailyBudget() view returns (uint256)",
  "function state() view returns (uint256)",
  "function approvedTargets(address) view returns (bool)",
  "event Executed(address indexed target, uint256 value, bytes4 selector)",
];

const AGENT_IDENTITY_ABI = [
  "function updateReputation(uint256 agentId, uint8 score, bytes32 tag, string reason)",
  "function getAgentInfo(uint256 agentId) view returns (tuple(string name, address walletAddress, uint256 reputationScore, uint256 totalDecisions, uint256 registeredAt, bool verified))",
  "function getReputationCount(uint256 agentId) view returns (uint256)",
  "event ReputationUpdated(uint256 indexed agentId, uint8 score, bytes32 indexed tag, string reason)",
];

const AGENT_NFT_ABI = [
  "function totalMinted() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function mintActive() view returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "event BatchMinted(address indexed to, uint256 startTokenId, uint256 quantity)",
];

const REVENUE_SPLITTER_ABI = [
  "function pendingPayment(address account) view returns (uint256)",
  "function totalReceived() view returns (uint256)",
  "function totalReleased() view returns (uint256)",
  "event PaymentReceived(address indexed from, uint256 amount)",
  "event PaymentReleased(address indexed to, uint256 amount)",
];

export interface Contracts {
  agentAccount: ethers.Contract;
  agentIdentity: ethers.Contract;
  agentNFT: ethers.Contract;
  revenueSplitter: ethers.Contract;
}

let _contracts: Contracts | null = null;

export function getContracts(): Contracts {
  if (_contracts) return _contracts;

  const config = getConfig();
  const signer = getSigner();

  _contracts = {
    agentAccount: new ethers.Contract(
      config.AGENT_ACCOUNT_ADDRESS,
      AGENT_ACCOUNT_ABI,
      signer
    ),
    agentIdentity: new ethers.Contract(
      config.AGENT_IDENTITY_ADDRESS,
      AGENT_IDENTITY_ABI,
      signer
    ),
    agentNFT: new ethers.Contract(
      config.AGENT_NFT_ADDRESS,
      AGENT_NFT_ABI,
      signer
    ),
    revenueSplitter: new ethers.Contract(
      config.REVENUE_SPLITTER_ADDRESS,
      REVENUE_SPLITTER_ABI,
      signer
    ),
  };

  return _contracts;
}

// Reputation tags
export const TAGS = {
  WL_DECISION: ethers.keccak256(ethers.toUtf8Bytes("wl_decision")),
  OUTREACH: ethers.keccak256(ethers.toUtf8Bytes("outreach")),
  SPENDING: ethers.keccak256(ethers.toUtf8Bytes("spending")),
  COLLAB: ethers.keccak256(ethers.toUtf8Bytes("collab")),
  CONTENT: ethers.keccak256(ethers.toUtf8Bytes("content")),
} as const;
