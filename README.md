# LANDLENS — Land Records Digitization Platform

AI-powered digitization, validation and verification of India's legacy land
records — from a faded 1962 register to a verified digital record, with a
human in the loop wherever it matters.

| Layer      | Tech |
|------------|------|
| Frontend   | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Zustand |
| Database   | **Supabase** (Postgres + Auth + Storage) — all app data lives here |
| Extraction | FastAPI worker · pluggable vision-model extraction + Tesseract OCR |

## Setup

### 1. Create the Supabase project (required)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql)
   (or run the files in [`supabase/migrations/`](supabase/migrations) in
   numbered order — they are identical in effect).
   This creates the tables (`profiles`, `documents`, `records`,
   `verifications`, `parcels`, `audit_logs`), RLS policies, the
   `documents` storage bucket, analytics views and the signup trigger.
3. Copy **Project Settings → API** values:
   - Project URL
   - anon / public key

### 2. Configure the frontend

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Then:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and create an officer account from the signup
page — the profile row is created automatically by the `handle_new_user`
trigger. Until the two env values are filled in, every page shows a setup
notice instead of data (there is no demo data in the app).

### 3. Run the extraction worker (optional but recommended)

The FastAPI worker performs the actual OCR + field extraction. The frontend
stores files and metadata in Supabase immediately, then hands the file to
the worker; the extracted record is written back to Supabase when the job
finishes.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set VLM_PROVIDER + VLM_API_KEY for field extraction
uvicorn app.main:app --reload --port 8000
```

If the worker is offline, uploads remain safely stored (status
`processing`) and nothing fabricated is ever shown.

Optionally set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in `backend/.env`
to give the worker service-level Supabase access.

## How the pieces connect

```
Browser ──► Supabase (Auth + Postgres + Storage)   ← all persistent data
        └─► Next.js (/api/* proxy routes)
              └──► FastAPI :8000 (/records/upload, /jobs/{id})
                     └──► OCR + vision-model extraction (stateless)
```

- **Supabase Auth** signs officers in; RLS protects every table.
- **Supabase Storage** (`documents` bucket, private) holds uploaded files.
- **Supabase Postgres** holds documents, extracted records, verification
  decisions, GIS parcels and the append-only audit trail.
- The FastAPI worker is a stateless extraction engine — the frontend
  persists its output to Supabase when the job completes.

## Pipeline

Upload → file stored in Supabase → preprocess (CLAHE/deskew) → layout
detection → OCR (Tesseract + langdetect) → vision-model field extraction →
validation & trust score → human verification (accept / reject with notes,
stored in `verifications` + `audit_logs`) → verified digital record → GIS
parcels on a live OpenStreetMap.

## Database

Multi-file SQL lives in `supabase/migrations/`:

| File | Contents |
|------|----------|
| `01_extensions.sql` | uuid-ossp, pgcrypto |
| `02_profiles.sql` | profiles table, signup trigger, updated_at helper, RLS |
| `03_documents.sql` | uploaded-document metadata + RLS |
| `04_records.sql` | extracted land records + RLS |
| `05_verifications.sql` | officer accept/reject decisions + RLS |
| `06_parcels.sql` | GIS parcel pins + RLS |
| `07_audit_logs.sql` | append-only audit trail + RLS |
| `08_storage.sql` | private `documents` bucket + storage policies |
| `09_analytics_views.sql` | dashboard/analytics aggregate views |
| `10_realtime.sql` | optional realtime publication |

## Production notes

- Keep `SUPABASE_SERVICE_KEY` server-side only (backend `.env`), never in
  `NEXT_PUBLIC_*` variables.
- Restrict `CORS_ORIGINS` for the worker to your deployed frontend origin.
- Put both apps behind TLS. Uploads are size-capped (`MAX_UPLOAD_MB`) and
  type-checked; storage policies limit the `documents` bucket to
  authenticated users.
