# Free Deployment Guide

## Stack
- **Frontend** → Netlify (free)
- **Backend**  → Render (free)
- **Database** → Neon (free PostgreSQL cloud)

---

## Step 1 — Free Cloud Database (Neon)
1. Go to https://neon.tech → Sign up free
2. Create project → copy the connection string
3. It looks like: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`
4. Save it — you'll need it in Step 3

---

## Step 2 — Push code to GitHub
```bash
git init
git add .
git commit -m "initial commit"
# Create repo on github.com, then:
git remote add origin https://github.com/YOURUSERNAME/resume-screener.git
git push -u origin main
```

---

## Step 3 — Deploy Backend on Render (free)
1. Go to https://render.com → Sign up free
2. New → Web Service → Connect GitHub repo
3. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. Add Environment Variables:
   - `DATABASE_URL` = your Neon connection string
   - `GROQ_API_KEY` = your Groq key
   - `GEMINI_API_KEY` = your Gemini key (starts with AIza)
   - `OPENROUTER_API_KEY` = your OpenRouter key
   - `NODE_ENV` = production
   - `FRONTEND_URL` = (fill in after Step 4)
5. Deploy → copy your backend URL (e.g. https://resume-screener-api.onrender.com)

---

## Step 4 — Deploy Frontend on Netlify (free)
1. Go to https://netlify.com → Sign up free
2. New site → Import from GitHub
3. Settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
4. Add Environment Variable:
   - `VITE_API_URL` = your Render backend URL from Step 3
5. Deploy → copy your frontend URL

---

## Step 5 — Connect them
1. Go back to Render → your backend service → Environment
2. Set `FRONTEND_URL` = your Netlify URL
3. Redeploy backend

---

## Done! Your app is live 🎉

### Free tier limits:
| Service | Limit |
|---|---|
| Render backend | Sleeps after 15min, 750hr/month free |
| Neon database | 0.5GB storage, 10GB transfer |
| Netlify frontend | 100GB bandwidth, always on |
| Groq API | 14,400 req/day |
| Gemini API | 1,500 req/day |
| OpenRouter | Free models available |
