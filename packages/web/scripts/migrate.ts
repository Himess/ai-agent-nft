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

const pool = new Pool({ connectionString: url });

async function main() {
  const schemaPath = resolve(here, "..", "lib", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const client = await pool.connect();
  try {
    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      process.stdout.write(`· ${preview}…  `);
      await client.query(stmt);
      console.log("ok");
    }

    const { rows } = await client.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM applications"
    );
    console.log(`\napplications table ready — ${rows[0].n} rows.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
