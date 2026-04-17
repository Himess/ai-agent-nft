import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const MINT_PRICE = ethers.parseEther("0.01");
const ROYALTY_BPS = 500n; // 5%
const MAX_PER_TX = ethers.parseEther("0.1");
const MAX_DAILY = ethers.parseEther("0.3");
const MIN_BALANCE = ethers.parseEther("4");
const MULTISIG_THRESHOLD = ethers.parseEther("1");

const WL_TAG = ethers.keccak256(ethers.toUtf8Bytes("wl_decision"));
const OUTREACH_TAG = ethers.keccak256(ethers.toUtf8Bytes("outreach"));

async function deployFullSystem() {
  const [deployer, founder1, founder2, user1, user2, user3, kolTarget, collabTarget] =
    await ethers.getSigners();

  // ── Step 1: Deploy AgentIdentity ──────────────────────────────
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const identity = await AgentIdentity.deploy();
  await identity.waitForDeployment();

  // ── Step 2: Deploy AgentNFT (splitter not set yet) ────────────
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy("SURVIVORS", "SVVR", MINT_PRICE, ROYALTY_BPS);
  await nft.waitForDeployment();

  // ── Step 3: Owner mints token #0 (the Agent's NFT — vault seat) ──
  await nft.reservedMint(deployer.address, 1);
  expect(await nft.ownerOf(0)).to.equal(deployer.address);

  // ── Step 4: Deploy AgentAccount (TBA) bound to token #0 ──────
  const AgentAccount = await ethers.getContractFactory("AgentAccount");
  const agentAccount = await AgentAccount.deploy(
    31337n,
    await nft.getAddress(),
    0n,
    MAX_PER_TX,
    MAX_DAILY,
    MIN_BALANCE,
    MULTISIG_THRESHOLD
  );
  await agentAccount.waitForDeployment();

  // ── Step 5: Deploy RevenueSplitter ────────────────────────────
  const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
  const splitter = await RevenueSplitter.deploy(
    await agentAccount.getAddress(),
    founder1.address,
    founder2.address
  );
  await splitter.waitForDeployment();

  // ── Step 6: Configure AgentNFT with splitter ──────────────────
  await nft.setRevenueSplitter(await splitter.getAddress(), ROYALTY_BPS);

  // ── Step 7: Configure AgentAccount ────────────────────────────
  await agentAccount.addApprovedTarget(kolTarget.address);
  await agentAccount.addApprovedTarget(collabTarget.address);

  // ── Step 8: Register agent identity ───────────────────────────
  const agentId = 0n;
  await identity.registerAgent(
    "The Seventh",
    "ipfs://QmAgent...",
    await agentAccount.getAddress()
  );
  await identity.addAuthorizedUpdater(deployer.address);
  await identity.verifyAgent(agentId);

  return {
    nft,
    splitter,
    agentAccount,
    identity,
    deployer,
    founder1,
    founder2,
    user1,
    user2,
    user3,
    kolTarget,
    collabTarget,
    agentId,
  };
}

