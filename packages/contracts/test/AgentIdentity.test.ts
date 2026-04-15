import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deployAgentIdentity() {
  const [owner, agentTBA, updater, random] = await ethers.getSigners();

  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const identity = await AgentIdentity.deploy();
  await identity.waitForDeployment();

  return { identity, owner, agentTBA, updater, random };
}

// Common tags
const WL_TAG = ethers.keccak256(ethers.toUtf8Bytes("wl_decision"));
const OUTREACH_TAG = ethers.keccak256(ethers.toUtf8Bytes("outreach"));
const SPENDING_TAG = ethers.keccak256(ethers.toUtf8Bytes("spending"));

describe("AgentIdentity", function () {
  // ─── Deployment ──────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      expect(await identity.name()).to.equal("Agent Identity");
      expect(await identity.symbol()).to.equal("AGENTID");
    });

    it("should set correct owner", async function () {
      const { identity, owner } = await loadFixture(deployAgentIdentity);
      expect(await identity.owner()).to.equal(owner.address);
    });

    it("should start with 0 agents", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      expect(await identity.totalAgents()).to.equal(0);
    });
  });

  // ─── Registration ────────────────────────────────────────────────

  describe("Registration", function () {
    it("should register a new agent", async function () {
      const { identity, owner, agentTBA } = await loadFixture(deployAgentIdentity);

      await expect(
        identity.registerAgent("The Seventh", "ipfs://Qm...", agentTBA.address)
      )
        .to.emit(identity, "AgentRegistered")
        .withArgs(0, "The Seventh", agentTBA.address);

      expect(await identity.totalAgents()).to.equal(1);
      expect(await identity.ownerOf(0)).to.equal(owner.address);
    });

    it("should store correct agent info", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("The Seventh", "ipfs://Qm...", agentTBA.address);

      const info = await identity.getAgentInfo(0);
      expect(info.name).to.equal("The Seventh");
      expect(info.walletAddress).to.equal(agentTBA.address);
      expect(info.reputationScore).to.equal(0);
      expect(info.totalDecisions).to.equal(0);
      expect(info.registeredAt).to.be.gt(0);
      expect(info.verified).to.be.false;
    });

    it("should set correct token URI", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("The Seventh", "ipfs://Qm...", agentTBA.address);
      expect(await identity.tokenURI(0)).to.equal("ipfs://Qm...");
    });

    it("should register multiple agents", async function () {
      const { identity, agentTBA, updater } = await loadFixture(deployAgentIdentity);

      await identity.registerAgent("Agent1", "ipfs://1", agentTBA.address);
      await identity.registerAgent("Agent2", "ipfs://2", updater.address);

      expect(await identity.totalAgents()).to.equal(2);
      const info0 = await identity.getAgentInfo(0);
      const info1 = await identity.getAgentInfo(1);
      expect(info0.name).to.equal("Agent1");
      expect(info1.name).to.equal("Agent2");
    });

    it("should revert from non-owner", async function () {
      const { identity, random, agentTBA } = await loadFixture(deployAgentIdentity);
      await expect(
        identity.connect(random).registerAgent("Agent", "uri", agentTBA.address)
      ).to.be.revertedWithCustomError(identity, "OwnableUnauthorizedAccount");
    });

    it("should revert with zero wallet address", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      await expect(
        identity.registerAgent("Agent", "uri", ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(identity, "ZeroAddress");
    });
  });

  // ─── Reputation Updates ──────────────────────────────────────────

  describe("Reputation Updates", function () {
    it("should update reputation from owner", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await expect(identity.updateReputation(0, 85, WL_TAG, "Good WL decision"))
        .to.emit(identity, "ReputationUpdated")
        .withArgs(0, 85, WL_TAG, "Good WL decision");

      const info = await identity.getAgentInfo(0);
      expect(info.reputationScore).to.equal(85);
      expect(info.totalDecisions).to.equal(1);
    });

    it("should update reputation from authorized updater", async function () {
      const { identity, agentTBA, updater } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);
      await identity.addAuthorizedUpdater(updater.address);

      await identity.connect(updater).updateReputation(0, 90, OUTREACH_TAG, "Great outreach");
      const info = await identity.getAgentInfo(0);
      expect(info.reputationScore).to.equal(90);
    });

    it("should calculate cumulative average correctly", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await identity.updateReputation(0, 80, WL_TAG, "Decision 1");
      await identity.updateReputation(0, 90, WL_TAG, "Decision 2");
      // Average: (80 + 90) / 2 = 85
      let info = await identity.getAgentInfo(0);
      expect(info.reputationScore).to.equal(85);

      await identity.updateReputation(0, 70, WL_TAG, "Decision 3");
      // Average: (85*2 + 70) / 3 = 240/3 = 80
      info = await identity.getAgentInfo(0);
      expect(info.reputationScore).to.equal(80);
      expect(info.totalDecisions).to.equal(3);
    });

    it("should revert for non-existent agent", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      await expect(
        identity.updateReputation(99, 50, WL_TAG, "reason")
      ).to.be.revertedWithCustomError(identity, "AgentNotFound");
    });

    it("should revert from unauthorized address", async function () {
      const { identity, agentTBA, random } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await expect(
        identity.connect(random).updateReputation(0, 50, WL_TAG, "reason")
      ).to.be.revertedWithCustomError(identity, "NotAuthorized");
    });

    it("should revert on score > 100", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await expect(
        identity.updateReputation(0, 101, WL_TAG, "reason")
      ).to.be.revertedWithCustomError(identity, "InvalidScore");
    });

    it("should accept score = 0 and score = 100", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await identity.updateReputation(0, 0, WL_TAG, "bad");
      await identity.updateReputation(0, 100, WL_TAG, "perfect");

      const info = await identity.getAgentInfo(0);
      expect(info.totalDecisions).to.equal(2);
    });
  });

  // ─── Reputation History ──────────────────────────────────────────

  describe("Reputation History", function () {
    it("should store and retrieve reputation entries", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await identity.updateReputation(0, 85, WL_TAG, "WL decision 1");
      await identity.updateReputation(0, 70, OUTREACH_TAG, "Outreach attempt");
      await identity.updateReputation(0, 95, SPENDING_TAG, "Smart spend");

      expect(await identity.getReputationCount(0)).to.equal(3);

      const history = await identity.getReputationHistory(0, 0, 10);
      expect(history.length).to.equal(3);
      expect(history[0].score).to.equal(85);
      expect(history[0].tag).to.equal(WL_TAG);
      expect(history[1].score).to.equal(70);
      expect(history[2].score).to.equal(95);
    });

    it("should paginate correctly", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      for (let i = 0; i < 5; i++) {
        await identity.updateReputation(0, i * 20, WL_TAG, `Decision ${i}`);
      }

      // Get first 2
      const page1 = await identity.getReputationHistory(0, 0, 2);
      expect(page1.length).to.equal(2);
      expect(page1[0].score).to.equal(0);
      expect(page1[1].score).to.equal(20);

      // Get next 2
      const page2 = await identity.getReputationHistory(0, 2, 2);
      expect(page2.length).to.equal(2);
      expect(page2[0].score).to.equal(40);
      expect(page2[1].score).to.equal(60);

      // Get last 1
      const page3 = await identity.getReputationHistory(0, 4, 2);
      expect(page3.length).to.equal(1);
      expect(page3[0].score).to.equal(80);
    });

    it("should return empty array for out-of-range offset", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);
      await identity.updateReputation(0, 50, WL_TAG, "test");

      const result = await identity.getReputationHistory(0, 100, 10);
      expect(result.length).to.equal(0);
    });

    it("should revert for non-existent agent", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      await expect(
        identity.getReputationHistory(99, 0, 10)
      ).to.be.revertedWithCustomError(identity, "AgentNotFound");
    });
  });

  // ─── Verification ────────────────────────────────────────────────

  describe("Verification", function () {
    it("should verify an agent", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await expect(identity.verifyAgent(0))
        .to.emit(identity, "AgentVerified")
        .withArgs(0);

      const info = await identity.getAgentInfo(0);
      expect(info.verified).to.be.true;
    });

    it("should unverify an agent", async function () {
      const { identity, agentTBA } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);
      await identity.verifyAgent(0);

      await expect(identity.unverifyAgent(0))
        .to.emit(identity, "AgentUnverified")
        .withArgs(0);

      const info = await identity.getAgentInfo(0);
      expect(info.verified).to.be.false;
    });

    it("should revert verify from non-owner", async function () {
      const { identity, agentTBA, random } = await loadFixture(deployAgentIdentity);
      await identity.registerAgent("Agent", "uri", agentTBA.address);

      await expect(
        identity.connect(random).verifyAgent(0)
      ).to.be.revertedWithCustomError(identity, "OwnableUnauthorizedAccount");
    });

    it("should revert for non-existent agent", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      await expect(
        identity.verifyAgent(99)
      ).to.be.revertedWithCustomError(identity, "AgentNotFound");
    });
  });

  // ─── Authorized Updaters ─────────────────────────────────────────

  describe("Authorized Updaters", function () {
    it("should add and remove authorized updaters", async function () {
      const { identity, updater } = await loadFixture(deployAgentIdentity);

      await expect(identity.addAuthorizedUpdater(updater.address))
        .to.emit(identity, "AuthorizedUpdaterAdded")
        .withArgs(updater.address);
      expect(await identity.authorizedUpdaters(updater.address)).to.be.true;

      await expect(identity.removeAuthorizedUpdater(updater.address))
        .to.emit(identity, "AuthorizedUpdaterRemoved")
        .withArgs(updater.address);
      expect(await identity.authorizedUpdaters(updater.address)).to.be.false;
    });

    it("should revert adding zero address", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      await expect(
        identity.addAuthorizedUpdater(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(identity, "ZeroAddress");
    });

    it("should revert from non-owner", async function () {
      const { identity, random, updater } = await loadFixture(deployAgentIdentity);
      await expect(
        identity.connect(random).addAuthorizedUpdater(updater.address)
      ).to.be.revertedWithCustomError(identity, "OwnableUnauthorizedAccount");
    });
  });

  // ─── ERC-165 ─────────────────────────────────────────────────────

  describe("supportsInterface", function () {
    it("should support ERC-721", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      expect(await identity.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("should support ERC-165", async function () {
      const { identity } = await loadFixture(deployAgentIdentity);
      expect(await identity.supportsInterface("0x01ffc9a7")).to.be.true;
    });
  });
});
