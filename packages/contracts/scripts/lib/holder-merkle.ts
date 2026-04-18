import { ethers } from "ethers";

export interface HolderEntry {
  holder: string;
  amount: bigint;
}

export function holderLeaf(holder: string, amount: bigint): string {
  return ethers.solidityPackedKeccak256(
    ["address", "uint256"],
    [holder, amount]
  );
}

/**
 * Build a merkle tree for HolderReward (leaf = keccak256(addr, amount),
 * sorted-pair OZ-compatible internal hashing).
 */
export function buildHolderMerkle(entries: HolderEntry[]) {
  if (entries.length === 0) throw new Error("no entries");
  const leaves = entries.map((e) => holderLeaf(e.holder, e.amount));

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
    const leaf = holderLeaf(holder, amount);
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
