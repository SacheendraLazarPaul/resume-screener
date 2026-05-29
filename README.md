# Resume Screener

AI-powered resume screening and candidate ranking.
Upload resumes + a Job Description → get a ranked list with scores, skill tags, and AI assessments.
All results are saved to your local PostgreSQL database.

---

## Your environment (already installed ✅)

| Tool       | Version you have |
|------------|------------------|
| Node.js    | v24.16.0         |
| npm        | 11.13.0          |
| PostgreSQL | 16.14            |
| Git        | 2.39.2           |

---

## 1 — Create the database

Open **Command Prompt** and run:

```cmd
psql -U postgres -c "CREATE DATABASE resume_screener;"
```

If it asks for a password, enter your PostgreSQL password (the one you set during install).
If you forgot it, see the Troubleshooting section below.

---

## 2 — Get a free AI key (pick one)

**Option A — Google Gemini (recommended)**
1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click **Get API key** → Create API key
4. Copy the key (starts with `AIza...`)
> Free: 1,500 requests/day, no credit card needed

**Option B — Groq (fastest)**
1. Go to https://console.groq.com
2. Sign up free → API Keys → Create
3. Copy the key (starts with `gsk_...`)
> Free: 14,400 requests/day

**Option C — Ollama (100% local, no internet, no key)**
1. Download from https://ollama.com
2. Install and run: `ollama pull llama3`
> Free forever, runs on your machine

---

## 3 — Configure environment

```cmd
cd resume-screener
copy .env.example backend\.env
```

Open `backend\.env` in Notepad and fill in:

```env
# Your AI choice (gemini / groq / ollama)
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza_YOUR_KEY_HERE

# Your local PostgreSQL
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/resume_screener
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

---

## 4 — Install dependencies

```cmd
npm run install:all
```

This installs root tools, backend packages, and frontend packages separately.

---

## 5 — Run database migration

```cmd
npm run db:migrate
```

Creates the `screening_sessions` and `candidates` tables.
Safe to run multiple times (uses `CREATE TABLE IF NOT EXISTS`).

---

## 6 — Start the app

```cmd
npm run dev
```

This starts both servers at once:
- **Backend** → http://localhost:3001
- **Frontend** → http://localhost:5173

Open http://localhost:5173 in your browser.

---

## Folder structure

```
resume-screener/
├── package.json              ← root scripts (dev, install:all, db:migrate)
├── .env.example              ← copy to backend/.env
├── .gitignore
│
├── backend/                  ← independent Node.js/Express API
│   ├── package.json          ← backend dependencies only
│   ├── server.js             ← Express entry point, port 3001
│   ├── db/
│   │   ├── pool.js           ← PostgreSQL connection pool
│   │   ├── migrate.js        ← creates tables
│   │   └── queries.js        ← all SQL queries
│   ├── routes/
│   │   ├── screen.js         ← POST /api/screen
│   │   └── history.js        ← GET/DELETE /api/history
│   └── services/
│       ├── aiService.js      ← Gemini / Groq / OpenRouter / Ollama
│       ├── parseService.js   ← PDF, DOCX, TXT extraction
│       └── scoringService.js ← prompt + score validation
│
└── frontend/                 ← independent React/Vite app
    ├── package.json          ← frontend dependencies only
    ├── vite.config.js        ← proxies /api → localhost:3001
    ├── index.html
    └── src/
        ├── App.jsx           ← root component + navigation
        ├── utils/
        │   ├── api.js        ← all backend API calls
        │   └── export.js     ← CSV export
        ├── components/
        │   ├── DropZone.jsx
        │   ├── CandidateCard.jsx
        │   ├── ScoreBar.jsx
        │   └── StatusBar.jsx
        └── pages/
            ├── UploadPage.jsx
            ├── JDPage.jsx
            ├── ResultsPage.jsx
            └── HistoryPage.jsx
```

---

## Upgrading parts independently

**Upgrade only the backend** (e.g. add a new AI provider):
```cmd
cd backend
npm install some-new-package
cd ..
```

**Upgrade only the frontend** (e.g. add a new UI library):
```cmd
cd frontend
npm install some-new-package
cd ..
```

The frontend and backend have completely separate `package.json` files and `node_modules`.

---

## Switching AI provider

Edit `backend/.env` — just change two lines, no code changes needed:

```env
# Switch to Groq:
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Switch to Ollama (local):
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3

# Switch back to Gemini:
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
```

Then restart the backend (`Ctrl+C` and `npm run dev` again).

---

## Free deployment (when ready)

| What          | Where          | Cost |
|---------------|----------------|------|
| Frontend      | Vercel         | Free |
| Backend       | Render         | Free |
| Database      | Neon.tech      | Free |
| AI            | Gemini/Groq    | Free |

See DEPLOY.md for step-by-step instructions.

---

## Troubleshooting

**"password authentication failed for user postgres"**
You need your PostgreSQL password. Try:
```cmd
psql -U postgres
```
If you can't remember it, open pgAdmin (installed with PostgreSQL) to reset it.

**"ECONNREFUSED" on startup**
PostgreSQL service isn't running. Open **Services** in Windows → find "postgresql-x64-16" → Start.

Or via Command Prompt:
```cmd
net start postgresql-x64-16
```

**"Cannot find module" errors**
Run `npm run install:all` again from the root folder.

**AI returns error**
Check your API key in `backend/.env`. Make sure there are no spaces around the `=` sign.
