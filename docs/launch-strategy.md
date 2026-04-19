# SURVIVORS — Launch Strategy & Cost Plan

> Prepared 2026-04-19. This document locks down **how** the 30-day raffle
> window runs, **when** each piece of the pipeline fires, and **what it
> costs** so the team can approve the budget before we throw the switch.

---

## 1. The 30-day window — canonical timeline

Anchor = mint day. We call it **T-0**. Earlier days are T-N (N days before
mint). The example uses **15 May 2026** as mint for concreteness; shift the
column 1:1 when the real date is set.

| Date (example) | Day  | Name                   | What happens                                                                                           | Twitter API calls               |
|----------------|------|------------------------|--------------------------------------------------------------------------------------------------------|---------------------------------|
| 15 Apr         | T-30 | **Opening**            | Site goes live. `/`, `/apply`, `/quiz`, `/raffle` are reachable. Connect Wallet + Link X enabled.      | 0                               |
| 15 Apr → 8 May | Window (23 d)     | Users sign in, link X, complete quiz, submit application, click "Verify" on social tasks. All task verifications stored as **`pending`**. No real-time Twitter check. | User OAuth reads only (~$0.01 per user sign-in). |
| 8 May          | T-7  | **Deadline**           | Form window closes. No new applications, no new quiz submissions, no new `pending` task clicks.         | 0                               |
| **9 May**      | **T-6** | **Batch verification + agent scoring** | The heavy day. Twitter fetches, Claude scoring, final ranking. See §4.                                 | **~$163 one-shot**              |
| 10 May         | T-5  | **Results announced**  | `/status` page live — user types wallet → sees `GTD` / `FCFS` / `Not Listed`. @ashborn_agent posts the list thread on X. | 0                               |
| 10 → 14 May    | — (hype window) | Agent tweets, replies, builds tension. Merkle root generation + SeaDrop stage config on-chain.         | minimal agent-side only         |
| 15 May         | T-0  | **Mint**               | Team 88 pre-mint → GTD window → FCFS window → Public. OpenSea Studio drop page.                         | 0                               |

---

## 2. Two separate Twitter flows — don't confuse them

There are **two distinct Twitter pipelines**, each with its own timing,
endpoint, and cost profile. Conflating them is the common trap.

### 2.1 User task verification — **T-6 batch**

"Did user X follow `@survivorsoneth`? Did they like tweet Y? Did they RT
tweet Z?"

- **When the user clicks "Verify":** nothing hits Twitter. We write a
  `task_completions` row with `status='pending'`, `points_awarded=0`. UI
  tells them: *"Pending — verified on results day."*
- **T-6 (9 May):** one batch run that fetches each reference set once and
  cross-matches against every user's `twitter_id` locally:
  - `GET /tweets/:tweet_id/liking_users` → one list of user IDs per tweet
  - `GET /tweets/:tweet_id/retweeted_by` → ditto for RT tasks
  - `GET /users/:collection_id/followers` → one fat list of `@survivorsoneth`'s followers
