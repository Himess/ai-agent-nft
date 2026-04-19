"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitQuiz, type QuizFormState } from "./actions";
import { QUIZ_QUESTIONS, type QuizQuestionId } from "@/lib/quiz-schema";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "@/lib/spam";

const GOLD = "#8C7A4F";
const CRIMSON = "#7A0F14";
const BONE = "#E8E4DC";
const BORDER_GOLD = "rgba(140,122,79,.18)";
const CARD_BLACK = "rgba(10,10,10,.56)";

// ─── Agent reply pool ──────────────────────────────────────────
// Pre-scripted. Short. Ritualistic. Never encouraging in the "great job!" sense.
// Three registers — the chat alternates between them with a slight bias toward
// "reflect" on heavy questions (collapse, scroll) and "press" on judgment calls.

const REPLIES = {
  receive: ["Noted.", "Held.", "Carried.", "Recognized.", "The Seventh reads this."],
  press:   ["Hmm. And now this —", "One more fragment.", "Turn.", "Another — sharper.", "Go on."],
  reflect: ["That carries weight.", "The order remembers.", "Signal — faint, but there.", "Deeper than it looked.", "Kept."],
} as const;

// Per-question register bias.
const REGISTER_PER_Q: ReadonlyArray<keyof typeof REPLIES> = [
  "receive", "reflect", "receive", "press", "press",
  "receive", "reflect", "press",  "reflect", "receive",
];

function randomFrom<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

// ─── Chat message type ────────────────────────────────────────

type Message =
  | { id: string; role: "agent"; kind: "intro" | "question" | "reply" | "outro"; text: string }
  | { id: string; role: "user";  kind: "answer"; text: string };

// Steps: 1..10 = question i-1 of QUIZ_QUESTIONS, 11 = final submit state.
const FIRST_Q_STEP = 1;
const LAST_Q_STEP  = FIRST_Q_STEP + QUIZ_QUESTIONS.length - 1; // 10
const SUBMIT_STEP  = LAST_Q_STEP + 1;                          // 11

// ─── Intro / outro copy ───────────────────────────────────────

const INTRO: Message = {
  id: "intro",
  role: "agent",
  kind: "intro",
  text:
    "The Seventh acknowledges you. Ten questions follow. No scores are revealed. Speak plainly.",
};

const OUTRO: Message = {
  id: "outro",
  role: "agent",
  kind: "outro",
  text:
    "Signal received. Your answers are held. The list closes when the list is full. Do not ask twice.",
};

// ─── Typing indicator ─────────────────────────────────────────

