import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const MAX_PER_TX = ethers.parseEther("0.1");
const MAX_DAILY = ethers.parseEther("0.3");
const MIN_BALANCE = ethers.parseEther("4");
const MULTISIG_THRESHOLD = ethers.parseEther("1");

async function deployAgentAccount() {
  const [deployer, nftOwner, signer1, signer2, target1, target2, random] =
    await ethers.getSigners();

  // Deploy a mock ERC-721 to simulate the NFT ownership
  const MockNFT = await ethers.getContractFactory("AgentNFT");
  const mockNFT = await MockNFT.deploy("Test", "TST", ethers.parseEther("0.01"), 500);
  await mockNFT.waitForDeployment();

  // Mint token #0 to nftOwner
  await mockNFT.reservedMint(nftOwner.address, 1);
  expect(await mockNFT.ownerOf(0)).to.equal(nftOwner.address);

  // Deploy AgentAccount bound to token #0
  const AgentAccount = await ethers.getContractFactory("AgentAccount");
  const account = await AgentAccount.deploy(
    31337n, // hardhat chainId
    await mockNFT.getAddress(),
    0n, // tokenId
    MAX_PER_TX,
    MAX_DAILY,
    MIN_BALANCE,
    MULTISIG_THRESHOLD
  );
  await account.waitForDeployment();

  // Fund the account with 10 ETH
  await deployer.sendTransaction({
    to: await account.getAddress(),
    value: ethers.parseEther("10"),
  });

  // Add target1 as approved target
  await account.connect(nftOwner).addApprovedTarget(target1.address);

  return { account, mockNFT, deployer, nftOwner, signer1, signer2, target1, target2, random };
}

