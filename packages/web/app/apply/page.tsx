import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { AuthGate } from "@/components/auth-gate";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = {
  title: "Applications — SURVIVORS",
  description: "Entry is not requested lightly. This is a filter.",
};

const GOLD = "#8C7A4F";

const pillars = [
  "Signal over noise",
  "Clarity over performance",
  "Presence over proximity",
  "Discipline over speculation",
];

export default async function ApplyPage() {
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
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-12 max-w-3xl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              Applications
            </div>
            <h1 className="mb-4 text-4xl md:text-6xl">
              Entry is not requested lightly.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/70">
              This page exists outside the landing flow. It is quieter,
              narrower, more ritualistic. This is not a waitlist. This is a
              filter.
            </p>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {pillars.map((item) => (
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

          <AuthGate>
            <ApplicationForm />
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
