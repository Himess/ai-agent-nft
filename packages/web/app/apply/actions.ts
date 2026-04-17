"use server";

import { headers } from "next/headers";
import { getSql } from "@/lib/db";
import { applicationSchema } from "@/lib/schema";
import { looksLikeBot } from "@/lib/spam";
import {
  markWalletSubmitted,
  perIpHourlyLimiter,
  perIpLimiter,
  walletAlreadySubmitted,
} from "@/lib/rate-limit";

export type FormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const SILENT_SUCCESS: FormState = { status: "success" };

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

export async function submitApplication(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  // ── Layer 1: honeypot + time gate ────────────────────────────────
  // Silent success: never reveal the detection to the bot.
  if (looksLikeBot(formData)) {
    return SILENT_SUCCESS;
  }

  // ── Layer 2: IP-based rate limiting ──────────────────────────────
  const ip = await getClientIp();
  if (ip) {
    const burst = perIpLimiter();
    if (burst) {
      const res = await burst.limit(ip);
      if (!res.success) {
        return {
          status: "error",
          message: "Too many attempts from this connection. Breathe. Try again in a few minutes.",
        };
      }
    }
    const hourly = perIpHourlyLimiter();
    if (hourly) {
      const res = await hourly.limit(ip);
      if (!res.success) {
        return {
          status: "error",
          message: "Hourly limit reached from this connection.",
        };
      }
    }
  }

  // ── Layer 3: schema validation ───────────────────────────────────
  const raw = {
    name: formData.get("name"),
    twitter: formData.get("twitter"),
    wallet: formData.get("wallet"),
    discovery: formData.get("discovery"),
    endurance: formData.get("endurance"),
    recognition: formData.get("recognition"),
    offering: formData.get("offering"),
    links: formData.get("links") ?? "",
  };

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Some answers did not pass the filter.",
      fieldErrors,
    };
  }

  const data = parsed.data;
  const wallet = data.wallet.toLowerCase();
  const twitter = data.twitter.replace(/^@/, "").toLowerCase();

  // ── Layer 4: wallet lifetime check (fast path via Redis) ─────────
  if (await walletAlreadySubmitted(wallet)) {
    return {
      status: "error",
      message: "This wallet has already submitted an application.",
    };
  }

  // ── Layer 5: DB write (UNIQUE constraint is final guard) ─────────
  const h = await headers();
  const userAgent = h.get("user-agent") ?? null;

  try {
    const sql = getSql();
    await sql`
      INSERT INTO applications (
        name, twitter, wallet, discovery, endurance,
        recognition, offering, links, ip, user_agent
      ) VALUES (
        ${data.name}, ${twitter}, ${wallet}, ${data.discovery},
        ${data.endurance}, ${data.recognition}, ${data.offering},
        ${data.links ?? ""}, ${ip}, ${userAgent}
      )
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      await markWalletSubmitted(wallet);
      return {
        status: "error",
        message: "This wallet has already submitted an application.",
      };
    }
    console.error("application insert failed", err);
    return {
      status: "error",
      message: "Something failed on our side. Try again in a moment.",
    };
  }

  await markWalletSubmitted(wallet);
  return { status: "success" };
}
