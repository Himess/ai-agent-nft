import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSql } from "@/lib/db";
import {
  OAUTH_COOKIE,
  exchangeCodeForToken,
  fetchTwitterUser,
  hasTwitterCreds,
} from "@/lib/twitter-oauth";

// Handles the X OAuth redirect. Verifies state, swaps the code for an access
// token, pulls the user's handle + public metrics, and writes them to the
// currently-signed-in wallet's user_profiles row. Twitter becomes a
// secondary identity bound to the primary wallet.

function failRedirect(origin: string, error: string) {
  const target = new URL("/", origin);
  target.searchParams.set("x_link_error", error);
  return NextResponse.redirect(target);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = process.env.NEXTAUTH_URL ?? `${url.protocol}//${url.host}`;

  if (!hasTwitterCreds()) {
    return failRedirect(origin, "twitter-oauth-not-configured");
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.wallet) {
    return failRedirect(origin, "no-session");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return failRedirect(origin, error);
  if (!code || !state) return failRedirect(origin, "missing-code-or-state");

  const cookieJar = await cookies();
  const cookie = cookieJar.get(OAUTH_COOKIE);
  if (!cookie) return failRedirect(origin, "missing-oauth-cookie");

  let stored: { verifier: string; state: string; wallet: string };
  try {
    stored = JSON.parse(cookie.value);
  } catch {
    return failRedirect(origin, "bad-oauth-cookie");
  }

  if (stored.state !== state) return failRedirect(origin, "state-mismatch");
  if (stored.wallet !== session.user.wallet)
    return failRedirect(origin, "wallet-mismatch");

  const redirectUri = `${origin}/api/auth/twitter/callback`;
  let user: Awaited<ReturnType<typeof fetchTwitterUser>>;
  try {
    const token = await exchangeCodeForToken({
      code,
      redirectUri,
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      verifier: stored.verifier,
    });
    user = await fetchTwitterUser(token.access_token);
  } catch (err) {
    console.error("twitter callback failed", err);
    return failRedirect(origin, "token-exchange-failed");
  }

  const wallet = session.user.wallet;
  const twitterId = user.id;
  const handle = user.username;
  const followers = user.public_metrics?.followers_count ?? null;
  const accountAgeDays = user.created_at
    ? Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Guard: same twitter_id cannot bind to multiple wallets. If the id
  // already belongs to a different wallet, surface an error rather than
  // silently overwriting.
  const sql = getSql();
  const conflict = await sql`
    SELECT wallet FROM user_profiles
    WHERE twitter_id = ${twitterId} AND wallet <> ${wallet}
    LIMIT 1
  `;
  if (conflict.length > 0) {
    return failRedirect(origin, "twitter-already-linked-to-other-wallet");
  }

  await sql`
    UPDATE user_profiles
       SET twitter_id = ${twitterId},
           twitter_handle = ${handle},
           twitter_followers = ${followers},
           twitter_account_age_d = ${accountAgeDays},
           twitter_verified_at = NOW(),
           updated_at = NOW()
     WHERE wallet = ${wallet}
  `;

  // Clear the PKCE cookie
  cookieJar.delete(OAUTH_COOKIE);

  const target = new URL("/", origin);
  target.searchParams.set("x_linked", "1");
  return NextResponse.redirect(target);
}
