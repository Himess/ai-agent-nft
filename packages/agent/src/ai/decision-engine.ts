import { ask, askJSON } from "./claude-client.js";
import { TWEET_SYSTEM_PROMPT, TWEET_TOPICS, type TweetTopic } from "./prompts/tweet.js";
import { WL_SYSTEM_PROMPT } from "./prompts/wl-analysis.js";
import { COLLAB_EVAL_SYSTEM_PROMPT } from "./prompts/outreach.js";
import { REPLY_SYSTEM_PROMPT, DM_SYSTEM_PROMPT } from "./prompts/content.js";
import { calculateWLScore } from "../scoring/wl-scorer.js";
import type { WLApplicant, WLScore } from "../scoring/types.js";
import { getLogger } from "../utils/logger.js";

// ─── Types ───────────────────────────────────────────────────────

export interface WLDecision {
  decision: "APPROVE" | "REJECT" | "REVIEW";
  confidence: number;
  reasoning: string;
  flags: string[];
  score: WLScore;
}

export interface CollabEval {
  collabScore: number;
  recommendation: "PURSUE" | "SKIP" | "WATCH";
  reasoning: string;
  proposedCollabType: string;
  estimatedValue: string;
}

// ─── Tweet Generation ────────────────────────────────────────────

export async function generateTweet(
  topic?: TweetTopic,
  context?: string
): Promise<string> {
  const log = getLogger();
  const selectedTopic = topic ?? TWEET_TOPICS[Math.floor(Math.random() * TWEET_TOPICS.length)];

  const userMessage = context
    ? `Write a tweet about: ${selectedTopic}\n\nContext: ${context}`
    : `Write a tweet about: ${selectedTopic}`;

  const response = await ask("tweet", TWEET_SYSTEM_PROMPT, userMessage);

  // Strip quotes if Claude wrapped it
  let tweet = response.content.trim();
  if (tweet.startsWith('"') && tweet.endsWith('"')) {
    tweet = tweet.slice(1, -1);
  }

  // Enforce 280 char limit
  if (tweet.length > 280) {
    tweet = tweet.slice(0, 277) + "...";
  }

  log.info({ topic: selectedTopic, length: tweet.length }, "Tweet generated");
  return tweet;
}

// ─── Reply Generation ────────────────────────────────────────────

export async function generateReply(
  originalTweet: string,
  authorUsername: string
): Promise<string> {
  const userMessage = `Reply to this tweet from @${authorUsername}:\n\n"${originalTweet}"`;
  const response = await ask("reply", REPLY_SYSTEM_PROMPT, userMessage);

  let reply = response.content.trim();
  if (reply.startsWith('"') && reply.endsWith('"')) {
    reply = reply.slice(1, -1);
  }
  if (reply.length > 280) {
    reply = reply.slice(0, 277) + "...";
  }

  return reply;
}

// ─── DM Response ─────────────────────────────────────────────────

export async function generateDMResponse(
  message: string,
  senderUsername: string
): Promise<string> {
  const userMessage = `Respond to this DM from @${senderUsername}:\n\n"${message}"`;
  const response = await ask("dm", DM_SYSTEM_PROMPT, userMessage);
  return response.content.trim();
}

// ─── WL Decision ─────────────────────────────────────────────────

export async function makeWLDecision(
  applicant: WLApplicant
): Promise<WLDecision> {
  const log = getLogger();

  // Step 1: Calculate data-driven score
  const score = calculateWLScore(applicant);

  // Step 2: Send score to AI for final decision
  const userMessage = `Evaluate this WL applicant:

Twitter Score: ${score.breakdown[0].score}/100 (weight: 30%)
On-Chain Score: ${score.breakdown[1].score}/100 (weight: 35%)
Community Score: ${score.breakdown[2].score}/100 (weight: 25%)
Bonus Score: ${score.breakdown[3].score}/100 (weight: 10%)
Total Weighted Score: ${score.total}/100

Flags: ${score.flags.length > 0 ? score.flags.join(", ") : "None"}

Twitter Details:
- Username: @${applicant.twitter.username}
- Account age: ${applicant.twitter.accountAge} days
- Followers: ${applicant.twitter.followers}
- Engagement rate: ${(applicant.twitter.engagementRate * 100).toFixed(2)}%
- Project mentions: ${applicant.twitter.recentMentions}

On-Chain Details:
- Wallet age: ${applicant.onChain.walletAge} days
- Total TX: ${applicant.onChain.totalTx}
- NFT holdings: ${applicant.onChain.nftHoldings}
- Avg hold duration: ${applicant.onChain.avgHoldDuration} days
- ETH balance: ${applicant.onChain.ethBalance}

Make your decision.`;

  const aiDecision = await askJSON<{
    decision: "APPROVE" | "REJECT" | "REVIEW";
    confidence: number;
    reasoning: string;
    flags: string[];
  }>("wl_decision", WL_SYSTEM_PROMPT, userMessage);

  const result: WLDecision = {
    ...aiDecision,
    score,
  };

  log.info(
    {
      username: applicant.twitter.username,
      decision: result.decision,
      confidence: result.confidence,
      total: score.total,
    },
    "WL decision made"
  );

  return result;
}

// ─── Collab Evaluation ───────────────────────────────────────────

export async function evaluateCollab(projectData: {
  name: string;
  followers: number;
  engagement: number;
  onChainActivity: number;
  communitySize: number;
  description: string;
}): Promise<CollabEval> {
  const userMessage = `Evaluate this project for collaboration:

Project: ${projectData.name}
Followers: ${projectData.followers}
Engagement rate: ${projectData.engagement}%
On-chain activity score: ${projectData.onChainActivity}/100
Community size: ${projectData.communitySize}
Description: ${projectData.description}`;

  return askJSON<CollabEval>(
    "collab_eval",
    COLLAB_EVAL_SYSTEM_PROMPT,
    userMessage
  );
}
