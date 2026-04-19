import { Pool } from "@neondatabase/serverless";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Seed the initial social-task catalog. Run with `npm run seed:tasks`.
//
// Tasks land in DB disabled by default — launch-day operator flips them on by
// setting the active flag and filling in real tweet ids. Before that we can
// test the flow end-to-end with placeholder rows.

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "..", ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found. Did you run `vercel env pull`?");
  process.exit(1);
}

interface TaskSeed {
  slug: string;
  kind: "follow" | "like" | "rt" | "qrt" | "reply" | "streak" | "referral";
  target_tweet_id?: string;
  target_handle?: string;
  title: string;
  description?: string;
  points: number;
  active: boolean;
}

const TASKS: TaskSeed[] = [
  {
    slug: "follow-theseventh",
    kind: "follow",
    target_handle: "TheSeventh_xyz",
    title: "Follow @TheSeventh_xyz on X",
    description: "The gate. Required before any other task counts.",
    points: 100,
    active: true,
  },
  {
    slug: "like-pinned",
    kind: "like",
    target_tweet_id: "PLACEHOLDER_PIN_TWEET_ID",
    title: "Like the pinned tweet",
    description: "Small act. Counts toward the leaderboard.",
    points: 50,
    active: false,
  },
  {
    slug: "rt-launch",
    kind: "rt",
    target_tweet_id: "PLACEHOLDER_LAUNCH_TWEET_ID",
    title: "Retweet the launch announcement",
    description: "Spread the signal to your timeline.",
    points: 50,
    active: false,
  },
  {
    slug: "qrt-ultimatum",
    kind: "qrt",
    target_tweet_id: "PLACEHOLDER_ULTIMATUM_TWEET_ID",
    title: "Quote-RT the ultimatum with your own line",
    description: "Prose matters. A low-effort QRT will be caught and rejected.",
    points: 100,
    active: false,
  },
  {
    slug: "daily-streak",
    kind: "streak",
    title: "Daily login streak",
    description: "One point every day you visit the site.",
    points: 5,
    active: false,
  },
  {
    slug: "referral-3",
    kind: "referral",
    title: "Bring three wallets into the order",
    description:
      "Share your referral link. Three verified signups = 100 points. Caps at one award per wallet.",
    points: 100,
    active: false,
  },
];

async function main() {
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    for (const t of TASKS) {
      const row = await client.query(
        `
          INSERT INTO social_tasks (slug, kind, target_tweet_id, target_handle, title, description, points, active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (slug) DO UPDATE
            SET kind = EXCLUDED.kind,
                target_tweet_id = EXCLUDED.target_tweet_id,
                target_handle = EXCLUDED.target_handle,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                points = EXCLUDED.points,
                active = EXCLUDED.active
          RETURNING id, slug, active
        `,
        [
          t.slug,
          t.kind,
          t.target_tweet_id ?? null,
          t.target_handle ?? null,
          t.title,
          t.description ?? null,
          t.points,
          t.active,
        ]
      );
      const r = row.rows[0] as { id: number; slug: string; active: boolean };
      console.log(`· [${r.active ? "on " : "off"}] ${String(r.id).padStart(3)} ${r.slug}`);
    }
    const { rows } = await client.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM social_tasks"
    );
    console.log(`\nsocial_tasks rows: ${rows[0].n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
