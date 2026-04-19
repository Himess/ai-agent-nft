-- ═══════════════════════════════════════════════════════════════════
-- SURVIVORS — auth-gated DB schema
-- -------------------------------------------------------------------
-- Final state for fresh installs. Running on an existing DB that
-- predates the auth layer requires dropping applications +
-- quiz_submissions first (they gain a FK to user_profiles). Use
-- `npm run migrate:reset` to drop + recreate cleanly.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Canonical identity. One wallet, one twitter, one row.
CREATE TABLE IF NOT EXISTS user_profiles (
  wallet                 TEXT PRIMARY KEY,      -- checksum address, verified via SIWE
  twitter_id             TEXT UNIQUE,           -- Twitter numeric id, stable across handle rename
  twitter_handle         TEXT,
  twitter_followers      INTEGER,
  twitter_account_age_d  INTEGER,               -- at time of OAuth verify

  -- auth timestamps
  siwe_verified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  twitter_verified_at    TIMESTAMPTZ,

  -- wallet score cache (refreshed every 7d)
  wallet_score           INTEGER,               -- 0-30, NFT-weighted 80/20
  wallet_age_days        INTEGER,
  tx_count               INTEGER,
  nft_usd_value          INTEGER,
  bluechip_count         INTEGER,
  avg_holding_days       INTEGER,
  last_activity_at       TIMESTAMPTZ,
  wallet_scored_at       TIMESTAMPTZ,

  -- social activity rollup (updated on task_completion insert / agent_engagement insert)
  total_task_points      INTEGER NOT NULL DEFAULT 0,
  total_agent_bonus      INTEGER NOT NULL DEFAULT 0,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_profiles_twitter_handle_idx ON user_profiles(twitter_handle);
CREATE INDEX IF NOT EXISTS user_profiles_total_points_idx   ON user_profiles((total_task_points + total_agent_bonus) DESC);

-- 2. SIWE nonces — short-lived, single-use challenges.
CREATE TABLE IF NOT EXISTS siwe_nonces (
  nonce       TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS siwe_nonces_expires_idx ON siwe_nonces(expires_at);

-- 3. Social task catalog — admin-defined.
CREATE TABLE IF NOT EXISTS social_tasks (
  id                    SERIAL PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  kind                  TEXT NOT NULL
                        CHECK (kind IN ('follow','like','rt','qrt','reply','streak','referral')),
  target_tweet_id       TEXT,
  target_handle         TEXT,
  title                 TEXT NOT NULL,
  description           TEXT,
  points                INTEGER NOT NULL,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at             TIMESTAMPTZ,
  ends_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_tasks_active_idx ON social_tasks(active) WHERE active = TRUE;

-- 4. Per-user task completion — one row per (wallet, task).
CREATE TABLE IF NOT EXISTS task_completions (
  wallet          TEXT NOT NULL REFERENCES user_profiles(wallet) ON DELETE CASCADE,
  task_id         INTEGER NOT NULL REFERENCES social_tasks(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','verified','rejected')),
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  evidence        JSONB,
  rejected_reason TEXT,
  queued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at     TIMESTAMPTZ,
  PRIMARY KEY (wallet, task_id)
);

CREATE INDEX IF NOT EXISTS task_completions_wallet_idx ON task_completions(wallet);
CREATE INDEX IF NOT EXISTS task_completions_pending_idx ON task_completions(queued_at) WHERE status = 'pending';

-- 5. Agent engagement bonuses when Ashborn likes/RTs/replies to a user's tweet.
CREATE TABLE IF NOT EXISTS agent_engagements (
  id             BIGSERIAL PRIMARY KEY,
  wallet         TEXT NOT NULL REFERENCES user_profiles(wallet) ON DELETE CASCADE,
  user_tweet_id  TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('liked','retweeted','replied')),
  bonus_points   INTEGER NOT NULL,
  seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wallet, user_tweet_id, kind)
);

CREATE INDEX IF NOT EXISTS agent_engagements_wallet_idx ON agent_engagements(wallet);
CREATE INDEX IF NOT EXISTS agent_engagements_seen_idx ON agent_engagements(seen_at DESC);

-- 6. Agent's scored reading of quiz + application (0-70 each).
CREATE TABLE IF NOT EXISTS agent_scores (
  wallet      TEXT NOT NULL REFERENCES user_profiles(wallet) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('quiz','application')),
  score       INTEGER NOT NULL,
  reasoning   TEXT,
  scored_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wallet, kind)
);

-- 7. Application form submissions — one per wallet.
CREATE TABLE IF NOT EXISTS applications (
  id            BIGSERIAL PRIMARY KEY,
  wallet        TEXT NOT NULL UNIQUE REFERENCES user_profiles(wallet) ON DELETE CASCADE,
  twitter       TEXT NOT NULL,                  -- denormalized cache of handle at submit time
  name          TEXT NOT NULL,
  discovery     TEXT NOT NULL,
  endurance     TEXT NOT NULL,
  recognition   TEXT NOT NULL,
  offering      TEXT NOT NULL,
  links         TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',
  score         INTEGER,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON applications(created_at DESC);

-- 8. Quiz submissions — one per wallet.
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id           BIGSERIAL PRIMARY KEY,
  wallet       TEXT NOT NULL UNIQUE REFERENCES user_profiles(wallet) ON DELETE CASCADE,
  twitter      TEXT NOT NULL,
  answers      JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  score        INTEGER,
  scored_at    TIMESTAMPTZ,
  scorer_notes TEXT,
  ip           TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_status_idx     ON quiz_submissions(status);
CREATE INDEX IF NOT EXISTS quiz_score_idx      ON quiz_submissions(score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS quiz_created_at_idx ON quiz_submissions(created_at DESC);
