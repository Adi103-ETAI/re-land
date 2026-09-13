# LANDLENS — Land Records Digitization Platform

AI-powered digitization, validation and verification of India's legacy land
records — from a faded 1962 register to a verified digital record, with a
human in the loop wherever it matters.

| Layer    | Tech |
|----------|------|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Zustand |
| Backend  | FastAPI · SQLAlchemy 2 (async) · SQLite (dev) / PostgreSQL (prod) |
| AI       | Pluggable VLM extraction (Gemini / Sarvam / more) + Tesseract OCR |

## Quickstart

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# SQLite is the default — zero setup. Optionally copy and edit env:
cp ../.env.example ../.env

uvicorn app.main:app --reload --port 8000
```

On startup the API creates all tables and seeds three demo officer accounts:

| Email | Password | Role |
|-------|----------|------|
| operator@landlens.local | operator123 | Digitization Operator |
| verifier@landlens.local | verifier123 | Verification Officer |
| admin@landlens.local | admin123 | Administrator |

Interactive API docs: http://localhost:8000/docs

### 2. Frontend (Next.js)

```bash
npm install
npm run dev
```

Open http://localhost:3000 — sign in with a demo account above.

### How the pieces connect

```
Browser ──► Next.js (/api/* proxy routes, forwards Authorization header)
              └──► FastAPI :8000 (/api/v1/auth, /records/upload, /jobs, ...)
                     └──► SQLite/Postgres + in-memory job store + pipeline
```

`NEXT_PUBLIC_API_URL` lets the browser call FastAPI directly (CORS-configured)
instead of going through the Next.js proxies. `BACKEND_URL` (server-side only)
sets where the proxies forward to.

## Pipeline

Upload → preprocess (CLAHE/deskew) → layout detection → OCR (Tesseract +
langdetect) → VLM field extraction → validation & trust score → human
verification → audit trail. Every job reports status/progress via
`GET /api/v1/jobs/{jobId}`.

## Production notes

- Set `DATABASE_URL` to PostgreSQL; run `alembic` migrations (backend/migrations).
- Restrict `CORS_ORIGINS` to your deployed frontend origin.
- Put both apps behind TLS; sessions expire after 1h (7d refresh token).
- Uploads are size-capped (`MAX_UPLOAD_MB`, default 15MB) and type-checked.
- Password hashing uses PBKDF2-HMAC-SHA256 (100k iterations) with per-user salt.
