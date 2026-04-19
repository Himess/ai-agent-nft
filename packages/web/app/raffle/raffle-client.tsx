"use client";

import Link from "next/link";
import { useState } from "react";
import { Grain, ScrollReveal } from "@/components/motion";

// Inline platform icons — kept in the component file so there is no dependency
// on a public/ subfolder (which has been flaky to serve under turbopack on
// Windows). Each is a single <path>; fill="currentColor" so parents control color.

function IconX({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M24.3 5h3.8L19.5 15.1 29.7 27h-7.9l-6.2-7.7L8.5 27H4.7l9.2-10.8L4.3 5h8.1l5.6 7 5.9-7h.4zm-1.3 19.7h2.1L11.1 7.2H8.9l14.1 17.5z" />
    </svg>
  );
}

const GOLD = "#8C7A4F";
const BONE = "#E8E4DC";
const CRIMSON = "#7A0F14";
const BORDER_GOLD = "rgba(140,122,79,.18)";
const BORDER_GOLD_MD = "rgba(140,122,79,.24)";
const BORDER_GOLD_STRONG = "rgba(140,122,79,.35)";
const CARD_BLACK = "rgba(10,10,10,.56)";
const CARD_BLACK_SOFT = "rgba(10,10,10,.44)";
const INDIGO_WASH = "rgba(28,34,51,.24)";

type GateState = "locked" | "pending" | "verified";
type TaskState = "not_started" | "pending" | "completed";

interface Task {
  id: string;
  name: string;
  points: number;
  state: TaskState;
}

interface Gate {
  x: GateState;
}

// ─── Primitives ──────────────────────────────────────────────────

function PillTag({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full border px-5 py-2 text-[11px] uppercase"
      style={{
        borderColor: "rgba(140,122,79,.28)",
        background: "rgba(10,10,10,.36)",
        color: GOLD,
        letterSpacing: "0.32em",
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({
  children,
  tracking = 0.35,
  style,
}: {
  children: React.ReactNode;
  tracking?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="text-[12px] uppercase"
      style={{ color: GOLD, letterSpacing: `${tracking}em`, ...style }}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  disabled,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "soft";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const base = {
    background:
      variant === "primary" ? CRIMSON : "transparent",
    color: variant === "outline" ? GOLD : BONE,
    border:
      variant === "outline"
        ? `1px solid ${GOLD}`
        : variant === "soft"
          ? `1px solid ${BORDER_GOLD_STRONG}`
          : "none",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={base}
    >
      {children}
    </button>
  );
}

// ─── Sections ───────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b"
      style={{ borderColor: BORDER_GOLD }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(122,15,20,.2), transparent 50%)," +
            "linear-gradient(180deg, rgba(10,10,10,.4), rgba(10,10,10,1))",
        }}
      />
      <Grain opacity={0.05} />
      <div className="relative mx-auto max-w-[1040px] px-6 pb-20 pt-28 text-center">
        <ScrollReveal>
          <h1
            className="m-0"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(52px, 9vw, 96px)",
              letterSpacing: "0.12em",
              lineHeight: 1,
              color: BONE,
            }}
          >
            THE WATCHTOWER
          </h1>
          <p
            className="mt-6 italic"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              color: "rgba(232,228,220,.9)",
              lineHeight: 1.4,
            }}
          >
            Earn presence. The order counts every trace.
          </p>
          <p
            className="mx-auto mt-5 max-w-[540px] text-[14px] leading-[1.8]"
            style={{ color: "rgba(255,255,255,.6)" }}
          >
            One hundred slots decided by the leaderboard. One hundred more drawn
            from those below. Submitted answers on the trial unlock a second
            track.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

