import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployAgentNFT,
  MAX_SUPPLY,
  RESERVED_ALLOCATION,
} from "./helpers/fixtures";

describe("AgentNFT (SURVIVORS on SeaDrop)", function () {
  // ─── Deployment ──────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.name()).to.equal("SURVIVORS");
      expect(await nft.symbol()).to.equal("SVVR");
    });

    it("should start with zero total minted and expose reserved cap", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.totalSupply()).to.equal(0);
      expect(await nft.reservedMinted()).to.equal(0);
      expect(await nft.RESERVED_ALLOCATION()).to.equal(RESERVED_ALLOCATION);
    });

    it("should report max supply set in the fixture", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("should start token IDs at 1 (ERC721A convention)", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).reservedMint(owner.address, 1);
      expect(await nft.ownerOf(1)).to.equal(owner.address);
      await expect(nft.ownerOf(0)).to.be.reverted;
    });
  });

  // ─── Reserved Mint (Team Vault) ──────────────────────────────────

  describe("Reserved Mint", function () {
    it("should mint to owner and emit event", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await expect(nft.connect(owner).reservedMint(owner.address, 1))
        .to.emit(nft, "ReservedMinted")
        .withArgs(owner.address, 1, 1);

      expect(await nft.ownerOf(1)).to.equal(owner.address);
      expect(await nft.reservedMinted()).to.equal(1);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("should batch-mint sequential token IDs to another address", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).reservedMint(user1.address, 3);
      expect(await nft.balanceOf(user1.address)).to.equal(3);
      expect(await nft.reservedMinted()).to.equal(3);
      expect(await nft.ownerOf(1)).to.equal(user1.address);
      expect(await nft.ownerOf(2)).to.equal(user1.address);
      expect(await nft.ownerOf(3)).to.equal(user1.address);
    });

    it("should revert when non-owner calls reservedMint", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).reservedMint(user1.address, 1)
      ).to.be.revertedWithCustomError(nft, "OnlyOwner");
    });

    it("should revert on zero quantity", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(owner).reservedMint(owner.address, 0)
      ).to.be.revertedWithCustomError(nft, "ZeroQuantity");
    });

    it("should revert when exceeding RESERVED_ALLOCATION", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      // Mint up to RESERVED_ALLOCATION (100) in chunks of 20
      for (let i = 0; i < 5; i++) {
        await nft.connect(owner).reservedMint(owner.address, 20); // 100 total
      }
      expect(await nft.reservedMinted()).to.equal(RESERVED_ALLOCATION);

      await expect(
        nft.connect(owner).reservedMint(owner.address, 1)
      ).to.be.revertedWithCustomError(nft, "ExceedsReservedAllocation");
    });
  });

  // ─── Admin (inherited from ERC721ContractMetadata / ERC721SeaDrop) ─

  describe("Admin", function () {
    it("owner can lower maxSupply as long as it stays >= totalMinted", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).reservedMint(owner.address, 5);
      await nft.connect(owner).setMaxSupply(500n);
      expect(await nft.maxSupply()).to.equal(500n);
    });

    it("setMaxSupply reverts when lowered below totalMinted", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).reservedMint(owner.address, 10);
      await expect(
        nft.connect(owner).setMaxSupply(5n)
      ).to.be.revertedWithCustomError(nft, "NewMaxSupplyCannotBeLessThenTotalMinted");
    });

    it("should set base URI and return tokenURI", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).reservedMint(owner.address, 1);
      await nft.connect(owner).setBaseURI("https://api.survivors.xyz/metadata/");
      expect(await nft.tokenURI(1)).to.equal(
        "https://api.survivors.xyz/metadata/1"
      );
    });

    it("should set royalty info via setRoyaltyInfo", async function () {
      const { nft, owner, founder1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setRoyaltyInfo({
        royaltyAddress: founder1.address,
        royaltyBps: 700,
      });
      const [receiver, amount] = await nft.royaltyInfo(1, ethers.parseEther("1"));
      expect(receiver).to.equal(founder1.address);
      expect(amount).to.equal(ethers.parseEther("0.07")); // 7%
    });
  });

  // ─── ERC-165 Supports Interface ──────────────────────────────────

  describe("supportsInterface", function () {
    it("should support ERC-721", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("should support ERC-2981", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });
  });
});
