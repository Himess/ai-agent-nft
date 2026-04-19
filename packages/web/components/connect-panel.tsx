"use client";

import { SurvConnectButton } from "./connect-button";
import { TwitterLinkButton } from "./twitter-link-button";

const GOLD = "#8C7A4F";
const BONE = "#E8E4DC";
const BORDER_GOLD = "rgba(140,122,79,.18)";
const CARD_BLACK = "rgba(10,10,10,.56)";

const COPY = {
  wallet: {
    eyebrow: "The Gate",
    title: "Connect your wallet first.",
    body:
      "Ownership has to be proven before you step inside. Sign the message. No funds move, no approvals granted. Only the signature, held by us as your mark.",
    hint: "The wallet you sign with is the wallet that mints later.",
  },
  twitter: {
    eyebrow: "The Gate",
    title: "Now link your X account.",
    body:
      "Social signal matters. Bind the X account that carries your presence to the wallet you just signed with. Ashborn reads the link. You cannot rewrite it later.",
    hint: "One X account. One wallet. Permanent binding.",
  },
} as const;

export function ConnectPanel({ step }: { step: "wallet" | "twitter" }) {
  const copy = COPY[step];
  return (
    <div
      className="rounded-[2rem] border p-8 md:p-12"
      style={{ borderColor: BORDER_GOLD, background: CARD_BLACK }}
    >
      <div
        className="mb-5 text-[11px] uppercase"
        style={{ color: GOLD, letterSpacing: "0.35em" }}
      >
        {copy.eyebrow}
      </div>
      <h2
        className="mb-5 italic"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 3.6vw, 44px)",
          lineHeight: 1.1,
          color: BONE,
        }}
      >
        {copy.title}
      </h2>
      <p className="mb-8 max-w-xl text-base leading-[1.85] text-white/70">
        {copy.body}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {step === "wallet" ? <SurvConnectButton /> : <TwitterLinkButton />}
      </div>
      <div
        className="mt-6 text-[11px] uppercase"
        style={{ color: "rgba(255,255,255,.35)", letterSpacing: "0.3em" }}
      >
        {copy.hint}
      </div>
    </div>
  );
}
