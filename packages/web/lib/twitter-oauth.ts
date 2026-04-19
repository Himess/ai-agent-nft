import { createHash, randomBytes } from "node:crypto";

// X / Twitter OAuth 2.0 (Authorization Code with PKCE).
// We run the flow ourselves — not via next-auth's TwitterProvider — because
// the SIWE session is primary and Twitter is a *secondary link* tied to the
// existing wallet. next-auth's account linking model assumes the opposite
// shape.

export const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
export const TOKEN_URL = "https://api.x.com/2/oauth2/token";
export const ME_URL = "https://api.x.com/2/users/me";

export const SCOPES = ["tweet.read", "users.read", "offline.access"];

export const OAUTH_COOKIE = "surv_x_oauth";

export function hasTwitterCreds(): boolean {
  return Boolean(
    process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
  );
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkcePair() {
  const verifier = base64Url(randomBytes(48));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64Url(randomBytes(24));
}

export function buildAuthorizeUrl({
  clientId,
  redirectUri,
  state,
  challenge,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken({
  code,
  redirectUri,
  clientId,
  clientSecret,
  verifier,
}: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  verifier: string;
}) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function fetchTwitterUser(accessToken: string) {
  const url = `${ME_URL}?user.fields=public_metrics,created_at`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`/users/me failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data: {
      id: string;
      username: string;
      name: string;
      created_at?: string;
      public_metrics?: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
        listed_count: number;
      };
    };
  };
  return json.data;
}
