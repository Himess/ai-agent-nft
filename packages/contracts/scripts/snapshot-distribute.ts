/**
 * Snapshot holders and seed a new HolderReward epoch.
 *
 * Usage:
 *   NFT_ADDRESS=0x...           \   # SurvivorsNFT
 *   HOLDER_REWARD=0x...         \   # HolderReward contract
 *   POOL_ETH=0.5                \   # pool size in ETH (sent with createEpoch)
 *   MODE=equal                  \   # "equal" (equal per NFT) | "weighted" (by holding time)
 *   OUTPUT=snapshots/epoch-1.json \ # proof output path
 *   DRY_RUN=1                   \   # optional — skip on-chain tx, just write JSON
 *   npx hardhat run scripts/snapshot-distribute.ts --network sepolia
 *
 * "equal" mode: each NFT receives `pool / totalSupply` wei. A holder with N
 * tokens receives N × that amount. Simple and predictable; use for the first
 * 2-3 epochs while the system is bedding in.
 *
 * "weighted" mode: each token earns proportional to time held since its last
 * transfer. Rewards long-term holders. Uses Transfer event history, so this
 * mode only works against a chain where events are retrievable (mainnet,
 * Sepolia, fork). Add `WEIGHT_ASOF=<block>` to pin the snapshot block.
 */
