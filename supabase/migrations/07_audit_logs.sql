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
