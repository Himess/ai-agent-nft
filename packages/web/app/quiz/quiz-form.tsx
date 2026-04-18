"use client";

import { useActionState, useMemo, useState } from "react";
import { submitQuiz, type QuizFormState } from "./actions";
import { QUIZ_IDENTITY, QUIZ_QUESTIONS } from "@/lib/quiz-schema";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "@/lib/spam";

const initialState: QuizFormState = { status: "idle" };

const GOLD = "#8C7A4F";
const CRIMSON = "#7A0F14";
const BONE = "#E8E4DC";

export function QuizForm() {
  const [state, action, pending] = useActionState(submitQuiz, initialState);
  const openedAt = useMemo(() => Date.now(), []);
  const [counts, setCounts] = useState<Record<string, number>>({});

  if (state.status === "success") {
    return (
      <div
        className="rounded-[2rem] border p-10 text-center"
        style={{
          borderColor: "rgba(140,122,79,.2)",
          background: "rgba(10,10,10,.56)",
        }}
      >
        <div
          className="mb-4 text-xs uppercase tracking-[0.35em]"
          style={{ color: GOLD }}
        >
          Answers received
        </div>
        <div className="mb-4 text-3xl md:text-4xl">
          The Seventh reads in silence.
        </div>
        <p className="mx-auto max-w-xl text-sm leading-7 text-white/65">
          Results are not revealed one by one. Five days before mint, the chosen
          walk forward. No appeals, no scores, no explanations — only the list.
        </p>
      </div>
    );
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form
      action={action}
      className="rounded-[2rem] border p-6 md:p-8"
      style={{
        borderColor: "rgba(140,122,79,.2)",
        background: "rgba(10,10,10,.56)",
      }}
    >
      {/* Honeypot */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor={HONEYPOT_FIELD}>Do not fill this field.</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <input type="hidden" name={TIMESTAMP_FIELD} value={openedAt} />

      {/* Identity row */}
      <div className="grid gap-5 md:grid-cols-2">
        {QUIZ_IDENTITY.map((q) => {
          const err = fieldErrors[q.id];
          return (
            <div key={q.id}>
              <label
                htmlFor={q.id}
                className="mb-3 block text-sm uppercase tracking-[0.25em]"
                style={{ color: GOLD }}
              >
                {q.label}
              </label>
              <input
                id={q.id}
                name={q.id}
                type="text"
                placeholder={q.placeholder}
                required={q.required}
                minLength={q.min}
                maxLength={q.max}
                disabled={pending}
                autoComplete="off"
                spellCheck={q.id === "wallet" ? false : undefined}
                className="w-full rounded-2xl border bg-transparent p-4 text-base text-white/90 outline-none transition placeholder:text-white/30 focus:border-white/30"
                style={{
                  borderColor: err
                    ? "rgba(122,15,20,.6)"
                    : "rgba(140,122,79,.18)",
                  background: "rgba(28,34,51,.16)",
                  fontFamily:
                    q.id === "wallet" ? "ui-monospace, monospace" : undefined,
                }}
              />
              {err ? (
                <div className="mt-2 text-xs" style={{ color: "#e8a0a4" }}>
                  {err}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div
        className="my-8 h-px w-full"
        style={{ background: "rgba(140,122,79,.2)" }}
      />

      {/* Quiz questions */}
      <div className="grid gap-5">
        {QUIZ_QUESTIONS.map((q, i) => {
          const err = fieldErrors[q.id];
          const count = counts[q.id] ?? 0;
          const near = count > q.max * 0.85;
          return (
            <div key={q.id}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <label
                  htmlFor={q.id}
                  className="block text-sm"
                  style={{ color: BONE }}
                >
                  <span
                    className="mr-3 text-xs tabular-nums"
                    style={{ color: GOLD }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {q.label}
                </label>
                <span
                  className="text-[10px] tabular-nums tracking-[0.15em] uppercase"
                  style={{ color: near ? "#e8a0a4" : "rgba(232,228,220,.35)" }}
                >
                  {count} / {q.max}
                </span>
              </div>
              <textarea
                id={q.id}
                name={q.id}
                rows={q.max > 500 ? 6 : 4}
                placeholder={q.placeholder}
                required={q.required}
                minLength={q.min}
                maxLength={q.max}
                disabled={pending}
                onChange={(e) =>
                  setCounts((c) => ({ ...c, [q.id]: e.target.value.length }))
                }
                className="w-full resize-none rounded-2xl border bg-transparent p-4 text-base text-white/90 outline-none transition placeholder:text-white/30 focus:border-white/30"
                style={{
                  borderColor: err
                    ? "rgba(122,15,20,.6)"
                    : "rgba(140,122,79,.18)",
                  background: "rgba(28,34,51,.16)",
                }}
              />
              {err ? (
                <div className="mt-2 text-xs" style={{ color: "#e8a0a4" }}>
                  {err}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {state.status === "error" && !state.fieldErrors ? (
        <div
          className="mt-6 rounded-2xl border p-4 text-sm"
          style={{
            borderColor: "rgba(122,15,20,.45)",
            background: "rgba(122,15,20,.12)",
            color: "#f1cccd",
          }}
        >
          {state.message}
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-white/45">
          One wallet. One submission. No edits after send.
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: CRIMSON, color: BONE }}
        >
          {pending ? "Sending Answers…" : "Submit Answers"}
        </button>
      </div>
    </form>
  );
}
