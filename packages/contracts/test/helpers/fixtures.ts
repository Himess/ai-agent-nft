import { ethers } from "hardhat";

export const MINT_PRICE = ethers.parseEther("0.01");
export const ROYALTY_BPS = 500n; // 5%
export const MAX_SUPPLY = 1000n;
export const MAX_BATCH = 20n;

export async function deployAgentNFT() {
  const [owner, founder1, founder2, user1, user2, user3] =
    await ethers.getSigners();

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy(
    "AI Agent NFT",
    "AGENT",
    MINT_PRICE,
    ROYALTY_BPS
  );
  await nft.waitForDeployment();

  return { nft, owner, founder1, founder2, user1, user2, user3 };
}
