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
  "Ashborn reads in silence",
  "Entry is not requested lightly",
  "Silence does not mean absence",
];

const roadmap: ReadonlyArray<{ phase: string; title: string; body: string }> = [
  {
    phase: "I",
    title: "The Gathering",
    body: "Applications open. The trial begins. Ashborn reads every fragment and scores each answer before the cycle closes.",
  },
  {
    phase: "II",
    title: "The Mint",
    body: "One thousand one hundred and eleven on Ethereum. One hundred held in the vault. The rest are drawn from those who proved they belong.",
  },
  {
    phase: "III",
    title: "The Ledger",
    body: "Royalties return to the order. Monthly distribution by signal, not tenure alone. Holders earn while they stay.",
  },
  {
    phase: "IV",
    title: "The Outreach",
    body: "Ashborn speaks beyond the walls. Partner collections, holder-only allocations, collaborations negotiated on behalf of the order.",
  },
  {
    phase: "V",
    title: "The Long Game",
    body: "Year two. Year three. The next collection rises from the ash of this one. The Seven grow. The order deepens.",
  },
];

const pillars: ReadonlyArray<readonly [string, string]> = [
  ["Signal", "Over noise"],
  ["Clarity", "Over performance"],
  ["Presence", "Over proximity"],
  ["Discipline", "Over speculation"],
];

