import { generateTweet } from "../../ai/decision-engine.js";
import { postTweet } from "../../twitter/client.js";
import { saveTweet, getTweetCount } from "../../storage/database.js";
import { TWEET_TOPICS, type TweetTopic } from "../../ai/prompts/tweet.js";
import { getLogger } from "../../utils/logger.js";

const MAX_TWEETS_PER_DAY = 40;

/**
 * Scheduled task: Generate and post a tweet.
 * Runs every ~36 minutes (40 tweets/day).
 */
export async function tweetTask(): Promise<void> {
  const log = getLogger();

  // Check daily limit
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = getTweetCount(today);

  if (todayCount >= MAX_TWEETS_PER_DAY) {
    log.info({ todayCount }, "Daily tweet limit reached, skipping");
    return;
  }

  // Pick a random topic
  const topic = TWEET_TOPICS[Math.floor(Math.random() * TWEET_TOPICS.length)] as TweetTopic;

  try {
    const content = await generateTweet(topic);
    const tweetId = await postTweet(content);
    saveTweet(tweetId, content, topic);

    log.info({ tweetId, topic, count: todayCount + 1 }, "Tweet task completed");
  } catch (err) {
    log.error({ err, topic }, "Tweet task failed");
  }
}
