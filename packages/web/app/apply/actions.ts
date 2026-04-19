"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
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
  // Layer 0 — authenticated wallet + linked twitter. If the session is
  // missing for any reason we refuse the write rather than creating an
  // orphaned row.
  const session = await getServerSession(authOptions);
  if (!session?.user?.wallet) {
    return { status: "error", message: "Connect your wallet first." };
  }
  if (!session.user.twitterLinked || !session.user.twitterHandle) {
    return { status: "error", message: "Link your X account first." };
  }
  const wallet = session.user.wallet.toLowerCase();
  const twitter = session.user.twitterHandle.replace(/^@/, "").toLowerCase();

  // Layer 1 — honeypot + time gate (silent success for bots).
  if (looksLikeBot(formData)) return SILENT_SUCCESS;

  // Layer 2 — per-IP burst + hourly.
  const ip = await getClientIp();
  if (ip) {
    const burst = perIpLimiter();
    if (burst) {
      const res = await burst.limit(ip);
      if (!res.success)
        return {
          status: "error",
          message:
            "Too many attempts from this connection. Breathe. Try again in a few minutes.",
        };
    }
    const hourly = perIpHourlyLimiter();
    if (hourly) {
      const res = await hourly.limit(ip);
      if (!res.success)
        return {
          status: "error",
          message: "Hourly limit reached from this connection.",
        };
    }
  }

  // Layer 3 — Zod over the narrative fields only (identity comes from session).
  const raw = {
    name: formData.get("name"),
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

  // Layer 4 — wallet Redis fast-reject.
  if (await walletAlreadySubmitted(wallet)) {
    return {
      status: "error",
      message: "This wallet has already submitted an application.",
    };
  }

  // Layer 5 — DB INSERT, UNIQUE is the final guard.
  const h = await headers();
  const userAgent = h.get("user-agent") ?? null;

  try {
    const sql = getSql();
    await sql`
      INSERT INTO applications (
        wallet, twitter, name, discovery, endurance,
        recognition, offering, links, ip, user_agent
      ) VALUES (
        ${wallet}, ${twitter}, ${data.name}, ${data.discovery},
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
