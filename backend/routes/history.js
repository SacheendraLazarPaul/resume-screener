import express from 'express';
import {
  getAllSessions,
  getSessionWithCandidates,
  deleteSession,
} from '../db/queries.js';

const router = express.Router();

// GET /api/history — all past sessions (summary)
router.get('/history', async (_req, res) => {
  try {
    const sessions = await getAllSessions();
    res.json({ sessions });
  } catch (err) {
    console.error('[history] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history/:id — full session with all candidates
router.get('/history/:id', async (req, res) => {
  try {
    const session = await getSessionWithCandidates(parseInt(req.params.id, 10));
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json({ session });
  } catch (err) {
    console.error('[history] GET/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:id
router.delete('/history/:id', async (req, res) => {
  try {
    await deleteSession(parseInt(req.params.id, 10));
    res.json({ ok: true });
  } catch (err) {
    console.error('[history] DELETE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
