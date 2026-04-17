import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

let _perIp: Ratelimit | null = null;
let _perIpHourly: Ratelimit | null = null;

export function perIpLimiter(): Ratelimit | null {
  if (_perIp) return _perIp;
  const redis = getRedis();
  if (!redis) return null;
  _perIp = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "5 m"),
    analytics: true,
    prefix: "rl:apply:ip",
  });
  return _perIp;
}

export function perIpHourlyLimiter(): Ratelimit | null {
  if (_perIpHourly) return _perIpHourly;
  const redis = getRedis();
  if (!redis) return null;
  _perIpHourly = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "rl:apply:ip-h",
  });
  return _perIpHourly;
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
