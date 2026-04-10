import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployAgentNFT,
  MINT_PRICE,
  ROYALTY_BPS,
  MAX_SUPPLY,
  MAX_BATCH,
} from "./helpers/fixtures";

describe("AgentNFT", function () {
  // ─── Deployment ──────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.name()).to.equal("AI Agent NFT");
      expect(await nft.symbol()).to.equal("AGENT");
    });

    it("should set correct mint price", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.mintPrice()).to.equal(MINT_PRICE);
    });

    it("should set owner as initial royalty receiver", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      // Check royalty info for a hypothetical token sale of 1 ETH
      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(owner.address);
      expect(amount).to.equal(ethers.parseEther("0.05")); // 5%
    });

    it("should start with mint inactive", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.mintActive()).to.equal(false);
    });

    it("should start with 0 total minted", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.totalMinted()).to.equal(0);
    });

    it("should set correct owner", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  // ─── Minting ─────────────────────────────────────────────────────

  describe("Minting", function () {
    it("should revert if mint is not active", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).mint(1, { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "MintNotActive");
    });

    it("should revert on zero quantity", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);
      await expect(
        nft.connect(user1).mint(0, { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "ZeroQuantity");
    });

    it("should revert if quantity exceeds MAX_BATCH", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);
      const qty = MAX_BATCH + 1n;
      await expect(
        nft.connect(user1).mint(qty, { value: MINT_PRICE * qty })
      ).to.be.revertedWithCustomError(nft, "MaxBatchExceeded");
    });

    it("should revert on insufficient payment", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);
      await expect(
        nft.connect(user1).mint(2, { value: MINT_PRICE }) // only pays for 1
      ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
    });

    it("should mint single token", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);

      await expect(nft.connect(user1).mint(1, { value: MINT_PRICE }))
        .to.emit(nft, "BatchMinted")
        .withArgs(user1.address, 0, 1);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
      expect(await nft.totalMinted()).to.equal(1);
      expect(await nft.totalSupply()).to.equal(1);
      expect(await nft.balanceOf(user1.address)).to.equal(1);
    });

    it("should batch mint multiple tokens", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);

      const qty = 5n;
      await expect(nft.connect(user1).mint(qty, { value: MINT_PRICE * qty }))
        .to.emit(nft, "BatchMinted")
        .withArgs(user1.address, 0, qty);

      expect(await nft.totalMinted()).to.equal(qty);
      expect(await nft.balanceOf(user1.address)).to.equal(qty);

      for (let i = 0; i < Number(qty); i++) {
        expect(await nft.ownerOf(i)).to.equal(user1.address);
      }
    });

    it("should batch mint MAX_BATCH tokens", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);

      await nft.connect(user1).mint(MAX_BATCH, { value: MINT_PRICE * MAX_BATCH });
      expect(await nft.totalMinted()).to.equal(MAX_BATCH);
    });

    it("should accumulate ETH in contract", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);

      await nft.connect(user1).mint(3, { value: MINT_PRICE * 3n });
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(
        MINT_PRICE * 3n
      );
    });

    it("should allow multiple users to mint", async function () {
      const { nft, owner, user1, user2 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);

      await nft.connect(user1).mint(2, { value: MINT_PRICE * 2n });
      await nft.connect(user2).mint(3, { value: MINT_PRICE * 3n });

      expect(await nft.balanceOf(user1.address)).to.equal(2);
      expect(await nft.balanceOf(user2.address)).to.equal(3);
      expect(await nft.totalMinted()).to.equal(5);
    });
  });

  // ─── Owner Mint ──────────────────────────────────────────────────

  describe("Owner Mint", function () {
    it("should allow owner to mint without payment", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await expect(nft.connect(owner).ownerMint(owner.address, 1))
        .to.emit(nft, "BatchMinted")
        .withArgs(owner.address, 0, 1);

      expect(await nft.ownerOf(0)).to.equal(owner.address);
    });

    it("should allow owner to mint to another address", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).ownerMint(user1.address, 3);
      expect(await nft.balanceOf(user1.address)).to.equal(3);
    });

    it("should revert when non-owner calls ownerMint", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).ownerMint(user1.address, 1)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should work even when mint is not active", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      expect(await nft.mintActive()).to.equal(false);
      await nft.connect(owner).ownerMint(owner.address, 1);
      expect(await nft.totalMinted()).to.equal(1);
    });

    it("should revert on zero quantity", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(owner).ownerMint(owner.address, 0)
      ).to.be.revertedWithCustomError(nft, "ZeroQuantity");
    });
  });

  // ─── Supply Cap ──────────────────────────────────────────────────

  describe("Supply Cap", function () {
    it("should revert when minting exceeds MAX_SUPPLY", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);

      // Mint 990 via ownerMint in batches
      for (let i = 0; i < 50; i++) {
        await nft.connect(owner).ownerMint(owner.address, 20);
      }
      expect(await nft.totalMinted()).to.equal(1000);

      // Try to mint 1 more
      await expect(
        nft.connect(owner).ownerMint(owner.address, 1)
      ).to.be.revertedWithCustomError(nft, "ExceedsMaxSupply");
    });
  });

  // ─── Admin Functions ─────────────────────────────────────────────

  describe("Admin", function () {
    it("should toggle mint active", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);

      await expect(nft.connect(owner).setMintActive(true))
        .to.emit(nft, "MintActiveChanged")
        .withArgs(true);
      expect(await nft.mintActive()).to.equal(true);

      await expect(nft.connect(owner).setMintActive(false))
        .to.emit(nft, "MintActiveChanged")
        .withArgs(false);
      expect(await nft.mintActive()).to.equal(false);
    });

    it("should revert setMintActive from non-owner", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).setMintActive(true)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should set base URI", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).ownerMint(owner.address, 1);

      await nft.connect(owner).setBaseURI("https://api.example.com/metadata/");
      expect(await nft.tokenURI(0)).to.equal("https://api.example.com/metadata/0");
    });

    it("should update royalty via setRoyalty", async function () {
      const { nft, owner, founder1 } = await loadFixture(deployAgentNFT);

      await nft.connect(owner).setRoyalty(founder1.address, 700n); // 7%
      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(founder1.address);
      expect(amount).to.equal(ethers.parseEther("0.07"));
    });
  });

  // ─── Revenue Splitter ────────────────────────────────────────────

  describe("Revenue Splitter", function () {
    it("should set revenue splitter once", async function () {
      const { nft, owner, founder1 } = await loadFixture(deployAgentNFT);

      await expect(nft.connect(owner).setRevenueSplitter(founder1.address, ROYALTY_BPS))
        .to.emit(nft, "RevenueSplitterSet")
        .withArgs(founder1.address);

      expect(await nft.revenueSplitter()).to.equal(founder1.address);
    });

    it("should update royalty receiver to splitter", async function () {
      const { nft, owner, founder1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setRevenueSplitter(founder1.address, ROYALTY_BPS);

      const [receiver] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(founder1.address);
    });

    it("should revert on second call to setRevenueSplitter", async function () {
      const { nft, owner, founder1, founder2 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setRevenueSplitter(founder1.address, ROYALTY_BPS);

      await expect(
        nft.connect(owner).setRevenueSplitter(founder2.address, ROYALTY_BPS)
      ).to.be.revertedWithCustomError(nft, "SplitterAlreadySet");
    });

    it("should revert on zero address", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(owner).setRevenueSplitter(ethers.ZeroAddress, ROYALTY_BPS)
      ).to.be.revertedWithCustomError(nft, "ZeroAddress");
    });
  });

  // ─── Withdraw ────────────────────────────────────────────────────

  describe("Withdraw", function () {
    it("should withdraw to owner if splitter not set", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setMintActive(true);
      await nft.connect(user1).mint(5, { value: MINT_PRICE * 5n });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nft.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter - balanceBefore + gasCost).to.equal(MINT_PRICE * 5n);
    });

    it("should withdraw to splitter if set", async function () {
      const { nft, owner, founder1, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setRevenueSplitter(founder1.address, ROYALTY_BPS);
      await nft.connect(owner).setMintActive(true);
      await nft.connect(user1).mint(3, { value: MINT_PRICE * 3n });

      const balanceBefore = await ethers.provider.getBalance(founder1.address);
      await nft.connect(owner).withdraw();
      const balanceAfter = await ethers.provider.getBalance(founder1.address);

      expect(balanceAfter - balanceBefore).to.equal(MINT_PRICE * 3n);
    });

    it("should revert withdraw from non-owner", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).withdraw()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ─── ERC-165 Supports Interface ──────────────────────────────────

  describe("supportsInterface", function () {
    it("should support ERC-721", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true; // ERC-721
    });

    it("should support ERC-2981", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true; // ERC-2981
    });

    it("should support ERC-721 Enumerable", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.supportsInterface("0x780e9d63")).to.be.true; // ERC-721 Enumerable
    });
  });
});
