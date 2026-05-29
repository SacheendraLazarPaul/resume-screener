import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractText } from '../services/parseService.js';
import { scoreResume } from '../services/scoringService.js';
import { getProviderInfo } from '../services/aiService.js';
import { createSession, saveCandidates } from '../db/queries.js';

const router = express.Router();

// ── Upload config ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uid = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, uid + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext)
      ? cb(null, true)
      : cb(new Error(`File type not supported: ${ext}`));
  },
});

// ── POST /api/screen ──────────────────────────────────────────
// multipart/form-data fields:
//   resumes[]      — resume files (optional)
//   jdFile         — JD file (optional)
//   jdText         — JD plain text (optional)
//   manualResumes  — JSON string [{name, content}]
router.post(
  '/screen',
  upload.fields([
    { name: 'resumes', maxCount: 20 },
    { name: 'jdFile',  maxCount: 1  },
  ]),
  async (req, res) => {
    const uploadedPaths = [];

    try {
      // ── 1. Collect JD text ────────────────────────────────
      let jdText = (req.body.jdText || '').trim();
      if (!jdText && req.files?.jdFile?.[0]) {
        const f = req.files.jdFile[0];
        uploadedPaths.push(f.path);
        jdText = await extractText(f.path, f.mimetype, f.originalname);
      }
      if (!jdText) {
        return res.status(400).json({ error: 'Job description is required.' });
      }

      // ── 2. Collect resumes ────────────────────────────────
      const resumes = []; // [{ name, content }]

      if (req.files?.resumes) {
        for (const f of req.files.resumes) {
          uploadedPaths.push(f.path);
          const text = await extractText(f.path, f.mimetype, f.originalname);
          resumes.push({
            name: path.basename(f.originalname, path.extname(f.originalname)),
            content: text,
          });
        }
      }

      if (req.body.manualResumes) {
        const manual = JSON.parse(req.body.manualResumes);
        resumes.push(...manual);
      }

      if (resumes.length === 0) {
        return res.status(400).json({ error: 'No resumes provided.' });
      }

      // ── 3. Score each resume ──────────────────────────────
      const settled = await Promise.allSettled(
        resumes.map(({ name, content }) =>
          scoreResume(content, jdText, name)
            .then(r => ({ ...r, status: 'ok' }))
            .catch(e => ({
              name,
              score: 0, skills_match: 0, experience_match: 0,
              education_match: 0, keyword_score: 0,
              matched_skills: [], missing_skills: [],
              recommendation: 'no',
              summary: `Error analysing this resume: ${e.message}`,
              status: 'error',
            }))
        )
      );

      const scored = settled.map(r => r.value || r.reason);

      // ── 4. Rank ───────────────────────────────────────────
      scored.sort((a, b) => b.score - a.score);
      scored.forEach((r, i) => { r.rank = i + 1; });

      // ── 5. Save to database ───────────────────────────────
      let sessionId = null;
      try {
        const title = jdText.split('\n')[0].substring(0, 80);
        const session = await createSession(title, jdText);
        sessionId = session.id;
        await saveCandidates(sessionId, scored);
      } catch (dbErr) {
        // DB failure doesn't break the response — just log it
        console.warn('[DB] Could not save session:', dbErr.message);
      }

      return res.json({
        sessionId,
        count: scored.length,
        provider: getProviderInfo(),
        results: scored,
      });

    } catch (err) {
      console.error('[screen] Error:', err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      // Always clean up temp files
      uploadedPaths.forEach(p => { try { fs.unlinkSync(p); } catch {} });
    }
  }
);

export default router;
