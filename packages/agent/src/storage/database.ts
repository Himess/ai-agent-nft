import Database from "better-sqlite3";
import { getLogger } from "../utils/logger.js";

let _db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (_db) return _db;

  _db = new Database("agent.db");
  _db.pragma("journal_mode = WAL");

  initTables(_db);

  getLogger().info("Database initialized");
  return _db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wl_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      address TEXT,
      decision TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      total_score INTEGER NOT NULL,
      reasoning TEXT,
      flags TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tweets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_id TEXT UNIQUE,
      content TEXT NOT NULL,
      topic TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outreach (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      collab_score INTEGER,
      recommendation TEXT,
      dm_sent INTEGER DEFAULT 0,
      response_received INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_id TEXT UNIQUE,
      author_username TEXT,
      content TEXT,
      replied INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reputation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      tag TEXT NOT NULL,
      reason TEXT,
      tx_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ─── WL Decisions ────────────────────────────────────────────────

export function saveWLDecision(data: {
  username: string;
  address?: string;
  decision: string;
  confidence: number;
  totalScore: number;
  reasoning: string;
  flags: string[];
}): void {
  getDB()
    .prepare(
      `INSERT INTO wl_decisions (username, address, decision, confidence, total_score, reasoning, flags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.username,
      data.address ?? null,
      data.decision,
      data.confidence,
      data.totalScore,
      data.reasoning,
      JSON.stringify(data.flags)
    );
}

// ─── Tweets ──────────────────────────────────────────────────────

export function saveTweet(tweetId: string, content: string, topic: string): void {
  getDB()
    .prepare(`INSERT OR IGNORE INTO tweets (tweet_id, content, topic) VALUES (?, ?, ?)`)
    .run(tweetId, content, topic);
}

export function getTweetCount(since?: string): number {
  if (since) {
    return (
      getDB()
        .prepare(`SELECT COUNT(*) as count FROM tweets WHERE created_at >= ?`)
        .get(since) as { count: number }
    ).count;
  }
  return (
    getDB().prepare(`SELECT COUNT(*) as count FROM tweets`).get() as { count: number }
  ).count;
}

// ─── Mentions ────────────────────────────────────────────────────

export function getLastMentionId(): string | undefined {
  const row = getDB()
    .prepare(`SELECT tweet_id FROM mentions ORDER BY id DESC LIMIT 1`)
    .get() as { tweet_id: string } | undefined;
  return row?.tweet_id;
}

export function saveMention(tweetId: string, author: string, content: string): void {
  getDB()
    .prepare(
      `INSERT OR IGNORE INTO mentions (tweet_id, author_username, content) VALUES (?, ?, ?)`
    )
    .run(tweetId, author, content);
}

export function markMentionReplied(tweetId: string): void {
  getDB()
    .prepare(`UPDATE mentions SET replied = 1 WHERE tweet_id = ?`)
    .run(tweetId);
}

// ─── Reputation ──────────────────────────────────────────────────

export function saveReputationLog(data: {
  agentId: number;
  score: number;
  tag: string;
  reason: string;
  txHash?: string;
}): void {
  getDB()
    .prepare(
      `INSERT INTO reputation_log (agent_id, score, tag, reason, tx_hash) VALUES (?, ?, ?, ?, ?)`
    )
    .run(data.agentId, data.score, data.tag, data.reason, data.txHash ?? null);
}
