import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { SevenCard, type SevenEntry } from "@/components/seven-card";

const seven: SevenEntry[] = [
  {
    kind: "revealed",
    index: 0,
    title: "The Young Ronin",
    tagline: "Marked by ruin, not finished.",
    image: "/seven/young-ronin.jpg",
  },
  {
    kind: "revealed",
    index: 1,
    title: "The Crimson Widow",
    tagline: "Silent, sharp, unreadable.",
    image: "/seven/crimson-widow.jpg",
  },
  {
    kind: "revealed",
    index: 2,
    title: "The Old Samurai",
    tagline: "Calm, distant, unmoved.",
    image: "/seven/old-samurai.jpg",
  },
  {
    kind: "revealed",
    index: 3,
    title: "The Farwalker",
    tagline: "Forged elsewhere, built to remain.",
    image: "/seven/farwalker.jpg",
  },
  {
    kind: "revealed",
    index: 4,
    title: "The Shadow Chief",
    tagline: "Silent, calculating, dangerous.",
    image: "/seven/shadow-chief.jpg",
  },
  { kind: "sealed", index: 5 },
  { kind: "sealed", index: 6 },
];

const ultimatumLines = [
  "Signal is recognized.",
  "Silence tests everyone.",
  "Pressure reveals form.",
  "Selection leaves a trace.",
  "Only the enduring remain.",
  "The order remembers.",
];

const orderLines = [
  "A real order is not built through mass access.",
  "A real network is not anonymous.",
  "A real structure does not admit everyone.",
  "It recognizes signal.",
];

const operatorCapabilities = [
  "Secure access",
  "Identify opportunity",
  "Initiate collaboration",
  "Expand reach",
  "Create value pathways",
];

const systemPillars = [
  "Growth opens the gate wider.",
  "Opportunity moves through the order.",
  "Distribution returns with purpose.",
  "Alignment hardens the structure.",
];

const GOLD = "#8C7A4F";
const CRIMSON = "#7A0F14";
const BONE = "#E8E4DC";
const BORDER_GOLD = "rgba(140,122,79,.18)";

