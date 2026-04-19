import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  getAgentRecentLikes,
  getAgentRecentRetweets,
} from "@/lib/twitter-api";

// Vercel Cron — hourly (see vercel.json).
//
// Polls the agent account's recent activity. For every like or retweet the
// agent performed on a user's tweet, look that user up in user_profiles by
// twitter_id. If matched, log a row in agent_engagements (unique on
// wallet+tweet+kind so we never double-count) and bump their
// total_agent_bonus.
//
// Bonus values:
//   agent liked a user's tweet     → +150
//   agent retweeted a user's tweet → +250
//   agent replied to a user        → +400  (left for later — Twitter's
//                                            reply-target lookup is a separate
//                                            endpoint; will add in follow-up)
//
// Cap: 3 bonuses per wallet per calendar month. Prevents the agent from
// funneling a single user to the top by liking them repeatedly.

export const runtime = "nodejs";
export const maxDuration = 60;

const LIKE_BONUS = 150;
const RT_BONUS = 250;
const MONTHLY_CAP = 3;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  if (req.headers.get("x-vercel-cron")) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const agentId = process.env.AGENT_TWITTER_ID?.trim();
  if (!agentId) {
    return NextResponse.json({
      skipped: "agent-twitter-id-not-configured",
    });
  }
  if (!process.env.TWITTER_BEARER_TOKEN) {
    return NextResponse.json({
      skipped: "twitter-bearer-not-configured",
    });
  }

  const sql = getSql();

  // Twitter lookups — bail early if either fails so we don't half-apply.
  const [likesRes, rtsRes] = await Promise.all([
    getAgentRecentLikes(agentId, 100),
    getAgentRecentRetweets(agentId, 100),
  ]);

  const engagements: {
    authorId: string;
    tweetId: string;
    kind: "liked" | "retweeted";
    bonus: number;
  }[] = [];

  if (likesRes.ok) {
    for (const t of likesRes.data) {
      if (!t.author_id || t.author_id === agentId) continue;
      engagements.push({
        authorId: t.author_id,
        tweetId: t.id,
        kind: "liked",
        bonus: LIKE_BONUS,
      });
    }
  }
  if (rtsRes.ok) {
    for (const r of rtsRes.data) {
      if (r.referencedAuthorId === agentId) continue;
      engagements.push({
        authorId: r.referencedAuthorId,
        tweetId: r.tweetId,
        kind: "retweeted",
        bonus: RT_BONUS,
      });
    }
  }

  if (engagements.length === 0) {
    return NextResponse.json({
      likes: likesRes.ok ? likesRes.data.length : `err:${likesRes.reason}`,
      retweets: rtsRes.ok ? rtsRes.data.length : `err:${rtsRes.reason}`,
      matched: 0,
      awarded: 0,
    });
  }

  // Resolve author_id → wallet. Single IN query.
  const uniqueAuthors = Array.from(new Set(engagements.map((e) => e.authorId)));
  const walletRows = (await sql`
    SELECT wallet, twitter_id FROM user_profiles
     WHERE twitter_id = ANY(${uniqueAuthors})
  `) as { wallet: string; twitter_id: string }[];
  const walletByTwitter = new Map(
    walletRows.map((r) => [r.twitter_id, r.wallet])
  );

  let awarded = 0;
  let skippedCap = 0;
  let duplicate = 0;

  for (const e of engagements) {
    const wallet = walletByTwitter.get(e.authorId);
    if (!wallet) continue;

    // Enforce monthly cap.
    const countRow = (await sql`
      SELECT COUNT(*)::int AS n
        FROM agent_engagements
       WHERE wallet = ${wallet}
         AND seen_at >= NOW() - INTERVAL '30 days'
    `) as { n: number }[];
    if (countRow[0]?.n >= MONTHLY_CAP) {
      skippedCap++;
      continue;
    }

    // Insert; unique constraint catches duplicates silently.
    const ins = (await sql`
      INSERT INTO agent_engagements (wallet, user_tweet_id, kind, bonus_points)
      VALUES (${wallet}, ${e.tweetId}, ${e.kind}, ${e.bonus})
      ON CONFLICT (wallet, user_tweet_id, kind) DO NOTHING
      RETURNING id
    `) as { id: number }[];
    if (ins.length === 0) {
      duplicate++;
      continue;
    }

    await sql`
      UPDATE user_profiles
         SET total_agent_bonus = total_agent_bonus + ${e.bonus},
             updated_at = NOW()
       WHERE wallet = ${wallet}
    `;
    awarded++;
  }

  return NextResponse.json({
    likes: likesRes.ok ? likesRes.data.length : `err:${likesRes.reason}`,
    retweets: rtsRes.ok ? rtsRes.data.length : `err:${rtsRes.reason}`,
    matched: engagements.filter((e) => walletByTwitter.has(e.authorId)).length,
    awarded,
    duplicate,
    skippedCap,
  });
}
