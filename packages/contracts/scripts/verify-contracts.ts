import { run, ethers } from "hardhat";

/**
 * Verify all deployed contracts on Etherscan.
 *
 * Usage:
 *   AGENT_NFT=0x... REVENUE_SPLITTER=0x... AGENT_ACCOUNT=0x... AGENT_IDENTITY=0x... \
 *   FOUNDER1_ADDRESS=0x... FOUNDER2_ADDRESS=0x... \
 *   npx hardhat run scripts/verify-contracts.ts --network sepolia
 */
async function main() {
  const network = await ethers.provider.getNetwork();
  const MINT_PRICE = ethers.parseEther("0.01");
  const ROYALTY_BPS = 500n;

  const addresses = {
    nft: process.env.AGENT_NFT!,
    splitter: process.env.REVENUE_SPLITTER!,
    account: process.env.AGENT_ACCOUNT!,
    identity: process.env.AGENT_IDENTITY!,
  };

  console.log("Verifying contracts on Etherscan...\n");

  // AgentIdentity
  console.log("1/4 AgentIdentity...");
  await run("verify:verify", {
    address: addresses.identity,
    constructorArguments: [],
  }).catch(console.log);

  // AgentNFT
  console.log("\n2/4 AgentNFT...");
  await run("verify:verify", {
    address: addresses.nft,
    constructorArguments: ["AI Agent NFT", "AGENT", MINT_PRICE, ROYALTY_BPS],
  }).catch(console.log);

  // AgentAccount
  console.log("\n3/4 AgentAccount...");
  await run("verify:verify", {
    address: addresses.account,
    constructorArguments: [
      network.chainId,
      addresses.nft,
      0n,
      ethers.parseEther("0.1"),
      ethers.parseEther("0.3"),
      ethers.parseEther("4"),
      ethers.parseEther("1"),
    ],
  }).catch(console.log);

  // RevenueSplitter
  console.log("\n4/4 RevenueSplitter...");
  await run("verify:verify", {
    address: addresses.splitter,
    constructorArguments: [
      addresses.account,
      process.env.FOUNDER1_ADDRESS!,
      process.env.FOUNDER2_ADDRESS!,
    ],
  }).catch(console.log);

  console.log("\nVerification complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
