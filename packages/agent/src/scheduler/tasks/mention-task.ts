import { getMentions, replyToTweet } from "../../twitter/client.js";
import { generateReply } from "../../ai/decision-engine.js";
import { getLastMentionId, saveMention, markMentionReplied } from "../../storage/database.js";
import { getLogger } from "../../utils/logger.js";

/**
 * Scheduled task: Check and reply to mentions.
 * Runs every 5 minutes.
 */
export async function mentionTask(): Promise<void> {
  const log = getLogger();

  try {
    const sinceId = getLastMentionId();
    const mentions = await getMentions(sinceId);

    if (!mentions.data?.data?.length) {
      log.debug("No new mentions");
      return;
    }

    for (const mention of mentions.data.data) {
      // Save mention
      saveMention(
        mention.id,
        mention.author_id ?? "unknown",
        mention.text
      );

      // Generate and post reply
      try {
        const reply = await generateReply(mention.text, mention.author_id ?? "user");
        await replyToTweet(reply, mention.id);
        markMentionReplied(mention.id);

        log.info({ mentionId: mention.id }, "Replied to mention");
      } catch (err) {
        log.error({ err, mentionId: mention.id }, "Failed to reply to mention");
      }
    }
  } catch (err) {
    log.error({ err }, "Mention task failed");
  }
}
