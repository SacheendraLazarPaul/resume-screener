# Resume Screener

AI-powered resume screening and candidate ranking web app.

Upload resumes + a Job Description → get a ranked list with scores, skill tags, and AI assessments.

**Live App:** [resume-screener-ui-production.up.railway.app](https://resume-screener-ui-production.up.railway.app)  
**GitHub:** [github.com/SacheendraLazarPaul/resume-screener](https://github.com/SacheendraLazarPaul/resume-screener)

---

## Features

- Upload multiple resumes (PDF, DOCX, TXT) + a Job Description
- AI ranks candidates with scores, skill tags, and assessments
- Screening history saved to PostgreSQL
- CSV export of results
- Supports Google Gemini, Groq, and Ollama (local) AI providers

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React, Vite                       |
| Backend  | Node.js, Express                  |
| Database | PostgreSQL                        |
| AI       | Google Gemini API / Groq API      |
| Deployed | Railway                           |

---

## Local Setup

### 1 — Clone the repo

```bash
git clone https://github.com/SacheendraLazarPaul/resume-screener.git
cd resume-screener
```

### 2 — Create the database

```bash
psql -U postgres -c "CREATE DATABASE resume_screener;"
```

### 3 — Configure environment

```bash
copy .env.example backend\.env
```

Open `backend/.env` and fill in:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza_YOUR_KEY_HERE
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/resume_screener
```

Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com) (1,500 req/day, no credit card).  
Or use Groq at [console.groq.com](https://console.groq.com) (14,400 req/day, free).

### 4 — Install dependencies

```bash
npm run install:all
```

### 5 — Run database migration

```bash
npm run db:migrate
```

### 6 — Start the app

```bash
npm run dev
```

- Frontend → http://localhost:5173
- Backend → http://localhost:3001

---

## Folder Structure

```
resume-screener/
├── backend/
│   ├── server.js               ← Express entry point (port 3001)
│   ├── db/
│   │   ├── pool.js             ← PostgreSQL connection
│   │   ├── migrate.js          ← creates tables
│   │   └── queries.js          ← SQL queries
│   ├── routes/
│   │   ├── screen.js           ← POST /api/screen
│   │   └── history.js          ← GET/DELETE /api/history
│   └── services/
│       ├── aiService.js        ← Gemini / Groq / Ollama
│       ├── parseService.js     ← PDF, DOCX, TXT parsing
│       └── scoringService.js   ← scoring + validation
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── UploadPage.jsx
        │   ├── JDPage.jsx
        │   ├── ResultsPage.jsx
        │   └── HistoryPage.jsx
        └── components/
            ├── DropZone.jsx
            ├── CandidateCard.jsx
            ├── ScoreBar.jsx
            └── StatusBar.jsx
```

---

## Switching AI Provider

Edit `backend/.env` — no code changes needed:

```env
# Groq
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...

# Ollama (local, no internet required)
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3

# Gemini
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
```

Restart the backend after changing.

---

## Troubleshooting

**"password authentication failed"** — Open pgAdmin to reset your PostgreSQL password.

**"ECONNREFUSED" on startup** — PostgreSQL isn't running. Start it:
```bash
net start postgresql-x64-16
```

**"Cannot find module"** — Run `npm run install:all` again from the root folder.

**AI returns error** — Check your API key in `backend/.env`. No spaces around the `=` sign.
