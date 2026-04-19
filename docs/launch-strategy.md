# SURVIVORS — Launch Strategy & Cost Plan (v2)

> Prepared 2026-04-19. **v2 supersedes v1** (dated 2026-04-17). Changes
> from v1: supply 888 → 1111, agent renamed The Seventh → Ashborn, social
> tasks dropped, added Twitter-handle claim flow driven by agent +
> collection giveaway picks.

---

## 1. Supply & allocation

Total supply: **1111 on Ethereum (ERC-721 via OpenSea SeaDrop).**

| Source                                 | GTD | FCFS | Mechanism                                                                 |
|----------------------------------------|----:|-----:|---------------------------------------------------------------------------|
| Team reserved vault                    |   — |    — | 100 via `reservedMint` on `AgentNFT.sol` (owner-only, free, not allowlist) |
| Quiz (on-site, agent-scored)           | 200 |  100 | `/quiz` with Ashborn persona; scores written to `agent_scores`             |
| Application (on-site, agent-scored)    | 450 |    0 | `/apply`; scored + ranked for 450 GTD slots                                |
| Community collab / partner collections | 100 |  100 | Manually curated, merged into allowlists via `scripts/build-allowlists.ts` |
| Yan (team alt wallets)                 | 120 |    0 | Team-held addresses, added to GTD list off-chain                           |
| @ashborn_agent Twitter picks           |  50 |   50 | Agent tweets picks → handles stored in `agent_wl_picks` → users claim      |
| @survivorsoneth Twitter picks          |  50 |   50 | Collection account tweets picks → same claim flow                          |
| **Totals**                             | **970** | **300** | On-chain MAX_SUPPLY = 1111 (reserved 100 + GTD 970 + FCFS 300 = 1370 offered, ~23% overflow for attrition) |

On-chain hard cap = 1111. The allowlist overflow is intentional — not every
qualifier will mint in time. First to mint wins.

---

## 2. The 30-day window — canonical timeline

Anchor = mint day, **T-0**. The example uses 15 May 2026 for concreteness;
shift 1:1 when the real date is locked.

| Date (example) | Day  | Name                              | What happens                                                                                               |
|----------------|------|-----------------------------------|-----------------------------------------------------------------------------------------------------------|
| 15 Apr         | T-30 | **Opening**                       | Site goes live. `/`, `/apply`, `/quiz` reachable. Connect Wallet + Link X enabled.                        |
| 15 Apr → 8 May | —    | Window (23 d)                     | Users sign in (SIWE), link X (OAuth), submit quiz + application. Agent + collection tweet giveaway picks. |
| 8 May          | T-7  | **Form deadline + claim deadline**| `/apply` and `/quiz` close. Twitter-pick claims must be bound by now (see §3).                            |
| 9 May          | T-6  | **Batch scoring + ranking**        | Claude scores every quiz + application. Final GTD/FCFS lists assembled. See §4.                          |
| 10 May         | T-5  | **Results announced**             | `/status` dashboard goes live. Agent posts the results thread. Merkle roots generated.                     |
| 10 → 14 May    | —    | Hype window                       | SeaDrop stage config pushed on-chain (GTD root, FCFS root, public drop, drop URI).                        |
| 15 May         | T-0  | **Mint**                          | Team 100 pre-mint → GTD (0.0035Ξ) → FCFS (0.0045Ξ) → Public (0.005Ξ). OpenSea Studio drop page.            |

---

## 3. Agent + collection Twitter picks (claim flow)

**Model:** The two X accounts give out GTD/FCFS slots by replying to tweets
they like, quoting strong threads, or hand-picking from their feeds.

- `@ashborn_agent` controls **50 GTD + 50 FCFS**. The agent picks
  autonomously (Claude-driven, curation + sentiment).
- `@survivorsoneth` controls **50 GTD + 50 FCFS**. A human on the team picks
  manually (brand-level curation + official giveaways).