export default function Home() {
  return (
    <div>
      <Nav />

      {/* HERO */}
      <section
        id="hero"
        className="relative overflow-hidden border-b"
        style={{ borderColor: BORDER_GOLD }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 28% 40%, rgba(122,15,20,.22), transparent 40%), radial-gradient(circle at 72% 60%, rgba(28,34,51,.55), transparent 55%), linear-gradient(180deg, rgba(10,10,10,.55), rgba(10,10,10,1))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-black" />

        <div className="relative mx-auto grid min-h-[94vh] max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-[1.2fr_.8fr]">
          <div className="max-w-4xl">
            <div
              className="mb-5 inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.32em]"
              style={{
                borderColor: "rgba(140,122,79,.28)",
                color: GOLD,
                background: "rgba(10,10,10,.36)",
              }}
            >
              The order gathers
            </div>
            <h1
              className="mb-4 text-6xl font-semibold tracking-[0.18em] md:text-8xl"
              style={{
                color: BONE,
                textShadow: "0 10px 40px rgba(0,0,0,.65)",
              }}
            >
              SURVIVORS
            </h1>
            <div
              className="mb-3 text-sm uppercase tracking-[0.38em]"
              style={{ color: GOLD }}
            >
              888 on Ethereum
            </div>
            <p
              className="max-w-2xl text-2xl leading-relaxed md:text-3xl"
              style={{ color: "rgba(232,228,220,.95)" }}
            >
              When every NFT died, we lived.
            </p>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/70">
              A selected order shaped by collapse, signal, and endurance.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/apply"
                className="rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: CRIMSON, color: BONE }}
              >
                Open Application
              </Link>
              <a
                href="#ultimatum"
                className="rounded-full border px-6 py-3 text-sm font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: GOLD, color: GOLD }}
              >
                Read the Ultimatum
              </a>
            </div>
          </div>

          <div
            className="rounded-[2rem] border p-4 shadow-2xl"
            style={{
              borderColor: "rgba(140,122,79,.24)",
              background: "rgba(10,10,10,.48)",
            }}
          >
            <div
              className="relative overflow-hidden rounded-[1.5rem] border"
              style={{ borderColor: "rgba(140,122,79,.14)" }}
            >
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src="/seven/old-samurai.jpg"
                  alt="The Old Samurai"
                  fill
                  priority
                  sizes="(min-width: 1024px) 34vw, 90vw"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(10,10,10,.15) 40%, rgba(10,10,10,.95) 100%)",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div
                    className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em]"
                    style={{ color: GOLD }}
                  >
                    <span>Fragment · 01</span>
                    <span>The Old Samurai</span>
                  </div>
                  <div className="text-2xl leading-tight" style={{ color: BONE }}>
                    This is not a mint page. This is a filter.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ULTIMATUM */}
      <section
        id="ultimatum"
        className="border-b"
        style={{
          borderColor: BORDER_GOLD,
          background:
            "linear-gradient(180deg, rgba(10,10,10,1), rgba(28,34,51,.34))",
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-12 max-w-3xl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              The Ultimatum
            </div>
            <h2 className="text-4xl md:text-6xl">
              What remained after the silence was never meant for everyone.
            </h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-[.95fr_1.05fr]">
            <div
              className="rounded-[2rem] border p-8"
              style={{
                borderColor: "rgba(140,122,79,.18)",
                background: "rgba(10,10,10,.52)",
              }}
            >
              <div
                className="mb-5 text-xs uppercase tracking-[0.3em]"
                style={{ color: GOLD }}
              >
                Manifesto
              </div>
              <div className="space-y-6 text-sm leading-8 text-white/72">
                <p>
                  In 2021, everyone wanted in. They were not chasing images
                  alone, but the feeling of standing inside something permanent,
                  something that could outlast the noise around it.
                </p>
                <p>
                  Then the cycle turned, and what looked eternal began to thin
                  out. Floors gave way, founders disappeared, communities lost
                  their shape, and conviction proved far rarer than excitement.
                </p>
                <p>
                  By the time the noise had burned itself out, almost everything
                  was gone. What remained was not luck. It was temperament. It
                  was pressure revealing what had substance.
                </p>
              </div>
            </div>
            <div
              className="rounded-[2rem] border p-8"
              style={{
                borderColor: "rgba(140,122,79,.18)",
                background: "rgba(10,10,10,.32)",
              }}
            >
              <div
                className="mb-6 text-xs uppercase tracking-[0.3em]"
                style={{ color: GOLD }}
              >
                Key Lines
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {ultimatumLines.map((line) => (
                  <div
                    key={line}
                    className="rounded-2xl border p-5 text-xl"
                    style={{
                      borderColor: "rgba(140,122,79,.16)",
                      background: "rgba(28,34,51,.2)",
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE SEVEN */}
      <section id="seven" className="border-b" style={{ borderColor: BORDER_GOLD }}>
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-12 max-w-3xl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              The Seven
            </div>
            <h2 className="text-4xl md:text-6xl">
              Seven figures emerged from the same ruin, each carrying a
              different way of enduring it.
            </h2>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/60">
              Five are visible. Two remain unseen. The order does not reveal
              itself all at once.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {seven.map((entry) => (
              <SevenCard key={entry.index} entry={entry} />
            ))}
          </div>
        </div>
      </section>

      {/* 888 CTA */}
      <section
        className="border-b"
        style={{
          borderColor: BORDER_GOLD,
          background:
            "linear-gradient(180deg, rgba(28,34,51,.22), rgba(10,10,10,1))",
        }}
      >
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div
            className="mb-4 text-xs uppercase tracking-[0.35em]"
            style={{ color: GOLD }}
          >
            The Order
          </div>
          <h2 className="mb-8 text-5xl md:text-7xl">888 will be selected.</h2>
          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
            {orderLines.map((x) => (
              <div
                key={x}
                className="rounded-2xl border px-5 py-4 text-lg"
                style={{
                  borderColor: "rgba(140,122,79,.18)",
                  background: "rgba(10,10,10,.42)",
                }}
              >
                {x}
              </div>
            ))}
          </div>
          <Link
            href="/apply"
            className="mt-10 inline-block rounded-full px-7 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: CRIMSON, color: BONE }}
          >
            Enter the Filter
          </Link>
        </div>
      </section>

      {/* OPERATOR */}
      <section id="operator" className="border-b" style={{ borderColor: BORDER_GOLD }}>
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-24 lg:grid-cols-[.9fr_1.1fr]">
          <div
            className="rounded-[2rem] border p-8"
            style={{
              borderColor: "rgba(140,122,79,.18)",
              background: "rgba(10,10,10,.52)",
            }}
          >
            <div
              className="mb-4 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              The Operator
            </div>
            <div
              className="relative aspect-square rounded-[1.5rem] border p-6 overflow-hidden"
              style={{
                borderColor: "rgba(140,122,79,.16)",
                background:
                  "radial-gradient(circle at 50% 50%, rgba(122,15,20,.18), rgba(10,10,10,.88))",
              }}
            >
              <div
                className="absolute inset-8 rounded-full border"
                style={{ borderColor: "rgba(140,122,79,.18)" }}
              />
              <div
                className="absolute inset-16 rounded-full border"
                style={{ borderColor: "rgba(140,122,79,.12)" }}
              />
              <div className="relative flex h-full items-center justify-center">
                <div className="text-center">
                  <div
                    className="text-xs uppercase tracking-[0.4em]"
                    style={{ color: GOLD }}
                  >
                    The Seventh
                  </div>
                  <div className="mt-4 text-3xl" style={{ color: BONE }}>
                    Autonomous
                  </div>
                  <div className="mt-1 text-sm uppercase tracking-[0.3em] text-white/55">
                    Operator
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="rounded-[2rem] border p-8"
            style={{
              borderColor: "rgba(140,122,79,.18)",
              background: "rgba(28,34,51,.24)",
            }}
          >
            <div
              className="mb-6 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              Active intelligence
            </div>
            <h2 className="mb-6 text-4xl md:text-5xl">
              At the center stands an intelligence that does not fade with the
              cycle.
            </h2>
            <p className="mb-8 max-w-2xl text-base leading-8 text-white/72">
              It exists to secure access, identify opportunity, initiate
              collaboration, expand reach, and create new pathways of value for
              the order.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {operatorCapabilities.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border px-5 py-4"
                  style={{
                    borderColor: "rgba(140,122,79,.16)",
                    background: "rgba(10,10,10,.34)",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SYSTEM */}
      <section
        id="system"
        className="border-b"
        style={{
          borderColor: BORDER_GOLD,
          background:
            "linear-gradient(180deg, rgba(10,10,10,1), rgba(122,15,20,.06), rgba(10,10,10,1))",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-10 max-w-3xl">
            <div
              className="mb-4 text-xs uppercase tracking-[0.35em]"
              style={{ color: GOLD }}
            >
              The Structure
            </div>
            <h2 className="text-4xl md:text-6xl">
              What is built here is meant to circulate, return, and strengthen.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {systemPillars.map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border p-6 text-lg"
                style={{
                  borderColor: "rgba(140,122,79,.18)",
                  background: "rgba(10,10,10,.44)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div
            className="mt-8 rounded-[1.75rem] border p-8 text-center"
            style={{
              borderColor: "rgba(140,122,79,.18)",
              background: "rgba(28,34,51,.2)",
            }}
          >
            <div className="text-2xl md:text-3xl">
              Nothing here is ornamental. Every part is meant to reinforce what
              survives.
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t"
        style={{
          borderColor: "rgba(140,122,79,.16)",
          background: "rgba(10,10,10,.95)",
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm tracking-[0.35em]" style={{ color: GOLD }}>
              SURVIVORS
            </div>
            <div className="mt-2 text-xs uppercase tracking-[0.3em] text-white/45">
              888 on Ethereum
            </div>
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-white/45">
            Applications live beyond the landing page
          </div>
        </div>
      </footer>
    </div>
  );
}
