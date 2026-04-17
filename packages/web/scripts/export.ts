import { Pool } from "@neondatabase/serverless";
import { mkdirSync, writeFileSync } from "node:fs";
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

const MODE = process.argv[2] ?? "all";

type Row = Record<string, unknown>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

async function main() {
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    let rows: Row[];
    let outName: string;

    if (MODE === "wl" || MODE === "approved") {
      const { rows: r } = await client.query(
        `SELECT wallet, score, reviewed_at
           FROM applications
          WHERE status = 'approved'
          ORDER BY score DESC NULLS LAST, reviewed_at ASC`
      );
      rows = r;
      outName = "wl-approved.csv";
    } else if (MODE === "wallets") {
      const { rows: r } = await client.query(
        `SELECT wallet FROM applications WHERE status = 'approved' ORDER BY wallet`
      );
      rows = r;
      outName = "wl-wallets.csv";
    } else {
      const { rows: r } = await client.query(
        `SELECT id, created_at, status, score, name, twitter, wallet,
                discovery, endurance, recognition, offering, links,
                ip, user_agent, reviewed_at
           FROM applications
          ORDER BY created_at DESC`
      );
      rows = r;
      outName = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const outDir = resolve(here, "..", "exports");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, outName);
    writeFileSync(outPath, toCsv(rows), "utf8");

    console.log(`· wrote ${rows.length} rows → ${outPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
