import { ethers } from "ethers";

// ─── Canonical SeaDrop addresses (mainnet + Sepolia share the same deterministic deployment) ──
export const SEADROP_ADDRESS = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

// OpenSea's fee recipient — must be explicitly allowlisted via
// `updateAllowedFeeRecipient` before any live mint can succeed with
// `restrictFeeRecipients = true`.
export const OS_FEE_RECIPIENT = "0x0000a26b00c1F0DF003000390027140000fAa719";

// ─── Mint economics ──────────────────────────────────────────────
// Team vault is free, owner-minted via `reservedMint` (88 tokens).
// Everyone else pays through SeaDrop at these prices.
export const GTD_PRICE = ethers.parseEther("0.0035");
export const FCFS_PRICE = ethers.parseEther("0.0045");
export const PUBLIC_PRICE = ethers.parseEther("0.005");

// OpenSea takes 10% of every SeaDrop mint. feeBps is out of 10_000.
export const FEE_BPS = 1000;

// 1 per wallet per stage (GTD + FCFS share the same per-wallet counter because
// SeaDrop's `maxTotalMintableByWallet` is a global counter on the token contract,
// not per-stage — a wallet on both lists would be allowed at most 1 total here.)
export const MAX_PER_WALLET = 1;

// ─── Supply per stage ────────────────────────────────────────────
// Not strictly enforced on-chain per stage (only MAX_SUPPLY=888 is), but
// useful as upper bounds in stage configs via `maxTokenSupplyForStage`
// and for the off-chain allowlist merge/validation step.
export const MAX_SUPPLY = 888;

// ─── Allocation caps per WL source ───────────────────────────────
// Hard limits enforced in `scripts/build-allowlists.ts` when the per-source
// lists are merged into the final GTD + FCFS merkle trees. If any source
// file exceeds its cap, the merge script refuses to run.
//
// Totals (2026-04-18 plan):
//   GTD  — team 88 + quiz 100 + app 200 + social 100 + collab 100 + yan 100 + agent 50 = 738
//   FCFS —              quiz 100                     + social 100 + collab 100         + agent 50 = 350
export const ALLOCATION_CAPS = {
  team:   { gtd: 88,  fcfs: 0 },   // reservedMint (owner-only)
  quiz:   { gtd: 100, fcfs: 100 }, // agent-scored quiz on the site
  app:    { gtd: 200, fcfs: 0 },   // agent-scored /apply submissions
  social: { gtd: 100, fcfs: 100 }, // site leaderboard (top N → GTD, raffle → FCFS)
  collab: { gtd: 100, fcfs: 100 }, // partner collections / community deals
  yan:    { gtd: 100, fcfs: 0 },   // team-held alt wallets (not revealed on-chain)
  agent:  { gtd: 50,  fcfs: 50 },  // agent-run Twitter giveaway (curation + raffle)
} as const;

export const TOTAL_GTD = Object.values(ALLOCATION_CAPS).reduce((a, c) => a + c.gtd, 0);
export const TOTAL_FCFS = Object.values(ALLOCATION_CAPS).reduce((a, c) => a + c.fcfs, 0);

// ─── Stage indices (non-zero for allowlist stages per SeaDrop) ───
export const GTD_STAGE_INDEX = 1;
export const FCFS_STAGE_INDEX = 2;

// ─── Restrict fee recipients ────────────────────────────────────
// SeaDrop requires this be true for signed mints; strongly recommended for
// allowlists too, so the 10% OS fee always goes to the right place.
export const RESTRICT_FEE_RECIPIENTS = true;

// ─── MintParams struct type (matches SeaDropStructs.sol) ─────────
export interface MintParams {
  mintPrice: bigint;
  maxTotalMintableByWallet: bigint;
  startTime: bigint;
  endTime: bigint;
  dropStageIndex: bigint; // non-zero
  maxTokenSupplyForStage: bigint;
  feeBps: bigint;
  restrictFeeRecipients: boolean;
}

// ─── Pre-built MintParams for each presale stage ─────────────────
// Times default to "wide open". Callers (deploy / config scripts) should
// override startTime + endTime once the final mint schedule is locked.
export function gtdMintParams(opts: { startTime: bigint; endTime: bigint }): MintParams {
  return {
    mintPrice: GTD_PRICE,
    maxTotalMintableByWallet: BigInt(MAX_PER_WALLET),
    startTime: opts.startTime,
    endTime: opts.endTime,
    dropStageIndex: BigInt(GTD_STAGE_INDEX),
    maxTokenSupplyForStage: BigInt(MAX_SUPPLY),
    feeBps: BigInt(FEE_BPS),
    restrictFeeRecipients: RESTRICT_FEE_RECIPIENTS,
  };
}

export function fcfsMintParams(opts: { startTime: bigint; endTime: bigint }): MintParams {
  return {
    mintPrice: FCFS_PRICE,
    maxTotalMintableByWallet: BigInt(MAX_PER_WALLET),
    startTime: opts.startTime,
    endTime: opts.endTime,
    dropStageIndex: BigInt(FCFS_STAGE_INDEX),
    maxTokenSupplyForStage: BigInt(MAX_SUPPLY),
    feeBps: BigInt(FEE_BPS),
    restrictFeeRecipients: RESTRICT_FEE_RECIPIENTS,
  };
}

// ─── PublicDrop struct type (matches SeaDropStructs.sol) ─────────
// Note: SeaDrop packs these into tighter uint types (uint80, uint48, uint16).
// The actual solidity struct is:
//   struct PublicDrop {
//     uint80 mintPrice;
//     uint48 startTime;
//     uint48 endTime;
//     uint16 maxTotalMintableByWallet;
//     uint16 feeBps;
//     bool   restrictFeeRecipients;
//   }
export interface PublicDrop {
  mintPrice: bigint;
  startTime: bigint;
  endTime: bigint;
  maxTotalMintableByWallet: bigint;
  feeBps: bigint;
  restrictFeeRecipients: boolean;
}

export function publicDrop(opts: { startTime: bigint; endTime: bigint }): PublicDrop {
  return {
    mintPrice: PUBLIC_PRICE,
    startTime: opts.startTime,
    endTime: opts.endTime,
    maxTotalMintableByWallet: BigInt(MAX_PER_WALLET),
    feeBps: BigInt(FEE_BPS),
    restrictFeeRecipients: RESTRICT_FEE_RECIPIENTS,
  };
}