- **For every pending row**, SET status to `verified` (and add points) or
  `rejected` (silently — no points, user still shows up on /status as "Not
  Listed"). Dishonest clicks are caught here with no drama.

### 2.2 Agent engagement bonus — **daily polling**

"Did `@ashborn_agent` like a user's tweet? Retweet someone? Those users
deserve a bonus, because the agent doesn't approve lightly."

- **Daily cron** (or Vercel Pro hourly) hits:
  - `GET /users/:agent_id/liked_tweets` → last ~50 tweets the agent liked
  - `GET /users/:agent_id/tweets?expansions=referenced_tweets.id.author_id` → filter type=retweeted
- For each hit, resolve the `author_id` to a wallet via `user_profiles.twitter_id`.
  Insert into `agent_engagements (wallet, user_tweet_id, kind, bonus_points)`
  — the UNIQUE constraint (`wallet, user_tweet_id, kind`) silently dedupes.
- Award:
  - **Agent liked user's tweet** → +150
  - **Agent RT'd user** → +250
  - Per-wallet **cap = 3 bonuses / 30 days** so the agent can't solo-boost one account.
- Why daily instead of a single batch? Twitter only returns the last ~100
  actions per endpoint. If we waited until T-6, any agent action before
  that window would be lost. Daily polling catches everything as it happens
  and the cost is tiny ($0.50/day).

---

## 3. The T-6 batch — what actually runs on 9 May

Single script, runs for ~1–2 hours, covers the whole ranking pipeline:

1. **Pull `@survivorsoneth` followers** (one call, paginated)
   - ~10,000 follower resources × $0.010 = **~$100**
   - Stored in Redis for the day's batch
2. **Pull each active task tweet's engagers**
   - Tweet #1 likers: ~1,500 × $0.010 = $15
   - Tweet #2 likers: ~800 × $0.010 = $8
   - Tweet #3 RTers: ~500 × $0.010 = $5
   - Others: ~$10–$30 depending on actual engagement
   - **Total: ~$45**
3. **Cross-reference `task_completions` locally** — free; no API calls
   - Every `pending` row either flips to `verified` with `points_awarded` set, or to `rejected`.
   - `user_profiles.total_task_points` rolls up at the same time.
4. **Agent scores quiz answers (Claude API)**
   - Sonnet 4.6 with prompt caching
   - ~5,000 users × 10 questions × ~700 tokens avg ≈ 35M tokens
   - With caching (persona prompt cached, ~90% cheaper): **~$50–100**
   - Output: 0–70 per user → `agent_scores (kind='quiz', score, reasoning)`
5. **Agent scores applications** (Claude API) — same pattern as quiz but
   fewer tokens (one submission per user, 5 fields): **~$20–40**
6. **Wallet score already cached** — computed at SIWE sign-in via Alchemy.
   No extra work here.
7. **Final ranking** — local SQL merge:
   ```
   final = (agent_score_quiz + agent_score_app) / 2        // 0-70
         + wallet_score                                     // 0-30
         + min(total_task_points / 10, 10)                  // 0-10 bonus
   ORDER BY final DESC
   ```
   Top N → GTD list, next M → FCFS list, rest → Not Listed.
8. **Merkle roots generated** from the GTD + FCFS wallet lists (see
   `packages/contracts/scripts/configure-gtd.ts` / `configure-fcfs.ts`).
9. **`@ashborn_agent` drafts the results thread** (Claude) — held for
   manual approval before posting.

Everything on 9 May is observable: the batch writes a run summary row so
the team can audit counts after the fact.

---

## 4. Money — full launch-month cost table

Scenario: **5,000 users**, 30-day window, launch-month totals. (Scenario B
from earlier sizing; see §6 for 3k and 10k variants.)

### 4.1 Twitter API

| Line item                                     | Cost   |
|-----------------------------------------------|--------|
| User OAuth reads (5,000 × $0.010)             | $50    |
| Agent tweets + replies + likes (daily, 30 d)  | $12    |
| Agent engagement polling (daily, 30 d)        | $15    |
| **T-6** `@survivorsoneth` followers fetch     | $100   |
| **T-6** tweet liker + RTer fetches            | $45    |
| **Twitter subtotal**                          | **~$222** |

### 4.2 Claude API (Anthropic)

| Line item                                     | Cost   |
|-----------------------------------------------|--------|
| **T-6** quiz scoring (5k × 10 answers)        | $50–100 |
| **T-6** application scoring (5k submissions)  | $20–40 |
| Agent content generation (30 d, tweets/replies) | $30–60 |
| **Claude subtotal**                           | **~$100–200** |

### 4.3 Infra

| Line item                                     | Cost     |
|-----------------------------------------------|----------|
| Vercel Pro (launch month, function limits + analytics) | $20 |
| Neon Postgres (free tier comfortably)         | $0       |
| Upstash Redis (free tier covers 5k users)     | $0       |
| Alchemy (free tier ~100M CU — 5k users ≈ 2.6M CU) | $0   |
| Cloudflare Turnstile (free tier is unlimited) | $0       |
| **Infra subtotal**                            | **$20**  |

### 4.4 Total

| Category         | Launch month | Post-launch (steady state) |
|------------------|--------------|-----------------------------|
| Twitter          | ~$222        | ~$25 (agent only)           |
| Claude           | ~$150        | ~$40 (agent only)           |
| Infra            | ~$20         | $0 (Hobby downgrade)        |
| **Total**        | **~$390**    | **~$65**                    |

**Safety margin:** set Twitter Developer Portal spending cap at **$400/mo**.
If anything goes sideways (bot attack, cache miss, misconfiguration), the
cap kills the bleeding. Claude is via Anthropic Console which also supports
spend caps.

---

## 5. What the user sees (honor-based UX)

On the /raffle page during the window:

```
  ┌─────────────────────────────────────────────────┐
  │  Follow @survivorsoneth on X                    │
  │  ●  Pending                                     │
  │                                       [ Verify ]│
  └─────────────────────────────────────────────────┘

  After click:

  ┌─────────────────────────────────────────────────┐
  │  Follow @survivorsoneth on X                    │
  │  ◐  Pending — verified on results day           │
  │                                         [ Done ]│
  └─────────────────────────────────────────────────┘
```

- **No points awarded yet.** The user's current point total on the
  leaderboard shows them only for tasks that are already deterministic
  (e.g., submitted quiz = score visible at T-6).
- Leaderboard shows a **"provisional rank"** pill near their position:
  *"#47 (provisional — final rank at T-6)"*.
- On **10 May (T-5)**, `/status` page goes live. User types their wallet
  → sees the final verdict. Agent posts a thread naming the list (not the
  scores).

---

## 6. Scenario variants

| Users | Twitter | Claude | Infra | **Launch-month total** |
|-------|---------|--------|-------|------------------------|
| 3,000 | ~$130   | ~$90   | $20   | **~$240** |
| 5,000 | ~$222   | ~$150  | $20   | **~$390** |
| 10,000 | ~$440  | ~$280  | $20   | **~$740** |

Our own forecast is **2–4k applications** (selective positioning pulls fewer
but higher-quality entrants), so the **$240–$390 range is the realistic
expectation**.

---

## 7. Risk management

| Risk | Mitigation |
|------|------------|
| Bot flood on /apply or /quiz | 5-layer spam defense already live: honeypot + time-gate + IP rate-limit + Zod + wallet UNIQUE. **Cloudflare Turnstile** adds a 6th layer (deferred PR). |
| Runaway Twitter API cost | Spending cap at $400/mo inside X Developer Portal. Kills the bleeding without needing our intervention. |
| Claude API cost spike | Anthropic Console → spend cap + email alerts at $100 / $200. |
| Single user tries to farm agent engagement | Per-wallet **3 bonuses / 30 days** cap on `agent_engagements`. |
| Dishonest "Verify" clicks | Caught at T-6 batch — `rejected` status, silent 0 points. No drama, no appeal process. |
| Fresh wallets cheating the scoring | Wallet score (0–30) naturally disadvantages them, but we also keep the agent's 0–70 as the dominant signal — good writing beats a fresh wallet. |
| Agent generates cringe content | Human-in-the-loop: all scheduled posts queued for manual approval in the agent's admin panel before they go out. |

---

## 8. Timeline checklist (operational)

### Before T-30 (pre-launch)

- [ ] Create `@survivorsoneth` + `@ashborn_agent` Twitter accounts
- [ ] Warm both accounts with 3–5 posts each (no shadow-bans)
- [ ] Sign up for X Developer (free)
- [ ] **2 weeks before T-30** — subscribe to X API (pay-per-use, set $400 cap)
- [ ] Create X app for Site (OAuth 2.0, read scope)
- [ ] Create X app for Agent (OAuth 1.0a/2.0, read + write, **no DM scope**)
- [ ] Bootstrap agent OAuth once, store tokens in agent `.env`
- [ ] Vercel env vars pushed: TWITTER_CLIENT_ID/SECRET, TWITTER_BEARER_TOKEN,
      AGENT_TWITTER_ID, COLLECTION_TWITTER_ID,
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, ALCHEMY_API_KEY
- [ ] Cloudflare Turnstile site created, keys in Vercel env
- [ ] Anthropic API key in Vercel env + agent `.env`
- [ ] Vercel upgraded to Pro (for function invocation limits)
- [ ] Seed `social_tasks` with real tweet IDs (replace placeholders)
- [ ] Agent deployed on Railway/Fly (not Vercel — it's long-running)
- [ ] Post pinned tweet, launch thread drafted

### At T-30 (opening)

- [ ] Site live, all routes responding 200
- [ ] Monitoring: Vercel analytics, Twitter usage dashboard, Anthropic dashboard
- [ ] Team watches DMs on `@ashborn_agent` and `@survivorsoneth` manually

### T-6 (batch day, 9 May example)

- [ ] Run agent batch script (exists at `/api/admin/run-verification-batch`, shared-secret protected)
- [ ] Review agent-generated draft thread (human approval)
- [ ] Review top 50 ranking entries for manual sanity check
- [ ] Approve WL list → it's now immutable

### T-5 (results day)

- [ ] `/status` page enabled
- [ ] Agent posts the approved thread
- [ ] Monitor appeals (none accepted — results are final by design)

### T-0 (mint day)

- [ ] Configure GTD + FCFS merkle roots on SeaDrop via
      `configure-gtd.ts` / `configure-fcfs.ts`
- [ ] Phase transitions: Team → GTD → FCFS → Public
- [ ] Agent live-posts mint progress

---

## 9. Why honor-based + batch is the right call

- **Predictable cost.** A single $400 spending cap protects the entire
  launch. No hourly anxiety about bot attacks.
- **User experience still feels alive.** "Pending — verified on results day"
  is a *feature*, not a bug. It reinforces the ritual tone: nobody knows the
  list until The Seventh reads it.
- **Cheating is harmless.** A user clicking "Verify" without actually
  following loses silently at T-6. No drama, no explanations, no appeal.
  The order does not answer.
- **Agent narrative stays intact.** The agent does all the scoring, does
  all the verification, signs the list — it's the single voice the
  community hears. That's the whole premise of SURVIVORS.

---

## 10. Open questions for the team

1. **Final mint date?** Every cost in this doc assumes a 30-day window. If we
   compress to 14 days, costs halve; if we stretch to 60, they roughly 1.5×.
2. **Which 2–3 tweets become launch task targets?** We need the actual
   tweet IDs seeded into `social_tasks` before T-30.
3. **Budget ceiling?** Recommendation: approve **$500** as the hard cap for
   the launch month across Twitter + Claude + infra combined. Realistic
   spend at 3–5k users is $240–$390.
4. **Manual review bandwidth?** Agent can draft everything, but someone on
   the team needs to approve the daily tweet + the T-5 results thread. Who
   owns this?

---

*Questions or disagreements, ping the dev channel. This doc is versioned
with the repo (`docs/launch-strategy.md`) — edit in a PR if the plan shifts.*
