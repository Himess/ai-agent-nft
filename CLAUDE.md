# CLAUDE.md — SURVIVORS Project Context

> Last updated: 2026-04-17 by Claude Opus 4.6 session. Read this FULLY before doing anything.

---

## 1. What Is This Project

**SURVIVORS** is an 888-supply ERC-721 NFT collection on Ethereum, stewarded by an autonomous AI agent called **"The Seventh"**. The agent manages WL decisions, tweets, outreach, and on-chain operations. The Seven are dark-anime samurai archetypes that survived a dead NFT cycle.

**User:** semihcvlk53@gmail.com — solo developer, speaks Turkish (casual register), handles both Solidity and TS/agent sides. Prefers concise updates. Expects the assistant to reconstruct state from repo/git/memory without re-asking.

---

## 2. Repository Structure

```
C:\Users\USER\desktop\ai-agent-nft\          ← monorepo root (npm workspaces)
├── .env.example                              ← template for contract env vars
├── CLAUDE.md                                 ← THIS FILE
├── SEPOLIA-DEPLOYMENT.md                     ← ⚠ STALE — old contract addresses (pre-rebrand)
├── NFT/                                      ← raw character portraits (5 JPGs, do NOT commit carelessly)
├── packages/
│   ├── agent/                                ← TS autonomous agent (Twitter, outreach, scoring, AI prompts)
│   │   └── src/
│   │       ├── ai/prompts/                   ← Persona prompts: tweet.ts, content.ts, outreach.ts, wl-analysis.ts
│   │       ├── config.ts                     ← AGENT_NAME="The Seventh", PROJECT_NAME="SURVIVORS"
│   │       ├── chain/ scoring/ scheduler/ twitter/ outreach/ storage/ utils/
│   │       └── index.ts
│   ├── contracts/                            ← Hardhat + Solidity (ERC-721 + ERC-2981 + ERC-6551)
│   │   ├── contracts/
│   │   │   ├── AgentNFT.sol                  ← SURVIVORS NFT (888 supply, Phase enum, Merkle WL, per-wallet guard)
│   │   │   ├── AgentAccount.sol              ← ERC-6551 Token Bound Account (agent's wallet)
│   │   │   ├── RevenueSplitter.sol           ← 50/20/30 revenue split
│   │   │   ├── identity/AgentIdentity.sol    ← on-chain identity + reputation
│   │   │   └── interfaces/IAgentNFT.sol      ← Phase { Closed, Whitelist, Public }, errors, events
│   │   ├── scripts/deploy.ts                 ← Full 8-step deploy (SURVIVORS/SVVR, The Seventh identity)
│   │   ├── test/                             ← 149 tests (all passing)
│   │   │   ├── AgentNFT.test.ts, AgentAccount.test.ts, AgentIdentity.test.ts, RevenueSplitter.test.ts
│   │   │   ├── integration/FullFlow.test.ts
│   │   │   └── helpers/fixtures.ts           ← buildMerkle() helper, allocation constants
│   │   ├── package.json                      ← test script uses EXPLICIT file list (default discovery breaks chai matchers)
│   │   └── hardhat.config.ts                 ← Sepolia + mainnet configs, needs .env
│   └── web/                                  ← Next.js 15 landing page (LIVE on Vercel)
│       ├── app/
│       │   ├── layout.tsx                    ← Inter + Cormorant Garamond fonts, metadata, noindex
│       │   ├── page.tsx                      ← Landing: Hero, Ultimatum, The Seven, 888 CTA, Operator, System, Footer
│       │   ├── globals.css                   ← Tailwind v4 @theme with surv-* color tokens
│       │   └── apply/
│       │       ├── page.tsx                  ← Application form page (/apply route)
│       │       ├── application-form.tsx      ← Client component: form + honeypot + time gate + character counters
│       │       └── actions.ts                ← Server Action: 5-layer spam defense → Neon INSERT
│       ├── components/
│       │   ├── nav.tsx                       ← Sticky nav with SVVR sigil, anchor links, /apply CTA
│       │   └── seven-card.tsx                ← Revealed (with portrait) + Sealed (placeholder) card variants
│       ├── lib/
│       │   ├── db.ts                         ← Neon serverless client (lazy init, reads DATABASE_URL)
│       │   ├── redis.ts                      ← Upstash Redis client (lazy init, reads KV_REST_API_URL/TOKEN)
│       │   ├── rate-limit.ts                 ← IP burst (3/5min) + IP hourly (10/1h) + wallet lifetime cache
│       │   ├── schema.ts                     ← Zod validation + LIMITS object + QUESTIONS array (single source of truth)
│       │   ├── schema.sql                    ← CREATE TABLE applications (wallet UNIQUE, status, score, ...)
│       │   └── spam.ts                       ← Honeypot field name + timestamp field name + looksLikeBot()
│       ├── scripts/
│       │   ├── migrate.ts                    ← Run schema.sql against Neon (npm run migrate)
│       │   └── export.ts                     ← CSV export: all / wl / wallets modes (npm run export)
│       ├── public/seven/                     ← 5 character portraits (young-ronin, crimson-widow, old-samurai, farwalker, shadow-chief)
│       ├── next.config.ts                    ← React alias (Windows path fix) + reactStrictMode
│       ├── postcss.config.mjs                ← @tailwindcss/postcss
│       ├── tsconfig.json                     ← @/* path alias
│       ├── package.json                      ← Scripts: dev, build (--turbopack), migrate, export, export:wl, export:wallets
│       └── .env.local                        ← ⚠ NOT in git. Has DATABASE_URL, KV_REST_API_URL, KV_REST_API_TOKEN, etc.
└── package.json                              ← Root: npm workspaces ["packages/*"]
```

