import { Pool } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "..", ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not found. Did you run `vercel env pull`?");
  process.exit(1);
}

const RESET_TABLES = [
  "task_completions",
  "agent_engagements",
  "agent_scores",
  "applications",
  "quiz_submissions",
  "social_tasks",
  "siwe_nonces",
  "user_profiles",
];

const pool = new Pool({ connectionString: url });

async function main() {
  const shouldReset = process.argv.includes("--reset");
  const schemaPath = resolve(here, "..", "lib", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");

  const client = await pool.connect();
  try {
    if (shouldReset) {
      console.log("· --reset flag: dropping all managed tables first");
      for (const t of RESET_TABLES) {
        process.stdout.write(`  - DROP TABLE IF EXISTS ${t} CASCADE…  `);
        await client.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
        console.log("ok");
      }
    }

    // Strip `--` line comments first so a stray semicolon inside a comment
    // (e.g. "handle changes; id doesn't") doesn't break the statement split.
    const stripped = schema
      .split(/\r?\n/)
      .map((line) => {
        const i = line.indexOf("--");
        return i === -1 ? line : line.slice(0, i);
      })
      .join("\n");

    const statements = stripped
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      process.stdout.write(`· ${preview}…  `);
      await client.query(stmt);
      console.log("ok");
    }

    const counts: Record<string, number> = {};
    for (const t of ["user_profiles", "applications", "quiz_submissions", "social_tasks"]) {
      const { rows } = await client.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM ${t}`
      );
      counts[t] = rows[0].n;
    }
    console.log("\nrow counts:", counts);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
