import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import screenRouter from './routes/screen.js';
import historyRouter from './routes/history.js';
import { getProviderInfo, getAllProvidersStatus, detectBestProvider } from './services/aiService.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
    : '*',
}));
app.use(express.json({ limit: '10mb' }));

// Rate limit
app.use('/api/screen', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait.' },
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/api', screenRouter);
app.use('/api', historyRouter);

// Current active provider
app.get('/api/status', (_req, res) => {
  res.json({ ok: true, ...getProviderInfo() });
});

// All providers + health status (used by frontend settings panel)
app.get('/api/providers', (_req, res) => {
  res.json({
    active: getProviderInfo(),
    providers: getAllProvidersStatus(),
  });
});

app.get('/', (_req, res) => {
  res.json({ message: 'Resume Screener API', status: 'running' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n✅  Backend  →  http://localhost:${PORT}`);
  console.log(`    Node.js  :  ${process.version}`);
  console.log(`    Database :  ${process.env.DATABASE_URL ? '✅ configured' : '❌ NOT SET'}\n`);

  // Auto-detect best provider on startup
  await detectBestProvider();

  const info = getProviderInfo();
  if (info.provider !== 'none') {
    console.log(`✅  Active AI: ${info.provider} (${info.model})\n`);
  } else {
    console.warn('⚠️  No AI provider working — check your API keys in backend/.env\n');
  }
});
