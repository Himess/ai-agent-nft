import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const MAX_SUPPLY = 1111n;
const ROYALTY_BPS = 500; // 5%
const MAX_PER_TX = ethers.parseEther("0.1");
const MAX_DAILY = ethers.parseEther("0.3");
const MIN_BALANCE = ethers.parseEther("4");
const MULTISIG_THRESHOLD = ethers.parseEther("1");

// Canonical cross-chain SeaDrop address. Not deployed on the hardhat network,
// so our unit tests only use it to seed the constructor — no mints actually
// route through SeaDrop in this file.
const SEADROP_PLACEHOLDER = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

const WL_TAG = ethers.keccak256(ethers.toUtf8Bytes("wl_decision"));
const OUTREACH_TAG = ethers.keccak256(ethers.toUtf8Bytes("outreach"));

async function deployFullSystem() {
  const [deployer, founder1, founder2, user1, user2, user3, kolTarget, collabTarget] =
    await ethers.getSigners();

  // ── Step 1: Deploy AgentIdentity ──────────────────────────────
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const identity = await AgentIdentity.deploy();
  await identity.waitForDeployment();

  // ── Step 2: Deploy AgentNFT (SeaDrop-aware ERC721A) ───────────
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy("SURVIVORS", "SVVR", [SEADROP_PLACEHOLDER]);
  await nft.waitForDeployment();
  await nft.setMaxSupply(MAX_SUPPLY);

  // ── Step 3: Owner mints the Agent's NFT (token #1, first ERC721A id) ──
  await nft.reservedMint(deployer.address, 1);
  expect(await nft.ownerOf(1)).to.equal(deployer.address);
  const AGENT_TOKEN_ID = 1n;

  // ── Step 4: Deploy AgentAccount (TBA) bound to the agent NFT ──
  const AgentAccount = await ethers.getContractFactory("AgentAccount");
  const agentAccount = await AgentAccount.deploy(
    31337n,
    await nft.getAddress(),
    AGENT_TOKEN_ID,
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

  // ── Step 6: Point royalty receiver at the splitter (ERC-2981 secondary-sale share) ──
  await nft.setRoyaltyInfo({
    royaltyAddress: await splitter.getAddress(),
    royaltyBps: ROYALTY_BPS,
  });

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
    AGENT_TOKEN_ID,
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

    it("should set splitter as ERC-2981 royalty receiver", async function () {
      const { nft, splitter } = await loadFixture(deployFullSystem);
      const [receiver, amount] = await nft.royaltyInfo(1, ethers.parseEther("1"));
      expect(receiver).to.equal(await splitter.getAddress());
      expect(amount).to.equal(ethers.parseEther("0.05")); // 5%
    });

    it("should bind agent account to token #1", async function () {
      const { nft, agentAccount } = await loadFixture(deployFullSystem);
      const [chainId, tokenContract, tokenId] = await agentAccount.token();
      expect(chainId).to.equal(31337n);
      expect(tokenContract).to.equal(await nft.getAddress());
      expect(tokenId).to.equal(1n);
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

  // ─── Split Flow (revenue arriving directly — SeaDrop would do this in prod) ──

  describe("Revenue Split", function () {
    it("should route ETH sent to splitter into the 50/20/30 split", async function () {
      const { splitter, agentAccount, founder1, founder2, deployer } =
        await loadFixture(deployFullSystem);

      // Simulate SeaDrop's creator payout forwarding 0.1 ETH to the splitter.
      await deployer.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("0.1"),
      });

      expect(await splitter.pendingPayment(await agentAccount.getAddress())).to.equal(
        ethers.parseEther("0.05")
      );
      expect(await splitter.pendingPayment(founder1.address)).to.equal(
        ethers.parseEther("0.02")
      );
      expect(await splitter.pendingPayment(founder2.address)).to.equal(
        ethers.parseEther("0.03")
      );

      const agentBefore = await ethers.provider.getBalance(
        await agentAccount.getAddress()
      );
      const f1Before = await ethers.provider.getBalance(founder1.address);
      const f2Before = await ethers.provider.getBalance(founder2.address);

      await splitter.releaseAll();

      expect(
        (await ethers.provider.getBalance(await agentAccount.getAddress())) -
          agentBefore
      ).to.equal(ethers.parseEther("0.05"));
      expect(
        (await ethers.provider.getBalance(founder1.address)) - f1Before
      ).to.equal(ethers.parseEther("0.02"));
      expect(
        (await ethers.provider.getBalance(founder2.address)) - f2Before
      ).to.equal(ethers.parseEther("0.03"));
    });

    it("should handle multiple fundings", async function () {
      const { splitter, agentAccount, deployer } = await loadFixture(deployFullSystem);

      await deployer.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("0.05"),
      });
      await splitter.releaseAll();

      await deployer.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("0.03"),
      });
      expect(await splitter.pendingPayment(await agentAccount.getAddress())).to.equal(
        ethers.parseEther("0.015")
      );
    });
  });

  // ─── Agent Spending Flow ─────────────────────────────────────────

  describe("Agent Spending", function () {
    it("should allow agent to spend within limits", async function () {
      const { agentAccount, deployer, kolTarget } =
        await loadFixture(deployFullSystem);

      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      const kolBefore = await ethers.provider.getBalance(kolTarget.address);
      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.05"), "0x", 0);
      const kolAfter = await ethers.provider.getBalance(kolTarget.address);

      expect(kolAfter - kolBefore).to.equal(ethers.parseEther("0.05"));
    });

    it("should enforce daily spending limit across transactions", async function () {
      const { agentAccount, deployer, kolTarget, collabTarget } =
        await loadFixture(deployFullSystem);

      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.1"), "0x", 0);
      await agentAccount.execute(collabTarget.address, ethers.parseEther("0.1"), "0x", 0);
      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.1"), "0x", 0);

      await expect(
        agentAccount.execute(kolTarget.address, ethers.parseEther("0.01"), "0x", 0)
      ).to.be.revertedWithCustomError(agentAccount, "ExceedsDailyLimit");

      await time.increase(86400);
      await agentAccount.execute(kolTarget.address, ethers.parseEther("0.05"), "0x", 0);
    });
  });

  // ─── Reputation Tracking ─────────────────────────────────────────

  describe("Reputation Tracking", function () {
    it("should record agent decisions on-chain", async function () {
      const { identity, agentId } = await loadFixture(deployFullSystem);

      await identity.updateReputation(agentId, 90, WL_TAG, "Approved user1 — strong on-chain history");
      await identity.updateReputation(agentId, 30, WL_TAG, "Rejected user2 — bot pattern detected");
      await identity.updateReputation(agentId, 85, OUTREACH_TAG, "Collab with Project X accepted");

      const info = await identity.getAgentInfo(agentId);
      expect(info.totalDecisions).to.equal(3);
      expect(info.reputationScore).to.equal(68n);

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
    it("fund splitter → agent is paid → agent spends → reputation logged", async function () {
      const {
        splitter,
        agentAccount,
        identity,
        deployer,
        kolTarget,
        agentId,
      } = await loadFixture(deployFullSystem);

      // ── 1. Simulate mint revenue arriving at the splitter ─────
      await deployer.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("0.1"),
      });

      const agentBefore = await ethers.provider.getBalance(
        await agentAccount.getAddress()
      );
      await splitter.releaseAll();
      const agentAfter = await ethers.provider.getBalance(
        await agentAccount.getAddress()
      );
      expect(agentAfter - agentBefore).to.equal(ethers.parseEther("0.05"));

      // ── 2. Top up for spending test ───────────────────────────
      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("10"),
      });

      // ── 3. Agent spends on KOL ────────────────────────────────
      const kolBefore = await ethers.provider.getBalance(kolTarget.address);
      await agentAccount.execute(
        kolTarget.address,
        ethers.parseEther("0.08"),
        "0x",
        0
      );
      const kolAfterPay = await ethers.provider.getBalance(kolTarget.address);
      expect(kolAfterPay - kolBefore).to.equal(ethers.parseEther("0.08"));

      // ── 4. Log reputation ─────────────────────────────────────
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

      // ── 5. State assertions ───────────────────────────────────
      expect(await agentAccount.state()).to.equal(1);
      expect(await agentAccount.dailySpent()).to.equal(ethers.parseEther("0.08"));
      expect(await agentAccount.getRemainingDailyBudget()).to.equal(
        ethers.parseEther("0.22")
      );
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────

  describe("Edge Cases", function () {
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

      await deployer.sendTransaction({
        to: await agentAccount.getAddress(),
        value: ethers.parseEther("4.05"),
      });

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

      await expect(
        agentAccount.execute(user1.address, ethers.parseEther("0.01"), "0x", 0)
      ).to.be.revertedWithCustomError(agentAccount, "TargetNotApproved");
    });
  });
});
