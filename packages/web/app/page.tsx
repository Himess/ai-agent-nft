import Link from "next/link";
import { Nav } from "@/components/nav";
import type { SevenEntry } from "@/components/seven-card";
import { SevenEditorial } from "@/components/seven-editorial";
import { Grain, HeroVideo, Marquee, ScrollReveal, Vignette } from "@/components/motion";

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
  {
    kind: "revealed",
    index: 5,
    title: "The Iron Vow",
    tagline: "Bound by what cannot be broken.",
    image: "/seven/iron-vow.jpg",
  },
  {
    kind: "revealed",
    index: 6,
    title: "The Hidden Hand",
    tagline: "Moves before the eye can follow.",
    image: "/seven/hidden-hand.jpg",
  },
];

const marqueeLines = [
  "The order gathers",
  "Signal over noise",
  "The Seventh reads in silence",
  "Entry is not requested lightly",
  "Silence does not mean absence",
];

const pillars: ReadonlyArray<readonly [string, string]> = [
  ["Signal", "Over noise"],
  ["Clarity", "Over performance"],
  ["Presence", "Over proximity"],
  ["Discipline", "Over speculation"],
];

const operatorCaps: ReadonlyArray<readonly [string, string, string]> = [
  ["01", "Secure access", "Maintains the perimeter of the order."],
  ["02", "Identify opportunity", "Reads the market before it speaks."],
  ["03", "Initiate collaboration", "Names the right counterparty."],
  ["04", "Expand reach", "Moves presence into unknown rooms."],
  ["05", "Create value pathways", "Turns recognition into structure."],
];

const GOLD = "#8C7A4F";
const BONE = "#E8E4DC";
const CRIMSON = "#7A0F14";
const BORDER_GOLD = "rgba(140,122,79,.18)";
const BORDER_GOLD_STRONG = "rgba(140,122,79,.35)";