### 3.1 The pipeline

1. Agent/human decides the pick → appends the handle (no leading `@`,
   lowercased) to `agent_wl_picks`:
   ```sql
   INSERT INTO agent_wl_picks (twitter_handle, source, allocation, reason, deadline_at)
   VALUES ('someuser', 'ashborn_agent', 'gtd', 'quoted X with signal', <T-7>);
   ```
2. On Twitter, the picking account replies publicly:
   > *"Ashborn grants you a GTD slot. Bind before T-7 at survivors-nu.vercel.app."*
3. The user comes to the site, connects wallet (SIWE), links X (OAuth 2.0).
4. The site sees both are authed → surfaces a *Claim* card on the status
   dashboard. User hits the button → `POST /api/claim-twitter`.
5. Server binds `claimed_wallet = session.wallet` and `claimed_at = NOW()`.
   Slot is now locked to that wallet and that wallet will appear on the GTD
   merkle tree built at T-6.

### 3.2 Forfeit

If `claimed_wallet IS NULL AND NOW() > deadline_at`, the slot is dead — the
T-6 batch ignores it. We do not recycle forfeited slots into overflow.

### 3.3 Per-wallet cap

A single wallet can claim **at most one GTD + one FCFS** slot across both
sources. Enforced in the batch script when the allowlists are merged; the
row-level `UNIQUE (twitter_handle, source, allocation)` already prevents
double-picks per handle.

### 3.4 Endpoints

- `GET /api/claim-twitter` — returns the session user's picks (claimed + unclaimed).
- `POST /api/claim-twitter` — claims every unclaimed pick matching the session's handle. Idempotent.

---

## 4. The T-6 batch — what actually runs

Single orchestrated script (exists at
`/api/admin/run-verification-batch`, shared-secret protected; to be
wired in `packages/web/app/api/admin/`). Runs ~1 h. No Twitter API calls.

1. **Agent scores quiz** (Claude, `packages/agent/src/ai/prompts/wl-analysis.ts`).
   Haiku 4.5 for the bulk, Sonnet 4.6 only for borderline re-review.
   Writes `agent_scores (kind='quiz', score, reasoning)`.
2. **Agent scores applications** — same pattern. Writes `agent_scores (kind='application', ...)`.
3. **Final ranking** (local SQL merge):
   ```sql
   final_score =
     (COALESCE(quiz_score, 0) + COALESCE(app_score, 0)) / 2   -- 0-70
     + COALESCE(wallet_score, 0)                               -- 0-30 (Alchemy, cached at sign-in)
   ORDER BY final_score DESC
   ```
4. **Slot assignment**:
   - Top 200 quiz participants → quiz GTD (then next 100 → quiz FCFS)
   - Top 450 application participants → app GTD
   - Community collab list (manual): 100 GTD + 100 FCFS
   - Yan list (manual): 120 GTD
   - `agent_wl_picks` with `claimed_wallet IS NOT NULL AND forfeited = FALSE`
     → 100 GTD + 100 FCFS
   - Deduplicate (a wallet on multiple GTD sources → keep one; push duplicates
     nowhere since GTD is already one mint per wallet)
5. **Merkle roots** generated from merged GTD + FCFS wallet lists via
   `packages/contracts/scripts/configure-gtd.ts` / `configure-fcfs.ts`.
6. **Agent drafts the results thread** (Claude Sonnet 4.6). Held for human
   approval before posting.

---

## 5. Money — full launch-month cost table

Scenario: **3–5k users** (realistic for selective-positioned project).

### 5.1 Twitter API (pay-per-use, as of 2026)

| Line item                                    | Cost   |
|----------------------------------------------|--------|
| User OAuth reads (5,000 × $0.01)             | $50    |
| Agent tweets + replies + likes (30 d)        | $12    |
| Agent engagement polling cron (30 d)         | $15    |
| **T-6 fetches**                              | **$0** (no Twitter calls at T-6 — honor-based verification was dropped) |
| **Twitter subtotal**                         | **~$77** |

