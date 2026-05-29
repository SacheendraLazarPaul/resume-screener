import { callAI, lastUsedProvider } from './aiService.js';

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
  return `JOB DESCRIPTION:
${jdText}

---

RESUME (candidate: ${candidateName}):
${resumeText.substring(0, 4000)}

---

Respond with ONLY this JSON, nothing else:
{
  "name": "full candidate name from resume",
  "current_title": "most recent job title or student",
  "experience_years": 0,
  "education": "highest degree and field",
  "score": 0,
  "skills_match": 0,
  "experience_match": 0,
  "education_match": 0,
  "keyword_score": 0,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "recommendation": "strong_yes",
  "summary": "3-sentence assessment of fit for this specific role"
}`;
}

export async function scoreResume(resumeText, jdText, candidateName) {
  const raw = await callAI(SYSTEM_PROMPT, buildPrompt(resumeText, jdText, candidateName));

  console.log(`[Score] Provider used: ${lastUsedProvider}`);
  console.log(`[Score] Raw response: ${raw.substring(0, 200)}...`);

  // ── Clean the response ────────────────────────────────────
  let clean = raw
    .replace(/```json\s*/gi, '')   // remove ```json
    .replace(/```\s*/gi, '')       // remove ```
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')  // remove AI thinking blocks
    .replace(/^\s*[\w\s]*:\s*/m, '') // remove any leading label like "Here is the JSON:"
    .trim();

  // Extract just the JSON object (ignore any text before/after)
  const start = clean.indexOf('{');
  const end   = clean.lastIndexOf('}');

  if (start === -1 || end === -1 || start >= end) {
    console.error('[Score] No JSON found in response:', clean);
    return defaultScore(candidateName, 'AI did not return JSON');
  }

  clean = clean.substring(start, end + 1);

  // ── Parse JSON ────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error('[Score] JSON parse failed:', err.message);
    console.error('[Score] Attempted to parse:', clean.substring(0, 300));
    return defaultScore(candidateName, `JSON parse error: ${err.message}`);
  }

  // ── Sanitize fields ───────────────────────────────────────
  const toInt  = (v) => Math.min(100, Math.max(0, parseInt(v) || 0));
  const toArr  = (v) => Array.isArray(v) ? v.map(String) : [];
  const toStr  = (v, fallback) => (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
  const validRec = ['strong_yes', 'yes', 'maybe', 'no'];

  const s = {
    name:             toStr(parsed.name, candidateName),
    current_title:    toStr(parsed.current_title, 'Not specified'),
    experience_years: parseInt(parsed.experience_years) || 0,
    education:        toStr(parsed.education, 'Not specified'),
    skills_match:     toInt(parsed.skills_match),
    experience_match: toInt(parsed.experience_match),
    education_match:  toInt(parsed.education_match),
    keyword_score:    toInt(parsed.keyword_score),
    matched_skills:   toArr(parsed.matched_skills),
    missing_skills:   toArr(parsed.missing_skills),
    recommendation:   validRec.includes(parsed.recommendation) ? parsed.recommendation : 'maybe',
    summary:          toStr(parsed.summary, 'Analysis complete.'),
  };

  // Always recalculate score from components (more reliable)
  s.score = Math.round(
    s.skills_match     * 0.35 +
    s.experience_match * 0.30 +
    s.education_match  * 0.15 +
    s.keyword_score    * 0.20
  );

  console.log(`[Score] Final score for ${s.name}: ${s.score}/100`);
  return s;
}

function defaultScore(candidateName, reason) {
  console.error(`[Score] Using default score. Reason: ${reason}`);
  return {
    name: candidateName,
    current_title: 'Unknown',
    experience_years: 0,
    education: 'Unknown',
    score: 0,
    skills_match: 0,
    experience_match: 0,
    education_match: 0,
    keyword_score: 0,
    matched_skills: [],
    missing_skills: [],
    recommendation: 'no',
    summary: `Analysis failed: ${reason}. Please try again.`,
    error: true,
  };
}
