-- ============================================================
-- LANDLENS · 03 — Documents (metadata for uploaded land records)
-- The actual files live in Supabase Storage bucket "documents"
-- (see 08_storage.sql).
-- ============================================================

create table if not exists public.documents (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  filename       text not null,                    -- original file name
  storage_bucket text not null default 'documents',
  storage_path   text not null,                    -- path inside the bucket
  mime_type      text not null default 'application/octet-stream',
  file_size      bigint not null default 0,
  doc_type       text,                             -- e.g. "7/12 register", mutation entry
  language       text default 'auto',              -- detected language hint
  status         text not null default 'uploaded'
                 check (status in ('uploaded', 'processing', 'completed', 'failed')),
  job_id         text,                             -- extraction pipeline job reference
  page_count     integer,
  error          text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  processed_at   timestamptz
);

create index if not exists idx_documents_owner   on public.documents(owner_id);
create index if not exists idx_documents_status  on public.documents(status);
create index if not exists idx_documents_created on public.documents(created_at desc);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────
alter table public.documents enable row level security;

drop policy if exists "documents readable by authenticated" on public.documents;
create policy "documents readable by authenticated"
  on public.documents for select
  to authenticated
  using (true);

drop policy if exists "documents insertable by authenticated" on public.documents;
create policy "documents insertable by authenticated"
  on public.documents for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "documents updatable by authenticated" on public.documents;
create policy "documents updatable by authenticated"
  on public.documents for update
  to authenticated
  using (true);

drop policy if exists "documents deletable by owner" on public.documents;
create policy "documents deletable by owner"
  on public.documents for delete
  to authenticated
  using (auth.uid() = owner_id);
