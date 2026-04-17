import { ethers } from "hardhat";

export const MINT_PRICE = ethers.parseEther("0.01");
export const ROYALTY_BPS = 500n; // 5%
export const MAX_SUPPLY = 888n;
export const RESERVED_ALLOCATION = 88n;

// Canonical cross-chain SeaDrop address (mainnet + Sepolia).
// For local unit tests we deploy a placeholder; Seadrop-driven mint flows
// are exercised in dedicated integration tests against a forked network.
export const SEADROP_PLACEHOLDER =
  "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

export async function deployAgentNFT() {
  const [owner, founder1, founder2, user1, user2, user3] =
    await ethers.getSigners();

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy("SURVIVORS", "SVVR", [SEADROP_PLACEHOLDER]);
  await nft.waitForDeployment();

  // Seadrop requires an explicit maxSupply before any mint. Set it once here
  // so individual tests don't have to repeat the call.
  await nft.setMaxSupply(MAX_SUPPLY);

  return { nft, owner, founder1, founder2, user1, user2, user3 };
}
