import { ethers } from "hardhat";

export const MINT_PRICE = ethers.parseEther("0.01");
export const ROYALTY_BPS = 500n; // 5%
export const MAX_SUPPLY = 888n;
export const VAULT_ALLOCATION = 88n;
export const WL_ALLOCATION = 500n;
export const FCFS_ALLOCATION = 250n;
export const TEAM_ALLOCATION = 50n;
export const RESERVED_ALLOCATION = VAULT_ALLOCATION + TEAM_ALLOCATION; // 138

export enum Phase {
  Closed = 0,
  Whitelist = 1,
  Public = 2,
}

export async function deployAgentNFT() {
  const [owner, founder1, founder2, user1, user2, user3] =
    await ethers.getSigners();

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const nft = await AgentNFT.deploy(
    "SURVIVORS",
    "SVVR",
    MINT_PRICE,
    ROYALTY_BPS
  );
  await nft.waitForDeployment();

  return { nft, owner, founder1, founder2, user1, user2, user3 };
}

/// Build a merkle tree compatible with OpenZeppelin's MerkleProof.verify:
/// leaves hashed via keccak256(abi.encodePacked(address)), pairs sorted then hashed.
export function buildMerkle(addresses: string[]) {
  const leaves = addresses.map((a) =>
    ethers.solidityPackedKeccak256(["address"], [a])
  );

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

  function proofFor(addr: string): string[] {
    const leaf = ethers.solidityPackedKeccak256(["address"], [addr]);
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

  return { root, proofFor };
}