describe("FullFlow Integration", function () {
  // ─── Deployment Verification ─────────────────────────────────────

  describe("System Deployment", function () {
    it("should deploy all contracts correctly", async function () {
      const { nft, splitter, agentAccount, identity } =
        await loadFixture(deployFullSystem);

      expect(await nft.getAddress()).to.be.properAddress;
      expect(await splitter.getAddress()).to.be.properAddress;
      expect(await agentAccount.getAddress()).to.be.properAddress;
      expect(await identity.getAddress()).to.be.properAddress;
    });

    it("should link NFT to splitter", async function () {
      const { nft, splitter } = await loadFixture(deployFullSystem);
      expect(await nft.revenueSplitter()).to.equal(await splitter.getAddress());
    });

    it("should set splitter as royalty receiver", async function () {
      const { nft, splitter } = await loadFixture(deployFullSystem);
      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(await splitter.getAddress());
      expect(amount).to.equal(ethers.parseEther("0.05")); // 5%
    });

    it("should bind agent account to token #0", async function () {
      const { nft, agentAccount } = await loadFixture(deployFullSystem);
      const [chainId, tokenContract, tokenId] = await agentAccount.token();
      expect(chainId).to.equal(31337n);
      expect(tokenContract).to.equal(await nft.getAddress());
      expect(tokenId).to.equal(0n);
    });

    it("should register and verify agent identity", async function () {
      const { identity, agentAccount, agentId } = await loadFixture(deployFullSystem);
      const info = await identity.getAgentInfo(agentId);
      expect(info.name).to.equal("The Seventh");
      expect(info.walletAddress).to.equal(await agentAccount.getAddress());
      expect(info.verified).to.be.true;
    });

    it("should set correct revenue split (50/20/30)", async function () {
      const { splitter, agentAccount, founder1, founder2 } =
        await loadFixture(deployFullSystem);

      const [addr0, shares0] = await splitter.getPayee(0);
      expect(addr0).to.equal(await agentAccount.getAddress());
      expect(shares0).to.equal(5000n);

      const [addr1, shares1] = await splitter.getPayee(1);
      expect(addr1).to.equal(founder1.address);
      expect(shares1).to.equal(2000n);

      const [addr2, shares2] = await splitter.getPayee(2);
      expect(addr2).to.equal(founder2.address);
      expect(shares2).to.equal(3000n);
    });
  });

  // ─── Mint → Split Flow ───────────────────────────────────────────

  describe("Mint → Revenue Split", function () {
    it("should split mint revenue correctly (50/20/30)", async function () {
      const { nft, splitter, agentAccount, founder1, founder2 } =
        await loadFixture(deployFullSystem);

      // Enable public mint
      await nft.setPhase(3); // Public

      // 10 fresh signers each mint 1 NFT (signers 8..17 are free)
      const signers = await ethers.getSigners();
      for (let i = 8; i < 18; i++) {
        await nft.connect(signers[i]).publicMint({ value: MINT_PRICE });
      }

      // Total: 10 * 0.01 ETH = 0.1 ETH in NFT contract
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(
        ethers.parseEther("0.1")
      );

      // Withdraw to splitter
      await nft.withdraw();
      expect(await ethers.provider.getBalance(await splitter.getAddress())).to.equal(
        ethers.parseEther("0.1")
      );

      // Check pending amounts
      const agentPending = await splitter.pendingPayment(await agentAccount.getAddress());
      const f1Pending = await splitter.pendingPayment(founder1.address);
      const f2Pending = await splitter.pendingPayment(founder2.address);

      expect(agentPending).to.equal(ethers.parseEther("0.05"));  // 50%
      expect(f1Pending).to.equal(ethers.parseEther("0.02"));     // 20%
      expect(f2Pending).to.equal(ethers.parseEther("0.03"));     // 30%

      // Release all
      const agentBalBefore = await ethers.provider.getBalance(await agentAccount.getAddress());
      const f1BalBefore = await ethers.provider.getBalance(founder1.address);
      const f2BalBefore = await ethers.provider.getBalance(founder2.address);

      await splitter.releaseAll();

      const agentBalAfter = await ethers.provider.getBalance(await agentAccount.getAddress());
      const f1BalAfter = await ethers.provider.getBalance(founder1.address);
      const f2BalAfter = await ethers.provider.getBalance(founder2.address);

      expect(agentBalAfter - agentBalBefore).to.equal(ethers.parseEther("0.05"));
      expect(f1BalAfter - f1BalBefore).to.equal(ethers.parseEther("0.02"));
      expect(f2BalAfter - f2BalBefore).to.equal(ethers.parseEther("0.03"));
    });

    it("should handle multiple withdraw cycles", async function () {
      const { nft, splitter, agentAccount } = await loadFixture(deployFullSystem);

      await nft.setPhase(3); // Public
      const signers = await ethers.getSigners();

      // First batch: 5 fresh wallets each mint 1
      for (let i = 8; i < 13; i++) {
        await nft.connect(signers[i]).publicMint({ value: MINT_PRICE });
      }
      await nft.withdraw();
      await splitter.releaseAll();

      // Second batch: 3 more fresh wallets
      for (let i = 13; i < 16; i++) {
        await nft.connect(signers[i]).publicMint({ value: MINT_PRICE });
      }
      await nft.withdraw();

      // Agent should have pending from second batch (0.03 → 50% = 0.015)
      expect(await splitter.pendingPayment(await agentAccount.getAddress())).to.equal(
        ethers.parseEther("0.015")
      );
    });
  });

  // ─── Agent Spending Flow ─────────────────────────────────────────

  describe("Agent Spending", function () {
    it("should allow agent to spend within limits", async function () {
      const { nft, splitter, agentAccount, deployer, kolTarget } =
        await loadFixture(deployFullSystem);

      // Fund agent via public mints from 10 fresh wallets → 0.1 ETH → 50% = 0.05 ETH
      await nft.setPhase(3);
      const signers = await ethers.getSigners();
      for (let i = 8; i < 18; i++) {
        await nft.connect(signers[i]).publicMint({ value: MINT_PRICE });
      }
      await nft.withdraw();
      await splitter.releaseAll();

      // Top up agent to 10 ETH for testing
      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // Agent pays KOL 0.05 ETH
      const kolBefore = await ethers.provider.getBalance(kolTarget.address);
      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.05"), "0x", 0);
      const kolAfter = await ethers.provider.getBalance(kolTarget.address);

      expect(kolAfter - kolBefore).to.equal(ethers.parseEther("0.05"));
    });

    it("should enforce daily spending limit across transactions", async function () {
      const { agentAccount, deployer, kolTarget, collabTarget } =
        await loadFixture(deployFullSystem);

      // Fund agent
      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // Spend 0.1 + 0.1 + 0.1 = 0.3 ETH (daily limit)
      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.1"), "0x", 0);
      await agentAccount.execute(collabTarget.address, ethers.parseEther("0.1"), "0x", 0);
      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.1"), "0x", 0);

      // Next tx should fail (daily limit reached)
      await expect(
        agentAccount.execute(kolTarget.address, ethers.parseEther("0.01"), "0x", 0)
      ).to.be.revertedWithCustomError(agentAccount, "ExceedsDailyLimit");

      // Next day: should work again
      await time.increase(86400);
      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.05"), "0x", 0);
    });
  });

  // ─── Reputation Tracking ─────────────────────────────────────────

  describe("Reputation Tracking", function () {
    it("should record agent decisions on-chain", async function () {
      const { identity, agentId } = await loadFixture(deployFullSystem);

      // Record WL decisions
      await identity.updateReputation(agentId, 90, WL_TAG, "Approved user1 — strong on-chain history");
      await identity.updateReputation(agentId, 30, WL_TAG, "Rejected user2 — bot pattern detected");
      await identity.updateReputation(agentId, 85, OUTREACH_TAG, "Collab with Project X accepted");

      const info = await identity.getAgentInfo(agentId);
      expect(info.totalDecisions).to.equal(3);
      // Average: (90 + 30 + 85) / 3 ≈ 68 (integer division: (90*1+30)/2=60, (60*2+85)/3=68)
      // Actually: first=90, second=(90+30)/2=60, third=(60*2+85)/3=68
      expect(info.reputationScore).to.equal(68n);

      // Verify history
      const history = await identity.getReputationHistory(agentId, 0, 10);
      expect(history.length).to.equal(3);
      expect(history[0].score).to.equal(90);
      expect(history[0].tag).to.equal(WL_TAG);
      expect(history[1].score).to.equal(30);
      expect(history[2].tag).to.equal(OUTREACH_TAG);
    });
  });

  // ─── Full Lifecycle ──────────────────────────────────────────────

  describe("Full Lifecycle", function () {
    it("mint → split → fund agent → agent spends → reputation logged", async function () {
      const {
        nft,
        splitter,
        agentAccount,
        identity,
        deployer,
        founder1,
        founder2,
        user1,
        user2,
        kolTarget,
        agentId,
      } = await loadFixture(deployFullSystem);

      // ── 1. PUBLIC MINT ────────────────────────────────────────
      await nft.setPhase(3); // Public
      // 10 fresh wallets each mint 1 NFT (signers 8..17 free)
      const signers = await ethers.getSigners();
      for (let i = 8; i < 18; i++) {
        await nft.connect(signers[i]).publicMint({ value: MINT_PRICE });
      }

      // Total: 10 * 0.01 = 0.1 ETH
      // + token #0 from reservedMint = 11 total (includes agent's NFT)
      expect(await nft.totalMinted()).to.equal(11);
      expect(await nft.totalSupply()).to.equal(11);

      // ── 2. WITHDRAW & SPLIT ───────────────────────────────────
      await nft.withdraw();
      const splitterBal = await ethers.provider.getBalance(await splitter.getAddress());
      expect(splitterBal).to.equal(ethers.parseEther("0.1"));

      // Release to all payees
      const agentBefore = await ethers.provider.getBalance(await agentAccount.getAddress());
      await splitter.releaseAll();
      const agentAfter = await ethers.provider.getBalance(await agentAccount.getAddress());

      // Agent gets 50% = 0.05 ETH
      expect(agentAfter - agentBefore).to.equal(ethers.parseEther("0.05"));

      // ── 3. TOP UP AGENT (simulate more revenue) ───────────────
      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // ── 4. AGENT SPENDS ON KOL ────────────────────────────────
      const kolBefore = await ethers.provider.getBalance(kolTarget.address);
      await agentAccount.execute(
        kolTarget.address,
        ethers.parseEther("0.08"),
        "0x",
        0
      );
      const kolAfterPay = await ethers.provider.getBalance(kolTarget.address);
      expect(kolAfterPay - kolBefore).to.equal(ethers.parseEther("0.08"));

      // ── 5. LOG REPUTATION ─────────────────────────────────────
      await identity.updateReputation(
        agentId,
        92,
        OUTREACH_TAG,
        "KOL deal with @influencer — 50K impressions"
      );

      const info = await identity.getAgentInfo(agentId);
      expect(info.totalDecisions).to.equal(1);
      expect(info.reputationScore).to.equal(92);
      expect(info.verified).to.be.true;

      // ── 6. VERIFY FINAL STATE ─────────────────────────────────
      // NFT holders — 10 distinct public minters + deployer's agent NFT
      expect(await nft.balanceOf(deployer.address)).to.equal(1); // Agent's NFT
      expect(await nft.publicMinted()).to.equal(10);

      // Agent state incremented
      expect(await agentAccount.state()).to.equal(1);

      // Daily budget consumed
      expect(await agentAccount.dailySpent()).to.equal(ethers.parseEther("0.08"));
      expect(await agentAccount.getRemainingDailyBudget()).to.equal(
        ethers.parseEther("0.22")
      );
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────

  describe("Edge Cases", function () {
    it("should prevent splitter from being changed after initial set", async function () {
      const { nft, founder1 } = await loadFixture(deployFullSystem);
      await expect(
        nft.setRevenueSplitter(founder1.address, ROYALTY_BPS)
      ).to.be.revertedWithCustomError(nft, "SplitterAlreadySet");
    });

    it("should prevent non-owner from spending agent funds", async function () {
      const { agentAccount, user1, kolTarget, deployer } =
        await loadFixture(deployFullSystem);

      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      await expect(
        agentAccount.connect(user1).execute(kolTarget.address, ethers.parseEther("0.01"), "0x", 0)
      ).to.be.revertedWithCustomError(agentAccount, "NotOwner");
    });

    it("should protect minimum balance", async function () {
      const { agentAccount, deployer, kolTarget } = await loadFixture(deployFullSystem);

      // Fund with exactly 4.05 ETH
      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("4.05"),
      });

      // Try to spend 0.1 → would leave 3.95 < 4 ETH min
      await expect(
        agentAccount.execute(kolTarget.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.be.revertedWithCustomError(agentAccount, "BelowMinBalance");
    });

    it("should reject unauthorized targets", async function () {
      const { agentAccount, deployer, user1 } = await loadFixture(deployFullSystem);

      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // user1 is not an approved target
      await expect(
        agentAccount.execute(user1.address, ethers.parseEther("0.01"), "0x", 0)
      ).to.be.revertedWithCustomError(agentAccount, "TargetNotApproved");
    });
  });
});
