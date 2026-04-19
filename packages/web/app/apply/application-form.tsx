"use client";

import { useActionState, useMemo, useState } from "react";
import { submitApplication, type FormState } from "./actions";
import { QUESTIONS } from "@/lib/schema";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "@/lib/spam";

const initialState: FormState = { status: "idle" };

const GOLD = "#8C7A4F";
const CRIMSON = "#7A0F14";
const BONE = "#E8E4DC";

export function ApplicationForm() {
  const [state, action, pending] = useActionState(submitApplication, initialState);
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
          Signal received
        </div>
        <div className="mb-4 text-3xl md:text-4xl">
          Your answers are now part of the filter.
        </div>
        <p className="mx-auto max-w-xl text-sm leading-7 text-white/65">
          Selection is not immediate. The Seventh reviews every entry against
          wallet behavior, presence, and the standard of the order. Silence does
          not mean absence.
        </p>
      </div>
    );
  }

  const fieldErrors =
    state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form
      action={action}
      className="rounded-[2rem] border p-6 md:p-8"
      style={{
        borderColor: "rgba(140,122,79,.2)",
        background: "rgba(10,10,10,.56)",
      }}
    >
      {/* Honeypot — hidden from humans, visible to naive bots. */}
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

      {/* Time gate — records when the form was rendered. */}
      <input type="hidden" name={TIMESTAMP_FIELD} value={openedAt} />

      <div className="grid gap-5 md:grid-cols-2">
        {QUESTIONS.map((q, i) => {
          // Name sits half-width; all narrative answers go full-width.
          const wide = i >= 1;
          const err = fieldErrors[q.id];
          const count = counts[q.id] ?? 0;
          const near = count > q.max * 0.85;
          return (
            <div key={q.id} className={wide ? "md:col-span-2" : ""}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <label
                  htmlFor={q.id}
                  className="block text-sm uppercase tracking-[0.25em]"
                  style={{ color: GOLD }}
                >
                  {q.label}
                  {!q.required ? (
                    <span className="ml-2 text-white/35 normal-case tracking-normal">
                      (optional)
                    </span>
                  ) : null}
                </label>
                {q.type === "textarea" ? (
                  <span
                    className="text-[10px] tabular-nums tracking-[0.15em] uppercase"
                    style={{ color: near ? "#e8a0a4" : "rgba(232,228,220,.35)" }}
                  >
                    {count} / {q.max}
                  </span>
                ) : null}
              </div>

              {q.type === "textarea" ? (
                <textarea
                  id={q.id}
                  name={q.id}
                  rows={5}
                  placeholder={q.placeholder}
                  required={q.required}
                  minLength={q.required ? q.min : undefined}
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
              ) : (
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
                  className="w-full rounded-2xl border bg-transparent p-4 text-base text-white/90 outline-none transition placeholder:text-white/30 focus:border-white/30"
                  style={{
                    borderColor: err
                      ? "rgba(122,15,20,.6)"
                      : "rgba(140,122,79,.18)",
                    background: "rgba(28,34,51,.16)",
                  }}
                />
              )}
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-white/45">
          Selection is not immediate. Silence does not mean absence.
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: CRIMSON, color: BONE }}
        >
          {pending ? "Sending Signal…" : "Submit Signal"}
        </button>
      </div>
    </form>
  );
}