function TypingDots() {
  return (
    <div className="inline-flex items-center gap-1.5" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block rounded-full"
          style={{
            width: 6,
            height: 6,
            background: GOLD,
            opacity: 0.6,
            animation: `surv-sealed-pulse 1200ms ease-in-out ${i * 150}ms infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Message bubbles ──────────────────────────────────────────

function AgentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[10px] uppercase"
        style={{
          borderColor: GOLD,
          color: GOLD,
          letterSpacing: "0.3em",
          background: "rgba(10,10,10,.6)",
        }}
      >
        VII
      </div>
      <div
        className="max-w-[640px] rounded-2xl rounded-tl-sm border px-5 py-4"
        style={{
          borderColor: BORDER_GOLD,
          background: CARD_BLACK,
          color: BONE,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-end gap-4">
      <div
        className="max-w-[640px] rounded-2xl rounded-tr-sm border px-5 py-4"
        style={{
          borderColor: "rgba(122,15,20,.35)",
          background: "rgba(122,15,20,.1)",
          color: BONE,
        }}
      >
        <div className="whitespace-pre-wrap text-[15px] leading-[1.65]">
          {children}
        </div>
      </div>
      <div
        className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[10px] uppercase"
        style={{
          borderColor: "rgba(232,228,220,.3)",
          color: "rgba(232,228,220,.7)",
          letterSpacing: "0.25em",
          background: "rgba(10,10,10,.6)",
        }}
      >
        You
      </div>
    </div>
  );
}

// ─── Answer composer ──────────────────────────────────────────

function AnswerComposer({
  question,
  onSubmit,
  disabled,
}: {
  question: (typeof QUIZ_QUESTIONS)[number];
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const near = text.length > question.max * 0.85;

  function handle(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (v.length < question.min) {
      setError(`At least ${question.min} characters.`);
      return;
    }
    if (v.length > question.max) {
      setError(`At most ${question.max} characters.`);
      return;
    }
    setError(null);
    onSubmit(v);
    setText("");
  }

  return (
    <form
      onSubmit={handle}
      className="rounded-2xl border p-4"
      style={{ borderColor: BORDER_GOLD, background: "rgba(10,10,10,.44)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[10px] uppercase"
          style={{ color: GOLD, letterSpacing: "0.3em" }}
        >
          Your answer
        </span>
        <span
          className="text-[10px] tabular-nums uppercase"
          style={{
            color: near ? "#e8a0a4" : "rgba(232,228,220,.4)",
            letterSpacing: "0.15em",
          }}
        >
          {text.length} / {question.max}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        rows={question.max > 500 ? 6 : 4}
        minLength={question.min}
        maxLength={question.max}
        placeholder={question.placeholder}
        className="w-full resize-none rounded-xl border bg-transparent p-3 text-[15px] text-white/90 outline-none transition placeholder:text-white/30 focus:border-white/30"
        style={{
          borderColor: error ? "rgba(122,15,20,.6)" : BORDER_GOLD,
          background: "rgba(28,34,51,.16)",
        }}
      />
      {error ? (
        <div className="mt-2 text-xs" style={{ color: "#e8a0a4" }}>
          {error}
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-full px-5 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: CRIMSON, color: BONE }}
        >
          Send
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────

const initialServerState: QuizFormState = { status: "idle" };

export function QuizChat() {
  const openedAt = useMemo(() => Date.now(), []);
  const [serverState, formAction, pending] = useActionState(
    submitQuiz,
    initialServerState
  );

  const [step, setStep] = useState<number>(FIRST_Q_STEP);
  const [answers, setAnswers] = useState<Partial<Record<QuizQuestionId, string>>>({});
  const [messages, setMessages] = useState<Message[]>([
    INTRO,
    {
      id: `q-${QUIZ_QUESTIONS[0].id}`,
      role: "agent",
      kind: "question",
      text: QUIZ_QUESTIONS[0].label,
    },
  ]);
  const [agentTyping, setAgentTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, agentTyping]);

  useEffect(() => {
    if (step === SUBMIT_STEP && formRef.current && serverState.status === "idle") {
      formRef.current.requestSubmit();
    }
  }, [step, serverState.status]);

  function pushMessage(m: Message) {
    setMessages((prev) => [...prev, m]);
  }

  async function advance(
    userText: string,
    nextStep: number,
    currentQ: (typeof QUIZ_QUESTIONS)[number]
  ) {
    pushMessage({
      id: `u-${step}-${Date.now()}`,
      role: "user",
      kind: "answer",
      text: userText,
    });

    setAgentTyping(true);
    await new Promise((r) => setTimeout(r, 600));

    const register =
      REGISTER_PER_Q[QUIZ_QUESTIONS.indexOf(currentQ) % REGISTER_PER_Q.length];
    const reply = randomFrom(REPLIES[register]);
    pushMessage({
      id: `a-reply-${step}-${Date.now()}`,
      role: "agent",
      kind: "reply",
      text: reply,
    });
    await new Promise((r) => setTimeout(r, 700));

    if (nextStep >= FIRST_Q_STEP && nextStep <= LAST_Q_STEP) {
      const nextQ = QUIZ_QUESTIONS[nextStep - FIRST_Q_STEP];
      pushMessage({
        id: `q-${nextQ.id}`,
        role: "agent",
        kind: "question",
        text: nextQ.label,
      });
    } else if (nextStep === SUBMIT_STEP) {
      pushMessage({ ...OUTRO, id: `outro-${Date.now()}` });
    }

    setAgentTyping(false);
    setStep(nextStep);
  }

  function handleAnswer(text: string) {
    if (step < FIRST_Q_STEP || step > LAST_Q_STEP) return;
    const q = QUIZ_QUESTIONS[step - FIRST_Q_STEP];
    setAnswers((a) => ({ ...a, [q.id]: text }));
    advance(text, step + 1, q);
  }

  const currentQ =
    step >= FIRST_Q_STEP && step <= LAST_Q_STEP
      ? QUIZ_QUESTIONS[step - FIRST_Q_STEP]
      : null;

  const progress =
    step > LAST_Q_STEP ? "Submitting" : `Question ${step} / ${QUIZ_QUESTIONS.length}`;

  if (serverState.status === "success") {
    return (
      <div
        className="rounded-[2rem] border p-10 text-center"
        style={{ borderColor: BORDER_GOLD, background: CARD_BLACK }}
      >
        <div
          className="mb-4 text-xs uppercase"
          style={{ color: GOLD, letterSpacing: "0.35em" }}
        >
          Signal received
        </div>
        <div
          className="mb-4 text-3xl italic md:text-4xl"
          style={{ fontFamily: "var(--font-display)", color: BONE }}
        >
          The Seventh reads in silence.
        </div>
        <p className="mx-auto max-w-xl text-sm leading-7 text-white/65">
          Results are not revealed one by one. Five days before mint, the chosen
          walk forward. No appeals, no scores, no explanations — only the list.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-5 rounded-[2rem] border p-5 md:p-8"
      style={{ borderColor: BORDER_GOLD, background: CARD_BLACK }}
    >
      <div className="flex items-center justify-between">
        <div
          className="text-[10px] uppercase"
          style={{ color: GOLD, letterSpacing: "0.3em" }}
        >
          The Trial · live
        </div>
        <div
          className="text-[10px] uppercase"
          style={{ color: "rgba(255,255,255,.5)", letterSpacing: "0.3em" }}
        >
          {progress}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-[56vh] flex-col gap-5 overflow-y-auto pr-2 md:max-h-[60vh]"
      >
        {messages.map((m) => {
          if (m.role === "agent") {
            const italic =
              m.kind === "intro" || m.kind === "reply" || m.kind === "outro";
            return (
              <AgentBubble key={m.id}>
                <div
                  className={italic ? "italic" : ""}
                  style={{
                    fontFamily: italic ? "var(--font-display)" : undefined,
                    fontSize: italic ? 20 : 16,
                    lineHeight: 1.55,
                  }}
                >
                  {m.text}
                </div>
              </AgentBubble>
            );
          }
          return <UserBubble key={m.id}>{m.text}</UserBubble>;
        })}
        {agentTyping ? (
          <AgentBubble>
            <TypingDots />
          </AgentBubble>
        ) : null}
      </div>

      <div className="mt-2">
        {agentTyping ? null : currentQ ? (
          <AnswerComposer
            key={currentQ.id}
            question={currentQ}
            onSubmit={handleAnswer}
            disabled={pending}
          />
        ) : step === SUBMIT_STEP ? (
          <div className="text-center text-sm text-white/60">
            {pending || serverState.status === "idle"
              ? "Sealing your answers…"
              : null}
          </div>
        ) : null}
      </div>

      {serverState.status === "error" ? (
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{
            borderColor: "rgba(122,15,20,.45)",
            background: "rgba(122,15,20,.12)",
            color: "#f1cccd",
          }}
        >
          {serverState.message}
        </div>
      ) : null}

      {/* Hidden form — populated from state, submitted once at the very end.
          Wallet + twitter come from the server-side session (authenticated
          via SIWE + X OAuth), so they're intentionally not in this form. */}
      <form ref={formRef} action={formAction} className="hidden">
        <input
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
        <input type="hidden" name={TIMESTAMP_FIELD} value={openedAt} />
        {QUIZ_QUESTIONS.map((q) => (
          <input
            key={q.id}
            type="hidden"
            name={q.id}
            value={answers[q.id] ?? ""}
          />
        ))}
      </form>
    </div>
  );
}
