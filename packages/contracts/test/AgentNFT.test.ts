import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  deployAgentNFT,
  buildMerkle,
  MINT_PRICE,
  ROYALTY_BPS,
  RESERVED_ALLOCATION,
  Phase,
} from "./helpers/fixtures";

describe("AgentNFT (SURVIVORS)", function () {
  // ─── Deployment ──────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.name()).to.equal("SURVIVORS");
      expect(await nft.symbol()).to.equal("SVVR");
    });

    it("should set correct mint price", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.mintPrice()).to.equal(MINT_PRICE);
    });

    it("should set owner as initial royalty receiver", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(owner.address);
      expect(amount).to.equal(ethers.parseEther("0.05"));
    });

    it("should start in Closed phase", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.currentPhase()).to.equal(Phase.Closed);
    });

    it("should start with 0 total minted", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.totalMinted()).to.equal(0);
    });

    it("should expose correct supply constants", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.MAX_SUPPLY()).to.equal(888);
      expect(await nft.RESERVED_ALLOCATION()).to.equal(RESERVED_ALLOCATION);
    });
  });

  // ─── GTD Mint ────────────────────────────────────────────────────

  describe("GTD Mint", function () {
    it("should revert when phase is not GTD", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setGTDMerkleRoot(tree.root);

      await expect(
        nft.connect(user1).gtdMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "WrongPhase");
    });

    it("should revert if GTD merkle root is not set", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setPhase(Phase.GTD);

      await expect(
        nft.connect(user1).gtdMint([], { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "MerkleRootNotSet");
    });

    it("should revert on invalid proof", async function () {
      const { nft, owner, user1, user2 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address, user2.address]);
      await nft.connect(owner).setGTDMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.GTD);

      // user3 is not on the list
      const [, , , , , , user3] = await ethers.getSigners();
      await expect(
        nft.connect(user3).gtdMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "InvalidProof");
    });

    it("should revert on insufficient payment", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setGTDMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.GTD);

      await expect(
        nft.connect(user1).gtdMint(tree.proofFor(user1.address), { value: 0 })
      ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
    });

    it("should mint one token to GTD address", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setGTDMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.GTD);

      await expect(
        nft.connect(user1).gtdMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      )
        .to.emit(nft, "Minted")
        .withArgs(user1.address, 0, Phase.GTD);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
      expect(await nft.gtdMinted()).to.equal(1);
      expect(await nft.mintedInGTD(user1.address)).to.be.true;
    });

    it("should revert on second GTD mint from same wallet", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setGTDMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.GTD);

      await nft.connect(user1).gtdMint(tree.proofFor(user1.address), { value: MINT_PRICE });

      await expect(
        nft.connect(user1).gtdMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "AlreadyMintedInPhase");
    });

    it("should allow multiple GTD addresses to mint 1 each", async function () {
      const { nft, owner, user1, user2, user3 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address, user2.address, user3.address]);
      await nft.connect(owner).setGTDMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.GTD);

      await nft.connect(user1).gtdMint(tree.proofFor(user1.address), { value: MINT_PRICE });
      await nft.connect(user2).gtdMint(tree.proofFor(user2.address), { value: MINT_PRICE });
      await nft.connect(user3).gtdMint(tree.proofFor(user3.address), { value: MINT_PRICE });

      expect(await nft.gtdMinted()).to.equal(3);
      expect(await nft.totalMinted()).to.equal(3);
    });
  });

  // ─── FCFS Mint (Merkle-gated race) ───────────────────────────────

  describe("FCFS Mint", function () {
    it("should revert when phase is not FCFS", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setFCFSMerkleRoot(tree.root);

      await expect(
        nft.connect(user1).fcfsMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "WrongPhase");
    });

    it("should revert if FCFS merkle root is not set", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setPhase(Phase.FCFS);

      await expect(
        nft.connect(user1).fcfsMint([], { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "MerkleRootNotSet");
    });

    it("should revert on invalid proof", async function () {
      const { nft, owner, user1, user2 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address, user2.address]);
      await nft.connect(owner).setFCFSMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.FCFS);

      const [, , , , , , user3] = await ethers.getSigners();
      await expect(
        nft.connect(user3).fcfsMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "InvalidProof");
    });

    it("should mint one token in FCFS phase", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setFCFSMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.FCFS);

      await expect(
        nft.connect(user1).fcfsMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      )
        .to.emit(nft, "Minted")
        .withArgs(user1.address, 0, Phase.FCFS);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
      expect(await nft.fcfsMinted()).to.equal(1);
      expect(await nft.mintedInFCFS(user1.address)).to.be.true;
    });

    it("should revert on second FCFS mint from same wallet", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setFCFSMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.FCFS);

      await nft.connect(user1).fcfsMint(tree.proofFor(user1.address), { value: MINT_PRICE });

      await expect(
        nft.connect(user1).fcfsMint(tree.proofFor(user1.address), { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "AlreadyMintedInPhase");
    });

    it("should allow GTD minter to also mint in FCFS phase (if on both lists)", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const gtdTree = buildMerkle([user1.address]);
      const fcfsTree = buildMerkle([user1.address]);

      await nft.connect(owner).setGTDMerkleRoot(gtdTree.root);
      await nft.connect(owner).setFCFSMerkleRoot(fcfsTree.root);

      await nft.connect(owner).setPhase(Phase.GTD);
      await nft.connect(user1).gtdMint(gtdTree.proofFor(user1.address), { value: MINT_PRICE });

      await nft.connect(owner).setPhase(Phase.FCFS);
      await nft.connect(user1).fcfsMint(fcfsTree.proofFor(user1.address), { value: MINT_PRICE });

      expect(await nft.balanceOf(user1.address)).to.equal(2);
      expect(await nft.gtdMinted()).to.equal(1);
      expect(await nft.fcfsMinted()).to.equal(1);
    });
  });

  // ─── Public Mint ─────────────────────────────────────────────────

  describe("Public Mint", function () {
    it("should revert when phase is not Public", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).publicMint({ value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "WrongPhase");
    });

    it("should revert on insufficient payment", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setPhase(Phase.Public);

      await expect(
        nft.connect(user1).publicMint({ value: 0 })
      ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
    });

    it("should mint one token in public phase", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setPhase(Phase.Public);

      await expect(nft.connect(user1).publicMint({ value: MINT_PRICE }))
        .to.emit(nft, "Minted")
        .withArgs(user1.address, 0, Phase.Public);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
      expect(await nft.publicMinted()).to.equal(1);
      expect(await nft.mintedInPublic(user1.address)).to.be.true;
    });

    it("should revert on second public mint from same wallet", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setPhase(Phase.Public);

      await nft.connect(user1).publicMint({ value: MINT_PRICE });
      await expect(
        nft.connect(user1).publicMint({ value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft, "AlreadyMintedInPhase");
    });

    it("should accumulate ETH in contract", async function () {
      const { nft, owner, user1, user2 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setPhase(Phase.Public);

      await nft.connect(user1).publicMint({ value: MINT_PRICE });
      await nft.connect(user2).publicMint({ value: MINT_PRICE });
      expect(await ethers.provider.getBalance(await nft.getAddress())).to.equal(
        MINT_PRICE * 2n
      );
    });

    it("should allow GTD minter to also mint in public phase", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await nft.connect(owner).setGTDMerkleRoot(tree.root);
      await nft.connect(owner).setPhase(Phase.GTD);
      await nft.connect(user1).gtdMint(tree.proofFor(user1.address), { value: MINT_PRICE });

      await nft.connect(owner).setPhase(Phase.Public);
      await nft.connect(user1).publicMint({ value: MINT_PRICE });

      expect(await nft.balanceOf(user1.address)).to.equal(2);
    });
  });

  // ─── Reserved Mint (Team Vault) ──────────────────────────────────

  describe("Reserved Mint", function () {
    it("should allow owner to mint reserved", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await expect(nft.connect(owner).reservedMint(owner.address, 1))
        .to.emit(nft, "ReservedMinted")
        .withArgs(owner.address, 0, 1);

      expect(await nft.ownerOf(0)).to.equal(owner.address);
      expect(await nft.reservedMinted()).to.equal(1);
    });

    it("should allow owner to mint reserved to another address", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).reservedMint(user1.address, 3);
      expect(await nft.balanceOf(user1.address)).to.equal(3);
      expect(await nft.reservedMinted()).to.equal(3);
    });

    it("should revert when non-owner calls reservedMint", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).reservedMint(user1.address, 1)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should work in any phase (including Closed)", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      expect(await nft.currentPhase()).to.equal(Phase.Closed);
      await nft.connect(owner).reservedMint(owner.address, 1);
      expect(await nft.totalMinted()).to.equal(1);
    });

    it("should revert on zero quantity", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(owner).reservedMint(owner.address, 0)
      ).to.be.revertedWithCustomError(nft, "ZeroQuantity");
    });

    it("should revert when exceeding RESERVED_ALLOCATION", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      // Mint up to RESERVED_ALLOCATION (88) in chunks of 20
      for (let i = 0; i < 4; i++) {
        await nft.connect(owner).reservedMint(owner.address, 20); // 80
      }
      await nft.connect(owner).reservedMint(owner.address, 8); // 88 total
      expect(await nft.reservedMinted()).to.equal(RESERVED_ALLOCATION);

      await expect(
        nft.connect(owner).reservedMint(owner.address, 1)
      ).to.be.revertedWithCustomError(nft, "ExceedsReservedAllocation");
    });
  });

  // ─── Admin Functions ─────────────────────────────────────────────

  describe("Admin", function () {
    it("should cycle through phases", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);

      await expect(nft.connect(owner).setPhase(Phase.GTD))
        .to.emit(nft, "PhaseChanged")
        .withArgs(Phase.GTD);
      expect(await nft.currentPhase()).to.equal(Phase.GTD);

      await nft.connect(owner).setPhase(Phase.FCFS);
      expect(await nft.currentPhase()).to.equal(Phase.FCFS);

      await nft.connect(owner).setPhase(Phase.Public);
      expect(await nft.currentPhase()).to.equal(Phase.Public);

      await nft.connect(owner).setPhase(Phase.Closed);
      expect(await nft.currentPhase()).to.equal(Phase.Closed);
    });

    it("should revert setPhase from non-owner", async function () {
      const { nft, user1 } = await loadFixture(deployAgentNFT);
      await expect(
        nft.connect(user1).setPhase(Phase.Public)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("should set GTD merkle root", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await expect(nft.connect(owner).setGTDMerkleRoot(tree.root))
        .to.emit(nft, "GTDMerkleRootSet")
        .withArgs(tree.root);
      expect(await nft.gtdMerkleRoot()).to.equal(tree.root);
    });

    it("should set FCFS merkle root", async function () {
      const { nft, owner, user1 } = await loadFixture(deployAgentNFT);
      const tree = buildMerkle([user1.address]);
      await expect(nft.connect(owner).setFCFSMerkleRoot(tree.root))
        .to.emit(nft, "FCFSMerkleRootSet")
        .withArgs(tree.root);
      expect(await nft.fcfsMerkleRoot()).to.equal(tree.root);
    });

    it("should keep GTD and FCFS roots independent", async function () {
      const { nft, owner, user1, user2 } = await loadFixture(deployAgentNFT);
      const gtdTree = buildMerkle([user1.address]);
      const fcfsTree = buildMerkle([user2.address]);

      await nft.connect(owner).setGTDMerkleRoot(gtdTree.root);
      await nft.connect(owner).setFCFSMerkleRoot(fcfsTree.root);

      expect(await nft.gtdMerkleRoot()).to.equal(gtdTree.root);
      expect(await nft.fcfsMerkleRoot()).to.equal(fcfsTree.root);
      expect(gtdTree.root).to.not.equal(fcfsTree.root);
    });

    it("should update mint price", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      const newPrice = ethers.parseEther("0.02");
      await nft.connect(owner).setMintPrice(newPrice);
      expect(await nft.mintPrice()).to.equal(newPrice);
    });

    it("should set base URI", async function () {
      const { nft, owner } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).reservedMint(owner.address, 1);

      await nft.connect(owner).setBaseURI("https://api.survivors.xyz/metadata/");
      expect(await nft.tokenURI(0)).to.equal("https://api.survivors.xyz/metadata/0");
    });

    it("should update royalty via setRoyalty", async function () {
      const { nft, owner, founder1 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setRoyalty(founder1.address, 700n);
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
      const { nft, owner, user1, user2, user3 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setPhase(Phase.Public);
      await nft.connect(user1).publicMint({ value: MINT_PRICE });
      await nft.connect(user2).publicMint({ value: MINT_PRICE });
      await nft.connect(user3).publicMint({ value: MINT_PRICE });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await nft.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter - balanceBefore + gasCost).to.equal(MINT_PRICE * 3n);
    });

    it("should withdraw to splitter if set", async function () {
      const { nft, owner, founder1, user1, user2 } = await loadFixture(deployAgentNFT);
      await nft.connect(owner).setRevenueSplitter(founder1.address, ROYALTY_BPS);
      await nft.connect(owner).setPhase(Phase.Public);
      await nft.connect(user1).publicMint({ value: MINT_PRICE });
      await nft.connect(user2).publicMint({ value: MINT_PRICE });

      const balanceBefore = await ethers.provider.getBalance(founder1.address);
      await nft.connect(owner).withdraw();
      const balanceAfter = await ethers.provider.getBalance(founder1.address);

      expect(balanceAfter - balanceBefore).to.equal(MINT_PRICE * 2n);
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
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("should support ERC-2981", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });

    it("should support ERC-721 Enumerable", async function () {
      const { nft } = await loadFixture(deployAgentNFT);
      expect(await nft.supportsInterface("0x780e9d63")).to.be.true;
    });
  });
});