function GateRow({
  icon,
  name,
  state,
  onVerify,
}: {
  icon: React.ReactNode;
  name: string;
  state: GateState;
  onVerify: () => void;
}) {
  const labelForState: Record<GateState, string> = {
    verified: "Verified",
    pending: "Pending",
    locked: "Locked",
  };
  return (
    <div
      className="flex items-center gap-4 rounded-[20px] border px-5 py-4"
      style={{ borderColor: BORDER_GOLD, background: CARD_BLACK }}
    >
      <div
        className="shrink-0 rounded-full"
        style={{
          width: 10,
          height: 10,
          background: state === "verified" ? GOLD : "rgba(140,122,79,.3)",
          animation:
            state === "pending"
              ? "surv-pulse-gold 2400ms ease-out infinite"
              : "none",
        }}
      />
      <span style={{ color: BONE, opacity: 0.88 }}>{icon}</span>
      <div className="flex-1">
        <div className="text-[15px]" style={{ color: BONE }}>
          {name}
        </div>
        <div
          className="mt-1 text-[10px] uppercase"
          style={{ color: "rgba(255,255,255,.45)", letterSpacing: "0.28em" }}
        >
          {labelForState[state]}
        </div>
      </div>
      {state === "verified" ? (
        <Button variant="soft" disabled>
          Verified
        </Button>
      ) : (
        <Button onClick={onVerify}>Verify</Button>
      )}
    </div>
  );
}

