import { describe, it, expect } from "vitest";
import { scoreTwitter } from "../src/scoring/twitter-analyzer.js";
import { scoreOnChain } from "../src/scoring/onchain-analyzer.js";
import { scoreCommunity } from "../src/scoring/community-scorer.js";
import { calculateWLScore } from "../src/scoring/wl-scorer.js";
import type { WLApplicant } from "../src/scoring/types.js";

// ─── Twitter Analyzer ──────────────────────────────────────────────

describe("Twitter Analyzer", () => {
  it("should score a strong profile highly", () => {
    const result = scoreTwitter({
      username: "whale_holder",
      accountAge: 500,
      followers: 5000,
      following: 1000,
      tweetCount: 3000,
      engagementRate: 0.06,
      isVerified: true,
      bio: "NFT collector",
      recentMentions: 15,
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.weight).toBe(0.3);
    expect(result.category).toBe("twitter");
  });

  it("should score a weak/new profile low", () => {
    const result = scoreTwitter({
      username: "new_user",
      accountAge: 5,
      followers: 10,
      following: 500,
      tweetCount: 200,
      engagementRate: 0.002,
      isVerified: false,
      bio: "",
      recentMentions: 0,
    });

    expect(result.score).toBeLessThan(30);
  });

  it("should flag bot patterns", () => {
    const result = scoreTwitter({
      username: "bot_account",
      accountAge: 3,
      followers: 50,
      following: 100,
      tweetCount: 500, // 500 tweets in 3 days
      engagementRate: 0.001,
      isVerified: false,
      bio: "",
      recentMentions: 0,
    });

    expect(result.details).toContain("bot_pattern");
    expect(result.score).toBeLessThan(20);
  });

  it("should flag fake followers", () => {
    const result = scoreTwitter({
      username: "fake_influence",
      accountAge: 200,
      followers: 50000,
      following: 100,
      tweetCount: 1000,
      engagementRate: 0.001,
      isVerified: false,
      bio: "",
      recentMentions: 0,
    });

    expect(result.details).toContain("fake_followers_suspected");
  });
});

// ─── On-Chain Analyzer ─────────────────────────────────────────────

describe("On-Chain Analyzer", () => {
  it("should score diamond hands wallet highly", () => {
    const result = scoreOnChain({
      address: "0x1234",
      walletAge: 730,
      totalTx: 1000,
      nftHoldings: 20,
      avgHoldDuration: 120,
      defiActivity: 100,
      ethBalance: 15,
      isContract: false,
    });

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.weight).toBe(0.35);
  });

  it("should penalize contract addresses", () => {
    const result = scoreOnChain({
      address: "0xcontract",
      walletAge: 365,
      totalTx: 500,
      nftHoldings: 10,
      avgHoldDuration: 60,
      defiActivity: 50,
      ethBalance: 5,
      isContract: true,
    });

    expect(result.details).toContain("contract_address");
    expect(result.score).toBeLessThan(60);
  });

  it("should flag flipper pattern", () => {
    const result = scoreOnChain({
      address: "0xflipper",
      walletAge: 200,
      totalTx: 300,
      nftHoldings: 50,
      avgHoldDuration: 2, // sells within 2 days
      defiActivity: 10,
      ethBalance: 1,
      isContract: false,
    });

    expect(result.details).toContain("flipper_pattern");
  });
});

// ─── Community Scorer ──────────────────────────────────────────────

describe("Community Scorer", () => {
  it("should score active community member highly", () => {
    const result = scoreCommunity({
      engagementCount: 60,
      constructiveFeedback: 12,
      communityDuration: 45,
      referrals: 3,
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.weight).toBe(0.25);
  });

  it("should score lurker low", () => {
    const result = scoreCommunity({
      engagementCount: 1,
      constructiveFeedback: 0,
      communityDuration: 2,
      referrals: 0,
    });

    expect(result.score).toBeLessThan(25);
  });
});

// ─── WL Scorer (Integration) ──────────────────────────────────────

describe("WL Scorer", () => {
  const strongApplicant: WLApplicant = {
    twitter: {
      username: "strong_holder",
      accountAge: 400,
      followers: 3000,
      following: 800,
      tweetCount: 2000,
      engagementRate: 0.04,
      isVerified: false,
      bio: "NFT enthusiast",
      recentMentions: 8,
    },
    onChain: {
      address: "0xstrong",
      walletAge: 500,
      totalTx: 600,
      nftHoldings: 15,
      avgHoldDuration: 90,
      defiActivity: 30,
      ethBalance: 5,
      isContract: false,
    },
    community: {
      engagementCount: 30,
      constructiveFeedback: 8,
      communityDuration: 25,
      referrals: 2,
    },
    bonus: {
      kolReferral: false,
      earlySupporterDays: 20,
      qualityProjectHoldings: ["BAYC", "Azuki"],
      otherWLCount: 3,
    },
  };

  const weakApplicant: WLApplicant = {
    twitter: {
      username: "bot_farmer",
      accountAge: 5,
      followers: 20,
      following: 2000,
      tweetCount: 300,
      engagementRate: 0.001,
      isVerified: false,
      bio: "",
      recentMentions: 0,
    },
    onChain: {
      address: "0xweak",
      walletAge: 10,
      totalTx: 5,
      nftHoldings: 0,
      avgHoldDuration: 0,
      defiActivity: 0,
      ethBalance: 0.01,
      isContract: false,
    },
    community: {
      engagementCount: 0,
      constructiveFeedback: 0,
      communityDuration: 1,
      referrals: 0,
    },
    bonus: {
      kolReferral: false,
      earlySupporterDays: 0,
      qualityProjectHoldings: [],
      otherWLCount: 0,
    },
  };

  it("should give strong applicant a high score (>= 60)", () => {
    const score = calculateWLScore(strongApplicant);

    expect(score.total).toBeGreaterThanOrEqual(60);
    expect(score.breakdown).toHaveLength(4);
    expect(score.breakdown[0].category).toBe("twitter");
    expect(score.breakdown[1].category).toBe("onchain");
    expect(score.breakdown[2].category).toBe("community");
    expect(score.breakdown[3].category).toBe("bonus");
  });

  it("should give weak applicant a low score (< 30)", () => {
    const score = calculateWLScore(weakApplicant);

    expect(score.total).toBeLessThan(30);
    expect(score.flags.length).toBeGreaterThan(0);
  });

  it("should have weights summing to 1.0", () => {
    const score = calculateWLScore(strongApplicant);
    const totalWeight = score.breakdown.reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });

  it("should detect bot flags in weak applicant", () => {
    const score = calculateWLScore(weakApplicant);
    expect(score.flags).toContain("bot_pattern");
  });
});
