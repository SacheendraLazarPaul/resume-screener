/**
 * Netlify Function — handles all /api/* routes
 * Replaces the Express backend entirely.
 * Deployed free on Netlify Functions (125k invocations/month free).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import pkg from 'pg';
import Busboy from 'busboy';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

const { Pool } = pkg;

// ─── DB Pool ──────────────────────────────────────────────────
function getPool() {
  const url = process.env.DATABASE_URL || '';
  const isNeon = url.includes('neon.tech');
  return new Pool({
    connectionString: url,
    ssl: isNeon ? { rejectUnauthorized: false } : false,
    max: 3, // small pool for serverless
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

async function dbQuery(sql, params = []) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
    await pool.end();
  }
}

// ─── AI Providers ─────────────────────────────────────────────
function hasKey(key) {
  return key && key.length > 10 && !key.includes('YOUR') && !key.includes('...');
}

async function callGemini(systemPrompt, userPrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!hasKey(key)) throw new Error('Gemini key missing');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.1, maxOutputTokens: 1500, responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text().replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
}

async function callGroq(systemPrompt, userPrompt) {
  const key = process.env.GROQ_API_KEY;
  if (!hasKey(key)) throw new Error('Groq key missing');
  const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    temperature: 0.1,
  }, { headers: { Authorization: `Bearer ${key}` } });
  return res.data.choices[0].message.content;
}

async function callOpenRouter(systemPrompt, userPrompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!hasKey(key)) throw new Error('OpenRouter key missing');
  const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    max_tokens: 1500,
    temperature: 0.1,
  }, {
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': process.env.URL || 'https://localhost',
      'X-Title': 'Resume Screener',
    },
  });
  return res.data.choices[0].message.content;
}

async function callAI(systemPrompt, userPrompt) {
  const preferred = (process.env.AI_PROVIDER || '').toLowerCase();
  const order = [preferred, 'gemini', 'groq', 'openrouter'].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  const errors = [];
  for (const p of order) {
    try {
      if (p === 'gemini') return await callGemini(systemPrompt, userPrompt);
      if (p === 'groq')   return await callGroq(systemPrompt, userPrompt);
      if (p === 'openrouter') return await callOpenRouter(systemPrompt, userPrompt);
    } catch (e) {
      errors.push(`${p}: ${e.message}`);
    }
  }
  throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}

function getProviderInfo() {
  const preferred = (process.env.AI_PROVIDER || '').toLowerCase();
  const models = {
    gemini: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    openrouter: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
  };
  const active = preferred || (hasKey(process.env.GEMINI_API_KEY) ? 'gemini' : hasKey(process.env.GROQ_API_KEY) ? 'groq' : 'openrouter');
  return { provider: active, model: models[active] || 'unknown', free: true };
}

// ─── Scoring ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert HR recruiter and ATS system.
Analyze resumes against job descriptions and return structured JSON scoring.

CRITICAL RULES:
- Return ONLY a single valid JSON object
- No markdown, no backticks, no explanation, no text before or after JSON
- All number fields must be plain integers (0-100), not strings
- All array fields must be arrays of strings

SCORING WEIGHTS:
  skills_match      × 0.35
  experience_match  × 0.30
  education_match   × 0.15
  keyword_score     × 0.20`;

function buildPrompt(resumeText, jdText, candidateName) {
  return `JOB DESCRIPTION:\n${jdText}\n\n---\n\nRESUME (candidate: ${candidateName}):\n${resumeText.substring(0, 4000)}\n\n---\n\nRespond with ONLY this JSON, nothing else:\n{\n  "name": "full candidate name from resume",\n  "current_title": "most recent job title or student",\n  "experience_years": 0,\n  "education": "highest degree and field",\n  "score": 0,\n  "skills_match": 0,\n  "experience_match": 0,\n  "education_match": 0,\n  "keyword_score": 0,\n  "matched_skills": ["skill1", "skill2"],\n  "missing_skills": ["skill1", "skill2"],\n  "recommendation": "strong_yes",\n  "summary": "3-sentence assessment of fit for this specific role"\n}`;
}

async function scoreResume(resumeText, jdText, candidateName) {
  const raw = await callAI(SYSTEM_PROMPT, buildPrompt(resumeText, jdText, candidateName));
  let clean = raw
    .replace(/```json\s*/gi, '').replace(/```\s*/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');
  if (start === -1 || end === -1) return defaultScore(candidateName, 'No JSON in response');
  try {
    const parsed = JSON.parse(clean.substring(start, end + 1));
    const toInt = v => Math.min(100, Math.max(0, parseInt(v) || 0));
    const toArr = v => Array.isArray(v) ? v.map(String) : [];
    const toStr = (v, fb) => (typeof v === 'string' && v.trim()) ? v.trim() : fb;
    const s = {
      name: toStr(parsed.name, candidateName),
      current_title: toStr(parsed.current_title, 'Not specified'),
      experience_years: parseInt(parsed.experience_years) || 0,
      education: toStr(parsed.education, 'Not specified'),
      skills_match: toInt(parsed.skills_match),
      experience_match: toInt(parsed.experience_match),
      education_match: toInt(parsed.education_match),
      keyword_score: toInt(parsed.keyword_score),
      matched_skills: toArr(parsed.matched_skills),
      missing_skills: toArr(parsed.missing_skills),
      recommendation: ['strong_yes','yes','maybe','no'].includes(parsed.recommendation) ? parsed.recommendation : 'maybe',
      summary: toStr(parsed.summary, 'Analysis complete.'),
    };
    s.score = Math.round(s.skills_match * 0.35 + s.experience_match * 0.30 + s.education_match * 0.15 + s.keyword_score * 0.20);
    return s;
  } catch (e) {
    return defaultScore(candidateName, `JSON parse error: ${e.message}`);
  }
}

function defaultScore(candidateName, reason) {
  return { name: candidateName, current_title: 'Unknown', experience_years: 0, education: 'Unknown', score: 0, skills_match: 0, experience_match: 0, education_match: 0, keyword_score: 0, matched_skills: [], missing_skills: [], recommendation: 'no', summary: `Analysis failed: ${reason}. Please try again.`, error: true };
}

// ─── File Parsing ──────────────────────────────────────────────
async function extractText(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'txt') return buffer.toString('utf8');
  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

// ─── Multipart parser ─────────────────────────────────────────
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const bb = Busboy({ headers: { 'content-type': contentType } });
    const fields = {};
    const files = {};

    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('data', d => chunks.push(d));
      stream.on('end', () => {
        if (!files[name]) files[name] = [];
        files[name].push({ buffer: Buffer.concat(chunks), filename: info.filename, mimetype: info.mimeType });
      });
    });
    bb.on('finish', () => resolve({ fields, files }));
    bb.on('error', reject);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '', 'utf8');
    bb.write(body);
    bb.end();
  });
}

// ─── DB Helpers ───────────────────────────────────────────────
async function createSession(title, jdText) {
  const { rows } = await dbQuery(
    `INSERT INTO screening_sessions (title, jd_text) VALUES ($1, $2) RETURNING id, created_at`,
    [title || null, jdText]
  );
  return rows[0];
}

async function getAllSessions() {
  const { rows } = await dbQuery(`
    SELECT s.id, s.title, s.created_at,
      COUNT(c.id)::int AS candidate_count,
      ROUND(AVG(c.score))::int AS avg_score,
      MAX(c.score) AS top_score
    FROM screening_sessions s
    LEFT JOIN candidates c ON c.session_id = s.id
    GROUP BY s.id ORDER BY s.created_at DESC LIMIT 50
  `);
  return rows;
}

async function getSessionWithCandidates(sessionId) {
  const { rows: sessions } = await dbQuery(`SELECT id, title, jd_text, created_at FROM screening_sessions WHERE id = $1`, [sessionId]);
  if (!sessions.length) return null;
  const { rows: candidates } = await dbQuery(`SELECT * FROM candidates WHERE session_id = $1 ORDER BY rank ASC`, [sessionId]);
  return { ...sessions[0], candidates };
}

async function deleteSession(sessionId) {
  await dbQuery(`DELETE FROM screening_sessions WHERE id = $1`, [sessionId]);
}

async function saveCandidates(sessionId, candidates) {
  for (const c of candidates) {
    await dbQuery(
      `INSERT INTO candidates (session_id, rank, name, current_title, experience_years, education, score, skills_match, experience_match, education_match, keyword_score, matched_skills, missing_skills, recommendation, summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [sessionId, c.rank, c.name, c.current_title || null, c.experience_years || null, c.education || null, c.score, c.skills_match, c.experience_match, c.education_match, c.keyword_score, c.matched_skills || [], c.missing_skills || [], c.recommendation || null, c.summary || null]
    );
  }
}

