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
