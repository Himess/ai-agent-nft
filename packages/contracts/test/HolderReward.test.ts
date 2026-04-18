import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

// Merkle helper for (address, amount) leaves — keccak256(abi.encodePacked(address, uint256))
// with standard OZ sorted-pair hashing for internal nodes.
function leafFor(holder: string, amount: bigint): string {
  return ethers.solidityPackedKeccak256(
    ["address", "uint256"],
    [holder, amount]
  );
}

function buildRewardMerkle(entries: { holder: string; amount: bigint }[]) {
  const leaves = entries.map((e) => leafFor(e.holder, e.amount));

  function hashPair(a: string, b: string): string {
    const [first, second] = a < b ? [a, b] : [b, a];
    return ethers.keccak256(ethers.concat([first, second]));
  }

  const layers: string[][] = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const cur = layers[layers.length - 1];
    const next: string[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      if (i + 1 < cur.length) next.push(hashPair(cur[i], cur[i + 1]));
      else next.push(cur[i]);
    }
    layers.push(next);
  }
  const root = layers[layers.length - 1][0];

  function proofFor(holder: string, amount: bigint): string[] {
    const leaf = leafFor(holder, amount);
    let idx = leaves.indexOf(leaf);
    if (idx === -1) throw new Error(`entry not in tree: ${holder}:${amount}`);
    const proof: string[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const layer = layers[l];
      const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (pairIdx < layer.length) proof.push(layer[pairIdx]);
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  return { root, proofFor };
}

async function deployReward() {
  const [owner, h1, h2, h3, outsider] = await ethers.getSigners();
  const HolderReward = await ethers.getContractFactory("HolderReward");
  const reward = await HolderReward.deploy(owner.address);
  await reward.waitForDeployment();
  return { reward, owner, h1, h2, h3, outsider };
}

describe("HolderReward", function () {
  describe("Deployment", function () {
    it("sets the owner", async function () {
      const { reward, owner } = await loadFixture(deployReward);
      expect(await reward.owner()).to.equal(owner.address);
    });

    it("starts with nextEpochId = 0", async function () {
      const { reward } = await loadFixture(deployReward);
      expect(await reward.nextEpochId()).to.equal(0);
    });
  });

  describe("createEpoch", function () {
    it("seeds an epoch with ETH and emits event", async function () {
      const { reward, owner, h1, h2 } = await loadFixture(deployReward);
      const entries = [
        { holder: h1.address, amount: ethers.parseEther("0.1") },
        { holder: h2.address, amount: ethers.parseEther("0.2") },
      ];
      const { root } = buildRewardMerkle(entries);
      const total = ethers.parseEther("0.3");

      await expect(reward.connect(owner).createEpoch(root, { value: total }))
        .to.emit(reward, "EpochCreated")
        .withArgs(0, root, total, anyBigInt());

      const e = await reward.epochs(0);
      expect(e.merkleRoot).to.equal(root);
      expect(e.totalAmount).to.equal(total);
      expect(e.totalClaimed).to.equal(0);
    });

    it("rejects zero root", async function () {
      const { reward, owner } = await loadFixture(deployReward);
      await expect(
        reward.connect(owner).createEpoch(ethers.ZeroHash, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(reward, "ZeroRoot");
    });

    it("rejects zero amount", async function () {
      const { reward, owner, h1 } = await loadFixture(deployReward);
      const { root } = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      await expect(
        reward.connect(owner).createEpoch(root, { value: 0 })
      ).to.be.revertedWithCustomError(reward, "ZeroAmount");
    });

    it("rejects non-owner call", async function () {
      const { reward, outsider, h1 } = await loadFixture(deployReward);
      const { root } = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      await expect(
        reward.connect(outsider).createEpoch(root, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(reward, "OwnableUnauthorizedAccount");
    });

    it("advances nextEpochId", async function () {
      const { reward, owner, h1 } = await loadFixture(deployReward);
      const { root } = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.1") });
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.1") });
      expect(await reward.nextEpochId()).to.equal(2);
    });
  });

  describe("claim", function () {
    it("holder claims their share with a valid proof", async function () {
      const { reward, owner, h1, h2 } = await loadFixture(deployReward);
      const entries = [
        { holder: h1.address, amount: ethers.parseEther("0.1") },
        { holder: h2.address, amount: ethers.parseEther("0.2") },
      ];
      const { root, proofFor } = buildRewardMerkle(entries);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.3") });

      const before = await ethers.provider.getBalance(h1.address);
      const tx = await reward
        .connect(h1)
        .claim(0, ethers.parseEther("0.1"), proofFor(h1.address, ethers.parseEther("0.1")));
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(h1.address);

      expect(after - before + gas).to.equal(ethers.parseEther("0.1"));
      expect(await reward.claimed(0, h1.address)).to.be.true;

      const e = await reward.epochs(0);
      expect(e.totalClaimed).to.equal(ethers.parseEther("0.1"));
    });

    it("rejects invalid proof", async function () {
      const { reward, owner, h1, h2, outsider } = await loadFixture(deployReward);
      const entries = [
        { holder: h1.address, amount: ethers.parseEther("0.1") },
        { holder: h2.address, amount: ethers.parseEther("0.2") },
      ];
      const { root, proofFor } = buildRewardMerkle(entries);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.3") });

      // outsider tries to claim h1's share
      await expect(
        reward
          .connect(outsider)
          .claim(0, ethers.parseEther("0.1"), proofFor(h1.address, ethers.parseEther("0.1")))
      ).to.be.revertedWithCustomError(reward, "InvalidProof");
    });

    it("rejects double-claim by same holder", async function () {
      const { reward, owner, h1, h2 } = await loadFixture(deployReward);
      const entries = [
        { holder: h1.address, amount: ethers.parseEther("0.1") },
        { holder: h2.address, amount: ethers.parseEther("0.2") },
      ];
      const { root, proofFor } = buildRewardMerkle(entries);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.3") });

      const proof = proofFor(h1.address, ethers.parseEther("0.1"));
      await reward.connect(h1).claim(0, ethers.parseEther("0.1"), proof);
      await expect(
        reward.connect(h1).claim(0, ethers.parseEther("0.1"), proof)
      ).to.be.revertedWithCustomError(reward, "AlreadyClaimed");
    });

    it("rejects claim against missing epoch", async function () {
      const { reward, h1 } = await loadFixture(deployReward);
      await expect(
        reward.connect(h1).claim(0, ethers.parseEther("0.1"), [])
      ).to.be.revertedWithCustomError(reward, "EpochMissing");
    });

    it("rejects claim with altered amount", async function () {
      const { reward, owner, h1, h2 } = await loadFixture(deployReward);
      const entries = [
        { holder: h1.address, amount: ethers.parseEther("0.1") },
        { holder: h2.address, amount: ethers.parseEther("0.2") },
      ];
      const { root, proofFor } = buildRewardMerkle(entries);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.3") });

      const proof = proofFor(h1.address, ethers.parseEther("0.1"));
      // h1 tries to claim 0.2 with a proof generated for 0.1
      await expect(
        reward.connect(h1).claim(0, ethers.parseEther("0.2"), proof)
      ).to.be.revertedWithCustomError(reward, "InvalidProof");
    });
  });

  describe("reclaimExpired", function () {
    it("reverts before the claim window closes", async function () {
      const { reward, owner, h1 } = await loadFixture(deployReward);
      const { root } = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.1") });

      await expect(
        reward.connect(owner).reclaimExpired(0)
      ).to.be.revertedWithCustomError(reward, "NotExpired");
    });

    it("reclaims remaining funds after 60 days", async function () {
      const { reward, owner, h1, h2 } = await loadFixture(deployReward);
      const entries = [
        { holder: h1.address, amount: ethers.parseEther("0.1") },
        { holder: h2.address, amount: ethers.parseEther("0.2") },
      ];
      const { root, proofFor } = buildRewardMerkle(entries);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.3") });

      // h1 claims, h2 never does
      await reward
        .connect(h1)
        .claim(0, ethers.parseEther("0.1"), proofFor(h1.address, ethers.parseEther("0.1")));

      await time.increase(60 * 24 * 60 * 60 + 1);

      const before = await ethers.provider.getBalance(owner.address);
      const tx = await reward.connect(owner).reclaimExpired(0);
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(owner.address);

      // Remaining = 0.3 - 0.1 claimed = 0.2 back to owner.
      expect(after - before + gas).to.equal(ethers.parseEther("0.2"));
    });

    it("rejects second reclaim on the same epoch", async function () {
      const { reward, owner, h1 } = await loadFixture(deployReward);
      const { root } = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.1") });

      await time.increase(60 * 24 * 60 * 60 + 1);
      await reward.connect(owner).reclaimExpired(0);
      await expect(
        reward.connect(owner).reclaimExpired(0)
      ).to.be.revertedWithCustomError(reward, "NothingToReclaim");
    });

    it("rejects non-owner call", async function () {
      const { reward, outsider, h1, owner } = await loadFixture(deployReward);
      const { root } = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      await reward.connect(owner).createEpoch(root, { value: ethers.parseEther("0.1") });
      await time.increase(60 * 24 * 60 * 60 + 1);
      await expect(
        reward.connect(outsider).reclaimExpired(0)
      ).to.be.revertedWithCustomError(reward, "OwnableUnauthorizedAccount");
    });
  });

  describe("Multi-epoch independence", function () {
    it("holder can claim from multiple epochs", async function () {
      const { reward, owner, h1 } = await loadFixture(deployReward);
      const tree1 = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      const tree2 = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.05") },
      ]);

      await reward.connect(owner).createEpoch(tree1.root, { value: ethers.parseEther("0.1") });
      await reward.connect(owner).createEpoch(tree2.root, { value: ethers.parseEther("0.05") });

      const before = await ethers.provider.getBalance(h1.address);
      const tx1 = await reward
        .connect(h1)
        .claim(0, ethers.parseEther("0.1"), tree1.proofFor(h1.address, ethers.parseEther("0.1")));
      const tx2 = await reward
        .connect(h1)
        .claim(1, ethers.parseEther("0.05"), tree2.proofFor(h1.address, ethers.parseEther("0.05")));
      const gas =
        (await tx1.wait())!.gasUsed * (await tx1.wait())!.gasPrice +
        (await tx2.wait())!.gasUsed * (await tx2.wait())!.gasPrice;
      const after = await ethers.provider.getBalance(h1.address);

      expect(after - before + gas).to.equal(ethers.parseEther("0.15"));
    });

    it("reverting an epoch does not affect other epochs", async function () {
      const { reward, owner, h1 } = await loadFixture(deployReward);
      const tree1 = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.1") },
      ]);
      const tree2 = buildRewardMerkle([
        { holder: h1.address, amount: ethers.parseEther("0.05") },
      ]);
      await reward.connect(owner).createEpoch(tree1.root, { value: ethers.parseEther("0.1") });
      await reward.connect(owner).createEpoch(tree2.root, { value: ethers.parseEther("0.05") });

      // Claim epoch 1 only. Then fast-forward and reclaim epoch 0.
      await reward
        .connect(h1)
        .claim(1, ethers.parseEther("0.05"), tree2.proofFor(h1.address, ethers.parseEther("0.05")));
      await time.increase(60 * 24 * 60 * 60 + 1);
      await reward.connect(owner).reclaimExpired(0);

      // h1 should still be marked claimed on epoch 1, and not claimed on epoch 0.
      expect(await reward.claimed(0, h1.address)).to.be.false;
      expect(await reward.claimed(1, h1.address)).to.be.true;
    });
  });
});

// Chai matcher for "any bigint" — used when we don't care about the exact expiresAt timestamp.
function anyBigInt() {
  return (v: bigint) => typeof v === "bigint" && v > 0n;
}