import { ethers } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildHolderMerkle, type HolderEntry } from "./lib/holder-merkle";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env var: ${name}`);
  return v;
}

async function collectEqual(nft: any, totalSupply: bigint, pool: bigint): Promise<HolderEntry[]> {
  const perToken = pool / totalSupply;
  const counts = new Map<string, bigint>();
  for (let i = 1n; i <= totalSupply; i++) {
    const owner = ethers.getAddress(await nft.ownerOf(i));
    counts.set(owner, (counts.get(owner) ?? 0n) + 1n);
  }
  return Array.from(counts).map(([holder, count]) => ({
    holder,
    amount: perToken * count,
  }));
}

async function collectWeighted(nft: any, totalSupply: bigint, pool: bigint, asOfBlock: number): Promise<HolderEntry[]> {
  const deployBlock = Number(process.env.NFT_DEPLOY_BLOCK ?? "0");
  const nftAddress = await nft.getAddress();
  const provider = ethers.provider;
  const asOfBlockData = await provider.getBlock(asOfBlock);
  if (!asOfBlockData) throw new Error(`unknown block ${asOfBlock}`);
  const snapshotTimestamp = BigInt(asOfBlockData.timestamp);

  // Transfer(address from, address to, uint256 tokenId)
  const transferTopic = ethers.id("Transfer(address,address,uint256)");

  // Fetch in chunks if deploy block is far behind (some RPCs cap log range).
  const CHUNK = 5000;
  const logs: { blockNumber: number; data: string; topics: readonly string[] }[] = [];
  for (let from = deployBlock; from <= asOfBlock; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, asOfBlock);
    const batch = await provider.getLogs({
      address: nftAddress,
      fromBlock: from,
      toBlock: to,
      topics: [transferTopic],
    });
    logs.push(...batch);
  }

  // Walk transfers chronologically. For each tokenId, track the current owner
  // + the block timestamp at which they acquired it.
  const currentOwner = new Map<bigint, string>();
  const acquiredAt = new Map<bigint, bigint>();
  const blockTimestamps = new Map<number, bigint>();
  async function blockTs(n: number): Promise<bigint> {
    if (blockTimestamps.has(n)) return blockTimestamps.get(n)!;
    const b = await provider.getBlock(n);
    const ts = BigInt(b!.timestamp);
    blockTimestamps.set(n, ts);
    return ts;
  }

  for (const log of logs) {
    const tokenId = BigInt(log.topics[3]);
    const to = ethers.getAddress("0x" + log.topics[2].slice(-40));
    currentOwner.set(tokenId, to);
    acquiredAt.set(tokenId, await blockTs(log.blockNumber));
  }

  // Weight = snapshot_ts - acquired_ts, per token. Aggregate per holder.
  const holderWeight = new Map<string, bigint>();
  let totalWeight = 0n;
  for (let tokenId = 1n; tokenId <= totalSupply; tokenId++) {
    const owner = currentOwner.get(tokenId);
    const acquired = acquiredAt.get(tokenId);
    if (!owner || acquired === undefined) continue;
    const weight = snapshotTimestamp - acquired;
    if (weight <= 0n) continue;
    holderWeight.set(owner, (holderWeight.get(owner) ?? 0n) + weight);
    totalWeight += weight;
  }

  if (totalWeight === 0n) throw new Error("no positive holding time at snapshot");
  return Array.from(holderWeight).map(([holder, weight]) => ({
    holder,
    amount: (pool * weight) / totalWeight,
  }));
}

async function main() {
  const nftAddress = requireEnv("NFT_ADDRESS");
  const holderRewardAddress = requireEnv("HOLDER_REWARD");
  const poolEth = requireEnv("POOL_ETH");
  const mode = (process.env.MODE ?? "equal").toLowerCase();
  const output = process.env.OUTPUT ?? `snapshots/epoch-${Date.now()}.json`;
  const dryRun = process.env.DRY_RUN === "1";

  if (mode !== "equal" && mode !== "weighted") {
    throw new Error(`MODE must be "equal" or "weighted", got "${mode}"`);
  }

  const pool = ethers.parseEther(poolEth);
  const nft = await ethers.getContractAt("AgentNFT", nftAddress);
  const reward = await ethers.getContractAt("HolderReward", holderRewardAddress);
  const totalSupply = await nft.totalSupply();

  console.log("━━━ Holder snapshot ━━━");
  console.log(`NFT:            ${nftAddress}`);
  console.log(`HolderReward:   ${holderRewardAddress}`);
  console.log(`Pool:           ${poolEth} ETH`);
  console.log(`Mode:           ${mode}`);
  console.log(`Total supply:   ${totalSupply}`);

  const entries =
    mode === "equal"
      ? await collectEqual(nft, totalSupply, pool)
      : await collectWeighted(
          nft,
          totalSupply,
          pool,
          Number(process.env.WEIGHT_ASOF ?? (await ethers.provider.getBlockNumber()))
        );

  if (entries.length === 0) throw new Error("no holders found");

  // Sort deterministically for reproducibility.
  entries.sort((a, b) => (a.holder.toLowerCase() < b.holder.toLowerCase() ? -1 : 1));

  const { root, proofFor } = buildHolderMerkle(entries);
  const totalAllocated = entries.reduce((acc, e) => acc + e.amount, 0n);

  console.log(`Unique holders: ${entries.length}`);
  console.log(`Allocated:      ${ethers.formatEther(totalAllocated)} ETH`);
  console.log(`Merkle root:    ${root}`);

  const outputPath = resolve(process.cwd(), output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        nftAddress,
        holderReward: holderRewardAddress,
        mode,
        pool: pool.toString(),
        totalAllocated: totalAllocated.toString(),
        merkleRoot: root,
        allocations: entries.map((e) => ({
          holder: e.holder,
          amount: e.amount.toString(),
          proof: proofFor(e.holder, e.amount),
        })),
      },
      null,
      2
    )
  );
  console.log(`Wrote ${output}`);

  if (dryRun) {
    console.log("DRY_RUN=1 — skipping on-chain createEpoch");
    return;
  }

  // totalAllocated may be very slightly less than pool due to integer division;
  // send the full pool so rounding dust stays in the contract for next epoch.
  console.log(`Creating epoch with ${poolEth} ETH...`);
  const tx = await reward.createEpoch(root, { value: pool });
  const receipt = await tx.wait();
  console.log(`✓ tx: ${receipt?.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