---

## 3. Git Status (as of 2026-04-17)

- **Branch:** `master`
- **Remote:** `origin/master` — 1 commit behind local (push NOT done, user wants private repo)
- **Commits:**
  1. `06b8922` — Initial commit: AI Agent NFT — contracts + agent backend + Sepolia deploy
  2. `e333460` — Rebrand to SURVIVORS + The Seventh; new mint mechanics
- **Uncommitted / untracked:**
  - `NFT/` — 5 raw portrait JPGs (untracked, intentionally not committed yet)
  - `packages/web/` — entire landing page package (untracked, needs to be committed)
  - `package-lock.json` — modified (new deps for web package)
- **⚠ NEEDS COMMIT:** `packages/web/` + `package-lock.json` should be committed as a single coherent commit (landing page + spam defense + Vercel setup)

---

## 4. Contracts (packages/contracts)

### Architecture
- **AgentNFT.sol** — ERC-721 + ERC-721Enumerable + ERC-2981 + Ownable + ReentrancyGuard
  - MAX_SUPPLY = 888
  - Allocation: VAULT=88, WL=500, FCFS=250, TEAM=50
  - Phase enum: Closed → Whitelist → Public
  - `wlMint(proof)` — Merkle-gated, 1 per wallet per phase
  - `publicMint()` — FCFS, 1 per wallet
  - `reservedMint(to, qty)` — owner only, for vault + team (up to 138)
  - `setPhase()`, `setWLMerkleRoot()`, `setMintPrice()`, `setRevenueSplitter()`, `withdraw()`
- **RevenueSplitter.sol** — 50% agent TBA / 20% founder1 / 30% founder2
- **AgentAccount.sol** — ERC-6551 Token Bound Account
- **AgentIdentity.sol** — on-chain identity registry + reputation system

### Tests
- 149 tests, ALL PASSING
- **IMPORTANT:** `package.json` test script uses explicit file list, NOT `hardhat test` alone. Default discovery breaks chai matchers due to ordering issue. Do NOT remove the explicit file list from the test command.
- Command: `cd packages/contracts && npm test`

### Sepolia Deployment — ⚠ STALE
`SEPOLIA-DEPLOYMENT.md` has OLD addresses from the initial `AI Agent NFT` deployment (1000 supply, `mint(qty)` API). These are from BEFORE the SURVIVORS rebrand. **Redeploy is needed.**

Old addresses (DO NOT USE for new code):
- AgentNFT: `0x2B8314d0D31314907cC8F94Cb6972bF37a292bc0`
- RevenueSplitter: `0x0Cc3f65E7E0D14F5A8A433d23f1Fa532d4C39053`
- AgentAccount (TBA): `0x5dd1961cEF2E9ae81dC4FB87fA561E624d2D502a`
- AgentIdentity: `0xDD722af18a0b4B96AC3bb48a8b038BF03b688e80`
- Deployer: `0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c`

Deploy env is at `packages/contracts/.env` (DEPLOYER_PRIVATE_KEY, ALCHEMY_API_KEY, ETHERSCAN_API_KEY — all set).

---

## 5. Agent (packages/agent)

TS backend that autonomously operates the project's Twitter presence, evaluates WL applications, and manages outreach.

### Persona: THE SEVENTH
- Voice mix: ~50% Oracle / ~35% Cold Strategist / ~15% dry humor
- No "GM/Fam/Anon" openers, no engagement bait, no meme-bot
- Dark, controlled, signal > noise

### Key prompt files:
- `src/ai/prompts/tweet.ts` — PERSONA_BLOCK + tweet system prompt + topic list
- `src/ai/prompts/content.ts` — reply + DM system prompts
- `src/ai/prompts/outreach.ts` — outreach + collab evaluation
- `src/ai/prompts/wl-analysis.ts` — WL decision engine (APPROVE >=65, REVIEW 50-64, REJECT <50)

