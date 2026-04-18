/**
 * Deploy RoyaltySplitter (30/70 agent/team) + HolderReward, then rewire the
 * existing SurvivorsNFT to:
 *   - send primary-mint revenue directly to the team wallet (bypasses the
 *     splitter entirely — mint is team-only)
 *   - send ERC-2981 royalty payments through the new RoyaltySplitter
 *
 * Safe to re-run with different env values: deploy is fresh each time, NFT
 * admin calls are idempotent.
 *
 * Usage:
 *   NFT_ADDRESS=0x...        \   # default: current Sepolia SurvivorsNFT
 *   AGENT_ACCOUNT=0x...      \   # default: current Sepolia AgentAccount
 *   TEAM_WALLET=0x...        \   # default: deployer address
 *   npx hardhat run scripts/deploy-revenue-v2.ts --network sepolia
 */
import { ethers } from "hardhat";

const SEADROP = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";
const NFT_DEFAULT = "0xe192E5ba10D7b4d44b16a122Fb0Bf0D020831A2D";
const AGENT_ACCOUNT_DEFAULT = "0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A";
const ROYALTY_BPS = 500; // 5%

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const NFT_ADDRESS = process.env.NFT_ADDRESS ?? NFT_DEFAULT;
  const AGENT_ACCOUNT = process.env.AGENT_ACCOUNT ?? AGENT_ACCOUNT_DEFAULT;
  const TEAM_WALLET = process.env.TEAM_WALLET ?? deployer.address;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Revenue v2 — RoyaltySplitter + HolderReward");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network:       ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer:      ${deployer.address}`);
  console.log(`  NFT:           ${NFT_ADDRESS}`);
  console.log(`  Agent TBA:     ${AGENT_ACCOUNT}`);
  console.log(`  Team wallet:   ${TEAM_WALLET}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 1. Deploy RoyaltySplitter (30/70)
  console.log("1/4  Deploying RoyaltySplitter (30% agent / 70% team)...");
  const RoyaltySplitter = await ethers.getContractFactory("RoyaltySplitter");
  const splitter = await RoyaltySplitter.deploy(AGENT_ACCOUNT, TEAM_WALLET);
  await splitter.waitForDeployment();
  const splitterAddr = await splitter.getAddress();
  console.log(`     RoyaltySplitter: ${splitterAddr}\n`);

  // 2. Deploy HolderReward (team-owned)
  console.log("2/4  Deploying HolderReward (owner = team wallet)...");
  const HolderReward = await ethers.getContractFactory("HolderReward");
  const reward = await HolderReward.deploy(TEAM_WALLET);
  await reward.waitForDeployment();
  const rewardAddr = await reward.getAddress();
  console.log(`     HolderReward: ${rewardAddr}\n`);

  // 3. Rewire NFT: mint payout → team wallet direct; royalty → new splitter
  const nft = await ethers.getContractAt("AgentNFT", NFT_ADDRESS);
  console.log("3/4  Updating creator payout address to team wallet (mint direct)...");
  await (await nft.updateCreatorPayoutAddress(SEADROP, TEAM_WALLET)).wait();
  console.log(`     SeaDrop creator payout = ${TEAM_WALLET}\n`);

  console.log("4/4  Pointing ERC-2981 royalty receiver to new RoyaltySplitter...");
  await (
    await nft.setRoyaltyInfo({ royaltyAddress: splitterAddr, royaltyBps: ROYALTY_BPS })
  ).wait();
  console.log(`     royalty receiver = ${splitterAddr} (${ROYALTY_BPS} bps)\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DONE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  RoyaltySplitter: ${splitterAddr}`);
  console.log(`  HolderReward:    ${rewardAddr}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nNew revenue flow:");
  console.log(`  • Primary mint (100%)    → ${TEAM_WALLET}`);
  console.log(`  • Royalty 30%            → ${AGENT_ACCOUNT} (agent TBA)`);
  console.log(`  • Royalty 70%            → ${TEAM_WALLET}`);
  console.log("\nDistribution flow:");
  console.log(`  • Monthly: snapshot-distribute.ts → createEpoch on HolderReward`);
  console.log(`  • Holders claim via HolderReward.claim(epochId, amount, proof)`);
  console.log("\nNext:");
  console.log("  • Sourcify verify new contracts: npx hardhat verify --network sepolia <addr> <args>");
  console.log("  • Update SEPOLIA-DEPLOYMENT.md");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
