"use server";

import { headers } from "next/headers";
import { getSql } from "@/lib/db";
import { quizSchema, QUIZ_QUESTIONS, type QuizInput } from "@/lib/quiz-schema";
import { looksLikeBot } from "@/lib/spam";
import {
  markQuizWalletSubmitted,
  quizPerIpHourlyLimiter,
  quizPerIpLimiter,
  quizWalletAlreadySubmitted,
} from "@/lib/rate-limit";

export type QuizFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const SILENT_SUCCESS: QuizFormState = { status: "success" };

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

export async function submitQuiz(
  _prev: QuizFormState,
  formData: FormData
): Promise<QuizFormState> {
  // ── Layer 1: honeypot + time gate ────────────────────────────────
  if (looksLikeBot(formData)) {
    return SILENT_SUCCESS;
  }

  // ── Layer 2: IP-based rate limiting ──────────────────────────────
  const ip = await getClientIp();
  if (ip) {
    const burst = quizPerIpLimiter();
    if (burst) {
      const res = await burst.limit(ip);
      if (!res.success) {
        return {
          status: "error",
          message:
            "Too many attempts from this connection. Breathe. Try again in a few minutes.",
        };
      }
    }
    const hourly = quizPerIpHourlyLimiter();
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
  const raw: Record<string, unknown> = {
    twitter: formData.get("twitter"),
    wallet: formData.get("wallet"),
  };
  for (const q of QUIZ_QUESTIONS) {
    raw[q.id] = formData.get(q.id);
  }

  const parsed = quizSchema.safeParse(raw);
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

  // ── Layer 4: wallet lifetime check ───────────────────────────────
  if (await quizWalletAlreadySubmitted(wallet)) {
    return {
      status: "error",
      message: "This wallet has already completed the quiz.",
    };
  }

  // ── Layer 5: DB write (UNIQUE constraint is final guard) ─────────
  const h = await headers();
  const userAgent = h.get("user-agent") ?? null;

  // Persist only the scored fields (no PII we don't need).
  const answers: Record<string, string> = {};
  for (const q of QUIZ_QUESTIONS) {
    answers[q.id] = (data as QuizInput)[q.id as keyof QuizInput] as string;
  }

  try {
    const sql = getSql();
    await sql`
      INSERT INTO quiz_submissions (
        wallet, twitter, answers, ip, user_agent
      ) VALUES (
        ${wallet}, ${twitter}, ${JSON.stringify(answers)}::jsonb,
        ${ip}, ${userAgent}
      )
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      await markQuizWalletSubmitted(wallet);
      return {
        status: "error",
        message: "This wallet has already completed the quiz.",
      };
    }
    console.error("quiz insert failed", err);
    return {
      status: "error",
      message: "Something failed on our side. Try again in a moment.",
    };
  }

  await markQuizWalletSubmitted(wallet);
  return { status: "success" };
}
