import type { TwitterProfile, ScoreResult } from "./types.js";

const WEIGHT = 0.3;

/**
 * Analyze Twitter/X profile for WL scoring (30% weight).
 */
export function scoreTwitter(profile: TwitterProfile): ScoreResult {
  let score = 0;
  const flags: string[] = [];

  // Account age: 0-25 points
  if (profile.accountAge > 365) score += 25;
  else if (profile.accountAge > 180) score += 20;
  else if (profile.accountAge > 90) score += 15;
  else if (profile.accountAge > 30) score += 8;
  else flags.push("new_account");

  // Organic engagement: 0-30 points
  if (profile.engagementRate > 0.05) score += 30;
  else if (profile.engagementRate > 0.03) score += 25;
  else if (profile.engagementRate > 0.01) score += 15;
  else score += 5;

  // Follower quality (ratio check): 0-20 points
  const ratio = profile.followers / Math.max(profile.following, 1);
  if (ratio > 2) score += 20;
  else if (ratio > 1) score += 15;
  else if (ratio > 0.5) score += 10;
  else score += 3;

  // Project interaction: 0-25 points
  if (profile.recentMentions > 10) score += 25;
  else if (profile.recentMentions > 5) score += 20;
  else if (profile.recentMentions > 2) score += 15;
  else if (profile.recentMentions > 0) score += 8;

  // Suspicious patterns
  if (profile.followers > 10000 && profile.engagementRate < 0.005) {
    flags.push("fake_followers_suspected");
    score = Math.max(0, score - 20);
  }
  if (profile.accountAge < 7 && profile.tweetCount > 100) {
    flags.push("bot_pattern");
    score = Math.max(0, score - 30);
  }

  return {
    category: "twitter",
    score: Math.min(100, Math.max(0, score)),
    weight: WEIGHT,
    details: flags.length > 0 ? `Flags: ${flags.join(", ")}` : "Clean profile",
  };
}
