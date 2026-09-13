# LANDLENS — Deploy

## Frontend → Vercel
1. Push `rl-o3` to GitHub → Vercel → New Project → Import `re-land`
   - Framework: **Next.js** (auto-detected)
   - Build: `npm run build` / Output: `.next` (see `vercel.json`)
   - Node: 20+ (22 recommended for `@supabase/supabase-js@2.116`)
2. **Environment Variables** (Vercel → Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://urgchpttiyhbucbrafsd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_i86RyfOVBwLfQysmCVi0nw_NruDU2nQ
   NEXT_PUBLIC_API_URL=https://<your-render-api>.onrender.com/api
   BACKEND_URL=https://<your-render-api>.onrender.com
   ```
   `NEXT_PUBLIC_API_URL` = browser → Render directly. Leave unset to proxy through `/api/*` (uses `BACKEND_URL` server-side).
3. Deploy → URL = `https://<app>.vercel.app`

## Backend → Render (Free)
1. Render Dashboard → New → Web Service → Connect `re-land` repo
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/health`
   - Or use `render.yaml` at repo root (Infrastructure as Code) → `New → Blueprint` → select repo
2. **Environment Variables** (Render → Environment):
   ```
   SUPABASE_URL=https://urgchpttiyhbucbrafsd.supabase.co
   SUPABASE_SERVICE_KEY=<service_role JWT>  # Project Settings → API → service_role (secret!)
   CORS_ORIGINS=https://<app>.vercel.app,http://localhost:3000
   VLM_PROVIDER=gemini
   VLM_API_KEY=<your key>
   VLM_MODEL=gemini-3.5-flash
   DATABASE_URL= # leave empty → SQLite at backend/data/landlens.db (ephemeral on free tier)
                 # or set to Render Postgres: postgresql://...
   ```
   Free tier disk is ephemeral — use Render Postgres for persistence.
3. Add your Vercel domain to Supabase → Auth → URL Configuration → Redirect URLs:
   `https://<app>.vercel.app/dashboard` + `https://<app>.vercel.app/*`
   and Google OAuth → Authorized redirect: `https://urgchpttiyhbucbrafsd.supabase.co/auth/v1/callback`

## Local ↔ Deployed parity
- `backend/.env` → loads via `app/core/config.py` (copied from `backend/.env.local`)
- `/.env.local` → `NEXT_PUBLIC_*` for local dev; Vercel uses its own env store

## Verification page fix
- `src/app/globals.css:8-15` now maps `--color-destructive` + friends so `bg-destructive` works in Tailwind v4
- `src/app/(app)/verification/page.tsx:262` — Reject button forced `bg-[#c64228] hover:bg-[#a73620] text-white` so it is never white-on-white
