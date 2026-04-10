import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const AgentNFTModule = buildModule("AgentNFTModule", (m) => {
  const mintPrice = m.getParameter("mintPrice", ethers.parseEther("0.01"));
  const royaltyBps = m.getParameter("royaltyBps", 500n); // 5%

  const nft = m.contract("AgentNFT", [
    "AI Agent NFT",
    "AGENT",
    mintPrice,
    royaltyBps,
  ]);

  return { nft };
});

export default AgentNFTModule;
