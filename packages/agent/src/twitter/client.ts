import { TwitterApi } from "twitter-api-v2";
import { getConfig } from "../config.js";
import { getLogger } from "../utils/logger.js";
import { RateLimiter } from "../utils/rate-limiter.js";

let _client: TwitterApi | null = null;

// Twitter rate limits: 50 tweets/24h on Basic plan
const tweetLimiter = new RateLimiter(50, 24 * 60 * 60 * 1000);
// DM rate limit: 100/24h
const dmLimiter = new RateLimiter(100, 24 * 60 * 60 * 1000);

export function getTwitterClient(): TwitterApi {
  if (_client) return _client;

  const config = getConfig();
  _client = new TwitterApi({
    appKey: config.TWITTER_API_KEY,
    appSecret: config.TWITTER_API_SECRET,
    accessToken: config.TWITTER_ACCESS_TOKEN,
    accessSecret: config.TWITTER_ACCESS_SECRET,
  });

  return _client;
}

/**
 * Post a tweet with rate limiting.
 */
export async function postTweet(text: string): Promise<string> {
  const log = getLogger();
  await tweetLimiter.acquire();

  const client = getTwitterClient();
  const result = await client.v2.tweet(text);

  log.info({ tweetId: result.data.id }, "Tweet posted");
  return result.data.id;
}

/**
 * Reply to a tweet.
 */
export async function replyToTweet(
  text: string,
  replyToId: string
): Promise<string> {
  const log = getLogger();
  await tweetLimiter.acquire();

  const client = getTwitterClient();
  const result = await client.v2.reply(text, replyToId);

  log.info({ tweetId: result.data.id, replyTo: replyToId }, "Reply posted");
  return result.data.id;
}

/**
 * Send a DM to a user.
 */
export async function sendDM(
  userId: string,
  text: string
): Promise<void> {
  const log = getLogger();
  await dmLimiter.acquire();

  const client = getTwitterClient();
  await client.v2.sendDmInConversation(userId, { text });

  log.info({ userId }, "DM sent");
}

/**
 * Get recent mentions of the agent.
 */
export async function getMentions(sinceId?: string) {
  const client = getTwitterClient();
  const me = await client.v2.me();

  const params: Record<string, string> = {
    "tweet.fields": "created_at,author_id,conversation_id",
    max_results: "20",
  };
  if (sinceId) params.since_id = sinceId;

  return client.v2.userMentionTimeline(me.data.id, params);
}

/**
 * Look up a user's public metrics.
 */
export async function getUserMetrics(username: string) {
  const client = getTwitterClient();
  const user = await client.v2.userByUsername(username, {
    "user.fields": "public_metrics,created_at,description,verified",
  });
  return user.data;
}

/**
 * Search recent tweets mentioning a keyword.
 */
export async function searchTweets(query: string, maxResults = 10) {
  const client = getTwitterClient();
  return client.v2.search(query, {
    "tweet.fields": "created_at,author_id,public_metrics",
    max_results: maxResults,
  });
}
