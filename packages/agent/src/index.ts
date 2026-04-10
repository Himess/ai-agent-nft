import "dotenv/config";
import { loadConfig } from "./config.js";
import { createLogger } from "./utils/logger.js";
import { getDB } from "./storage/database.js";
import { startScheduler, stopScheduler } from "./scheduler/cron-manager.js";

async function main() {
  // 1. Load and validate config
  const config = loadConfig();
  const log = createLogger();

  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log.info(`  ${config.AGENT_NAME} — AI Agent NFT Backend`);
  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 2. Initialize database
  getDB();

  // 3. Start scheduler
  startScheduler();

  log.info("Agent is running. Press Ctrl+C to stop.");

  // Graceful shutdown
  const shutdown = () => {
    log.info("Shutting down...");
    stopScheduler();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
