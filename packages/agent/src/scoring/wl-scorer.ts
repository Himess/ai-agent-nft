import type { WLApplicant, WLScore } from "./types.js";
import { scoreTwitter } from "./twitter-analyzer.js";
import { scoreOnChain } from "./onchain-analyzer.js";
import { scoreCommunity } from "./community-scorer.js";
import type { BonusSignals, ScoreResult } from "./types.js";

const BONUS_WEIGHT = 0.1;

/**
 * Score bonus signals (10% weight).
 */
function scoreBonus(bonus: BonusSignals): ScoreResult {
  let score = 0;

  if (bonus.kolReferral) score += 30;
  if (bonus.earlySupporterDays > 30) score += 25;
  else if (bonus.earlySupporterDays > 14) score += 15;
  else if (bonus.earlySupporterDays > 0) score += 8;

  score += Math.min(30, bonus.qualityProjectHoldings.length * 10);
  score += Math.min(15, bonus.otherWLCount * 5);

  return {
    category: "bonus",
    score: Math.min(100, Math.max(0, score)),
    weight: BONUS_WEIGHT,
    details: bonus.kolReferral ? "KOL referred" : "No referral",
  };
}

/**
 * Calculate weighted WL score for an applicant.
 * Twitter: 30%, On-chain: 35%, Community: 25%, Bonus: 10%
 */
export function calculateWLScore(applicant: WLApplicant): WLScore {
  const twitterScore = scoreTwitter(applicant.twitter);
  const onchainScore = scoreOnChain(applicant.onChain);
  const communityScore = scoreCommunity(applicant.community);
  const bonusScore = scoreBonus(applicant.bonus);

  const breakdown = [twitterScore, onchainScore, communityScore, bonusScore];

  // Weighted average
  const total = breakdown.reduce(
    (sum, s) => sum + s.score * s.weight,
    0
  );

  // Collect flags from all categories
  const flags: string[] = [];
  for (const s of breakdown) {
    if (s.details.startsWith("Flags:")) {
      flags.push(...s.details.replace("Flags: ", "").split(", "));
    }
  }

  return {
    total: Math.round(total),
    breakdown,
    flags,
  };
}
