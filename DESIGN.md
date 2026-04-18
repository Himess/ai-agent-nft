# SURVIVORS — Design Language

This document is the single source of truth for the visual and editorial
language of SURVIVORS. It is read by design tools (Claude Design,
Figma-to-code, etc.) and by human contributors writing new components.

## 1. Project identity

**SURVIVORS** is an 888-supply, dark-anime samurai NFT collection on
Ethereum, operated by an autonomous AI agent called **The Seventh**. The
collection is positioned as a disciplined response to the "dead cycle"
of meme-driven NFT culture — the holders are survivors who stayed after
the collapse, The Seven are their archetypes, and The Seventh is the
unrevealed operator that speaks for the order.

The pre-launch site is a Next.js 15 app with three live surfaces:

- `/` — landing page
- `/apply` — long-form application form (8 questions, team-reviewed)
- `/quiz` — ten-question trial (agent-scored, silent results)

Planned surfaces:

- `/raffle` — social-task leaderboard + raffle entry
- `/status` — T-5 results page (wallet lookup → GTD / FCFS / Not Listed)

## 2. Tone of voice

The tone is **ritualistic, controlled, signal-heavy**. Never GM / fam /
anon / meme-bot. No emoji in copy. No exclamation marks. Short clauses
are fine; padding is not.

Reference lines that should feel at home:

- "Signal received."
- "The Seventh reads in silence."
- "Entry is not requested lightly."
- "Silence does not mean absence."
- "Signal over noise. Clarity over performance. Presence over proximity. Discipline over speculation."
- "One sentence. Heavy enough to survive the cycle."

Banned register: "wagmi", "ser", "gm", "to the moon", "grind", "ape in".

## 3. Palette

Tokens defined in `packages/web/app/globals.css` under `@theme`. Do not
introduce colors outside this set without proposing a new token first.

| Token | Hex | Role |
|---|---|---|
| `--color-surv-black` | `#0A0A0A` | Primary background |
| `--color-surv-ash` | `#2B2B2B` | Secondary surface / borders |
| `--color-surv-bone` | `#E8E4DC` | Primary text |
| `--color-surv-crimson` | `#7A0F14` | CTA buttons, accents, error |
| `--color-surv-gold` | `#8C7A4F` | Labels, borders, small text, highlights |
| `--color-surv-indigo` | `#1C2233` | Subtle background gradients |

Alpha usage (common):
- Borders: `rgba(140,122,79,.18)` (gold at 18%)
- Card surfaces: `rgba(10,10,10,.56)` (black at 56%)
- Input surfaces: `rgba(28,34,51,.16)` (indigo at 16%)
- Error border: `rgba(122,15,20,.6)` (crimson at 60%)

## 4. Typography

- **Body:** Inter (Google Fonts) — variable, 300–600
- **Display:** Cormorant Garamond (Google Fonts) — italic + regular, 400–700, used for headlines and ritual lines
- **Monospace:** `ui-monospace` — only for wallet addresses

Common styles:

- Section labels: uppercase, `tracking-[0.35em]` or `tracking-[0.25em]`, 12–14px, `color: surv-gold`
- Page titles: Cormorant Garamond, 4xl → 6xl, regular weight, white/bone
- Body copy: Inter, 14–16px, leading-7 or leading-8, `text-white/70` or `/65`
- Support text: `text-white/45` or `/35`

## 5. Component patterns

### Form shell

Rounded `[2rem]`, border gold-18%, background black-56%. Padding
`p-6 md:p-8`. See `packages/web/app/apply/application-form.tsx` and
`packages/web/app/quiz/quiz-form.tsx` for canonical examples.

### Spam defense (every form must include these)

- Hidden honeypot input (field name: `order_nickname`) positioned off-screen
- Hidden timestamp input (field name: `order_started_at`) set on mount
- 5 layers server-side: honeypot + time gate + IP rate limit + Zod + wallet-UNIQUE

### Field layout

- Label above input, uppercase gold tracking
- Textarea with live character counter (switches to muted crimson `#e8a0a4` above 85% of max)
- Inline error below field in `#e8a0a4`

### Primary CTA

Crimson (`surv-crimson`) rounded-full button, `text-sm font-medium`,
bone text. Examples: "Submit Signal", "Submit Answers", "Enter the
Trial".

### Success state

Replaces the form with a centered card. Small gold label, then a
Cormorant Garamond headline, then one line of muted explanatory copy.
Never a checkmark icon, never a green. See "Signal received" pattern.

### Nav

