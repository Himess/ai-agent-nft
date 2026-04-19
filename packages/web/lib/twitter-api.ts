// X / Twitter API v2 helpers — app-auth (bearer) + user-auth (oauth2).
// App bearer reads public data: tweet lookups, who-liked-this, etc.
// User OAuth reads a specific user's follows, liked tweets, retweets.
//
// The subscription we'll rely on is Basic ($100/mo). One project covers the
// site's verification needs + the agent's posting + engagement polling —
// quota is shared across apps in the project.
//
// Every helper here returns a discriminated result `{ ok, data } | { ok:
// false, reason }` so callers never see raw thrown errors and we can
// short-circuit when TWITTER_* env is missing (pre-launch dev).

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; status?: number };

const API = "https://api.x.com/2";

function bearer(): string | null {
  return process.env.TWITTER_BEARER_TOKEN?.trim() || null;
}

// ─── App-auth: bearer token ───────────────────────────────────

async function appFetch<T>(
  path: string,
  query?: Record<string, string>
): Promise<ApiResult<T>> {
  const token = bearer();
  if (!token) return { ok: false, reason: "twitter-bearer-not-configured" };
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  const res = await fetch(`${API}${path}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return {
      ok: false,
      reason: await res.text().catch(() => res.statusText),
      status: res.status,
    };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

// ─── User-auth: per-user OAuth access token ──────────────────
// When the user OAuths via /api/auth/twitter/*, we can later call endpoints
// on their behalf. We'd need to persist the access token (and refresh token)
// to do that; PR 3 currently only stores the resulting identity. A future
// enhancement persists tokens in a new table `twitter_tokens(wallet, …)`.
// For now, helpers that require a user token accept it as a parameter.

async function userFetch<T>(
  path: string,
  userAccessToken: string,
  query?: Record<string, string>
): Promise<ApiResult<T>> {
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  const res = await fetch(`${API}${path}${qs}`, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });
  if (!res.ok) {
    return {
      ok: false,
      reason: await res.text().catch(() => res.statusText),
      status: res.status,
    };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

// ─── Task verification primitives ────────────────────────────

export interface UserObj {
  id: string;
  username: string;
  public_metrics?: { followers_count: number };
}

export async function lookupUserByUsername(
  username: string
): Promise<ApiResult<UserObj>> {
  const clean = username.replace(/^@/, "");
  const res = await appFetch<{ data: UserObj }>(`/users/by/username/${clean}`, {
    "user.fields": "public_metrics",
  });
  return res.ok ? { ok: true, data: res.data.data } : res;
}

export async function getLikersOfTweet(
  tweetId: string,
  maxPages = 3
): Promise<ApiResult<string[]>> {
  // Returns user IDs that liked the tweet. Paginated; we cap pages so one
  // poll doesn't burn the whole rate budget.
  const ids: string[] = [];
  let nextToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const query: Record<string, string> = { max_results: "100" };
    if (nextToken) query.pagination_token = nextToken;
    const res = await appFetch<{
      data?: { id: string }[];
      meta?: { next_token?: string };
    }>(`/tweets/${tweetId}/liking_users`, query);
    if (!res.ok) return res;
    for (const u of res.data.data ?? []) ids.push(u.id);
    nextToken = res.data.meta?.next_token;
    if (!nextToken) break;
  }
  return { ok: true, data: ids };
}

export async function getRetweetersOfTweet(
  tweetId: string,
  maxPages = 3
): Promise<ApiResult<string[]>> {
  const ids: string[] = [];
  let nextToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const query: Record<string, string> = { max_results: "100" };
    if (nextToken) query.pagination_token = nextToken;
    const res = await appFetch<{
      data?: { id: string }[];
      meta?: { next_token?: string };
    }>(`/tweets/${tweetId}/retweeted_by`, query);
    if (!res.ok) return res;
    for (const u of res.data.data ?? []) ids.push(u.id);
    nextToken = res.data.meta?.next_token;
    if (!nextToken) break;
  }
  return { ok: true, data: ids };
}

// ─── Agent-side polling (PR 7) ───────────────────────────────
// Given the agent's user id, fetch tweets it recently liked + accounts it
// recently retweeted. Cross-referenced against user_profiles to award bonus
// points. Poll cadence is hourly via Vercel Cron.

export async function getAgentRecentLikes(
  agentUserId: string,
  maxResults = 50
): Promise<
  ApiResult<
    { id: string; author_id?: string; created_at?: string; text?: string }[]
  >
> {
  const res = await appFetch<{
    data?: { id: string; author_id?: string; created_at?: string; text?: string }[];
  }>(`/users/${agentUserId}/liked_tweets`, {
    max_results: String(Math.min(100, Math.max(10, maxResults))),
    "tweet.fields": "author_id,created_at",
  });
  if (!res.ok) return res;
  return { ok: true, data: res.data.data ?? [] };
}

// Retweets authored by the agent show up as tweets of type "retweeted" in the
// user timeline. `/users/:id/tweets?expansions=referenced_tweets.id.author_id`
// gives us the original author for each retweet. We filter to type=retweeted.
export async function getAgentRecentRetweets(
  agentUserId: string,
  maxResults = 50
): Promise<ApiResult<{ referencedAuthorId: string; tweetId: string }[]>> {
  const res = await appFetch<{
    data?: {
      id: string;
      referenced_tweets?: { type: string; id: string }[];
    }[];
    includes?: {
      tweets?: { id: string; author_id: string }[];
    };
  }>(`/users/${agentUserId}/tweets`, {
    max_results: String(Math.min(100, Math.max(10, maxResults))),
    expansions: "referenced_tweets.id,referenced_tweets.id.author_id",
    "tweet.fields": "referenced_tweets",
  });
  if (!res.ok) return res;
  const byId = new Map(
    (res.data.includes?.tweets ?? []).map((t) => [t.id, t.author_id])
  );
  const out: { referencedAuthorId: string; tweetId: string }[] = [];
  for (const t of res.data.data ?? []) {
    const ref = t.referenced_tweets?.find((r) => r.type === "retweeted");
    if (!ref) continue;
    const authorId = byId.get(ref.id);
    if (!authorId) continue;
    out.push({ referencedAuthorId: authorId, tweetId: ref.id });
  }
  return { ok: true, data: out };
}