function Gate({
  gate,
  onVerify,
}: {
  gate: Gate;
  onVerify: (key: keyof Gate) => void;
}) {
  return (
    <section className="border-b" style={{ borderColor: BORDER_GOLD }}>
      <div className="mx-auto max-w-[1040px] px-6 py-20">
        <ScrollReveal>
          <div className="mb-9 max-w-[680px]">
            <Eyebrow style={{ marginBottom: 14 }}>The Gate</Eyebrow>
            <h2
              className="m-0"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 4vw, 44px)",
                fontWeight: 500,
                lineHeight: 1.1,
                color: BONE,
              }}
            >
              One threshold. Cross it to earn.
            </h2>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <div className="grid gap-3">
            <GateRow
              icon={<IconX />}
              name="Follow @survivorsoneth on X"
              state={gate.x}
              onVerify={() => onVerify("x")}
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function Status({
  wallet,
  points,
  rank,
  total,
  locked,
}: {
  wallet: string;
  points: number;
  rank: number;
  total: number;
  locked: boolean;
}) {
  return (
    <section className="border-b" style={{ borderColor: BORDER_GOLD }}>
      <div className="mx-auto max-w-[1040px] px-6 py-16">
        <ScrollReveal>
          <div
            className="grid items-center gap-6 rounded-[2rem] border p-7 md:grid-cols-[1.1fr_1fr_1fr]"
            style={{ borderColor: BORDER_GOLD, background: CARD_BLACK }}
          >
            <div>
              <Eyebrow tracking={0.3} style={{ marginBottom: 10 }}>
                Wallet
              </Eyebrow>
              <div
                className="font-mono text-[16px]"
                style={{ color: BONE, fontFamily: "ui-monospace, Menlo, monospace" }}
              >
                {wallet}
              </div>
            </div>
            <div>
              <Eyebrow tracking={0.3} style={{ marginBottom: 10 }}>
                Points
              </Eyebrow>
              <div
                className="font-medium"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 42,
                  color: BONE,
                }}
              >
                {locked ? "···" : points.toLocaleString()}
              </div>
            </div>
            <div>
              <Eyebrow tracking={0.3} style={{ marginBottom: 10 }}>
                Rank
              </Eyebrow>
              <div
                className="font-medium"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 42,
                  color: BONE,
                }}
              >
                {locked ? "···" : `#${rank}`}
                <span
                  className="ml-1.5 text-[18px]"
                  style={{ color: "rgba(255,255,255,.45)" }}
                >
                  {locked ? "" : ` / ${total.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
          <div
            className="mt-3 text-right text-[11px] uppercase"
            style={{ color: "rgba(255,255,255,.45)", letterSpacing: "0.3em" }}
          >
            {locked ? "Cross the gate to unlock" : "Updates at T-5"}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function TaskCard({
  task,
  locked,
  onVerify,
}: {
  task: Task;
  locked: boolean;
  onVerify: (id: string) => void;
}) {
  const chip =
    task.state === "completed"
      ? { label: "Completed", border: BORDER_GOLD_STRONG, color: GOLD, pulse: false }
      : task.state === "pending"
        ? { label: "Pending", border: BORDER_GOLD_MD, color: GOLD, pulse: true }
        : {
            label: "Not started",
            border: "rgba(255,255,255,.12)",
            color: "rgba(255,255,255,.55)",
            pulse: false,
          };
  return (
    <div
      className="flex flex-col gap-3 rounded-[1.5rem] border p-5"
      style={{
        minHeight: 168,
        borderColor: BORDER_GOLD,
        background: locked ? "rgba(10,10,10,.34)" : CARD_BLACK,
        opacity: locked ? 0.45 : 1,
      }}
    >
      <div className="text-[14px] leading-[1.4]" style={{ color: BONE }}>
        {task.name}
      </div>
      <div
        className="font-medium"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 38,
          lineHeight: 1,
          color: GOLD,
        }}
      >
        {task.points}
      </div>
      <div
        className="inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-[9px] uppercase"
        style={{
          borderColor: chip.border,
          color: chip.color,
          letterSpacing: "0.28em",
        }}
      >
        {chip.pulse ? (
          <span
            className="block rounded-full"
            style={{
              width: 6,
              height: 6,
              background: GOLD,
              animation: "surv-pulse-gold 2400ms ease-out infinite",
            }}
          />
        ) : null}
        {chip.label}
      </div>
      <div className="mt-auto">
        {task.state === "completed" ? (
          <Button variant="soft" disabled className="w-full">
            Done
          </Button>
        ) : task.state === "pending" ? (
          <Button variant="soft" disabled className="w-full">
            Pending
          </Button>
        ) : (
          <Button
            onClick={() => !locked && onVerify(task.id)}
            disabled={locked}
            className="w-full"
          >
            Verify
          </Button>
        )}
      </div>
    </div>
  );
}

function TaskCatalog({
  tasks,
  locked,
  onVerify,
}: {
  tasks: Task[];
  locked: boolean;
  onVerify: (id: string) => void;
}) {
  return (
    <section className="border-b" style={{ borderColor: BORDER_GOLD }}>
      <div className="mx-auto max-w-[1040px] px-6 py-20">
        <ScrollReveal>
          <div className="mb-9 max-w-[680px]">
            <Eyebrow style={{ marginBottom: 14 }}>Tasks</Eyebrow>
            <h2
              className="m-0"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 4vw, 44px)",
                fontWeight: 500,
                lineHeight: 1.1,
                color: BONE,
              }}
            >
              Presence is earned in small, repeated acts.
            </h2>
          </div>
        </ScrollReveal>
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((t, i) => (
            <ScrollReveal key={t.id} delay={i * 40}>
              <TaskCard task={t} locked={locked} onVerify={onVerify} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Leaderboard({
  rows,
}: {
  rows: { wallet: string; points: number }[];
}) {
  return (
    <section className="border-b" style={{ borderColor: BORDER_GOLD }}>
      <div className="mx-auto max-w-[1040px] px-6 py-20">
        <ScrollReveal>
          <div className="mb-9 max-w-[680px]">
            <Eyebrow style={{ marginBottom: 14 }}>Leaderboard · Top 10</Eyebrow>
            <h2
              className="m-0"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 4vw, 44px)",
                fontWeight: 500,
                lineHeight: 1.1,
                color: BONE,
              }}
            >
              The top hundred walk. The next hundred are drawn.
            </h2>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <div
            className="overflow-hidden rounded-[20px] border"
            style={{ borderColor: BORDER_GOLD, background: CARD_BLACK_SOFT }}
          >
            <div
              className="grid border-b px-6 py-3.5 text-[10px] uppercase"
              style={{
                gridTemplateColumns: "80px 1fr 140px",
                borderColor: "rgba(140,122,79,.14)",
                background: "rgba(28,34,51,.18)",
                color: GOLD,
                letterSpacing: "0.3em",
              }}
            >
              <div>Rank</div>
              <div>Wallet</div>
              <div className="text-right">Points</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.wallet}
                className="grid items-center px-6 py-3.5 text-[14px]"
                style={{
                  gridTemplateColumns: "80px 1fr 140px",
                  color: "rgba(232,228,220,.85)",
                  borderBottom:
                    i === rows.length - 1
                      ? "none"
                      : "1px solid rgba(140,122,79,.1)",
                }}
              >
                <div
                  className="font-mono text-[13px] tabular-nums"
                  style={{ color: GOLD, fontFamily: "ui-monospace, Menlo, monospace" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="font-mono text-[13px]"
                  style={{ fontFamily: "ui-monospace, Menlo, monospace" }}
                >
                  {r.wallet}
                </div>
                <div
                  className="text-right tabular-nums"
                  style={{ color: BONE }}
                >
                  {r.points.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center">
            <span
              className="text-[11px] uppercase"
              style={{ color: GOLD, letterSpacing: "0.3em" }}
            >
              Full leaderboard →
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <section>
      <div className="mx-auto max-w-[1040px] px-6 py-20 text-center">
        <ScrollReveal>
          <div
            className="rounded-[2rem] border p-10"
            style={{ borderColor: BORDER_GOLD, background: INDIGO_WASH }}
          >
            <div
              className="mb-4 text-[13px] uppercase"
              style={{ color: GOLD, letterSpacing: "0.32em" }}
            >
              A second track
            </div>
            <div
              className="mb-6 font-medium"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 30,
                color: BONE,
                lineHeight: 1.2,
              }}
            >
              Submit answers on /quiz to unlock an additional track.
            </div>
            <Link
              href="/quiz"
              className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-[13px] font-medium transition-opacity hover:opacity-90"
              style={{ borderColor: GOLD, color: GOLD, background: "transparent" }}
            >
              Enter the Trial
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─── Page assembly ──────────────────────────────────────────────

const initialTasks: Task[] = [
  { id: "daily", name: "Quote the daily scroll", points: 120, state: "not_started" },
  { id: "repost", name: "Repost the ultimatum", points: 250, state: "pending" },
  { id: "invite", name: "Invite one survivor", points: 500, state: "completed" },
  { id: "bio", name: "Pin the oath in your bio", points: 150, state: "not_started" },
  { id: "thread", name: "Write a thread on signal", points: 400, state: "not_started" },
  { id: "reply", name: "Reply to Ashborn", points: 80, state: "completed" },
];

const leaderboardRows = [
  { wallet: "0x8a3f…d21b", points: 8420 },
  { wallet: "0xc5d1…9f4a", points: 7915 },
  { wallet: "0x124b…77c9", points: 7280 },
  { wallet: "0xa4e0…b12e", points: 6945 },
  { wallet: "0x33ac…11d4", points: 6410 },
  { wallet: "0xbf8c…0a62", points: 5820 },
  { wallet: "0x7ed2…c4e8", points: 5410 },
  { wallet: "0x21fa…6b05", points: 4998 },
  { wallet: "0x9c7b…02ef", points: 4722 },
  { wallet: "0x6045…feaa", points: 4510 },
];

export function RaffleClient() {
  const [gate, setGate] = useState<Gate>({ x: "pending" });
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const locked = gate.x !== "verified";

  const verifyGate = (key: keyof Gate) =>
    setGate((g) => ({ ...g, [key]: "verified" }));
  const verifyTask = (id: string) =>
    setTasks((ts) =>
      ts.map((t) => (t.id === id ? { ...t, state: "pending" } : t))
    );

  return (
    <>
      <Hero />
      <Gate gate={gate} onVerify={verifyGate} />
      <Status
        wallet="0x8a3f…d21b"
        points={3240}
        rank={47}
        total={3220}
        locked={locked}
      />
      <TaskCatalog tasks={tasks} locked={locked} onVerify={verifyTask} />
      <Leaderboard rows={leaderboardRows} />
      <FooterCTA />
    </>
  );
}
