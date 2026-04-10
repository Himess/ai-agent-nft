import type { OnChainProfile, ScoreResult } from "./types.js";

const WEIGHT = 0.35;

/**
 * Analyze on-chain wallet data for WL scoring (35% weight).
 */
export function scoreOnChain(profile: OnChainProfile): ScoreResult {
  let score = 0;
  const flags: string[] = [];

  // Wallet age: 0-25 points
  if (profile.walletAge > 365) score += 25;
  else if (profile.walletAge > 180) score += 20;
  else if (profile.walletAge > 90) score += 15;
  else if (profile.walletAge > 30) score += 8;
  else flags.push("new_wallet");

  // TX history: 0-20 points
  if (profile.totalTx > 500) score += 20;
  else if (profile.totalTx > 100) score += 15;
  else if (profile.totalTx > 20) score += 10;
  else score += 3;

  // NFT holding behavior: 0-25 points
  if (profile.avgHoldDuration > 90) score += 25; // Diamond hands
  else if (profile.avgHoldDuration > 30) score += 20;
  else if (profile.avgHoldDuration > 7) score += 10;
  else if (profile.nftHoldings > 0) {
    score += 3;
    flags.push("flipper_pattern");
  }

  // DeFi activity: 0-15 points
  if (profile.defiActivity > 50) score += 15;
  else if (profile.defiActivity > 10) score += 10;
  else if (profile.defiActivity > 0) score += 5;

  // ETH balance: 0-15 points
  if (profile.ethBalance > 10) score += 15;
  else if (profile.ethBalance > 1) score += 10;
  else if (profile.ethBalance > 0.1) score += 5;

  // Contract addresses are likely bots
  if (profile.isContract) {
    flags.push("contract_address");
    score = Math.max(0, score - 40);
  }

  // Suspiciously new + high activity
  if (profile.walletAge < 7 && profile.totalTx > 50) {
    flags.push("suspicious_new_wallet");
    score = Math.max(0, score - 25);
  }

  return {
    category: "onchain",
    score: Math.min(100, Math.max(0, score)),
    weight: WEIGHT,
    details: flags.length > 0 ? `Flags: ${flags.join(", ")}` : "Clean wallet",
  };
}
