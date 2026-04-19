"use client";

import Image from "next/image";
import { useState } from "react";
import type { SevenEntry } from "./seven-card";
import { Grain } from "./motion";

const GOLD = "#8C7A4F";
const BONE = "#E8E4DC";
const CRIMSON = "#7A0F14";
const BORDER_GOLD = "rgba(140,122,79,.18)";
const BORDER_GOLD_STRONG = "rgba(140,122,79,.35)";

/**
 * SevenEditorial — featured portrait + rotating dossier panel + a
 * thumbstrip selector below. Client-side because the active index is
 * user-controlled state; everything above/below this component on the
 * landing page stays server-rendered.
 */
export function SevenEditorial({ entries }: { entries: SevenEntry[] }) {
  const [active, setActive] = useState(0);
  const current = entries[active];
  const isRevealed = current.kind === "revealed";

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      {/* Portrait plate */}
      <div
        className="relative overflow-hidden rounded-[1.25rem] border"
        style={{
          aspectRatio: "5 / 6",
          borderColor: BORDER_GOLD_STRONG,
          background: "#0a0a0a",
        }}
      >
        {isRevealed ? (
          <Image
            src={current.image}
            alt={current.title}
            fill
            sizes="(min-width: 1024px) 54vw, 92vw"
            className="object-cover"
            style={{ filter: "contrast(1.05) brightness(.88)" }}
            priority
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(122,15,20,.25), rgba(10,10,10,.95))",
            }}
          >
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full border text-xs uppercase"
              style={{
                borderColor: GOLD,
                color: GOLD,
                letterSpacing: "0.4em",
              }}
            >
              Sealed
            </div>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,10,.1) 40%, rgba(10,10,10,.92) 100%)",
          }}
        />
        <Grain opacity={0.08} />

        {/* Crest corners */}
        {(["tl", "tr", "bl", "br"] as const).map((pos) => (
          <div
            key={pos}
            className="absolute"
            style={{
              top: pos[0] === "t" ? 16 : "auto",
              bottom: pos[0] === "b" ? 16 : "auto",
              left: pos[1] === "l" ? 16 : "auto",
              right: pos[1] === "r" ? 16 : "auto",
              width: 18,
              height: 18,
              borderTop: pos[0] === "t" ? `1px solid ${GOLD}` : "none",
              borderBottom: pos[0] === "b" ? `1px solid ${GOLD}` : "none",
              borderLeft: pos[1] === "l" ? `1px solid ${GOLD}` : "none",
              borderRight: pos[1] === "r" ? `1px solid ${GOLD}` : "none",
            }}
          />
        ))}

        {/* Foot band */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-8 pb-8 pt-7"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(10,10,10,.92) 50%)",
          }}
        >
          <div className="min-w-0 flex-1">
            <div
              className="mb-2 text-[10px] uppercase"
              style={{ color: GOLD, letterSpacing: "0.4em" }}
            >
              Fragment 0{current.index + 1}
            </div>
            <div
              className="text-3xl italic leading-tight"
              style={{ fontFamily: "var(--font-display)", color: BONE }}
            >
              {isRevealed ? current.title : "Unrevealed"}
            </div>
          </div>
          <div
            className="flex-shrink-0 text-right text-[10px] uppercase"
            style={{ color: "rgba(255,255,255,.45)", letterSpacing: "0.35em" }}
          >
            0{current.index + 1}
            <br />
            of seven
          </div>
        </div>
      </div>

      {/* Dossier panel */}
      <div className="flex flex-col justify-between gap-6">
        <div>
          <div
            className="mb-5 text-[10px] uppercase"
            style={{ color: GOLD, letterSpacing: "0.4em" }}
          >
            Dossier
          </div>
          <div
            className="italic"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 44,
              color: BONE,
              lineHeight: 1.15,
            }}
          >
            {isRevealed
              ? current.tagline
              : "Two of the Seven remain unseen. Selection does not show itself all at once."}
          </div>
          <div
            className="mt-14 grid gap-x-6 gap-y-4 border-t pt-7"
            style={{
              borderColor: BORDER_GOLD,
              gridTemplateColumns: "auto 1fr",
            }}
          >
            {(
              [
                ["Fragment", `0${current.index + 1} / 07`],
                ["Archetype", isRevealed ? current.title : "Sealed"],
                ["Status", isRevealed ? "Revealed" : "Awaiting cycle"],
                ["Signal", isRevealed ? "Observed" : "Pending"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <div
                  className="text-[10px] uppercase"
                  style={{ color: GOLD, letterSpacing: "0.35em" }}
                >
                  {k}
                </div>
                <div
                  className="italic"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    color: BONE,
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className="border-t pt-5 text-[11px] uppercase"
          style={{
            borderColor: BORDER_GOLD,
            color: "rgba(255,255,255,.45)",
            letterSpacing: "0.35em",
          }}
        >
          Ashborn reads every fragment before the list is drawn.
        </div>
      </div>

      {/* Thumbstrip — full-width row below the plate + dossier */}
      <div className="grid gap-2.5 lg:col-span-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {entries.map((e) => {
          const isActive = e.index === active;
          const rev = e.kind === "revealed";
          return (
            <button
              key={e.index}
              type="button"
              onClick={() => setActive(e.index)}
              className="relative cursor-pointer overflow-hidden p-0 transition-all"
              style={{
                aspectRatio: "3 / 4",
                border: "none",
                borderRadius: 10,
                boxShadow: isActive
                  ? `0 0 0 1px ${GOLD}, 0 10px 30px rgba(0,0,0,.6)`
                  : `0 0 0 1px ${BORDER_GOLD}`,
                opacity: isActive ? 1 : 0.55,
                background: "#0a0a0a",
              }}
              onMouseEnter={(ev) => (ev.currentTarget.style.opacity = "1")}
              onMouseLeave={(ev) =>
                (ev.currentTarget.style.opacity = isActive ? "1" : "0.55")
              }
              aria-label={`Fragment 0${e.index + 1}`}
            >
              {rev ? (
                <Image
                  src={e.image}
                  alt=""
                  fill
                  sizes="14vw"
                  className="object-cover"
                  style={{ filter: "grayscale(.2) contrast(1.05)" }}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center text-[9px] uppercase"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(122,15,20,.3), rgba(10,10,10,.95))",
                    color: GOLD,
                    letterSpacing: "0.35em",
                  }}
                >
                  Sealed
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 50%, rgba(10,10,10,.92))",
                }}
              />
              <div className="absolute inset-x-2 bottom-2 flex items-end justify-between">
                <span
                  className="text-[9px] uppercase"
                  style={{ color: GOLD, letterSpacing: "0.35em" }}
                >
                  0{e.index + 1}
                </span>
                {isActive ? (
                  <span
                    className="block"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 9999,
                      background: CRIMSON,
                      boxShadow: `0 0 10px ${CRIMSON}`,
                    }}
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