### Config
- `src/config.ts` — zod env schema, requires: ANTHROPIC_API_KEY, TWITTER_*, RPC_URL, AGENT_PRIVATE_KEY, contract addresses
- Default: AGENT_NAME="The Seventh", PROJECT_NAME="SURVIVORS"

---

## 6. Web / Landing Page (packages/web) — LIVE

### Live URLs
- **Primary:** https://survivors-nu.vercel.app
- **Aliases:** survivors-himess-projects.vercel.app, survivors-himess-himess-projects.vercel.app
- **Vercel project:** `himess-projects/survivors` (prj_fAWJh5A4kxn2Vx3g7WBshlXoZ4DP)
- **Target:** production
- **Region:** iad1 (US East)
- **robots:** noindex, nofollow (pre-launch stealth)

### Tech Stack
- Next.js 15.5 + React 19 + TypeScript
- Tailwind CSS v4 (with @theme custom tokens: surv-black, surv-bone, surv-crimson, surv-gold, surv-indigo, surv-ash)
- Fonts: Inter (body) + Cormorant Garamond (headings)
- **MUST build with `--turbopack`** — webpack fails on Windows due to path casing issue (Desktop vs desktop → duplicate React instances → useContext null error). Do NOT remove --turbopack flag.

### Pages
1. **`/`** — Landing page: Hero (with Old Samurai portrait), Ultimatum (manifesto + key lines), The Seven (5 revealed with portraits + 2 SEALED), 888 CTA, Operator (The Seventh), System (4 pillars), Footer
2. **`/apply`** — Application form: 8 questions (3 short inputs + 4 required textareas + 1 optional), real submit to Neon DB

### The Seven (character mapping)
| # | Character | Image file | Status |
|---|---|---|---|
| 01 | The Young Ronin | young-ronin.jpg | Revealed |
| 02 | The Crimson Widow | crimson-widow.jpg | Revealed |
| 03 | The Old Samurai | old-samurai.jpg | Revealed (also in hero) |
| 04 | The Farwalker | farwalker.jpg | Revealed |
| 05 | The Shadow Chief | shadow-chief.jpg | Revealed |
| 06 | ??? | — | SEALED (placeholder card) |
| 07 | ??? | — | SEALED (placeholder card) |

Missing characters (Iron Vow, Hidden Hand) — user hasn't provided images. Placeholder = radial gradient + "Sealed" sigil.

### Form Validation (lib/schema.ts — SINGLE SOURCE OF TRUTH)
| Field | ID | Min | Max | Required | Validation |
|---|---|---|---|---|---|
| Name or Alias | name | 1 | 120 | Yes | — |
| X / Twitter Handle | twitter | 1 | 16 | Yes | `/^@?[A-Za-z0-9_]{1,15}$/` |
| Wallet Address | wallet | 42 | 42 | Yes | `/^0x[a-fA-F0-9]{40}$/` |
| How did you find SURVIVORS? | discovery | 10 | 500 | Yes | — |
| What kept you here after collapse? | endurance | 10 | 1500 | Yes | — |
| Which of the Seven? | recognition | 10 | 1500 | Yes | — |
| What do you carry? | offering | 10 | 1500 | Yes | — |
| Links | links | 0 | 500 | No | — |

Client-side: `required`, `minLength`, `maxLength` HTML attributes + live character counter on textareas.
Server-side: zod validation with same limits.

### Spam / Bot Defense (5 layers in order — app/apply/actions.ts)
1. **Honeypot** (`order_nickname`) — hidden input, CSS off-screen. Bots fill it → silent success (never reveal detection).
2. **Time gate** (`order_started_at`) — hidden timestamp. Submit < 3 seconds or > 1 hour → silent success.
3. **IP rate limit** (Upstash Redis) — sliding window: 3 per 5 min burst + 10 per hour sustained.
4. **Zod validation** — schema checks (length, regex, required).
5. **Wallet check** — Redis fast-reject (180-day cache) + DB UNIQUE constraint (final guard). On unique violation → cache wallet in Redis.

Silent success = bot thinks it succeeded, but nothing saved. This prevents bots from adapting.

### Infrastructure
- **Neon Postgres** (`neon-aqua-fountain`) — Vercel Marketplace. Env: `DATABASE_URL`. Table: `applications` (see `lib/schema.sql`).
- **Upstash Redis** (`upstash-kv-almond-brush`) — Vercel Marketplace. Env: `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
- Both are `● Available` status.

### Scripts (run from packages/web/)
```bash
npm run dev              # dev server (turbopack)
npm run build            # production build (turbopack — MUST keep --turbopack)
npm run migrate          # apply lib/schema.sql to Neon DB
npm run export           # all applications → exports/applications-YYYY-MM-DD.csv
npm run export:wl        # approved only (status='approved') with score
npm run export:wallets   # just wallet addresses of approved ones
```

### Deploy (Vercel CLI)
```bash
# Vercel CLI is at C:\Users\USER\AppData\Roaming\npm\vercel.cmd
# In bash, add to PATH first:
export PATH="$PATH:/c/Users/USER/AppData/Roaming/npm"

