# Deployment Guide — Netlify (100% Free)

## Architecture
```
Browser  →  Netlify CDN  (frontend: React/Vite)
             │
             └──  /api/*  →  Netlify Function  (backend: serverless Node.js)
                               │
                               └──  Neon  (free PostgreSQL, optional)
                               └──  Gemini / Groq / OpenRouter  (free AI)
```

---

## Step 1 — Free Cloud Database (optional but recommended)

History feature requires a database. Skip this step if you don't need history.

1. Go to https://neon.tech → Sign up free
2. Create a project → copy the connection string  
   It looks like: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`
3. Run migrations locally once:
   ```bash
   DATABASE_URL="your-neon-url" npm run db:migrate
   ```

---

## Step 2 — Get a Free AI API Key

Pick **one** (you can add more later):

| Provider | Free Tier | Get Key |
|---|---|---|
| Google Gemini | 1,500 req/day | https://aistudio.google.com/app/apikey |
| Groq | 14,400 req/day | https://console.groq.com |
| OpenRouter | Free models | https://openrouter.ai |

---

## Step 3 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/resume-screener.git
git push -u origin main
```

---

## Step 4 — Deploy on Netlify

1. Go to https://app.netlify.com → **Add new site → Import an existing project**
2. Connect GitHub → select your repo
3. Netlify auto-reads `netlify.toml` — build settings are pre-configured ✅
4. Go to **Site configuration → Environment variables** → Add:

   | Variable | Value |
   |---|---|
   | `GEMINI_API_KEY` | your key (starts with `AIza`) |
   | `GROQ_API_KEY` | your key (optional) |
   | `OPENROUTER_API_KEY` | your key (optional) |
   | `AI_PROVIDER` | `gemini` (or leave blank to auto-detect) |
   | `DATABASE_URL` | your Neon URL (optional) |

5. Click **Deploy site** → done! 🎉

---

## Reconnecting your existing Netlify project

If you already have a site at `luxury-llama-eaf171.netlify.app`:

1. In Netlify dashboard → your site → **Site configuration → Build & deploy**
2. Link it to your GitHub repo (or drag-drop the `frontend/dist` folder)
3. Set environment variables as above
4. Trigger a redeploy

---

## Free Tier Limits

| Service | Free Limit |
|---|---|
| Netlify Functions | 125,000 invocations/month |
| Netlify Bandwidth | 100 GB/month |
| Neon Database | 0.5 GB storage, 10 GB transfer |
| Gemini API | 1,500 requests/day |
| Groq API | 14,400 requests/day |

No credit card required for any of the above.

---

## Local Development

```bash
# 1. Install dependencies
npm install --prefix frontend
npm install --prefix backend

# 2. Copy and fill in .env
cp .env backend/.env
# Edit backend/.env with your keys

# 3. Run DB migration (first time only)
npm run db:migrate

# 4. Start dev servers
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```
