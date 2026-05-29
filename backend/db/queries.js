import { query } from './pool.js';

// ── Sessions ──────────────────────────────────────────────────

export async function createSession(title, jdText) {
  const { rows } = await query(
    `INSERT INTO screening_sessions (title, jd_text)
     VALUES ($1, $2) RETURNING id, created_at`,
    [title || null, jdText]
  );
  return rows[0];
}

export async function getAllSessions() {
  const { rows } = await query(`
    SELECT
      s.id,
      s.title,
      s.created_at,
      COUNT(c.id)::int          AS candidate_count,
      ROUND(AVG(c.score))::int  AS avg_score,
      MAX(c.score)              AS top_score
    FROM screening_sessions s
    LEFT JOIN candidates c ON c.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 50
  `);
  return rows;
}

export async function getSessionWithCandidates(sessionId) {
  const { rows: sessions } = await query(
    `SELECT id, title, jd_text, created_at
     FROM screening_sessions WHERE id = $1`,
    [sessionId]
  );
  if (!sessions.length) return null;

  const { rows: candidates } = await query(
    `SELECT * FROM candidates WHERE session_id = $1 ORDER BY rank ASC`,
    [sessionId]
  );

  return { ...sessions[0], candidates };
}

export async function deleteSession(sessionId) {
  await query(`DELETE FROM screening_sessions WHERE id = $1`, [sessionId]);
}

// ── Candidates ────────────────────────────────────────────────

export async function saveCandidates(sessionId, candidates) {
  // Insert all candidates for a session in one round-trip
  for (const c of candidates) {
    await query(
      `INSERT INTO candidates
         (session_id, rank, name, current_title, experience_years,
          education, score, skills_match, experience_match,
          education_match, keyword_score, matched_skills,
          missing_skills, recommendation, summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        sessionId,
        c.rank,
        c.name,
        c.current_title || null,
        c.experience_years || null,
        c.education || null,
        c.score,
        c.skills_match,
        c.experience_match,
        c.education_match,
        c.keyword_score,
        c.matched_skills || [],
        c.missing_skills || [],
        c.recommendation || null,
        c.summary || null,
      ]
    );
  }
}