cd packages/web
vercel deploy --prod --yes    # production deploy
vercel env pull .env.local    # pull latest env vars from Vercel
```

---

## 7. Pending / TODO (what was NOT completed)

### High Priority
1. **Commit packages/web/** — the entire web package + NFT/ portraits + package-lock.json are untracked. Should be one coherent commit.
2. **Sepolia redeploy** — contracts were rebranded (SURVIVORS/SVVR, Phase enum, wlMint/publicMint/reservedMint, 888 supply) but NOT redeployed. Old Sepolia addresses are stale. Command: `cd packages/contracts && npx hardhat run scripts/deploy.ts --network sepolia`. Will generate new addresses → update SEPOLIA-DEPLOYMENT.md.
3. **WL Merkle root** — after redeploy, need actual WL address list to generate Merkle tree root. `setWLMerkleRoot(root)` then `setPhase(1)` to open WL. Contract's `buildMerkle()` helper is in `test/helpers/fixtures.ts` — can reuse.
4. **Notification on new submission** — discussed Discord webhook / Telegram bot / Resend email. User hasn't chosen yet. No notification system exists currently — submissions only visible via `npm run export` or Neon dashboard.

### Medium Priority
5. **Admin panel** — `/admin` route for reviewing applications (Approve/Reject buttons, scoring). Not started.
6. **Hero image** — currently using Old Samurai portrait in hero right panel. User may want a dedicated widescreen hero image.
7. **Missing 2 characters** — Iron Vow + Hidden Hand portraits not provided. Currently "SEALED" placeholders.
8. **Etherscan verification** — needs ETHERSCAN_API_KEY (set in .env). `npx hardhat verify --network sepolia <address> <constructor args>`.
9. **Connect Wallet / Mint UI** — not in current MVP. Discussion deferred to after contract redeploy.

### Low Priority / Future
10. **Custom domain** — currently on *.vercel.app subdomain
11. **Deployment protection** — Vercel Pro required for password-protected previews
12. **OG image** — no social preview image yet
13. **Mobile menu** — nav links hidden on mobile (hamburger not implemented)
14. **Agent backend operational setup** — requires Twitter API keys, Anthropic key, running agent process

---

## 8. Key Technical Gotchas

1. **ALWAYS use `--turbopack` for Next.js build/dev.** Webpack fails on Windows due to case-insensitive filesystem creating duplicate React instances (`Desktop` vs `desktop` path normalization). Turbopack handles this correctly.

2. **Contract test script MUST list files explicitly.** `hardhat test` with default discovery has a chai matcher ordering bug. The test command in `packages/contracts/package.json` is: `hardhat test test/AgentAccount.test.ts test/AgentIdentity.test.ts test/AgentNFT.test.ts test/RevenueSplitter.test.ts test/integration/FullFlow.test.ts` — do NOT simplify to `hardhat test`.

3. **Vercel CLI path on Windows bash:** `export PATH="$PATH:/c/Users/USER/AppData/Roaming/npm"` before running `vercel` commands.

4. **Vercel user:** `himess` (logged in). Team: `himess-projects`.

5. **Rate limit graceful degradation:** If Upstash Redis env vars are missing, rate limiting is SKIPPED (not errored). DB UNIQUE is the final guard. This lets dev/preview work without Redis.

6. **Schema changes require 4 updates:** If you add/change form fields: (1) `lib/schema.ts` LIMITS + QUESTIONS + zod schema, (2) `lib/schema.sql` + run migrate, (3) `app/apply/actions.ts` INSERT, (4) `scripts/export.ts` SELECT.

7. **NFT/ folder** is the user's raw image dump. DO NOT commit to public repo. Images used in the site are COPIES in `packages/web/public/seven/`.

8. **Private repo requirement:** User explicitly wants this repo private. Don't push to public GitHub. No git remote push has been done since initial commit.

---

## 9. Color Palette

```
black:   #0A0A0A  (background)
ash:     #2B2B2B  (secondary bg)
bone:    #E8E4DC  (primary text)
crimson: #7A0F14  (CTA buttons, accent)
gold:    #8C7A4F  (labels, borders, highlights)
indigo:  #1C2233  (subtle bg gradients)
```

---

## 10. Conversation Language

User speaks **Turkish** (casual register — "bakalım", "aynenç", "falan"). Respond in Turkish unless writing code/commits/docs in English. Keep responses concise. User values pragmatic action over lengthy explanations.