// ─── CORS Headers ─────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

function json(statusCode, body) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// ─── Main Handler ─────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  // Netlify routes: /api/status, /api/screen, /api/history, /api/history/:id
  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '') || '/';
  const method = event.httpMethod;

  try {
    // GET /status
    if (path === '/status' && method === 'GET') {
      return json(200, { ok: true, ...getProviderInfo() });
    }

    // GET /providers
    if (path === '/providers' && method === 'GET') {
      return json(200, {
        active: getProviderInfo(),
        providers: {
          gemini:     { name: 'Google Gemini', hasKey: hasKey(process.env.GEMINI_API_KEY) && process.env.GEMINI_API_KEY?.startsWith('AIza'), free: true, getKeyUrl: 'https://aistudio.google.com/app/apikey' },
          groq:       { name: 'Groq',          hasKey: hasKey(process.env.GROQ_API_KEY),         free: true, getKeyUrl: 'https://console.groq.com' },
          openrouter: { name: 'OpenRouter',     hasKey: hasKey(process.env.OPENROUTER_API_KEY),   free: true, getKeyUrl: 'https://openrouter.ai' },
        },
      });
    }

    // POST /screen
    if (path === '/screen' && method === 'POST') {
      const { fields, files } = await parseMultipart(event);

      // Collect JD
      let jdText = (fields.jdText || '').trim();
      if (!jdText && files.jdFile?.[0]) {
        jdText = await extractText(files.jdFile[0].buffer, files.jdFile[0].filename);
      }
      if (!jdText) return json(400, { error: 'Job description is required.' });

      // Collect resumes
      const resumes = [];
      if (files.resumes) {
        for (const f of files.resumes) {
          const text = await extractText(f.buffer, f.filename);
          const baseName = f.filename.replace(/\.[^/.]+$/, '');
          resumes.push({ name: baseName, content: text });
        }
      }
      if (fields.manualResumes) {
        resumes.push(...JSON.parse(fields.manualResumes));
      }
      if (resumes.length === 0) return json(400, { error: 'No resumes provided.' });

      // Score
      const settled = await Promise.allSettled(
        resumes.map(({ name, content }) =>
          scoreResume(content, jdText, name)
            .then(r => ({ ...r, status: 'ok' }))
            .catch(e => defaultScore(name, e.message))
        )
      );
      const scored = settled.map(r => r.value || r.reason);
      scored.sort((a, b) => b.score - a.score);
      scored.forEach((r, i) => { r.rank = i + 1; });

      // Save to DB (optional — doesn't break if DB not configured)
      let sessionId = null;
      try {
        if (process.env.DATABASE_URL) {
          const title = jdText.split('\n')[0].substring(0, 80);
          const session = await createSession(title, jdText);
          sessionId = session.id;
          await saveCandidates(sessionId, scored);
        }
      } catch (dbErr) {
        console.warn('[DB] Could not save session:', dbErr.message);
      }

      return json(200, { sessionId, count: scored.length, provider: getProviderInfo(), results: scored });
    }

    // GET /history
    if (path === '/history' && method === 'GET') {
      if (!process.env.DATABASE_URL) return json(200, { sessions: [] });
      const sessions = await getAllSessions();
      return json(200, { sessions });
    }

    // GET /history/:id
    const historyMatch = path.match(/^\/history\/(\d+)$/);
    if (historyMatch && method === 'GET') {
      if (!process.env.DATABASE_URL) return json(404, { error: 'Database not configured.' });
      const session = await getSessionWithCandidates(parseInt(historyMatch[1]));
      if (!session) return json(404, { error: 'Session not found.' });
      return json(200, { session });
    }

    // DELETE /history/:id
    if (historyMatch && method === 'DELETE') {
      if (!process.env.DATABASE_URL) return json(200, { ok: true });
      await deleteSession(parseInt(historyMatch[1]));
      return json(200, { ok: true });
    }

    return json(404, { error: 'Not found' });

  } catch (err) {
    console.error('[api] Error:', err.message);
    return json(500, { error: err.message });
  }
};
