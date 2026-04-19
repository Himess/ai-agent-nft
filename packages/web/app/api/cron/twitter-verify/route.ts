import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import {
  getLikersOfTweet,
  getRetweetersOfTweet,
} from "@/lib/twitter-api";

// Vercel Cron — every 10 minutes (see vercel.json).
//
// Walks the `task_completions` queue and promotes rows from 'pending' to
// 'verified' or 'rejected' using Twitter API v2 app-auth. Designed for the
// async verification UX: user clicks Verify → row inserted as pending →
// this worker picks it up within 10 min → status updates → UI reflects it.
//
// Conservative scope: the worker processes tweet-liker + tweet-retweeter
// tasks in bulk (one API call per tweet, not per user). Follow checks and
// QRT / reply checks require per-user OAuth tokens (PR 3 currently doesn't
// persist them) and are left for a follow-up.

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  // Vercel Cron adds an `x-vercel-cron` header. In development we allow
  // manual invocation via a shared CRON_SECRET.
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
  if (!process.env.TWITTER_BEARER_TOKEN) {
    return NextResponse.json({
      skipped: "twitter-bearer-not-configured",
    });
  }

  const sql = getSql();

  // Pull pending tweet-bound tasks. Grouped by tweet id so we hit the API
  // once per tweet rather than once per user.
  const pending = (await sql`
    SELECT tc.wallet, tc.task_id, t.kind, t.target_tweet_id, t.points, up.twitter_id
      FROM task_completions tc
      JOIN social_tasks    t  ON t.id = tc.task_id
      JOIN user_profiles   up ON up.wallet = tc.wallet
     WHERE tc.status = 'pending'
       AND t.active = TRUE
       AND t.kind IN ('like','rt')
       AND t.target_tweet_id IS NOT NULL
       AND up.twitter_id IS NOT NULL
     ORDER BY tc.queued_at ASC
     LIMIT 500
  `) as {
    wallet: string;
    task_id: number;
    kind: "like" | "rt";
    target_tweet_id: string;
    points: number;
    twitter_id: string;
  }[];

  // Group by (kind, tweet_id) so we fetch each batch once.
  const groups = new Map<
    string,
    { kind: "like" | "rt"; tweetId: string; rows: typeof pending }
  >();
  for (const row of pending) {
    const key = `${row.kind}:${row.target_tweet_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        kind: row.kind,
        tweetId: row.target_tweet_id,
        rows: [],
      });
    }
    groups.get(key)!.rows.push(row);
  }

  let verified = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const { kind, tweetId, rows } of groups.values()) {
    const res =
      kind === "like"
        ? await getLikersOfTweet(tweetId)
        : await getRetweetersOfTweet(tweetId);
    if (!res.ok) {
      errors.push(`${kind} ${tweetId}: ${res.reason}`);
      continue;
    }
    const engagedSet = new Set(res.data);

    for (const r of rows) {
      if (engagedSet.has(r.twitter_id)) {
        await sql`
          UPDATE task_completions
             SET status = 'verified',
                 points_awarded = ${r.points},
                 verified_at = NOW()
           WHERE wallet = ${r.wallet} AND task_id = ${r.task_id}
        `;
        await sql`
          UPDATE user_profiles
             SET total_task_points = total_task_points + ${r.points},
                 updated_at = NOW()
           WHERE wallet = ${r.wallet}
        `;
        verified++;
      }
      // Otherwise leave as pending — user may engage later. Tasks expire by
      // their end_at on social_tasks rather than being rejected in-queue.
    }
  }

  return NextResponse.json({
    groups: groups.size,
    pending: pending.length,
    verified,
    rejected,
    errors,
  });
}
