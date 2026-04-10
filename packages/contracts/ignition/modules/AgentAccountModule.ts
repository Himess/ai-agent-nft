import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const AgentAccountModule = buildModule("AgentAccountModule", (m) => {
  const chainId = m.getParameter<bigint>("chainId");
  const tokenContract = m.getParameter<string>("tokenContract");
  const tokenId = m.getParameter("tokenId", 0n);
  const maxPerTx = m.getParameter("maxPerTx", ethers.parseEther("0.1"));
  const maxDaily = m.getParameter("maxDaily", ethers.parseEther("0.3"));
  const minBalance = m.getParameter("minBalance", ethers.parseEther("4"));
  const multisigThreshold = m.getParameter("multisigThreshold", ethers.parseEther("1"));

  const agentAccount = m.contract("AgentAccount", [
    chainId,
    tokenContract,
    tokenId,
    maxPerTx,
    maxDaily,
    minBalance,
    multisigThreshold,
  ]);

  return { agentAccount };
});

export default AgentAccountModule;
