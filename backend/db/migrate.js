import 'dotenv/config';
import { query } from './pool.js';

const SQL = `
CREATE TABLE IF NOT EXISTS screening_sessions (
  id          SERIAL       PRIMARY KEY,
  title       TEXT,
  jd_text     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id                SERIAL       PRIMARY KEY,
  session_id        INTEGER      REFERENCES screening_sessions(id) ON DELETE CASCADE,
  rank              INTEGER,
  name              TEXT         NOT NULL,
  current_title     TEXT,
  experience_years  NUMERIC,
  education         TEXT,
  score             INTEGER      NOT NULL,
  skills_match      INTEGER,
  experience_match  INTEGER,
  education_match   INTEGER,
  keyword_score     INTEGER,
  matched_skills    TEXT[],
  missing_skills    TEXT[],
  recommendation    TEXT,
  summary           TEXT,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_session ON candidates(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created   ON screening_sessions(created_at DESC);
`;

(async () => {
  try {
    await query(SQL);
    console.log('✅  Database tables created (or already exist). Ready to go.');
    process.exit(0);
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    console.error('    Check your DATABASE_URL in backend/.env');
    process.exit(1);
  }
})();
