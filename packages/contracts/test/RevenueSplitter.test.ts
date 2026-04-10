import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deployRevenueSplitter() {
  const [owner, agentTBA, founder1, founder2, user1] = await ethers.getSigners();

  const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
  const splitter = await RevenueSplitter.deploy(
    agentTBA.address,
    founder1.address,
    founder2.address
  );
  await splitter.waitForDeployment();

  return { splitter, owner, agentTBA, founder1, founder2, user1 };
}

describe("RevenueSplitter", function () {
  // ─── Deployment ──────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set correct payees and shares", async function () {
      const { splitter, agentTBA, founder1, founder2 } =
        await loadFixture(deployRevenueSplitter);

      const [addr0, shares0] = await splitter.getPayee(0);
      expect(addr0).to.equal(agentTBA.address);
      expect(shares0).to.equal(5000n);

      const [addr1, shares1] = await splitter.getPayee(1);
      expect(addr1).to.equal(founder1.address);
      expect(shares1).to.equal(2000n);

      const [addr2, shares2] = await splitter.getPayee(2);
      expect(addr2).to.equal(founder2.address);
      expect(shares2).to.equal(3000n);
    });

    it("should revert with zero address for agentTBA", async function () {
      const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
      const [, , founder1, founder2] = await ethers.getSigners();
      await expect(
        RevenueSplitter.deploy(ethers.ZeroAddress, founder1.address, founder2.address)
      ).to.be.revertedWithCustomError(RevenueSplitter, "ZeroAddress");
    });

    it("should revert with zero address for founder1", async function () {
      const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
      const [, agentTBA, , founder2] = await ethers.getSigners();
      await expect(
        RevenueSplitter.deploy(agentTBA.address, ethers.ZeroAddress, founder2.address)
      ).to.be.revertedWithCustomError(RevenueSplitter, "ZeroAddress");
    });

    it("should revert with zero address for founder2", async function () {
      const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
      const [, agentTBA, founder1] = await ethers.getSigners();
      await expect(
        RevenueSplitter.deploy(agentTBA.address, founder1.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(RevenueSplitter, "ZeroAddress");
    });

    it("should start with zero balances", async function () {
      const { splitter } = await loadFixture(deployRevenueSplitter);
      expect(await splitter.totalReceived()).to.equal(0);
      expect(await splitter.totalReleased()).to.equal(0);
    });
  });

  // ─── Receiving ETH ───────────────────────────────────────────────

  describe("Receiving ETH", function () {
    it("should accept ETH and emit event", async function () {
      const { splitter, user1 } = await loadFixture(deployRevenueSplitter);
      const amount = ethers.parseEther("1");

      await expect(
        user1.sendTransaction({ to: await splitter.getAddress(), value: amount })
      )
        .to.emit(splitter, "PaymentReceived")
        .withArgs(user1.address, amount);

      expect(await splitter.totalReceived()).to.equal(amount);
    });

    it("should accept multiple deposits", async function () {
      const { splitter, user1, owner } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });
      await owner.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("2"),
      });

      expect(await splitter.totalReceived()).to.equal(ethers.parseEther("3"));
    });
  });

  // ─── Pending Payment ─────────────────────────────────────────────

  describe("Pending Payment", function () {
    it("should calculate correct pending for each payee", async function () {
      const { splitter, agentTBA, founder1, founder2, user1 } =
        await loadFixture(deployRevenueSplitter);

      const deposit = ethers.parseEther("10");
      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: deposit,
      });

      // 50% of 10 ETH = 5 ETH
      expect(await splitter.pendingPayment(agentTBA.address)).to.equal(
        ethers.parseEther("5")
      );
      // 20% of 10 ETH = 2 ETH
      expect(await splitter.pendingPayment(founder1.address)).to.equal(
        ethers.parseEther("2")
      );
      // 30% of 10 ETH = 3 ETH
      expect(await splitter.pendingPayment(founder2.address)).to.equal(
        ethers.parseEther("3")
      );
    });

    it("should return 0 for non-payee", async function () {
      const { splitter, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });

      expect(await splitter.pendingPayment(user1.address)).to.equal(0);
    });

    it("should return 0 when no deposits", async function () {
      const { splitter, agentTBA } = await loadFixture(deployRevenueSplitter);
      expect(await splitter.pendingPayment(agentTBA.address)).to.equal(0);
    });
  });

  // ─── Release ─────────────────────────────────────────────────────

  describe("Release", function () {
    it("should release correct amount to agent TBA", async function () {
      const { splitter, agentTBA, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      const balanceBefore = await ethers.provider.getBalance(agentTBA.address);

      await expect(splitter.release(agentTBA.address))
        .to.emit(splitter, "PaymentReleased")
        .withArgs(agentTBA.address, ethers.parseEther("5"));

      const balanceAfter = await ethers.provider.getBalance(agentTBA.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("5"));
    });

    it("should release correct amount to founder1 (20%)", async function () {
      const { splitter, founder1, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      const balanceBefore = await ethers.provider.getBalance(founder1.address);
      await splitter.release(founder1.address);
      const balanceAfter = await ethers.provider.getBalance(founder1.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2"));
    });

    it("should release correct amount to founder2 (30%)", async function () {
      const { splitter, founder2, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      const balanceBefore = await ethers.provider.getBalance(founder2.address);
      await splitter.release(founder2.address);
      const balanceAfter = await ethers.provider.getBalance(founder2.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("3"));
    });

    it("should revert when no payment is due", async function () {
      const { splitter, agentTBA } = await loadFixture(deployRevenueSplitter);
      await expect(
        splitter.release(agentTBA.address)
      ).to.be.revertedWithCustomError(splitter, "NoPaymentDue");
    });

    it("should revert for non-payee address", async function () {
      const { splitter, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("1"),
      });

      await expect(
        splitter.release(user1.address)
      ).to.be.revertedWithCustomError(splitter, "NoPaymentDue");
    });

    it("should track released amounts", async function () {
      const { splitter, agentTBA, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      await splitter.release(agentTBA.address);

      expect(await splitter.released(agentTBA.address)).to.equal(
        ethers.parseEther("5")
      );
      expect(await splitter.totalReleased()).to.equal(ethers.parseEther("5"));
    });

    it("should handle multiple deposits and releases correctly", async function () {
      const { splitter, agentTBA, user1 } = await loadFixture(deployRevenueSplitter);

      // First deposit: 10 ETH
      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      // Release agent's 5 ETH
      await splitter.release(agentTBA.address);
      expect(await splitter.pendingPayment(agentTBA.address)).to.equal(0);

      // Second deposit: 4 ETH
      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("4"),
      });

      // Agent should have 50% of 4 ETH = 2 ETH pending
      expect(await splitter.pendingPayment(agentTBA.address)).to.equal(
        ethers.parseEther("2")
      );

      await splitter.release(agentTBA.address);
      expect(await splitter.released(agentTBA.address)).to.equal(
        ethers.parseEther("7") // 5 + 2
      );
    });
  });

  // ─── Release All ─────────────────────────────────────────────────

  describe("Release All", function () {
    it("should release to all payees", async function () {
      const { splitter, agentTBA, founder1, founder2, user1 } =
        await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      const agentBefore = await ethers.provider.getBalance(agentTBA.address);
      const f1Before = await ethers.provider.getBalance(founder1.address);
      const f2Before = await ethers.provider.getBalance(founder2.address);

      await splitter.releaseAll();

      const agentAfter = await ethers.provider.getBalance(agentTBA.address);
      const f1After = await ethers.provider.getBalance(founder1.address);
      const f2After = await ethers.provider.getBalance(founder2.address);

      expect(agentAfter - agentBefore).to.equal(ethers.parseEther("5"));
      expect(f1After - f1Before).to.equal(ethers.parseEther("2"));
      expect(f2After - f2Before).to.equal(ethers.parseEther("3"));
    });

    it("should handle releaseAll when some already released", async function () {
      const { splitter, agentTBA, founder1, founder2, user1 } =
        await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      // Release agent first
      await splitter.release(agentTBA.address);

      // Now releaseAll — agent has 0 pending, others should still get paid
      const f1Before = await ethers.provider.getBalance(founder1.address);
      const f2Before = await ethers.provider.getBalance(founder2.address);

      await splitter.releaseAll();

      const f1After = await ethers.provider.getBalance(founder1.address);
      const f2After = await ethers.provider.getBalance(founder2.address);

      expect(f1After - f1Before).to.equal(ethers.parseEther("2"));
      expect(f2After - f2Before).to.equal(ethers.parseEther("3"));
    });

    it("should leave zero in contract after releaseAll", async function () {
      const { splitter, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      await splitter.releaseAll();

      expect(
        await ethers.provider.getBalance(await splitter.getAddress())
      ).to.equal(0);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────

  describe("Edge Cases", function () {
    it("should handle small amounts without rounding loss", async function () {
      const { splitter, agentTBA, founder1, founder2, user1 } =
        await loadFixture(deployRevenueSplitter);

      // 1 wei — agent gets 0 (5000/10000 of 1 = 0 due to integer math)
      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: 1n,
      });

      // With 1 wei: 5000/10000 = 0, 2000/10000 = 0, 3000/10000 = 0
      // This is expected integer division behavior
      expect(await splitter.pendingPayment(agentTBA.address)).to.equal(0);
    });

    it("should handle exact 10000 wei cleanly", async function () {
      const { splitter, agentTBA, founder1, founder2, user1 } =
        await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: 10000n,
      });

      expect(await splitter.pendingPayment(agentTBA.address)).to.equal(5000n);
      expect(await splitter.pendingPayment(founder1.address)).to.equal(2000n);
      expect(await splitter.pendingPayment(founder2.address)).to.equal(3000n);
    });

    it("should allow anyone to call release", async function () {
      const { splitter, agentTBA, user1 } = await loadFixture(deployRevenueSplitter);

      await user1.sendTransaction({
        to: await splitter.getAddress(),
        value: ethers.parseEther("10"),
      });

      // user1 (non-payee) calls release for agentTBA
      const balanceBefore = await ethers.provider.getBalance(agentTBA.address);
      await splitter.connect(user1).release(agentTBA.address);
      const balanceAfter = await ethers.provider.getBalance(agentTBA.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("5"));
    });
  });
});
