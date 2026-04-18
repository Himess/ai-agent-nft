CREATE TABLE IF NOT EXISTS applications (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  twitter     TEXT NOT NULL,
  wallet      TEXT NOT NULL UNIQUE,
  discovery   TEXT NOT NULL,
  endurance   TEXT NOT NULL,
  recognition TEXT NOT NULL,
  offering    TEXT NOT NULL,
  links       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  score       INTEGER,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
CREATE INDEX IF NOT EXISTS applications_created_at_idx ON applications(created_at DESC);

CREATE TABLE IF NOT EXISTS quiz_submissions (
  id          BIGSERIAL PRIMARY KEY,
  wallet      TEXT NOT NULL UNIQUE,
  twitter     TEXT NOT NULL,
  answers     JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  score       INTEGER,
  scored_at   TIMESTAMPTZ,
  scorer_notes TEXT,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_status_idx ON quiz_submissions(status);
CREATE INDEX IF NOT EXISTS quiz_score_idx ON quiz_submissions(score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS quiz_created_at_idx ON quiz_submissions(created_at DESC);