const GOLD = "#8C7A4F";
const BONE = "#E8E4DC";
const CRIMSON = "#7A0F14";
const BORDER_GOLD = "rgba(140,122,79,.18)";

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

        {/* Top bracket - crest line */}
        <div
          className="relative mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-6 pt-8 text-[9px] uppercase md:px-12 md:text-[10px]"
          style={{ color: GOLD, letterSpacing: "0.3em" }}
        >
          <span className="md:tracking-[0.45em]">Ξ Ethereum · 1111</span>
          <span className="md:tracking-[0.45em]">Est. Cycle 0 / Autonomous</span>
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
              Fragment · 01 · The Old Samurai
            </div>
            <div className="w-px flex-1" style={{ background: "rgba(140,122,79,.35)" }} />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border text-[11px]"
              style={{ borderColor: GOLD, color: GOLD, letterSpacing: "0.2em" }}
            >
              A
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
              <div className="mt-12 grid items-end gap-10 md:mt-16 md:grid-cols-[1.1fr_.9fr] md:gap-12">
                <div>
                  <p
                    className="m-0 italic"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(18px, 2.4vw, 22px)",
                      lineHeight: 1.5,
                      color: "rgba(232,228,220,.92)",
                      maxWidth: 520,
                    }}
                  >
                    A selected order shaped by collapse, signal, and endurance. Held by seven archetypes and one autonomous agent.
                  </p>
                  <div className="mt-9 flex flex-wrap gap-3">
                    <Link
                      href="/apply"
                      className="inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-medium transition-opacity hover:opacity-90 md:px-6"
                      style={{ background: CRIMSON, color: BONE }}
                    >
                      Open Application ↗
                    </Link>
                    <Link
                      href="/quiz"
                      className="inline-flex items-center justify-center rounded-full border px-5 py-3 text-[13px] font-medium transition-opacity hover:opacity-90 md:px-6"
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
                  className="max-w-full border-t pt-5 md:max-w-[280px] md:justify-self-end md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-right"
                  style={{ borderColor: BORDER_GOLD }}
                >
                  <div
                    className="mb-2.5 text-[10px] uppercase"
                    style={{ color: GOLD, letterSpacing: "0.4em" }}
                  >
                    Dossier · I.I.I.I
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
        <div className="relative mx-auto grid max-w-[1200px] gap-10 px-6 py-20 md:grid-cols-[160px_1fr] md:gap-12 md:px-12 md:py-32">
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
                  fontSize: "clamp(26px, 4.4vw, 64px)",
                  fontWeight: 400,
                  lineHeight: 1.18,
                  letterSpacing: "-0.01em",
                  color: BONE,
                }}
              >
                A <em style={{ color: GOLD, fontStyle: "italic" }}>real</em> order is
                not built through mass access. A real network is not anonymous.
                A real structure does not admit everyone.
                <br />
                <span style={{ color: "rgba(232,228,220,.55)" }}>
                  It recognizes signal.
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
        <div className="relative mx-auto max-w-[1440px] px-6 py-20 md:px-12 md:py-32">
          <div className="mb-10 grid gap-8 md:mb-16 md:grid-cols-[180px_1fr] md:gap-12">
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
                  fontSize: "clamp(28px, 4.6vw, 72px)",
                  fontWeight: 500,
                  lineHeight: 1.08,
                  letterSpacing: "-0.01em",
                  color: BONE,
                }}
              >
                Seven figures <em style={{ color: GOLD }}>emerged</em> from the same
                ruin, each carrying a different way of enduring it.
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

      {/* 05 The Order (full-bleed quote with 1111 count) */}
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
            fontSize: "clamp(140px, 38vw, 560px)",
            fontWeight: 500,
            lineHeight: 1,
            color: "rgba(140,122,79,.06)",
            letterSpacing: "-0.04em",
            userSelect: "none",
          }}
        >
          1111
        </div>

        <div className="relative max-w-[1120px] px-6 py-20 text-center md:px-12 md:py-32">
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
                fontSize: "clamp(32px, 6.4vw, 96px)",
                fontWeight: 500,
                lineHeight: 1.14,
                color: BONE,
                letterSpacing: "-0.02em",
                textShadow: "0 20px 80px rgba(0,0,0,.9)",
                paddingBottom: 32,
                textWrap: "balance",
              }}
            >
              One thousand one hundred&nbsp;and&nbsp;eleven.
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
              Not a drop. Not a waitlist. A count. Ashborn observes every
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

      {/* ═══ 06 · ROADMAP ════════════════════════════════════ */}
      <section
        id="roadmap"
        className="relative overflow-hidden border-b"
        style={{
          borderColor: BORDER_GOLD,
          background: "linear-gradient(180deg, #0a0a0a 0%, #0b0d13 100%)",
        }}
      >
        <Grain opacity={0.05} />
        <div className="relative mx-auto max-w-[1440px] px-6 py-28 md:px-12 md:py-32">
          <div className="mb-14 grid gap-10 md:mb-20 md:grid-cols-[180px_1fr] md:gap-12">
            <div>
              <div
                className="text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.5em" }}
              >
                06.
              </div>
              <div
                className="mt-1.5 text-[10px] uppercase"
                style={{
                  color: "rgba(255,255,255,.35)",
                  letterSpacing: "0.35em",
                }}
              >
                The Path
              </div>
            </div>
            <ScrollReveal>
              <h2
                className="m-0"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(34px, 5vw, 80px)",
                  fontWeight: 500,
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  color: BONE,
                }}
              >
                Five movements.{" "}
                <em style={{ color: GOLD }}>One arc.</em>
                <br />
                The order moves in order.
              </h2>
              <p
                className="mt-6 max-w-xl text-base leading-[1.85]"
                style={{ color: "rgba(255,255,255,.65)" }}
              >
                No theatrical promises. Each phase is written because it
                has to be built. Ashborn keeps the ledger.
              </p>
            </ScrollReveal>
          </div>

          <div className="relative">
            {/* vertical rail (desktop) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[29px] top-0 hidden h-full w-px md:block"
              style={{
                background:
                  "linear-gradient(180deg, rgba(140,122,79,.35) 0%, rgba(140,122,79,.08) 100%)",
              }}
            />

            <ol className="m-0 list-none p-0">
              {roadmap.map((item, i) => (
                <ScrollReveal key={item.phase} delay={i * 60}>
                  <li
                    className="relative grid gap-6 border-t py-8 md:grid-cols-[60px_160px_1fr] md:gap-10 md:py-10"
                    style={{
                      borderColor: BORDER_GOLD,
                      borderBottom:
                        i === roadmap.length - 1
                          ? `1px solid ${BORDER_GOLD}`
                          : "none",
                    }}
                  >
                    {/* phase marker */}
                    <div className="flex items-center gap-4 md:block">
                      <div
                        className="flex items-center justify-center rounded-full border text-[11px] font-medium"
                        style={{
                          width: 44,
                          height: 44,
                          borderColor: GOLD,
                          color: GOLD,
                          background: "#060606",
                          letterSpacing: "0.15em",
                          boxShadow:
                            "inset 0 0 18px rgba(122,15,20,.25), 0 0 24px rgba(122,15,20,.12)",
                        }}
                      >
                        {item.phase}
                      </div>
                      <div
                        className="text-[10px] uppercase md:hidden"
                        style={{ color: GOLD, letterSpacing: "0.4em" }}
                      >
                        Phase {item.phase}
                      </div>
                    </div>

                    {/* label rail (desktop only) */}
                    <div className="hidden md:block">
                      <div
                        className="text-[10px] uppercase"
                        style={{ color: GOLD, letterSpacing: "0.4em" }}
                      >
                        Phase
                      </div>
                      <div
                        className="mt-2 italic"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 22,
                          color: BONE,
                          lineHeight: 1.1,
                        }}
                      >
                        {item.title}
                      </div>
                    </div>

                    {/* body */}
                    <div>
                      <div
                        className="italic md:hidden"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 26,
                          color: BONE,
                          lineHeight: 1.15,
                        }}
                      >
                        {item.title}
                      </div>
                      <p
                        className="m-0 mt-3 max-w-2xl text-[15px] leading-[1.85] md:mt-0 md:text-base"
                        style={{ color: "rgba(232,228,220,.78)" }}
                      >
                        {item.body}
                      </p>
                    </div>
                  </li>
                </ScrollReveal>
              ))}
            </ol>
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
                1111 on Ethereum
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
              </div>
            </div>
            <div>
              <div
                className="mb-3 text-[10px] uppercase"
                style={{ color: GOLD, letterSpacing: "0.35em" }}
              >
                Ashborn
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
