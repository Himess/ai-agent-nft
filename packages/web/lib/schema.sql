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
