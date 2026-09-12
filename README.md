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
| POST | `/api/v1/auth/login` | Auth (prototype) |
| GET | `/health` | Liveness |

### Configuration (env)

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/landlens.db` | SQLAlchemy async URL |
| `BACKEND_URL` | `http://localhost:8000` | Next.js → FastAPI proxy target |
| `CONF_THRESHOLD` | `0.90` | Below this a critical field always routes to review |
| `VLM_API_KEY` | — | Optional Gemini/Sarvam fallback for handwriting |

## Docker (full stack)

```bash
docker compose up --build
```
