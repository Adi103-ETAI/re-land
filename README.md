# LANDLENS (re-land)

AI-powered digitization platform for historical land records — extract structured,
auditable data from scanned 7/12 extracts and mutation entries.

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS 4 + shadcn/ui + TypeScript
- **Backend**: FastAPI (Python 3.12) + SQLAlchemy async (SQLite dev / Postgres prod) + Tesseract OCR
- **Infra**: docker-compose (PostGIS, Redis) — optional for local dev

## UI (branch `rl-o3` — complete redesign)

Every screen was rebuilt on a single shadcn design system (saffron/ink palette,
Geist type, lucide icons, glass-morphism auth):

| Route | Purpose |
|---|---|
| `/` | Marketing landing page |
| `/login`, `/signup` | Glass sign-in / sign-up (demo auth fallback) |
| `/dashboard` | Case pipeline overview |
| `/upload` | Drag & drop document upload → live backend |
| `/processing` | Real-time job polling (backend) with graceful simulation |
| `/extraction` | AI fields with hover bbox overlay on the scanned page |
| `/validation` | Trust score, cross-field checks |
| `/verification` | Officer review queue |
| `/record`, `/records` | Record detail (print-friendly) + searchable register |
| `/gis` | Leaflet parcel map |
| `/analytics`, `/audit` | Charts + immutable audit timeline |

## Run the frontend

```bash
npm install
npm run dev          # http://localhost:3000
```

Demo credentials (no backend needed): `operator@landlens.local` / `operator123`.
Any valid email + 6+ char password works in demo mode.

## Run the backend (enables the real OCR pipeline)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# optional but recommended: Marathi + Hindi traineddata next to eng
# (tesseract already falls back to eng automatically if missing)

uvicorn app.main:app --reload --port 8000
```

The backend persists to `backend/data/landlens.db` (SQLite + aiosqlite) by default.
Set `DATABASE_URL=postgresql://...` to target Postgres instead.

Point the frontend at it with `BACKEND_URL=http://localhost:8000` (optional —
`localhost:8000` is the default). With the backend live:

1. Upload a scan on `/upload`
2. The FastAPI pipeline runs: preprocess → layout → OCR (tesseract `mar+hin+eng`)
   → rule extraction → validation → decision
3. `/processing` polls `/api/v1/jobs/{jobId}`; `/extraction` renders the real
   fields with bounding-box overlays from the OCR evidence

### API (v1)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/records/upload` | Upload a document, queue the pipeline |
| GET | `/api/v1/jobs/{jobId}` | Job status/progress + extracted record |
| GET | `/api/v1/records/{recId}` | One extracted record with fields + bboxes |
| GET | `/api/v1/records` | Recent records |
| POST | `/api/v1/records/{recId}/validate` | Run the validation engine |
| POST | `/api/v1/verify/{recId}` | Officer decision (Approved/Rejected/Corrected) |
| POST | `/api/v1/auth/register` | Create an officer account (PBKDF2-hashed) |
| POST | `/api/v1/auth/login` | Issue session + refresh tokens |
| GET | `/api/v1/auth/me` | Resolve the officer behind the bearer token |
| POST | `/api/v1/auth/refresh` | Rotate a session via the refresh token |
| POST | `/api/v1/auth/logout` | Invalidate the presented session |
| GET | `/health` | Liveness + database readiness probe |

### Configuration (env)

Copy `backend/.env.example` → `backend/.env` and `.env.example` → `.env.local`.

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/landlens.db` | SQLAlchemy async URL |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins (set in prod) |
| `BACKEND_URL` | `http://localhost:8000` | Next.js → FastAPI proxy target (auth + uploads) |
| `NEXT_PUBLIC_API_URL` | *(same-origin proxy)* | Optional: browser calls the API directly |
| `CONF_THRESHOLD` | `0.90` | Below this a critical field always routes to review |
| `VLM_API_KEY` | — | Optional Gemini/Sarvam fallback for handwriting |
| `LOG_LEVEL` | `INFO` | Backend log verbosity |

### Auth modes

The frontend resolves the first available provider:

1. **FastAPI backend** — real accounts, PBKDF2-hashed passwords, session +
   refresh tokens, server-side invalidation on sign-out. The browser calls
   `/api/v1/auth/*` on its own origin; the Next.js server proxies to the
   backend (`BACKEND_URL`), so no CORS setup is needed. Seeded demo officers
   work out of the box: `operator@landlens.local` / `operator123`.
2. **Supabase** — when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   are set and the backend is unreachable.
3. **Demo fallback** — local-only session so the UI remains explorable offline.

## Production deployment

### Docker (recommended)

```bash
docker compose up --build --detach
# frontend  → http://localhost:3000  (healthchecked via /api)
# backend   → http://localhost:8000  (healthchecked via /health)

# with PostGIS + Redis:
docker compose --profile full up --build --detach
# then in backend/.env set:
# DATABASE_URL=postgresql+asyncpg://landlens:secret@db:5432/landlens
```

Both images run as non-root, ship security headers, and expose healthchecks.
The backend image includes tesseract with `eng`+`mar`+`hin` traineddata.

### Production checklist

- [ ] Set `CORS_ORIGINS=https://app.yourdomain.com` in `backend/.env` (never `*`)
- [ ] Keep auth on the same-origin proxy (default) or set
      `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` at frontend build time
      (it is inlined into the client bundle)
- [ ] Point `DATABASE_URL` at Postgres and back up the volume
- [ ] Terminate TLS at your proxy (Caddy/nginx/ALB); both services are plain HTTP
- [ ] Consider `DOCS_URL=` (empty) in `backend/.env` to hide the API docs
- [ ] Rotate any demo credentials you keep, or seed real officers via
      `POST /api/v1/auth/register` and delete the seeded rows

### Bare metal

```bash
# backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2

# frontend (self-contained standalone server)
npm ci && npm run build
node .next/standalone/server.js
```

## Repository layout

```
src/                 Next.js app (pages, components, lib, store)
backend/app/         FastAPI app (api/v1, models, services, core)
backend/scripts/     OCR/VLM test + evaluation scripts
docs/                Product & engineering specifications (19 documents)
docker-compose.yml   Full stack with healthchecks (optional PostGIS/Redis profile)
```
