-- ============================================================
-- LANDLENS · Supabase schema — ALL-IN-ONE
--
-- Two ways to set up your database:
--   A) SQL Editor → run supabase/migrations/01…10 in order (recommended)
--   B) SQL Editor → run THIS single file (identical result)
--
-- After running: Settings → API to copy your URL + anon key into .env.local
-- ============================================================

-- ============================================================
-- LANDLENS · 01 — Extensions
-- Run this FIRST (or run supabase/schema.sql to run everything)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- LANDLENS · 02 — Profiles (extends supabase auth.users)
-- ============================================================

-- Profiles table — one row per authenticated officer
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        text not null default 'operator'
              check (role in ('operator', 'verifier', 'senior', 'auditor', 'admin')),
  phone       text,
  district    text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role  on public.profiles(role);

-- Generic updated_at helper used by all LANDLENS tables
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create a profile whenever a user signs up through Supabase Auth.
-- role and full name are passed through the signUp metadata
-- (options: { data: { name, role } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'operator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);


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


-- ============================================================
-- LANDLENS · 05 — Verifications (human review decisions)
-- Every accept / reject / correction is recorded here.
-- ============================================================

create table if not exists public.verifications (
  id              uuid primary key default uuid_generate_v4(),
  record_id       uuid not null references public.records(id) on delete cascade,
  verifier_id     uuid references auth.users(id) on delete set null,
  action          text not null
                  check (action in ('accepted', 'rejected', 'corrected', 'escalated')),
  previous_status text,
  notes           text,
  field_changes   jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_verifications_record   on public.verifications(record_id);
create index if not exists idx_verifications_verifier on public.verifications(verifier_id);
create index if not exists idx_verifications_created  on public.verifications(created_at desc);

-- ── Row Level Security ──────────────────────────────────────
alter table public.verifications enable row level security;

drop policy if exists "verifications readable by authenticated" on public.verifications;
create policy "verifications readable by authenticated"
  on public.verifications for select
  to authenticated
  using (true);

drop policy if exists "verifications insertable by authenticated" on public.verifications;
create policy "verifications insertable by authenticated"
  on public.verifications for insert
  to authenticated
  with check (auth.uid() = verifier_id);


-- ============================================================
-- LANDLENS · 06 — Parcels (GIS map data)
-- Lat/lng pins rendered on the Leaflet / OpenStreetMap map.
-- ============================================================

create table if not exists public.parcels (
  id             uuid primary key default uuid_generate_v4(),
  survey_no      text,
  owner_name     text,
  village        text,
  tehsil         text,
  district       text,
  area_hectares  numeric(10,2),
  lat            double precision not null,
  lng            double precision not null,
  status         text not null default 'Pending'
                 check (status in ('Verified', 'Pending', 'Conflict')),
  record_id      uuid references public.records(id) on delete set null,
  notes          text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_parcels_survey  on public.parcels(survey_no);
create index if not exists idx_parcels_village on public.parcels(village);
create index if not exists idx_parcels_status  on public.parcels(status);

drop trigger if exists set_parcels_updated_at on public.parcels;
create trigger set_parcels_updated_at
  before update on public.parcels
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────
alter table public.parcels enable row level security;

drop policy if exists "parcels readable by authenticated" on public.parcels;
create policy "parcels readable by authenticated"
  on public.parcels for select
  to authenticated
  using (true);

drop policy if exists "parcels insertable by authenticated" on public.parcels;
create policy "parcels insertable by authenticated"
  on public.parcels for insert
  to authenticated
  with check (true);

drop policy if exists "parcels updatable by authenticated" on public.parcels;
create policy "parcels updatable by authenticated"
  on public.parcels for update
  to authenticated
  using (true);

drop policy if exists "parcels deletable by authenticated" on public.parcels;
create policy "parcels deletable by authenticated"
  on public.parcels for delete
  to authenticated
  using (true);


-- ============================================================
-- LANDLENS · 07 — Audit logs (immutable action trail)
-- ============================================================

create table if not exists public.audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete set null,
  action          text not null,          -- RECORD_CREATED, EXTRACTION_COMPLETED, VERIFICATION_ACCEPTED, ...
  entity_type     text not null,          -- document | record | parcel | verification
  entity_id       text,
  previous_values jsonb,
  new_values      jsonb,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_audit_logs_user     on public.audit_logs(user_id);
create index if not exists idx_audit_logs_entity   on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_action   on public.audit_logs(action);
create index if not exists idx_audit_logs_created  on public.audit_logs(created_at desc);

-- ── Row Level Security ──────────────────────────────────────
alter table public.audit_logs enable row level security;

drop policy if exists "audit logs readable by authenticated" on public.audit_logs;
create policy "audit logs readable by authenticated"
  on public.audit_logs for select
  to authenticated
  using (true);

drop policy if exists "audit logs insertable by authenticated" on public.audit_logs;
create policy "audit logs insertable by authenticated"
  on public.audit_logs for insert
  to authenticated
  with check (true);

-- No update / delete policies — the audit trail is append-only.


-- ============================================================
-- LANDLENS · 08 — Storage (bucket + policies for document files)
-- ============================================================

-- Create the private "documents" bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'image/bmp'
  ]
)
on conflict (id) do nothing;

-- ── Storage policies ────────────────────────────────────────
drop policy if exists "authenticated can upload documents" on storage.objects;
create policy "authenticated can upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

drop policy if exists "authenticated can read documents" on storage.objects;
create policy "authenticated can read documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

drop policy if exists "authenticated can update documents" on storage.objects;
create policy "authenticated can update documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');

drop policy if exists "authenticated can delete documents" on storage.objects;
create policy "authenticated can delete documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');


-- ============================================================
-- LANDLENS · 09 — Analytics views
-- Small helper views the dashboard / analytics pages aggregate.
-- All views run with the caller's permissions (security_invoker)
-- so RLS still applies.
-- ============================================================

create or replace view public.v_document_status
with (security_invoker = true) as
select status, count(*)::int as count
from public.documents
group by status;

create or replace view public.v_validation_distribution
with (security_invoker = true) as
select validation_status, count(*)::int as count,
       coalesce(round(avg(confidence_score) * 100), 0)::int as avg_confidence_pct
from public.records
group by validation_status;

create or replace view public.v_verification_distribution
with (security_invoker = true) as
select verification_status, count(*)::int as count
from public.records
group by verification_status;

create or replace view public.v_confidence_distribution
with (security_invoker = true) as
select
  case
    when confidence_score >= 0.9 then '90-100%'
    when confidence_score >= 0.8 then '80-90%'
    when confidence_score >= 0.7 then '70-80%'
    else 'Below 70%'
  end as range,
  count(*)::int as count
from public.records
where confidence_score is not null
group by 1
order by 1 desc;

create or replace view public.v_daily_extractions
with (security_invoker = true) as
select date_trunc('day', created_at)::date as day,
       count(*)::int as records_created
from public.records
group by 1
order by 1 desc;


-- ============================================================
-- LANDLENS · 10 — Realtime (optional)
-- Enables live updates for the dashboard / verification queue.
-- Safe to skip if realtime is not needed.
-- ============================================================

do $$
begin
  alter publication supabase_realtime add table public.records;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.documents;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.audit_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;


