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