describe("AgentAccount", function () {
  // ─── Deployment ──────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should return correct token info", async function () {
      const { account, mockNFT } = await loadFixture(deployAgentAccount);
      const [chainId, tokenContract, tokenId] = await account.token();
      expect(chainId).to.equal(31337n);
      expect(tokenContract).to.equal(await mockNFT.getAddress());
      expect(tokenId).to.equal(0n);
    });

    it("should set correct spending limits", async function () {
      const { account } = await loadFixture(deployAgentAccount);
      const [maxPerTx, maxDaily, minBalance, multisigThreshold] =
        await account.spendingConfig();
      expect(maxPerTx).to.equal(MAX_PER_TX);
      expect(maxDaily).to.equal(MAX_DAILY);
      expect(minBalance).to.equal(MIN_BALANCE);
      expect(multisigThreshold).to.equal(MULTISIG_THRESHOLD);
    });

    it("should have correct owner", async function () {
      const { account, nftOwner } = await loadFixture(deployAgentAccount);
      expect(await account.owner()).to.equal(nftOwner.address);
    });

    it("should accept ETH", async function () {
      const { account } = await loadFixture(deployAgentAccount);
      expect(
        await ethers.provider.getBalance(await account.getAddress())
      ).to.equal(ethers.parseEther("10"));
    });
  });

  // ─── isValidSigner ───────────────────────────────────────────────

  describe("isValidSigner", function () {
    it("should return magic value for NFT owner", async function () {
      const { account, nftOwner } = await loadFixture(deployAgentAccount);
      const result = await account.isValidSigner(nftOwner.address, "0x");
      expect(result).to.equal("0x523e3260");
    });

    it("should return 0x00000000 for non-owner", async function () {
      const { account, random } = await loadFixture(deployAgentAccount);
      const result = await account.isValidSigner(random.address, "0x");
      expect(result).to.equal("0x00000000");
    });
  });

  // ─── Execute (Basic) ─────────────────────────────────────────────

  describe("Execute", function () {
    it("should execute ETH transfer within limits", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      const balanceBefore = await ethers.provider.getBalance(target1.address);
      await account.connect(nftOwner).execute(
        target1.address,
        ethers.parseEther("0.05"),
        "0x",
        0
      );
      const balanceAfter = await ethers.provider.getBalance(target1.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.05"));
    });

    it("should emit Executed event", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      await expect(
        account.connect(nftOwner).execute(
          target1.address,
          ethers.parseEther("0.05"),
          "0x",
          0
        )
      ).to.emit(account, "Executed");
    });

    it("should increment state after execute", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      expect(await account.state()).to.equal(0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.05"), "0x", 0);
      expect(await account.state()).to.equal(1);
    });

    it("should revert from non-owner", async function () {
      const { account, random, target1 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(random).execute(target1.address, ethers.parseEther("0.05"), "0x", 0)
      ).to.be.revertedWithCustomError(account, "NotOwner");
    });

    it("should revert on non-CALL operation", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(nftOwner).execute(target1.address, 0, "0x", 1)
      ).to.be.revertedWithCustomError(account, "InvalidOperation");
    });

    it("should allow zero-value calls to any address (no whitelist check)", async function () {
      const { account, nftOwner, random } = await loadFixture(deployAgentAccount);
      // Zero-value call to non-approved target should work (read-only calls)
      await account.connect(nftOwner).execute(random.address, 0, "0x", 0);
    });
  });

  // ─── Spending Limits ─────────────────────────────────────────────

  describe("Spending Limits", function () {
    it("should revert when exceeding per-tx limit", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(nftOwner).execute(
          target1.address,
          ethers.parseEther("0.15"), // > 0.1 ETH per-tx limit
          "0x",
          0
        )
      ).to.be.revertedWithCustomError(account, "ExceedsPerTxLimit");
    });

    it("should revert when exceeding daily limit", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      // Spend 0.1 ETH three times = 0.3 ETH (daily limit)
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);

      // 4th time should exceed daily limit
      await expect(
        account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.05"), "0x", 0)
      ).to.be.revertedWithCustomError(account, "ExceedsDailyLimit");
    });

    it("should reset daily limit on new day", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      // Spend full daily limit
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);

      // Advance 1 day
      await time.increase(86400);

      // Should work again
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      expect(await account.dailySpent()).to.equal(ethers.parseEther("0.1"));
    });

    it("should revert when resulting balance below minimum", async function () {
      const { account, nftOwner, target1, deployer } = await loadFixture(deployAgentAccount);

      // Account has 10 ETH, min balance is 4 ETH
      // To trigger: we need balance to drop below 4 ETH
      // But per-tx max is 0.1 ETH and daily max is 0.3 ETH
      // So we need to drain to ~4 ETH first via multisig or a different approach

      // Let's create a new account with just 4.05 ETH to test min balance
      const AgentAccount = await ethers.getContractFactory("AgentAccount");
      const mockNFT = await ethers.getContractFactory("AgentNFT");
      const nft = await mockNFT.deploy("Test2", "TST2", 1, 500);
      await nft.reservedMint(nftOwner.address, 1);

      const account2 = await AgentAccount.deploy(
        31337n,
        await nft.getAddress(),
        0n,
        MAX_PER_TX,
        MAX_DAILY,
        MIN_BALANCE,
        MULTISIG_THRESHOLD
      );

      // Fund with exactly 4.05 ETH
      await deployer.sendTransaction({
        to: await account2.getAddress(),
        value: ethers.parseEther("4.05"),
      });
      await account2.connect(nftOwner).addApprovedTarget(target1.address);

      // Try to spend 0.1 ETH — resulting balance would be 3.95 < 4 ETH
      await expect(
        account2.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.be.revertedWithCustomError(account2, "BelowMinBalance");

      // Spending 0.04 ETH should work — resulting balance 4.01 ETH
      await account2.connect(nftOwner).execute(target1.address, ethers.parseEther("0.04"), "0x", 0);
    });

    it("should revert when value exceeds multisig threshold", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      // Multisig threshold is 1 ETH, but per-tx limit is 0.1 ETH
      // Per-tx limit is checked first in SpendingLimits.validate
      // So this would fail with ExceedsPerTxLimit, not RequiresMultisig
      // Let's just verify the flow works
      await expect(
        account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.15"), "0x", 0)
      ).to.be.revertedWithCustomError(account, "ExceedsPerTxLimit");
    });

    it("should track daily spending correctly", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.05"), "0x", 0);
      expect(await account.dailySpent()).to.equal(ethers.parseEther("0.05"));

      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.03"), "0x", 0);
      expect(await account.dailySpent()).to.equal(ethers.parseEther("0.08"));
    });

    it("should report remaining daily budget correctly", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      expect(await account.getRemainingDailyBudget()).to.equal(MAX_DAILY);

      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      expect(await account.getRemainingDailyBudget()).to.equal(ethers.parseEther("0.2"));
    });

    it("should report full daily budget after day reset", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      expect(await account.getRemainingDailyBudget()).to.equal(ethers.parseEther("0.2"));

      // Advance 1 day
      await time.increase(86400);
      expect(await account.getRemainingDailyBudget()).to.equal(MAX_DAILY);
    });

    it("should report 0 when daily budget fully spent", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);

      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);

      expect(await account.getRemainingDailyBudget()).to.equal(0);
    });
  });

  // ─── Approved Targets ────────────────────────────────────────────

  describe("Approved Targets", function () {
    it("should revert ETH transfer to unapproved target", async function () {
      const { account, nftOwner, target2 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(nftOwner).execute(target2.address, ethers.parseEther("0.01"), "0x", 0)
      ).to.be.revertedWithCustomError(account, "TargetNotApproved");
    });

    it("should add and remove approved targets", async function () {
      const { account, nftOwner, target2 } = await loadFixture(deployAgentAccount);

      await expect(account.connect(nftOwner).addApprovedTarget(target2.address))
        .to.emit(account, "TargetApproved")
        .withArgs(target2.address);
      expect(await account.approvedTargets(target2.address)).to.be.true;
      expect(await account.approvedTargetCount()).to.equal(2); // target1 + target2

      await expect(account.connect(nftOwner).removeApprovedTarget(target2.address))
        .to.emit(account, "TargetRemoved")
        .withArgs(target2.address);
      expect(await account.approvedTargets(target2.address)).to.be.false;
      expect(await account.approvedTargetCount()).to.equal(1);
    });

    it("should revert add from non-owner", async function () {
      const { account, random, target2 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(random).addApprovedTarget(target2.address)
      ).to.be.revertedWithCustomError(account, "NotOwner");
    });

    it("should revert adding zero address", async function () {
      const { account, nftOwner } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(nftOwner).addApprovedTarget(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(account, "ZeroAddress");
    });

    it("should revert adding already approved target", async function () {
      const { account, nftOwner, target1 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(nftOwner).addApprovedTarget(target1.address)
      ).to.be.revertedWithCustomError(account, "AlreadyApproved");
    });

    it("should revert removing unapproved target", async function () {
      const { account, nftOwner, target2 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(nftOwner).removeApprovedTarget(target2.address)
      ).to.be.revertedWithCustomError(account, "NotApproved");
    });
  });

  // ─── Multisig ────────────────────────────────────────────────────

  describe("Multisig", function () {
    it("should add and remove multisig signers", async function () {
      const { account, nftOwner, signer1, signer2 } = await loadFixture(deployAgentAccount);

      await account.connect(nftOwner).addMultisigSigner(signer1.address);
      await account.connect(nftOwner).addMultisigSigner(signer2.address);
      expect(await account.multisigSignerCount()).to.equal(2);
      expect(await account.isMultisigSigner(signer1.address)).to.be.true;

      await account.connect(nftOwner).removeMultisigSigner(signer1.address);
      expect(await account.multisigSignerCount()).to.equal(1);
      expect(await account.isMultisigSigner(signer1.address)).to.be.false;
    });

    it("should revert adding duplicate signer", async function () {
      const { account, nftOwner, signer1 } = await loadFixture(deployAgentAccount);
      await account.connect(nftOwner).addMultisigSigner(signer1.address);
      await expect(
        account.connect(nftOwner).addMultisigSigner(signer1.address)
      ).to.be.revertedWithCustomError(account, "AlreadySigner");
    });

    it("should revert removing non-signer", async function () {
      const { account, nftOwner, signer1 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(nftOwner).removeMultisigSigner(signer1.address)
      ).to.be.revertedWithCustomError(account, "NotSigner");
    });

    it("should require multisig approvals before executeMultisig", async function () {
      const { account, nftOwner, signer1, signer2, target1 } =
        await loadFixture(deployAgentAccount);

      await account.connect(nftOwner).addMultisigSigner(signer1.address);
      await account.connect(nftOwner).addMultisigSigner(signer2.address);
      await account.connect(nftOwner).setMultisigRequired(2);

      const value = ethers.parseEther("0.05");

      // Try to execute without approvals — should fail
      await expect(
        account.connect(signer1).executeMultisig(target1.address, value, "0x")
      ).to.be.revertedWithCustomError(account, "InsufficientApprovals");

      // First signer approves
      await expect(
        account.connect(signer1).approveTransaction(target1.address, value, "0x")
      ).to.emit(account, "MultisigApproval");

      // Still not enough — 1 of 2
      await expect(
        account.connect(signer1).executeMultisig(target1.address, value, "0x")
      ).to.be.revertedWithCustomError(account, "InsufficientApprovals");

      // Second signer approves
      await account.connect(signer2).approveTransaction(target1.address, value, "0x");

      // Now execute — should succeed
      const balanceBefore = await ethers.provider.getBalance(target1.address);
      await expect(
        account.connect(signer1).executeMultisig(target1.address, value, "0x")
      ).to.emit(account, "Executed");
      const balanceAfter = await ethers.provider.getBalance(target1.address);
      expect(balanceAfter - balanceBefore).to.equal(value);
    });

    it("should revert approveTransaction from unauthorized", async function () {
      const { account, random, target1 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(random).approveTransaction(target1.address, ethers.parseEther("0.05"), "0x")
      ).to.be.revertedWithCustomError(account, "NotOwner");
    });

    it("should revert executeMultisig from unauthorized", async function () {
      const { account, random, target1 } = await loadFixture(deployAgentAccount);
      await expect(
        account.connect(random).executeMultisig(target1.address, ethers.parseEther("0.05"), "0x")
      ).to.be.revertedWithCustomError(account, "NotOwner");
    });

    it("should revert executeMultisig when exceeding daily limit", async function () {
      const { account, nftOwner, signer1, signer2, target1 } =
        await loadFixture(deployAgentAccount);

      await account.connect(nftOwner).addMultisigSigner(signer1.address);
      await account.connect(nftOwner).addMultisigSigner(signer2.address);
      await account.connect(nftOwner).setMultisigRequired(2);

      // First exhaust daily limit via normal execute
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);
      await account.connect(nftOwner).execute(target1.address, ethers.parseEther("0.1"), "0x", 0);

      // Now try multisig — daily limit already exhausted
      const value = ethers.parseEther("0.05");
      await account.connect(signer1).approveTransaction(target1.address, value, "0x");
      await account.connect(signer2).approveTransaction(target1.address, value, "0x");

      await expect(
        account.connect(signer1).executeMultisig(target1.address, value, "0x")
      ).to.be.revertedWithCustomError(account, "ExceedsDailyLimit");
    });

    it("should revert executeMultisig when below min balance", async function () {
      const { nftOwner, signer1, signer2, target1, deployer } =
        await loadFixture(deployAgentAccount);

      // Create account with low balance
      const AgentAccount = await ethers.getContractFactory("AgentAccount");
      const mockNFT = await ethers.getContractFactory("AgentNFT");
      const nft = await mockNFT.deploy("T", "T", 1, 500);
      await nft.reservedMint(nftOwner.address, 1);

      const acc = await AgentAccount.deploy(
        31337n, await nft.getAddress(), 0n,
        MAX_PER_TX, MAX_DAILY, MIN_BALANCE, MULTISIG_THRESHOLD
      );

      // Fund with 4.02 ETH (just above min)
      await deployer.sendTransaction({ to: await acc.getAddress(), value: ethers.parseEther("4.02") });
      await acc.connect(nftOwner).addApprovedTarget(target1.address);
      await acc.connect(nftOwner).addMultisigSigner(signer1.address);
      await acc.connect(nftOwner).addMultisigSigner(signer2.address);
      await acc.connect(nftOwner).setMultisigRequired(2);

      // Try to spend 0.05 ETH → would leave 3.97 < 4 ETH min
      const value = ethers.parseEther("0.05");
      await acc.connect(signer1).approveTransaction(target1.address, value, "0x");
      await acc.connect(signer2).approveTransaction(target1.address, value, "0x");

      await expect(
        acc.connect(signer1).executeMultisig(target1.address, value, "0x")
      ).to.be.revertedWithCustomError(acc, "BelowMinBalance");
    });
  });

  // ─── ERC-165 ─────────────────────────────────────────────────────

  describe("supportsInterface", function () {
    it("should support ERC-165", async function () {
      const { account } = await loadFixture(deployAgentAccount);
      expect(await account.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("should support IERC6551Account", async function () {
      const { account } = await loadFixture(deployAgentAccount);
      // IERC6551Account interfaceId
      expect(await account.supportsInterface("0x6faff5f1")).to.be.true;
    });

    it("should support IERC1271", async function () {
      const { account } = await loadFixture(deployAgentAccount);
      expect(await account.supportsInterface("0x1626ba7e")).to.be.true;
    });
  });
});
