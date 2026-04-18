import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

const limiterCache = new Map<string, Ratelimit>();

function makeBurst(prefix: string): Ratelimit | null {
  const cached = limiterCache.get(`${prefix}:burst`);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "5 m"),
    analytics: true,
    prefix: `rl:${prefix}:ip`,
  });
  limiterCache.set(`${prefix}:burst`, rl);
  return rl;
}

function makeHourly(prefix: string): Ratelimit | null {
  const cached = limiterCache.get(`${prefix}:hourly`);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: `rl:${prefix}:ip-h`,
  });
  limiterCache.set(`${prefix}:hourly`, rl);
  return rl;
}

// ─── Applications (existing form) ───────────────────────────────

export function perIpLimiter(): Ratelimit | null {
  return makeBurst("apply");
}

export function perIpHourlyLimiter(): Ratelimit | null {
  return makeHourly("apply");
}

export async function walletAlreadySubmitted(wallet: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `wallet:submitted:${wallet}`;
  const exists = await redis.exists(key);
  return exists > 0;
}

export async function markWalletSubmitted(wallet: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`wallet:submitted:${wallet}`, "1", {
    ex: 60 * 60 * 24 * 180,
  });
}

// ─── Quiz (separate namespace — user may submit both apply and quiz) ───

export function quizPerIpLimiter(): Ratelimit | null {
  return makeBurst("quiz");
}

export function quizPerIpHourlyLimiter(): Ratelimit | null {
  return makeHourly("quiz");
}

export async function quizWalletAlreadySubmitted(wallet: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `wallet:quiz-submitted:${wallet}`;
  const exists = await redis.exists(key);
  return exists > 0;
}

export async function markQuizWalletSubmitted(wallet: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`wallet:quiz-submitted:${wallet}`, "1", {
    ex: 60 * 60 * 24 * 180,
  });
}
