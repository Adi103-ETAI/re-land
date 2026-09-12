-- Supabase Schema for LANDLENS
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  role text not null check (role in ('operator', 'verifier', 'senior', 'auditor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

-- Policies
create policy "Profiles are viewable by officers"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Documents table
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  original_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'failed')),
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz
);

create index idx_documents_user_id on public.documents(user_id);
create index idx_documents_status on public.documents(status);

-- Records table
create table public.records (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references public.documents(id) on delete cascade,
  page_number integer not null,
  fields jsonb not null default '{}'::jsonb,
  confidence_score numeric(5,4),
  validation_status text not null default 'pending' check (validation_status in ('pending', 'safe', 'review', 'high_risk', 'verified', 'rejected')),
  verification_status text check (verification_status in ('pending', 'accepted', 'corrected', 'rejected', 'escalated')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id)
);

create index idx_records_document_id on public.records(document_id);
create index idx_records_validation_status on public.records(validation_status);

-- Audit log table
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at);

-- Pipeline stages tracking
create table public.pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  record_id uuid references public.records(id) on delete cascade,
  stage_name text not null,
  stage_order integer not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb
);

create index idx_pipeline_stages_record_id on public.pipeline_stages(record_id);

-- Secure API key for backend (stored in env, referenced here for reference)
-- INSERT INTO auth.custom_auth_keys (name, key, organization_id) VALUES ('landlens-api-key', 'your-secret-key', null);

-- Example seed data (optional)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, roles)
VALUES 
  (gen_random_uuid(), 'operator@landlens.local', now(), now(), now(), ARRAY['authenticated']),
  (gen_random_uuid(), 'verifier@landlens.local', now(), now(), now(), ARRAY['authenticated']),
  (gen_random_uuid(), 'admin@landlens.local', now(), now(), now(), ARRAY['authenticated']);

-- Insert profiles
INSERT INTO public.profiles (id, email, name, role)
SELECT 
  id,
  email,
  split_part(email, '@', 1) || ' User',
  CASE 
    WHEN email LIKE '%operator%' THEN 'operator'
    WHEN email LIKE '%verifier%' THEN 'verifier'
    ELSE 'admin'
  END
FROM auth.users;