Sticky, blurred, gold-border bottom. Left: SVVR sigil disk (gold ring
on black, letter-spaced) + "SURVIVORS" wordmark + subtitle. Right:
anchor links (desktop) + Quiz outline button + Applications crimson
CTA. Mobile hamburger: not yet implemented.

## 6. The Seven

The Seven are character archetypes. Five are revealed (portraits in
`packages/web/public/seven/`). Two are **SEALED** — rendered as a
radial gradient card with a "Sealed" sigil, NOT a placeholder image.

| # | Name | Status |
|---|---|---|
| 01 | The Young Ronin | revealed |
| 02 | The Crimson Widow | revealed |
| 03 | The Old Samurai | revealed |
| 04 | The Farwalker | revealed |
| 05 | The Shadow Chief | revealed |
| 06 | — | SEALED |
| 07 | — | SEALED |

## 7. Copy-editing rules

- Lowercase "mint", "wallet", "royalty" — no unnecessary capitalisation.
- Numbers: always digits ("888", not "eight hundred and eighty-eight").
- Time: `T-5`, `T-0` notation for mint-adjacent scheduling.
- Error copy: declarative, not pleading. "This wallet has already submitted." beats "Oops! Looks like..."
- Loading copy: "Sending Signal…", "Sending Answers…" — not "Loading…".

## 8. What to design next

### 8.1 Landing page — full redesign (current one is rough)

Goals:
- Reset the first impression with stronger ritual atmosphere
- Keep 3–5 sections max; density should feel like a scroll, not a SaaS homepage
- First fold must land **tone + scarcity + agent** inside 3 seconds
- Preserve existing data: The Seven portrait grid, 888 CTA, The Seventh
  operator section, "4 pillars" (Signal over Noise, Clarity over
  Performance, Presence over Proximity, Discipline over Speculation)
- The Seventh operator section should feel like a **bio card** of an
  entity, not a project team bio

### 8.2 `/raffle` — new page

Purpose: entry point for the social-task track. Users gate through
three external platforms, then earn points over ~25 days, then a live
leaderboard decides 100 GTD slots; an additional 100 FCFS slots go to
a weighted raffle among participants outside the top 100.

Sections:

1. **Hero** — title "THE TRIAL" or "THE WATCHTOWER", one-line oath,
   small countdown pill ("closes in 6d 12h").
2. **Gate panel** — three vertical rows:
   - Follow `@TheSeventh_xyz` on X
   - Join the Discord Order
   - Join the Telegram Watchtower
   Each row: muted dot (locked) or gold dot (verified), name,
   crimson "Verify" button. Locked → task catalog grayed.
3. **User status** — truncated wallet address, current points, rank
   ("#47 / 3,220"), small label "updates at T-5".
4. **Task catalog** — responsive grid of ~12 tasks. Each card: task
   name (1 line), gold points number (prominent), status chip
   (not-started / pending / completed), Verify button. States for
   pending = subtle gold pulse, not spinner.
5. **Leaderboard preview** — top 10 rows: rank, wallet (truncated
   `0x1234…abcd`), points. Monospace for wallet, regular for rank.
   "Full leaderboard" link below.
6. **Footer CTA** — muted gold line: "Submit answers on /quiz to
   unlock an additional track."

Micro-interactions: no parallax, no animated backgrounds. Gold pulse
only on pending verify. Subtle shimmer on newly-earned points (ease-out
500ms). Mobile first.

### 8.3 `/status` (later) — T-5 results

Wallet input. On submit, three possible cards:
- **Chosen — GTD.** "The Seventh marked you at [timestamp]. One mint, one wallet, on mint day. Watch the feed."
- **Chosen — FCFS.** "You will compete for the remaining slots. Speed and fee discipline decide."
- **Not listed.** "The Trial did not return your signal. This is not an appeal." (No explanation, no score.)

No user accounts, no login required — just wallet address as the lookup key.

## 9. What NOT to do

- No marketing illustrations (no 3D blobs, no isometric vector scenes).
- No bright colors outside the palette. No purple. No hot pink. No lime.
- No "limited offer" urgency banners. The pressure is implicit, not loud.
- No testimonials / quote cards with avatars. The agent is the only named voice.
- No pricing cards. Mint price lives in a single line on the raffle or landing page, not in a feature matrix.
- No stock photography.
- No emoji in UI or in error/loading/success copy.

## 10. Assets

- Character portraits: `packages/web/public/seven/*.jpg`
- Fonts loaded via `next/font/google` in `packages/web/app/layout.tsx`
- SVVR sigil is text-only (no logo file)
- No OG image yet — deferred polish item
