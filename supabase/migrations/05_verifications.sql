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
