import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { AuthGate } from "@/components/auth-gate";
import { QuizChat } from "./quiz-chat";

export const metadata: Metadata = {
  title: "The Trial — SURVIVORS",
  description: "Ten questions. The Seventh speaks. You answer.",
};

const GOLD = "#8C7A4F";

export default async function QuizPage() {
  return (
    <div>
      <Nav />
      <section
        className="min-h-screen border-t"
        style={{
          borderColor: "rgba(140,122,79,.18)",
          background:
            "linear-gradient(180deg, rgba(10,10,10,1), rgba(28,34,51,.2), rgba(10,10,10,1))",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="mb-10 max-w-2xl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              The Trial
            </div>
            <h1 className="mb-4 text-4xl italic md:text-5xl">
              The Seventh speaks first.
            </h1>
            <p className="text-base leading-8 text-white/70">
              Ten questions, asked one at a time. The agent reads each answer
              before moving to the next. Short is allowed. Shallow is not.
              AI-generated prose is detected and discarded.
            </p>
          </div>

          <AuthGate>
            <QuizChat />
          </AuthGate>

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.3em] text-white/40 hover:text-white/70"
            >
              ← return to the landing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
