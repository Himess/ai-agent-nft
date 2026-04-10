import type { CommunityProfile, ScoreResult } from "./types.js";

const WEIGHT = 0.25;

/**
 * Score community contribution (25% weight).
 */
export function scoreCommunity(profile: CommunityProfile): ScoreResult {
  let score = 0;

  // Engagement count: 0-35 points
  if (profile.engagementCount > 50) score += 35;
  else if (profile.engagementCount > 20) score += 28;
  else if (profile.engagementCount > 10) score += 20;
  else if (profile.engagementCount > 3) score += 12;
  else score += 3;

  // Constructive feedback: 0-30 points
  if (profile.constructiveFeedback > 10) score += 30;
  else if (profile.constructiveFeedback > 5) score += 22;
  else if (profile.constructiveFeedback > 2) score += 15;
  else if (profile.constructiveFeedback > 0) score += 8;

  // Community duration: 0-20 points
  if (profile.communityDuration > 30) score += 20;
  else if (profile.communityDuration > 14) score += 15;
  else if (profile.communityDuration > 7) score += 10;
  else score += 3;

  // Referrals: 0-15 points
  if (profile.referrals > 5) score += 15;
  else if (profile.referrals > 2) score += 10;
  else if (profile.referrals > 0) score += 5;

  return {
    category: "community",
    score: Math.min(100, Math.max(0, score)),
    weight: WEIGHT,
    details: `${profile.engagementCount} engagements, ${profile.constructiveFeedback} constructive`,
  };
}
