import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";
import { buildSeadropMerkle } from "../../test/helpers/fixtures";
import type { MintParams, PublicDrop } from "../../config/drop-config";
import { SEADROP_ADDRESS } from "../../config/drop-config";

/**
 * Read a newline-delimited list of checksum or lowercase addresses from a file.
 * Blank lines and lines starting with `#` are ignored. Addresses are returned
 * in their checksum form so merkle construction is deterministic.
 */
export function readAddressList(path: string): string[] {
  const absolute = resolve(process.cwd(), path);
  const raw = readFileSync(absolute, "utf8");
  const addresses: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (!/^0x[a-fA-F0-9]{40}$/.test(line)) {
      throw new Error(`invalid address on line: "${line}"`);
    }
    const addr = ethers.getAddress(line);
    if (seen.has(addr.toLowerCase())) {
      throw new Error(`duplicate address in list: ${addr}`);
    }
    seen.add(addr.toLowerCase());
    addresses.push(addr);
  }
  if (addresses.length === 0) throw new Error(`address list at ${absolute} is empty`);
  return addresses;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env var: ${name}`);
  return v;
}

export function parseUnixTimestamp(value: string, label: string): bigint {
  // Accept either unix seconds or ISO-8601.
  if (/^\d+$/.test(value)) return BigInt(value);
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new Error(`invalid timestamp for ${label}: "${value}"`);
  return BigInt(Math.floor(ms / 1000));
}

/**
 * Configure one allowlist stage on the token contract. All minters in
 * `addresses` will share the same `MintParams` (price, time window, stage
 * index, etc.).
 */
export async function configureAllowListStage(
  nftAddress: string,
  addresses: string[],
  params: MintParams,
  allowListURI = ""
) {
  const nft = await ethers.getContractAt("AgentNFT", nftAddress);
  const { root } = buildSeadropMerkle(addresses, params);

  console.log(`  addresses:      ${addresses.length}`);
  console.log(`  dropStageIndex: ${params.dropStageIndex}`);
  console.log(`  mintPrice:      ${ethers.formatEther(params.mintPrice)} ETH`);
  console.log(`  window:         ${params.startTime} → ${params.endTime}`);
  console.log(`  merkle root:    ${root}`);

  const allowListData = {
    merkleRoot: root,
    publicKeyURIs: [] as string[],
    allowListURI,
  };

  const tx = await nft.updateAllowList(SEADROP_ADDRESS, allowListData);
  const receipt = await tx.wait();
  console.log(`  ✓ updateAllowList tx: ${receipt?.hash}`);
  return { root, txHash: receipt?.hash };
}

export async function configurePublicStage(
  nftAddress: string,
  drop: PublicDrop
) {
  const nft = await ethers.getContractAt("AgentNFT", nftAddress);
  console.log(`  mintPrice:      ${ethers.formatEther(drop.mintPrice)} ETH`);
  console.log(`  window:         ${drop.startTime} → ${drop.endTime}`);
  console.log(`  feeBps:         ${drop.feeBps}`);
  const tx = await nft.updatePublicDrop(SEADROP_ADDRESS, drop);
  const receipt = await tx.wait();
  console.log(`  ✓ updatePublicDrop tx: ${receipt?.hash}`);
  return { txHash: receipt?.hash };
}