Dropping social tasks saved ~$145 vs v1's T-6 batch. The agent still spends
a little on its daily content cycle.

### 5.2 Claude API (Anthropic)

| Line item                                       | Cost    |
|-------------------------------------------------|---------|
| T-6 quiz scoring (5k × 10 answers, **Haiku 4.5** with caching) | $15–30  |
| T-6 application scoring (5k, Haiku 4.5)         | $8–15   |
| Borderline re-score (Sonnet 4.6, ~500 users)    | $20–40  |
| Agent content generation (30 d, Sonnet 4.6)     | $30–60  |
| **Claude subtotal**                             | **~$75–145** |

Haiku 4.5 is good enough for first-pass scoring; Sonnet 4.6 only spent on
the 10% around the APPROVE/REJECT cut line.

### 5.3 Infra

| Line item                                     | Cost    |
|-----------------------------------------------|---------|
| Vercel Pro (required for cron flexibility + team features) | $20 |
| Neon Postgres (free tier handles 5k users)     | $0      |
| Upstash Redis (free tier)                      | $0      |
| Alchemy (free tier, ~100M CU — 5k users ≈ 2.6M CU) | $0    |
| **Infra subtotal**                             | **$20** |

### 5.4 Total

| Category         | Launch month | Post-launch (steady state) |
|------------------|--------------|-----------------------------|
| Twitter          | ~$77         | ~$25 (agent only)           |
| Claude           | ~$110        | ~$40 (agent only)           |
| Infra            | ~$20         | $0 (Hobby downgrade)        |
| **Total**        | **~$207**    | **~$65**                    |

**Safety cap:** set Twitter Developer Portal cap at **$200/mo**. Anthropic
Console spend cap at **$200/mo** with email alerts at $75 / $150.

---

## 6. What the user sees (status dashboard)

The `/raffle` route is repurposed to `/status` (server-rendered dashboard).
Pre-T-5 it shows:

- `Wallet connected: 0x1234…abcd`
- `X linked: @somehandle`
- `Quiz submitted — score pending`
- `Application submitted — score pending`
- `Twitter picks: 1 pending` + *Claim* button (if `agent_wl_picks` has an
  unclaimed row for their handle)

Post-T-5 it shows:

- `Final rank: #183`
- `Allocation: GTD (quiz source)` / `FCFS (agent pick)` / `Not listed`
- `Mint window: 15 May, 14:00 UTC. Merkle proof: 0x…`

No leaderboard, no provisional scores. We reveal the ranking at T-5 and
that's it — keeps narrative tight, kills the social-tasks FOMO noise.

---

## 7. Cron jobs (Vercel Pro)

| Cron                        | Schedule (UTC) | What it does                                                           |
|-----------------------------|----------------|------------------------------------------------------------------------|
| `/api/cron/agent-engagement`| `0 3 * * *`    | Poll @ashborn_agent's likes + RTs, dedupe via UNIQUE, award bonuses.    |

`/api/cron/twitter-verify` was removed in the v2 plan (social tasks dropped).

Vercel Hobby allows daily-only schedules, so even without Pro the agent
engagement cron runs. Pro unlocks hourly if we need it for a future feature.

---

## 8. Risk management

| Risk                                     | Mitigation |
|------------------------------------------|------------|
| Bot flood on /apply or /quiz             | 5-layer spam defense (honeypot + time-gate + IP rate-limit + Zod + wallet UNIQUE). |
| Runaway Twitter API cost                 | $200/mo cap in X Developer Portal. |
| Claude API cost spike                    | Anthropic Console spend cap. |
| Agent farming engagement with one account| Per-wallet 3 bonuses / 30 days cap on `agent_engagements`. |
| Handle change mid-window (user renames X)| `twitter_id` is the stable key in `user_profiles`; pick matches `twitter_handle` lowercase but the session carries the live handle post-OAuth. Corner case logged, not blocked. |
| Agent picks someone without a wallet     | Fine — unclaimed slots forfeit at T-7. The agent is told to pick generously; attrition does the pruning. |
| Agent generates cringe content           | Human-in-the-loop: all scheduled posts queued for manual approval. |