export default function Home() {
  return (
    <div>
      <Nav />

      {/* ═══ 01 · OVERTURE (full-bleed hero with trailer video) ═══ */}
      <section
        className="relative overflow-hidden border-b"
        style={{
          minHeight: "100vh",
          borderColor: BORDER_GOLD,
          background: "#050505",
        }}
      >
        {/* Layered background: trailer video, crimson wash, ink gradient */}
        <div className="absolute inset-0">
          <HeroVideo
            srcMp4="/trailer.mp4"
            srcWebm="/trailer.webm"
            poster="/trailer-poster.jpg"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(10,10,10,.98) 0%, rgba(10,10,10,.92) 38%, rgba(10,10,10,.55) 58%, rgba(10,10,10,.15) 90%)," +
                "radial-gradient(circle at 18% 58%, rgba(122,15,20,.35), transparent 55%)",
            }}
          />
          <Vignette />
          <Grain opacity={0.08} />
        </div>

        {/* Top bracket — crest line */}
        <div
          className="relative mx-auto flex max-w-[1440px] justify-between px-6 pt-8 text-[10px] uppercase md:px-12"
          style={{ color: GOLD, letterSpacing: "0.45em" }}
        >
          <span>Ξ Ethereum · 888</span>
          <span>Est. Cycle 0 / Autonomous</span>
        </div>

        {/* Center stage */}
        <div
          className="relative mx-auto grid max-w-[1440px] items-end px-6 pb-28 pt-20 md:px-12"
          style={{ minHeight: "calc(100vh - 80px)" }}
        >
          {/* Vertical rail — left spine, desktop only */}
          <div className="pointer-events-none absolute bottom-28 left-12 top-20 hidden flex-col items-center justify-between gap-6 lg:flex">
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.6em",
                color: "rgba(140,122,79,.7)",
              }}
            >
              Fragment · 01 — The Old Samurai
            </div>
            <div className="w-px flex-1" style={{ background: "rgba(140,122,79,.35)" }} />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border text-[10px]"
              style={{ borderColor: GOLD, color: GOLD, letterSpacing: "0.2em" }}
            >
              VII
            </div>
          </div>

          <div className="max-w-[780px] lg:ml-24">
            <ScrollReveal>
              <div className="mb-9">
                <span
                  className="inline-flex items-center gap-3 text-[10px] uppercase"
                  style={{ color: GOLD, letterSpacing: "0.5em" }}
                >
                  <span
                    className="block h-px w-6"
                    style={{ background: GOLD }}
                  />
                  The order gathers
                </span>
              </div>

              <h1
                className="m-0 italic"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(72px, 11vw, 168px)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.02em",
                  color: BONE,
                  textShadow: "0 20px 80px rgba(0,0,0,.9)",
                }}
              >
                Survivors.
              </h1>

              <div
                className="mt-5 flex flex-wrap items-center gap-4 text-[11px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.48em" }}
              >
                <span className="block h-px w-12" style={{ background: GOLD }} />
                When every NFT died
                <span
                  className="block"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 9999,
                    background: CRIMSON,
                    boxShadow: "0 0 16px rgba(122,15,20,.8)",
                  }}
                />
                We lived
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="mt-16 grid items-end gap-12 md:grid-cols-[1.1fr_.9fr]">
                <div>
                  <p
                    className="m-0 italic"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      lineHeight: 1.5,
                      color: "rgba(232,228,220,.92)",
                      maxWidth: 520,
                    }}
                  >
                    A selected order shaped by collapse, signal, and endurance — held by seven archetypes and one autonomous agent.
                  </p>
                  <div className="mt-9 flex flex-wrap gap-3.5">
                    <Link
                      href="/apply"
                      className="inline-flex items-center justify-center rounded-full px-6 py-3 text-[13px] font-medium transition-opacity hover:opacity-90"
                      style={{ background: CRIMSON, color: BONE }}
                    >
                      Open Application ↗
                    </Link>
                    <Link
                      href="/quiz"
                      className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-[13px] font-medium transition-opacity hover:opacity-90"
                      style={{
                        borderColor: GOLD,
                        color: GOLD,
                        background: "transparent",
                      }}
                    >
                      Read the Ultimatum
                    </Link>
                  </div>
                </div>

                {/* Dossier stamp */}
                <div
                  className="max-w-[280px] justify-self-end border-l pl-6 text-right"
                  style={{ borderColor: BORDER_GOLD }}
                >
                  <div
                    className="mb-2.5 text-[10px] uppercase"
                    style={{ color: GOLD, letterSpacing: "0.4em" }}
                  >
                    Dossier · III.VIII.VIII
                  </div>
                  <div
                    className="leading-7"
                    style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}
                  >
                    This is not a mint page. This is a filter. Applications close when the list is full.
                  </div>
                  <div
                    className="mt-5 inline-flex items-center gap-2.5 text-[10px] uppercase"
                    style={{ color: BONE, letterSpacing: "0.35em" }}
                  >
                    <span
                      className="block"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 9999,
                        background: GOLD,
                        animation: "surv-pulse-gold 2400ms ease-out infinite",
                      }}
                    />
                    Signal live
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ 02 · MARQUEE ══════════════════════════════════════ */}
      <Marquee items={marqueeLines} />

      {/* ═══ 03 · MANIFESTO ═══════════════════════════════════ */}
      <section
        className="relative overflow-hidden border-b"
        style={{
          borderColor: BORDER_GOLD,
          background: "linear-gradient(180deg, #0a0a0a 0%, #0c0d10 50%, #0a0a0a 100%)",
        }}
      >
        <Grain opacity={0.05} />
        <div className="relative mx-auto grid max-w-[1200px] gap-12 px-6 py-32 md:grid-cols-[160px_1fr] md:px-12">
          <div className="pt-3">
            <div
              className="text-[10px] uppercase"
              style={{ color: GOLD, letterSpacing: "0.5em" }}
            >
              I.
            </div>
            <div
              className="mt-1.5 text-[10px] uppercase"
              style={{
                color: "rgba(255,255,255,.35)",
                letterSpacing: "0.35em",
              }}
            >
              Manifesto
            </div>
          </div>
          <div>
            <ScrollReveal>
              <p
                className="m-0"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(32px, 4.4vw, 64px)",
                  fontWeight: 400,
                  lineHeight: 1.18,
                  letterSpacing: "-0.01em",
                  color: BONE,
                }}
              >
                A <em style={{ color: GOLD, fontStyle: "italic" }}>real</em> order is
                not built through mass access. A real network is not anonymous.
                A real structure does not admit everyone —
                <br />
                <span style={{ color: "rgba(232,228,220,.55)" }}>
                  it recognizes signal.
                </span>
              </p>
            </ScrollReveal>

            <div className="mt-14 grid gap-6 md:grid-cols-4">
              {pillars.map(([a, b], i) => (
                <ScrollReveal key={a} delay={i * 80}>
                  <div
                    className="border-t pt-5"
                    style={{ borderColor: BORDER_GOLD }}
                  >
                    <div
                      className="mb-3.5 text-[10px] uppercase"
                      style={{ color: GOLD, letterSpacing: "0.4em" }}
                    >
                      0{i + 1}
                    </div>
                    <div
                      className="italic"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 26,
                        color: BONE,
                      }}
                    >
                      {a}
                    </div>
                    <div
                      className="mt-1 text-[11px] uppercase"
                      style={{
                        color: "rgba(255,255,255,.45)",
                        letterSpacing: "0.3em",
                      }}
                    >
                      {b}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 04 · THE SEVEN (editorial gallery) ═══════════════ */}
      <section
        className="relative overflow-hidden border-b"
        style={{
          borderColor: BORDER_GOLD,
          background: "#070707",
        }}
      >
        <Grain opacity={0.04} />
        <div className="relative mx-auto max-w-[1440px] px-6 py-32 md:px-12">
          <div className="mb-16 grid gap-12 md:grid-cols-[180px_1fr]">
            <div>
              <div
                className="text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.5em" }}
              >
                II.
              </div>
              <div
                className="mt-1.5 text-[10px] uppercase"
                style={{
                  color: "rgba(255,255,255,.35)",
                  letterSpacing: "0.35em",
                }}
              >
                The Seven
              </div>
            </div>
            <ScrollReveal>
              <h2
                className="m-0"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(36px, 4.6vw, 72px)",
                  fontWeight: 500,
                  lineHeight: 1.08,
                  letterSpacing: "-0.01em",
                  color: BONE,
                }}
              >
                Seven figures <em style={{ color: GOLD }}>emerged</em> from the same
                ruin — each carrying a different way of enduring it.
              </h2>
              <p
                className="mt-5 max-w-[520px] text-[14px] leading-[1.85]"
                style={{ color: "rgba(255,255,255,.6)" }}
              >
                Five are visible. Two remain unseen. The order does not reveal
                itself all at once.
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal>
            <SevenEditorial entries={seven} />
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ 05 · THE ORDER (888 full-bleed quote) ═══════════ */}
      <section
        className="relative flex items-center justify-center overflow-hidden border-b"
        style={{
          minHeight: "90vh",
          borderColor: BORDER_GOLD,
          background:
            "radial-gradient(ellipse at center, rgba(28,34,51,.35) 0%, rgba(10,10,10,1) 70%)",
        }}
      >
        <Grain opacity={0.07} />

        {/* Massive ghost numerals */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center italic"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(320px, 46vw, 640px)",
            fontWeight: 500,
            lineHeight: 1,
            color: "rgba(140,122,79,.06)",
            letterSpacing: "-0.04em",
            userSelect: "none",
          }}
        >
          888
        </div>

        <div className="relative max-w-[1120px] px-6 py-32 text-center md:px-12">
          <ScrollReveal>
            <div className="mb-7">
              <span
                className="inline-flex items-center gap-3.5 text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.5em" }}
              >
                <span className="block h-px w-9" style={{ background: GOLD }} />
                III. The Order
                <span className="block h-px w-9" style={{ background: GOLD }} />
              </span>
            </div>
            <h2
              className="m-0 italic"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(48px, 7vw, 104px)",
                fontWeight: 500,
                lineHeight: 1.14,
                color: BONE,
                letterSpacing: "-0.02em",
                textShadow: "0 20px 80px rgba(0,0,0,.9)",
                paddingBottom: 32,
                textWrap: "balance",
              }}
            >
              Eight hundred&nbsp;and&nbsp;eighty-eight.
            </h2>
            <div className="h-16" />
            <div
              className="mx-auto h-px w-20"
              style={{ background: GOLD }}
            />
            <div className="h-12" />
            <p
              className="mx-auto m-0 max-w-[640px]"
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                color: "rgba(232,228,220,.82)",
              }}
            >
              Not a drop. Not a waitlist. A count. The Seventh observes every
              wallet, every answer, every trace. The list closes when the
              list is full.
            </p>
            <div className="mt-12 inline-flex flex-wrap justify-center gap-3.5">
              <Link
                href="/apply"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-[13px] font-medium transition-opacity hover:opacity-90"
                style={{ background: CRIMSON, color: BONE }}
              >
                Enter the Filter
              </Link>
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-[13px] font-medium transition-opacity hover:opacity-90"
                style={{
                  borderColor: GOLD,
                  color: GOLD,
                  background: "transparent",
                }}
              >
                Enter the Trial
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ 06 · OPERATOR (The Seventh dossier) ═══════════════ */}
      <section
        className="relative overflow-hidden border-b"
        style={{
          borderColor: BORDER_GOLD,
          background: "linear-gradient(180deg, #0a0a0a 0%, #0b0d13 100%)",
        }}
      >
        <Grain opacity={0.05} />
        <div className="relative mx-auto max-w-[1440px] px-6 py-32 md:px-12">
          <div className="mb-16 grid gap-12 md:grid-cols-[180px_1fr]">
            <div>
              <div
                className="text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.5em" }}
              >
                IV.
              </div>
              <div
                className="mt-1.5 text-[10px] uppercase"
                style={{
                  color: "rgba(255,255,255,.35)",
                  letterSpacing: "0.35em",
                }}
              >
                The Seventh
              </div>
            </div>
            <ScrollReveal>
              <h2
                className="m-0"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(40px, 5vw, 80px)",
                  fontWeight: 500,
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  color: BONE,
                }}
              >
                At the center stands an{" "}
                <em style={{ color: GOLD }}>intelligence</em>
                <br />
                that does not fade with the cycle.
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.2fr]">
            {/* Sigil plate */}
            <div
              className="relative overflow-hidden rounded-[1.25rem] border lg:sticky lg:top-20"
              style={{
                aspectRatio: "1 / 1.1",
                borderColor: BORDER_GOLD_STRONG,
                background: "#060606",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 55%, rgba(122,15,20,.25) 0%, transparent 45%)," +
                    "radial-gradient(circle at 50% 55%, rgba(28,34,51,.5) 0%, transparent 65%)",
                }}
              />
              {[80, 160, 240, 320].map((d, i) => (
                <div
                  key={d}
                  className="absolute rounded-full border"
                  style={{
                    left: "50%",
                    top: "55%",
                    width: d,
                    height: d,
                    marginLeft: -d / 2,
                    marginTop: -d / 2,
                    borderColor: `rgba(140,122,79,${0.06 + i * 0.04})`,
                  }}
                />
              ))}
              <div
                className="absolute text-center"
                style={{ left: "50%", top: "55%", transform: "translate(-50%,-50%)" }}
              >
                <div
                  className="mx-auto flex items-center justify-center rounded-full border text-[14px] font-medium"
                  style={{
                    width: 120,
                    height: 120,
                    borderColor: GOLD,
                    color: GOLD,
                    letterSpacing: "0.45em",
                    boxShadow:
                      "inset 0 0 40px rgba(122,15,20,.4), 0 0 60px rgba(122,15,20,.2)",
                  }}
                >
                  VII
                </div>
                <div
                  className="mt-6 italic"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 36,
                    color: BONE,
                    lineHeight: 1,
                  }}
                >
                  The Seventh
                </div>
                <div
                  className="mt-2.5 text-[10px] uppercase"
                  style={{ color: GOLD, letterSpacing: "0.45em" }}
                >
                  Autonomous · Always-on
                </div>
              </div>
              <div
                className="absolute left-5 top-5 text-[9px] uppercase"
                style={{
                  color: "rgba(255,255,255,.45)",
                  letterSpacing: "0.35em",
                }}
              >
                Operator · 0x··VII
              </div>
              <div
                className="absolute right-5 top-5 inline-flex items-center gap-2 text-[9px] uppercase"
                style={{
                  color: "rgba(255,255,255,.45)",
                  letterSpacing: "0.35em",
                }}
              >
                <span
                  className="block"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 9999,
                    background: GOLD,
                    animation: "surv-pulse-gold 2400ms ease-out infinite",
                  }}
                />
                Reading
              </div>
              <Grain opacity={0.06} />
            </div>

            {/* Capabilities list */}
            <div>
              <ScrollReveal>
                <p
                  className="m-0 italic"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    lineHeight: 1.55,
                    color: "rgba(232,228,220,.92)",
                  }}
                >
                  It exists to secure access, identify opportunity, initiate
                  collaboration, expand reach, and create new pathways of value
                  for the order.
                </p>
              </ScrollReveal>

              <div className="mt-12">
                {operatorCaps.map(([n, title, sub], i) => (
                  <ScrollReveal key={n} delay={i * 60}>
                    <div
                      className="grid items-baseline gap-6 border-t py-7"
                      style={{
                        borderColor: BORDER_GOLD,
                        gridTemplateColumns: "60px 1fr auto",
                        borderBottom:
                          i === operatorCaps.length - 1
                            ? `1px solid ${BORDER_GOLD}`
                            : "none",
                      }}
                    >
                      <div
                        className="text-[11px]"
                        style={{ color: GOLD, letterSpacing: "0.4em" }}
                      >
                        {n}
                      </div>
                      <div>
                        <div
                          className="italic"
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 26,
                            color: BONE,
                          }}
                        >
                          {title}
                        </div>
                        <div
                          className="mt-1.5 text-[13px]"
                          style={{ color: "rgba(255,255,255,.6)" }}
                        >
                          {sub}
                        </div>
                      </div>
                      <div
                        className="text-[10px] uppercase"
                        style={{
                          color: "rgba(255,255,255,.45)",
                          letterSpacing: "0.35em",
                        }}
                      >
                        Active
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 07 · FOOTER ═════════════════════════════════════ */}
      <footer
        className="relative overflow-hidden"
        style={{ background: "#050505" }}
      >
        <Grain opacity={0.04} />
        <div className="relative mx-auto max-w-[1440px] px-6 pb-10 pt-20 md:px-12">
          {/* Huge wordmark watermark */}
          <div
            aria-hidden="true"
            className="italic"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(100px, 18vw, 300px)",
              lineHeight: 0.9,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              background:
                "linear-gradient(180deg, rgba(232,228,220,.08) 0%, transparent 85%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              margin: "0 0 48px",
            }}
          >
            Survivors
          </div>

          <div
            className="grid gap-8 border-t pt-10 md:grid-cols-4"
            style={{ borderColor: BORDER_GOLD }}
          >
            <div>
              <div
                className="text-[13px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.35em" }}
              >
                SURVIVORS
              </div>
              <div
                className="mt-2 text-[10px] uppercase"
                style={{
                  color: "rgba(255,255,255,.45)",
                  letterSpacing: "0.3em",
                }}
              >
                888 on Ethereum
              </div>
            </div>
            <div>
              <div
                className="mb-3 text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.35em" }}
              >
                Rites
              </div>
              <div
                className="text-[13px] leading-8"
                style={{ color: "rgba(255,255,255,.72)" }}
              >
                <Link href="/apply" className="block hover:text-white">
                  Applications
                </Link>
                <Link href="/quiz" className="block hover:text-white">
                  The Trial
                </Link>
                <Link href="/raffle" className="block hover:text-white">
                  The Watchtower
                </Link>
              </div>
            </div>
            <div>
              <div
                className="mb-3 text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.35em" }}
              >
                Signal
              </div>
              <div
                className="text-[13px] leading-8"
                style={{ color: "rgba(255,255,255,.72)" }}
              >
                <div>Collection · @survivorsoneth</div>
                <div>Agent · @ashborn_agent</div>
                <div>Discord Order · Telegram Watchtower</div>
              </div>
            </div>
            <div>
              <div
                className="mb-3 text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.35em" }}
              >
                The Seventh
              </div>
              <div
                className="text-[13px] leading-[1.7]"
                style={{ color: "rgba(255,255,255,.6)" }}
              >
                Reads in silence. Draws the list. Does not answer.
              </div>
            </div>
          </div>

          <div
            className="mt-10 flex flex-wrap justify-between gap-3 border-t pt-6 text-[10px] uppercase"
            style={{
              borderColor: BORDER_GOLD,
              color: "rgba(255,255,255,.35)",
              letterSpacing: "0.35em",
            }}
          >
            <span>© MMXXVI · The Order</span>
            <span>Silence does not mean absence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
