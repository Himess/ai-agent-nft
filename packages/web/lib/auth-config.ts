import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import { getSql } from "./db";
import { computeWalletScore } from "./wallet-score";

// Refresh the wallet score at most once per week — NFT holdings drift but not
// fast enough to warrant hitting Alchemy on every sign-in.
const WALLET_SCORE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function ensureWalletScore(wallet: string): Promise<void> {
  if (!process.env.ALCHEMY_API_KEY) return; // skip silently in local envs
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT wallet_scored_at FROM user_profiles WHERE wallet = ${wallet}
    `;
    const scoredAt = (rows[0]?.wallet_scored_at ?? null) as Date | null;
    if (scoredAt && Date.now() - scoredAt.getTime() < WALLET_SCORE_MAX_AGE_MS) {
      return;
    }
    const s = await computeWalletScore(wallet);
    await sql`
      UPDATE user_profiles
         SET wallet_score      = ${s.score},
             wallet_age_days   = ${s.walletAgeDays},
             tx_count          = ${s.txCount},
             nft_usd_value     = ${s.nftUsdValue},
             bluechip_count    = ${s.bluechipCount},
             avg_holding_days  = ${s.avgHoldingDays},
             last_activity_at  = ${s.lastActivityAt},
             wallet_scored_at  = NOW(),
             updated_at        = NOW()
       WHERE wallet = ${wallet}
    `;
  } catch (err) {
    console.warn("wallet-score failed (non-fatal):", err);
  }
}

// Pull the CSRF token out of the cookie header. next-auth sets it under
// `next-auth.csrf-token` in dev and `__Host-next-auth.csrf-token` in prod
// (HTTPS). The cookie value is "<token>|<hash>" — we only need the token
// half, which the RainbowKit adapter embeds as the SIWE message nonce.
function getCsrfFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((c) => c.trim());
  for (const name of [
    "__Host-next-auth.csrf-token",
    "next-auth.csrf-token",
  ]) {
    const found = parts.find((c) => c.startsWith(`${name}=`));
    if (!found) continue;
    try {
      const raw = decodeURIComponent(found.slice(name.length + 1));
      const [token] = raw.split("|");
      if (token) return token;
    } catch {
      // fall through
    }
  }
  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "siwe",
      name: "Sign-In with Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.message || !credentials?.signature) return null;
          const siwe = new SiweMessage(JSON.parse(credentials.message));
          const url = new URL(
            process.env.NEXTAUTH_URL ?? "http://localhost:3000"
          );

          // The SIWE message's nonce field is the next-auth CSRF token
          // the RainbowKit adapter pulled client-side. We re-read it here
          // from the cookie the browser just sent and make sure they match.
          const cookieHeader =
            (req?.headers as Record<string, string | undefined> | undefined)
              ?.cookie ?? undefined;
          const csrfToken = getCsrfFromCookie(cookieHeader);

          const result = await siwe.verify({
            signature: credentials.signature,
            domain: url.host,
            nonce: csrfToken ?? undefined,
          });

          if (!result.success) return null;

          const wallet = result.data.address.toLowerCase();

          // Upsert the user_profiles row — this is the moment ownership is
          // proven on-chain and the profile exists.
          const sql = getSql();
          await sql`
            INSERT INTO user_profiles (wallet, siwe_verified_at)
            VALUES (${wallet}, NOW())
            ON CONFLICT (wallet) DO UPDATE
              SET siwe_verified_at = NOW(),
                  updated_at = NOW()
          `;

          // Fire the wallet score computation. It's intentionally awaited
          // here (~1-2s extra on first sign-in) so downstream consumers can
          // assume the cache is populated. Subsequent sign-ins skip it
          // unless the cache is stale.
          await ensureWalletScore(wallet);

          return { id: wallet };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) return session;
      const wallet = token.sub.toLowerCase();
      (session.user ??= {} as typeof session.user).wallet = wallet;

      // Pull any linked twitter fields out of user_profiles so the client can
      // decide whether to prompt for "Connect X" or skip straight to forms.
      try {
        const sql = getSql();
        const rows = await sql`
          SELECT twitter_id, twitter_handle, twitter_verified_at
          FROM user_profiles
          WHERE wallet = ${wallet}
        `;
        if (rows.length > 0) {
          const r = rows[0] as {
            twitter_id: string | null;
            twitter_handle: string | null;
            twitter_verified_at: Date | null;
          };
          session.user.twitterId = r.twitter_id;
          session.user.twitterHandle = r.twitter_handle;
          session.user.twitterLinked = r.twitter_verified_at != null;
        }
      } catch {
        // non-fatal — session still valid if twitter fields can't be loaded
      }

      return session;
    },
  },
};
