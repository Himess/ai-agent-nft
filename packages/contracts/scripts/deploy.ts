import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SURVIVORS — Full Deployment (agent: The Seventh)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network:  ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Config ────────────────────────────────────────────────────
  const MINT_PRICE = ethers.parseEther("0.01");
  const ROYALTY_BPS = 500n; // 5%
  const MAX_PER_TX = ethers.parseEther("0.1");
  const MAX_DAILY = ethers.parseEther("0.3");
  const MIN_BALANCE = ethers.parseEther("4");
  const MULTISIG_THRESHOLD = ethers.parseEther("1");

  const FOUNDER1 = process.env.FOUNDER1_ADDRESS;
  const FOUNDER2 = process.env.FOUNDER2_ADDRESS;

  if (!FOUNDER1 || !FOUNDER2) {
    throw new Error("FOUNDER1_ADDRESS and FOUNDER2_ADDRESS must be set in .env");
  }

  // ── Step 1: Deploy AgentIdentity ──────────────────────────────
  console.log("1/8  Deploying AgentIdentity...");
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const identity = await AgentIdentity.deploy();
  await identity.waitForDeployment();
  console.log(`     AgentIdentity: ${await identity.getAddress()}\n`);

  // ── Step 2: Deploy AgentNFT ───────────────────────────────────
  console.log("2/8  Deploying AgentNFT...");
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy("SURVIVORS", "SVVR", MINT_PRICE, ROYALTY_BPS);
  await nft.waitForDeployment();
  console.log(`     SurvivorsNFT: ${await nft.getAddress()}\n`);

  // ── Step 3: Owner mints token #0 (Agent's NFT, from reserved/vault bucket) ──
  console.log("3/8  Minting Agent NFT (token #0) — The Seventh vault seat...");
  const mintTx = await nft.reservedMint(deployer.address, 1);
  await mintTx.wait();
  console.log(`     Token #0 minted to ${deployer.address}\n`);

  // ── Step 4: Deploy AgentAccount (TBA) ─────────────────────────
  console.log("4/8  Deploying AgentAccount (TBA)...");
  const AgentAccount = await ethers.getContractFactory("AgentAccount");
  const agentAccount = await AgentAccount.deploy(
    network.chainId,
    await nft.getAddress(),
    0n,
    MAX_PER_TX,
    MAX_DAILY,
    MIN_BALANCE,
    MULTISIG_THRESHOLD
  );
  await agentAccount.waitForDeployment();
  console.log(`     AgentAccount: ${await agentAccount.getAddress()}\n`);

  // ── Step 5: Deploy RevenueSplitter ────────────────────────────
  console.log("5/8  Deploying RevenueSplitter...");
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

  // ── Step 6: Configure AgentNFT ────────────────────────────────
  console.log("6/8  Configuring AgentNFT (setting splitter + royalty)...");
  const configTx = await nft.setRevenueSplitter(await splitter.getAddress(), ROYALTY_BPS);
  await configTx.wait();
  console.log(`     RevenueSplitter set on AgentNFT\n`);

  // ── Step 7: Register Agent Identity ───────────────────────────
  console.log("7/8  Registering Agent Identity...");
  const registerTx = await identity.registerAgent(
    "The Seventh",
    "ipfs://TODO", // Replace with actual IPFS URI
    await agentAccount.getAddress()
  );
  await registerTx.wait();

  const verifyTx = await identity.verifyAgent(0);
  await verifyTx.wait();
  console.log(`     Agent registered (id: 0) and verified\n`);

  // ── Step 8: Add agent TBA as authorized reputation updater ────
  console.log("8/8  Adding deployer as authorized reputation updater...");
  const authTx = await identity.addAuthorizedUpdater(deployer.address);
  await authTx.wait();
  console.log(`     ${deployer.address} authorized\n`);

  // ── Summary ───────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  SurvivorsNFT:     ${await nft.getAddress()}`);
  console.log(`  RevenueSplitter:  ${await splitter.getAddress()}`);
  console.log(`  AgentAccount:     ${await agentAccount.getAddress()}`);
  console.log(`  AgentIdentity:    ${await identity.getAddress()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nNext steps:");
  console.log("  1. Verify contracts on Etherscan");
  console.log("  2. Configure approved targets on AgentAccount");
  console.log("  3. Set base URI on SurvivorsNFT");
  console.log("  4. Set WL Merkle root: nft.setWLMerkleRoot(root)");
  console.log("  5. Open WL phase:      nft.setPhase(1)  // Whitelist");
  console.log("  6. Later open public:  nft.setPhase(2)  // Public FCFS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
