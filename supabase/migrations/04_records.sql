-- ============================================================
-- LANDLENS · 04 — Records (AI-extracted land record data)
-- ============================================================

create table if not exists public.records (
  id                  uuid primary key default uuid_generate_v4(),
  document_id         uuid references public.documents(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null,
  record_code         text unique,                  -- human friendly ref e.g. LR-2026-000184
  page_number         integer not null default 1,

  -- extracted structured fields
  fields              jsonb not null default '{}'::jsonb,
  raw_ocr_text        text,
  confidence_score    numeric(5,4),
  language            text,

  -- flattened core fields (fast filtering / GIS join)
  survey_no           text,
  khata_no            text,
  owner_name          text,
  village             text,
  tehsil              text,
  district            text,
  area_detected       numeric(10,2),                -- area read from the document
  area_reference      numeric(10,2),                -- area in the reference database
  classification      text,
  mutation_date       text,

  -- pipeline state
  validation_status   text not null default 'pending'
                      check (validation_status in ('pending', 'safe', 'review', 'high_risk')),
  validation_score    integer,
  verification_status text not null default 'pending'
                      check (verification_status in ('pending', 'accepted', 'rejected', 'corrected', 'escalated')),

  -- duplicate detection
  dup_similarity      integer,
  dup_match_code      text,

  -- human verification outcome
  rejection_reason    text,
  verified_by         uuid references auth.users(id) on delete set null,
  verified_at         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_records_document   on public.records(document_id);
create index if not exists idx_records_validation on public.records(validation_status);
create index if not exists idx_records_verification on public.records(verification_status);
create index if not exists idx_records_survey     on public.records(survey_no);
create index if not exists idx_records_created    on public.records(created_at desc);

drop trigger if exists set_records_updated_at on public.records;
create trigger set_records_updated_at
  before update on public.records
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────
alter table public.records enable row level security;

drop policy if exists "records readable by authenticated" on public.records;
create policy "records readable by authenticated"
  on public.records for select
  to authenticated
  using (true);

drop policy if exists "records insertable by authenticated" on public.records;
create policy "records insertable by authenticated"
  on public.records for insert
  to authenticated
  with check (true);

drop policy if exists "records updatable by authenticated" on public.records;
create policy "records updatable by authenticated"
  on public.records for update
  to authenticated
  using (true);

drop policy if exists "records deletable by creator" on public.records;
create policy "records deletable by creator"
  on public.records for delete
  to authenticated
  using (auth.uid() = created_by);
