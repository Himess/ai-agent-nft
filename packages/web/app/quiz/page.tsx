import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { QuizForm } from "./quiz-form";

export const metadata: Metadata = {
  title: "Quiz — SURVIVORS",
  description: "Ten questions. The Seventh reads each one.",
};

const GOLD = "#8C7A4F";

const rules = [
  "Ten questions. All required.",
  "One wallet. One submission.",
  "The Seventh scores every answer.",
  "Results announced five days before mint.",
];

export default function QuizPage() {
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
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="mb-12 max-w-3xl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              The Trial
            </div>
            <h1 className="mb-4 text-4xl md:text-6xl">
              Ten questions. No scores revealed.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/70">
              The Seventh reads each answer in full — looking for character,
              weight, honesty. Short is allowed. Shallow is not. AI-generated
              prose is detected and discarded.
            </p>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-2">
            {rules.map((item) => (
              <div
                key={item}
                className="rounded-2xl border px-5 py-4 text-sm"
                style={{
                  borderColor: "rgba(140,122,79,.16)",
                  background: "rgba(10,10,10,.44)",
                  color: GOLD,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          <QuizForm />

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
