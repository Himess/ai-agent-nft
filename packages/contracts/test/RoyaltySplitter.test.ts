import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deploySplitter() {
  const [deployer, agent, team, outsider, funder] = await ethers.getSigners();
  const RoyaltySplitter = await ethers.getContractFactory("RoyaltySplitter");
  const splitter = await RoyaltySplitter.deploy(agent.address, team.address);
  await splitter.waitForDeployment();
  return { splitter, deployer, agent, team, outsider, funder };
}

describe("RoyaltySplitter", function () {
  describe("Deployment", function () {
    it("stores agent and team immutably and exposes share constants", async function () {
      const { splitter, agent, team } = await loadFixture(deploySplitter);
      expect(await splitter.agent()).to.equal(agent.address);
      expect(await splitter.team()).to.equal(team.address);
      expect(await splitter.AGENT_BPS()).to.equal(3000n);
      expect(await splitter.TEAM_BPS()).to.equal(7000n);
    });

    it("reverts on zero addresses", async function () {
      const RoyaltySplitter = await ethers.getContractFactory("RoyaltySplitter");
      const [, agent] = await ethers.getSigners();
      await expect(
        RoyaltySplitter.deploy(ethers.ZeroAddress, agent.address)
      ).to.be.revertedWithCustomError(RoyaltySplitter, "ZeroAddress");
      await expect(
        RoyaltySplitter.deploy(agent.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(RoyaltySplitter, "ZeroAddress");
    });
  });

  describe("Receive + pending", function () {
    it("accumulates totalReceived and emits event", async function () {
      const { splitter, funder } = await loadFixture(deploySplitter);
      await expect(
        funder.sendTransaction({
          to: await splitter.getAddress(),
          value: ethers.parseEther("1"),
        })
      )
        .to.emit(splitter, "PaymentReceived")
        .withArgs(funder.address, ethers.parseEther("1"));
      expect(await splitter.totalReceived()).to.equal(ethers.parseEther("1"));
    });

    it("splits pending correctly at 30/70", async function () {
      const { splitter, agent, team, funder } = await loadFixture(deploySplitter);
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });
      expect(await splitter.pendingPayment(agent.address)).to.equal(
        ethers.parseEther("0.3")
      );
      expect(await splitter.pendingPayment(team.address)).to.equal(
        ethers.parseEther("0.7")
      );
    });

    it("returns 0 pending for non-payee", async function () {
      const { splitter, outsider, funder } = await loadFixture(deploySplitter);
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });
      expect(await splitter.pendingPayment(outsider.address)).to.equal(0);
    });
  });

  describe("Release", function () {
    it("release(agent) transfers 30%", async function () {
      const { splitter, agent, funder } = await loadFixture(deploySplitter);
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });

      const before = await ethers.provider.getBalance(agent.address);
      await splitter.connect(funder).release(agent.address);
      const after = await ethers.provider.getBalance(agent.address);

      expect(after - before).to.equal(ethers.parseEther("0.3"));
      expect(await splitter.released(agent.address)).to.equal(
        ethers.parseEther("0.3")
      );
      expect(await splitter.pendingPayment(agent.address)).to.equal(0);
    });

    it("second release with no new income reverts", async function () {
      const { splitter, agent, funder } = await loadFixture(deploySplitter);
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });
      await splitter.release(agent.address);
      await expect(
        splitter.release(agent.address)
      ).to.be.revertedWithCustomError(splitter, "NoPaymentDue");
    });

    it("releaseAll pays both payees", async function () {
      const { splitter, agent, team, funder } = await loadFixture(deploySplitter);
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("2"),
      });

      const agentBefore = await ethers.provider.getBalance(agent.address);
      const teamBefore = await ethers.provider.getBalance(team.address);
      await splitter.releaseAll();
      const agentAfter = await ethers.provider.getBalance(agent.address);
      const teamAfter = await ethers.provider.getBalance(team.address);

      expect(agentAfter - agentBefore).to.equal(ethers.parseEther("0.6"));
      expect(teamAfter - teamBefore).to.equal(ethers.parseEther("1.4"));
    });

    it("releaseAll is a no-op when nothing pending", async function () {
      const { splitter } = await loadFixture(deploySplitter);
      // Should not revert
      await splitter.releaseAll();
    });

    it("non-payee release reverts with NoPaymentDue", async function () {
      const { splitter, outsider, funder } = await loadFixture(deploySplitter);
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });
      await expect(
        splitter.release(outsider.address)
      ).to.be.revertedWithCustomError(splitter, "NoPaymentDue");
    });

    it("handles multiple deposits correctly", async function () {
      const { splitter, agent, team, funder } = await loadFixture(deploySplitter);
      // First deposit + release
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });
      await splitter.releaseAll();

      // Second deposit
      await funder.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("0.5"),
      });

      expect(await splitter.pendingPayment(agent.address)).to.equal(
        ethers.parseEther("0.15")
      );
      expect(await splitter.pendingPayment(team.address)).to.equal(
        ethers.parseEther("0.35")
      );
    });
  });
});
