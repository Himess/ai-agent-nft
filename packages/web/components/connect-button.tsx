"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

const GOLD = "#8C7A4F";
const CRIMSON = "#7A0F14";
const BONE = "#E8E4DC";

/**
 * Custom Connect button that matches the SURVIVORS design language.
 * Wraps RainbowKit's `ConnectButton.Custom` so we control every pixel
 * instead of inheriting their default button chrome.
 *
 * Three visible states:
 *   - not connected            → crimson "Connect" pill
 *   - wrong network            → crimson "Wrong network" pill
 *   - connected + signed (SIWE) → gold outline pill with truncated wallet
 *
 * The RainbowKit-SIWE-NextAuth provider auto-triggers message signing the
 * moment the wallet is linked, so there is no intermediate "sign" state
 * exposed here — the button remains the "connected" pill until auth
 * completes (or the user rejects, in which case RainbowKit handles retry).
 */
export function SurvConnectButton({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const authed =
          !!account &&
          !!chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            aria-hidden={!ready}
            style={{
              opacity: ready ? 1 : 0,
              pointerEvents: ready ? "auto" : "none",
              userSelect: ready ? "auto" : "none",
            }}
          >
            {(() => {
              if (!ready || !account || !chain) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ background: CRIMSON, color: BONE }}
                  >
                    {compact ? "Connect" : "Connect Wallet"}
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ background: CRIMSON, color: BONE }}
                  >
                    Wrong network
                  </button>
                );
              }
              // Connected but SIWE sign step was skipped / rejected. The
              // RainbowKit-SIWE adapter normally auto-prompts, but after a
              // rejected sign (or if cookies were cleared mid-session) the
              // user is left in "connected, unauthenticated" limbo — a plain
              // account pill does not tell them what to do. Surface an
              // explicit CTA that re-opens the connect modal so the verify
              // step re-fires.
              if (authenticationStatus === "unauthenticated") {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ background: CRIMSON, color: BONE }}
                  >
                    {compact ? "Sign" : "Sign to enter"}
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-white/30"
                  style={{
                    borderColor: authed
                      ? "rgba(140,122,79,.5)"
                      : "rgba(140,122,79,.25)",
                    color: authed ? BONE : GOLD,
                    background: "rgba(10,10,10,.35)",
                    fontFamily:
                      "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
                    fontSize: 12,
                    letterSpacing: "0.05em",
                  }}
                >
                  <span
                    className="block rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      background: authed ? GOLD : "rgba(140,122,79,.4)",
                      boxShadow: authed
                        ? "0 0 8px rgba(140,122,79,.6)"
                        : "none",
                    }}
                  />
                  {account.displayName}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
