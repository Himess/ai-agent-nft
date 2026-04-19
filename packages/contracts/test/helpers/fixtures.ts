import { ethers } from "hardhat";
import type { MintParams } from "../../config/drop-config";

export const MINT_PRICE = ethers.parseEther("0.01");
export const ROYALTY_BPS = 500n; // 5%
export const MAX_SUPPLY = 1111n;
export const RESERVED_ALLOCATION = 100n;

// Canonical cross-chain SeaDrop address (mainnet + Sepolia).
export const SEADROP_PLACEHOLDER =
  "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

export async function deployAgentNFT() {
  const [owner, founder1, founder2, user1, user2, user3] =
    await ethers.getSigners();

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy("SURVIVORS", "SVVR", [SEADROP_PLACEHOLDER]);
  await nft.waitForDeployment();
  await nft.setMaxSupply(MAX_SUPPLY);

  return { nft, owner, founder1, founder2, user1, user2, user3 };
}

// ─── SeaDrop-compatible Merkle helpers ───────────────────────────
//
// SeaDrop verifies allowlist proofs with:
//   leaf = keccak256(abi.encode(address minter, MintParams mintParams))
//   root = OZ MerkleProof (sorted-pair concat + keccak256)
//
// The entire `MintParams` struct (8 fields) is baked into every leaf, so a
// change to any field (price, time window, dropStageIndex, feeBps, …) yields
// a completely different tree.

const MINT_PARAMS_TUPLE =
  "tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)";

export function encodeMintParams(params: MintParams): unknown[] {
  return [
    params.mintPrice,
    params.maxTotalMintableByWallet,
    params.startTime,
    params.endTime,
    params.dropStageIndex,
    params.maxTokenSupplyForStage,
    params.feeBps,
    params.restrictFeeRecipients,
  ];
}

export function leafFor(minter: string, params: MintParams): string {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = coder.encode(
    ["address", MINT_PARAMS_TUPLE],
    [minter, encodeMintParams(params)]
  );
  return ethers.keccak256(encoded);
}

/**
 * Build a Seadrop-compatible merkle tree for a list of allowlist addresses,
 * all sharing the same `MintParams`. Returns the root and a proof generator.
 */
export function buildSeadropMerkle(addresses: string[], params: MintParams) {
  const leaves = addresses.map((a) => leafFor(a, params));

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
  const root = layers.length === 0 ? ethers.ZeroHash : layers[layers.length - 1][0];

  function proofFor(addr: string): string[] {
    const leaf = leafFor(addr, params);
    let idx = leaves.indexOf(leaf);
    if (idx === -1) throw new Error(`address ${addr} not in tree`);
    const proof: string[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const layer = layers[l];
      const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (pairIdx < layer.length) proof.push(layer[pairIdx]);
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  return { root, proofFor, leaves };
}
