import { ethers } from "hardhat";

// Canonical cross-chain SeaDrop address (mainnet + Sepolia).
const SEADROP_ADDRESS = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

// OpenSea's official fee recipient (must be explicitly allowed before OpenSea
// can collect its 10% primary-mint fee).
const OS_FEE_RECIPIENT = "0x0000a26b00c1F0DF003000390027140000fAa719";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const isLiveNetwork = network.chainId === 1n || network.chainId === 11155111n;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SURVIVORS — Full Deployment (agent: The Seventh)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Config ────────────────────────────────────────────────────
  const MAX_SUPPLY = 888n;
  const ROYALTY_BPS = 500; // 5%
  const MAX_PER_TX = ethers.parseEther("0.1");
  const MAX_DAILY = ethers.parseEther("0.3");
  const MIN_BALANCE = ethers.parseEther("4");
  const MULTISIG_THRESHOLD = ethers.parseEther("1");
  const AGENT_TOKEN_ID = 1n; // ERC721A starts token IDs at 1

  const FOUNDER1 = process.env.FOUNDER1_ADDRESS;
  const FOUNDER2 = process.env.FOUNDER2_ADDRESS;

  if (!FOUNDER1 || !FOUNDER2) {
    throw new Error("FOUNDER1_ADDRESS and FOUNDER2_ADDRESS must be set in .env");
  }

  // ── Step 1: Deploy AgentIdentity ──────────────────────────────
  console.log("1/9  Deploying AgentIdentity...");
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const identity = await AgentIdentity.deploy();
  await identity.waitForDeployment();
  console.log(`     AgentIdentity: ${await identity.getAddress()}\n`);

  // ── Step 2: Deploy AgentNFT (SeaDrop-aware ERC721A) ───────────
  console.log("2/9  Deploying AgentNFT (ERC721SeaDrop)...");
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy("SURVIVORS", "SVVR", [SEADROP_ADDRESS]);
  await nft.waitForDeployment();
  console.log(`     SurvivorsNFT: ${await nft.getAddress()}\n`);

  // ── Step 3: Set max supply (must happen before any mint) ──────
  console.log("3/9  Setting max supply to 888...");
  await (await nft.setMaxSupply(MAX_SUPPLY)).wait();
  console.log(`     maxSupply = ${MAX_SUPPLY}\n`);

  // ── Step 4: Reserved-mint the agent NFT (token #1) ────────────
  console.log("4/9  Minting Agent NFT (token #1) — The Seventh vault seat...");
  await (await nft.reservedMint(deployer.address, 1)).wait();
  console.log(`     Token #1 minted to ${deployer.address}\n`);

  // ── Step 5: Deploy AgentAccount (TBA bound to token #1) ───────
  console.log("5/9  Deploying AgentAccount (TBA)...");
  const AgentAccount = await ethers.getContractFactory("AgentAccount");
  const agentAccount = await AgentAccount.deploy(
    network.chainId,
    await nft.getAddress(),
    AGENT_TOKEN_ID,
    MAX_PER_TX,
    MAX_DAILY,
    MIN_BALANCE,
    MULTISIG_THRESHOLD
  );
  await agentAccount.waitForDeployment();
  console.log(`     AgentAccount: ${await agentAccount.getAddress()}\n`);

  // ── Step 6: Deploy RevenueSplitter ────────────────────────────
  console.log("6/9  Deploying RevenueSplitter...");
  const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
  const splitter = await RevenueSplitter.deploy(
    await agentAccount.getAddress(),
    FOUNDER1,
    FOUNDER2
  );
  await splitter.waitForDeployment();
  console.log(`     RevenueSplitter: ${await splitter.getAddress()}`);
  console.log(`       Agent TBA (50%): ${await agentAccount.getAddress()}`);
  console.log(`       Founder1  (20%): ${FOUNDER1}`);
  console.log(`       Founder2  (30%): ${FOUNDER2}\n`);

  // ── Step 7: Wire royalty (ERC-2981, secondary-sale share) ─────
  console.log("7/9  Setting royalty receiver to RevenueSplitter (5%)...");
  await (
    await nft.setRoyaltyInfo({
      royaltyAddress: await splitter.getAddress(),
      royaltyBps: ROYALTY_BPS,
    })
  ).wait();
  console.log(`     Royalty receiver = ${await splitter.getAddress()}\n`);

  // ── Step 8: SeaDrop bootstrap (only on live networks) ─────────
  if (isLiveNetwork) {
    console.log("8/9  Bootstrapping SeaDrop (payout + fee recipient)...");
    await (
      await nft.updateCreatorPayoutAddress(SEADROP_ADDRESS, await splitter.getAddress())
    ).wait();
    console.log(`     creatorPayoutAddress = ${await splitter.getAddress()}`);

    await (
      await nft.updateAllowedFeeRecipient(SEADROP_ADDRESS, OS_FEE_RECIPIENT, true)
    ).wait();
    console.log(`     allowed fee recipient = ${OS_FEE_RECIPIENT}\n`);
  } else {
    console.log(`8/9  Skipping SeaDrop bootstrap (network ${network.chainId} has no canonical SeaDrop deployment)\n`);
  }

  // ── Step 9: Register + verify agent identity ──────────────────
  console.log("9/9  Registering Agent Identity...");
  await (
    await identity.registerAgent(
      "The Seventh",
      "ipfs://TODO", // Replace with actual IPFS URI
      await agentAccount.getAddress()
    )
  ).wait();
  await (await identity.verifyAgent(0)).wait();
  await (await identity.addAuthorizedUpdater(deployer.address)).wait();
  console.log(`     Agent registered (id: 0), verified, deployer authorized\n`);

  // ── Summary ───────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  SurvivorsNFT:     ${await nft.getAddress()}`);
  console.log(`  RevenueSplitter:  ${await splitter.getAddress()}`);
  console.log(`  AgentAccount:     ${await agentAccount.getAddress()}`);
  console.log(`  AgentIdentity:    ${await identity.getAddress()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nNext steps (via SeaDrop admin):");
  console.log("  1. Verify contracts on Etherscan");
  console.log("  2. Configure approved targets on AgentAccount");
  console.log("  3. Set base URI + contractURI on SurvivorsNFT");
  console.log("  4. Set GTD allow list:   nft.updateAllowList(seadrop, AllowListData{gtd})");
  console.log("  5. Set FCFS allow list:  nft.updateAllowList(seadrop, AllowListData{fcfs})  // stage 2");
  console.log("  6. Set public drop:      nft.updatePublicDrop(seadrop, PublicDrop{...})");
  console.log("  7. Set drop URI (OpenSea Studio metadata): nft.updateDropURI(seadrop, uri)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
