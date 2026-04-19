"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.wallet) {
    return { status: "error", message: "Connect your wallet first." };
  }
  if (!session.user.twitterLinked || !session.user.twitterHandle) {
    return { status: "error", message: "Link your X account first." };
  }
  const wallet = session.user.wallet.toLowerCase();
  const twitter = session.user.twitterHandle.replace(/^@/, "").toLowerCase();

  if (looksLikeBot(formData)) return SILENT_SUCCESS;

  const ip = await getClientIp();
  if (ip) {
    const burst = quizPerIpLimiter();
    if (burst) {
      const res = await burst.limit(ip);
      if (!res.success)
        return {
          status: "error",
          message:
            "Too many attempts from this connection. Breathe. Try again in a few minutes.",
        };
    }
    const hourly = quizPerIpHourlyLimiter();
    if (hourly) {
      const res = await hourly.limit(ip);
      if (!res.success)
        return {
          status: "error",
          message: "Hourly limit reached from this connection.",
        };
    }
  }

  const raw: Record<string, unknown> = {};
  for (const q of QUIZ_QUESTIONS) raw[q.id] = formData.get(q.id);

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

  if (await quizWalletAlreadySubmitted(wallet)) {
    return {
      status: "error",
      message: "This wallet has already completed the quiz.",
    };
  }

  const h = await headers();
  const userAgent = h.get("user-agent") ?? null;

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