---

## 9. Timeline checklist (operational)

### Before T-30

- [ ] Create `@survivorsoneth` + `@ashborn_agent` Twitter accounts
- [ ] Warm both with 3–5 posts each (avoid shadow-bans)
- [ ] Subscribe to X API pay-per-use (set $200 cap)
- [ ] Create X app for Site (OAuth 2.0, read scope) — tokens in Vercel env
- [ ] Create X app for Agent (OAuth 2.0, read + write, **no DM scope**) — tokens in agent `.env`
- [ ] Vercel Pro upgrade
- [ ] Anthropic API keys (one for agent, one for web batch scorer)
- [ ] Custom domain purchased + DNS pointed at Vercel
- [ ] Agent deployed on Railway/Fly (long-running, not Vercel)
- [ ] Seed `agent_wl_picks.deadline_at` to the locked T-7 timestamp

### T-30 → T-8 (window)

- [ ] Agent posts daily (manual approval queue)
- [ ] Team + agent tweet giveaway picks → insert rows into `agent_wl_picks`
- [ ] Monitor: Vercel analytics, Twitter usage dashboard, Anthropic dashboard

### T-7 (claim deadline)

- [ ] Form routes return 410 (gone)
- [ ] `/api/claim-twitter` POST still accepted until midnight UTC (deadline_at is per-row)
- [ ] Midnight-UTC job flags any unclaimed `agent_wl_picks` as `forfeited = TRUE`

### T-6 (batch day)

- [ ] Run the batch endpoint (shared-secret)
- [ ] Review agent draft thread (human approval)
- [ ] Review top 50 of each list for manual sanity check
- [ ] Approve merged GTD + FCFS lists → merkle roots built

### T-5 (results)

- [ ] `/status` dashboard switches to post-results mode
- [ ] Agent posts the approved thread
- [ ] Monitor appeals (none accepted — results are final by design)

### T-0 (mint)

- [ ] SeaDrop stage config: GTD root, FCFS root, PublicDrop, drop URI
- [ ] Team reservedMint(100) to vault wallet before the public window opens
- [ ] Phase transitions managed via SeaDrop admin: GTD → FCFS → Public
- [ ] Agent live-posts progress

---

## 10. Why this is the right call

- **Predictable cost.** $200 launch-month ceiling covers everything except
  edge-case Twitter usage spikes.
- **Narrative stays tight.** Two Twitter accounts with curated picks is a
  stronger story than a public points leaderboard. Users don't farm, they
  write and wait.
- **Fewer moving parts.** Honor-based social tasks are gone. One less cron,
  one less page, one less set of edge cases.
- **Agent gets a real on-chain role.** Every pick the agent makes is
  auditable (`agent_wl_picks.reason` + the public tweet), and the agent
  still owns 50% of primary revenue via the TBA.

---

## 11. Open questions for the team

1. **Final mint date?** All costs scale linearly with window length.
2. **Who owns the daily-tweet approval?** Agent drafts it, someone on the
   team has to click send.
3. **How aggressive should `@ashborn_agent` be with its 100 slots?**
   Generous = wider reach but more forfeits; conservative = tighter list
   but less social pull. Suggestion: *generous* (oversubscribe 1.3×).
4. **Moderation line for picks?** If a picked handle is a known bot /
   farmer / problematic account, do we quietly drop them or flag? Suggest
   flag + manual review.

---

*Plan versioned in-repo (`docs/launch-strategy.md`). v2 as of 2026-04-19.*
