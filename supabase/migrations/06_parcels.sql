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
