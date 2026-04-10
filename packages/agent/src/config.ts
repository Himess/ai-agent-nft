import { z } from "zod";

const envSchema = z.object({
  // AI
  ANTHROPIC_API_KEY: z.string().min(1),

  // Twitter/X
  TWITTER_API_KEY: z.string().min(1),
  TWITTER_API_SECRET: z.string().min(1),
  TWITTER_ACCESS_TOKEN: z.string().min(1),
  TWITTER_ACCESS_SECRET: z.string().min(1),
  TWITTER_BEARER_TOKEN: z.string().optional(),

  // Blockchain
  RPC_URL: z.string().url(),
  AGENT_PRIVATE_KEY: z.string().min(1),
  ETHERSCAN_API_KEY: z.string().optional(),

  // Contract Addresses
  AGENT_NFT_ADDRESS: z.string().startsWith("0x"),
  REVENUE_SPLITTER_ADDRESS: z.string().startsWith("0x"),
  AGENT_ACCOUNT_ADDRESS: z.string().startsWith("0x"),
  AGENT_IDENTITY_ADDRESS: z.string().startsWith("0x"),
  AGENT_ID: z.coerce.number().default(0),

  // Agent Config
  AGENT_NAME: z.string().default("HermesAgent"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;
  _config = envSchema.parse(process.env);
  return _config;
}

export function getConfig(): Config {
  if (!_config) throw new Error("Config not loaded. Call loadConfig() first.");
  return _config;
}
