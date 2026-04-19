"use client";

import { useSession } from "next-auth/react";

const GOLD = "#8C7A4F";
const CRIMSON = "#7A0F14";
const BONE = "#E8E4DC";

/**
 * Connect X button — only shown when the wallet is authed via SIWE but the
 * Twitter side hasn't been linked yet. Clicking it bounces the user through
 * `/api/auth/twitter/start`, which handles the PKCE hop and redirects back.
 */
export function TwitterLinkButton() {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user?.wallet) return null;
  if (session.user.twitterLinked) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px]"
        style={{
          borderColor: "rgba(140,122,79,.35)",
          color: BONE,
          background: "rgba(10,10,10,.35)",
          fontFamily: "ui-monospace, Menlo, monospace",
          letterSpacing: "0.05em",
        }}
      >
        <span
          className="block rounded-full"
          style={{
            width: 8,
            height: 8,
            background: GOLD,
            boxShadow: "0 0 8px rgba(140,122,79,.6)",
          }}
        />
        @{session.user.twitterHandle}
      </div>
    );
  }
  return (
    <a
      href="/api/auth/twitter/start"
      className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
      style={{ background: CRIMSON, color: BONE }}
    >
      Connect X
    </a>
  );
}
