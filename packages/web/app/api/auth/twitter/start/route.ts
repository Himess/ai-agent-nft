import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  OAUTH_COOKIE,
  buildAuthorizeUrl,
  generatePkcePair,
  generateState,
  hasTwitterCreds,
} from "@/lib/twitter-oauth";

// Kicks off the X OAuth 2.0 PKCE flow. Requires the user to already have a
// SIWE session (we want to link Twitter to an existing wallet, not create an
// unrelated identity). Returns a 302 to X's authorization endpoint.

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.wallet) {
    return NextResponse.json(
      { error: "wallet-not-connected" },
      { status: 401 }
    );
  }

  if (!hasTwitterCreds()) {
    return NextResponse.json(
      { error: "twitter-oauth-not-configured" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const origin =
    process.env.NEXTAUTH_URL ??
    `${url.protocol}//${url.host}`;
  const redirectUri = `${origin}/api/auth/twitter/callback`;

  const { verifier, challenge } = generatePkcePair();
  const state = generateState();

  const authorize = buildAuthorizeUrl({
    clientId: process.env.TWITTER_CLIENT_ID!,
    redirectUri,
    state,
    challenge,
  });

  const payload = JSON.stringify({ verifier, state, wallet: session.user.wallet });
  const cookieJar = await cookies();
  cookieJar.set(OAUTH_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });

  return NextResponse.redirect(authorize);
}
