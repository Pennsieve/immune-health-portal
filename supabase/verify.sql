-- ============================================================
-- I3H Portal — schema verification (READ-ONLY)
-- Run this in the Supabase SQL editor after running setup.sql.
--
-- It changes nothing. It returns one checklist row per item with
-- a status of '✓ OK' or '✗ MISSING'. Rows that are MISSING sort
-- to the top. If every row says '✓ OK', your schema matches what
-- the current branch's code expects.
-- ============================================================

with
-- Expected (table, column) pairs — the full schema from setup.sql
expected_cols(tbl, col) as (
  values
    -- inquiries
    ('inquiries','id'),('inquiries','study_name'),('inquiries','abbreviation'),
    ('inquiries','status'),('inquiries','submitted_date'),('inquiries','submitted_relative'),
    ('inquiries','objectives'),('inquiries','pi'),
    ('inquiries','study_lead'),('inquiries','affiliation'),('inquiries','affiliation_org'),
    ('inquiries','irb'),('inquiries','cohort_subjects'),
    ('inquiries','services'),('inquiries','services_detail'),('inquiries','estimate'),
    ('inquiries','sample_type'),('inquiries','phlebotomy'),('inquiries','metadata'),
    ('inquiries','budget_code'),('inquiries','funding_name'),('inquiries','ba_name'),
    ('inquiries','ba_email'),('inquiries','contracting_contact'),('inquiries','additional_notes'),
    ('inquiries','notes'),('inquiries','feasibility'),('inquiries','intake_details'),
    ('inquiries','sample_schedule'),('inquiries','created_at'),('inquiries','updated_at'),
    -- studies
    ('studies','id'),('studies','name'),('studies','abbreviation'),('studies','pi'),
    ('studies','study_lead'),('studies','affiliation'),('studies','affiliation_org'),
    ('studies','irb'),('studies','stage'),('studies','is_locked'),('studies','cohort'),
    ('studies','budget'),('studies','integrations'),('studies','started_date'),
    ('studies','department'),('studies','objectives'),('studies','phlebotomy'),
    ('studies','metadata_desc'),('studies','lifecycle'),('studies','updated_relative'),
    ('studies','activity'),('studies','status_token_version'),
    ('studies','intake_details'),('studies','additional_notes'),('studies','created_at'),('studies','updated_at'),
    -- agreements
    ('agreements','id'),('agreements','study_id'),('agreements','name'),
    ('agreements','description'),('agreements','status'),('agreements','signed_by'),
    ('agreements','signed_date'),('agreements','signed_email'),('agreements','sent_date'),
    ('agreements','reminder_date')
),
expected_tables(tbl) as (
  values ('inquiries'),('studies'),('agreements')
),
expected_policies(tbl, polname) as (
  values
    ('inquiries','Admin full access on inquiries'),
    ('studies','Admin full access on studies'),
    ('agreements','Admin full access on agreements')
),
expected_triggers(trg) as (
  values ('inquiries_updated_at'),('studies_updated_at')
),

-- ── Checks ──────────────────────────────────────────────────
check_tables as (
  select '1. table' as check_group,
         t.tbl as item,
         case when p.tablename is null then '✗ MISSING' else '✓ OK' end as status
  from expected_tables t
  left join pg_tables p on p.schemaname = 'public' and p.tablename = t.tbl
),
check_columns as (
  select '2. column' as check_group,
         e.tbl || '.' || e.col as item,
         case when c.column_name is null then '✗ MISSING' else '✓ OK' end as status
  from expected_cols e
  left join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = e.tbl and c.column_name = e.col
),
check_rls as (
  select '3. rls' as check_group,
         t.tbl || ' — row level security' as item,
         case when coalesce(c.relrowsecurity, false) then '✓ OK' else '✗ MISSING' end as status
  from expected_tables t
  left join pg_class c on c.relname = t.tbl
    and c.relnamespace = 'public'::regnamespace
),
check_policies as (
  select '4. policy' as check_group,
         ep.polname as item,
         case when p.policyname is null then '✗ MISSING' else '✓ OK' end as status
  from expected_policies ep
  left join pg_policies p
    on p.schemaname = 'public' and p.tablename = ep.tbl and p.policyname = ep.polname
),
check_function as (
  select '5. function' as check_group,
         'handle_updated_at()' as item,
         case when count(*) = 0 then '✗ MISSING' else '✓ OK' end as status
  from pg_proc where proname = 'handle_updated_at'
),
check_triggers as (
  select '6. trigger' as check_group,
         et.trg as item,
         case when t.tgname is null then '✗ MISSING' else '✓ OK' end as status
  from expected_triggers et
  left join pg_trigger t on t.tgname = et.trg and not t.tgisinternal
),
all_checks as (
  select * from check_tables
  union all select * from check_columns
  union all select * from check_rls
  union all select * from check_policies
  union all select * from check_function
  union all select * from check_triggers
),
summary as (
  select '0. SUMMARY' as check_group,
         count(*) filter (where status like '✗%')::text || ' missing of '
           || count(*)::text || ' checks' as item,
         case when count(*) filter (where status like '✗%') = 0
              then '✓ ALL OK' else '✗ ACTION NEEDED' end as status
  from all_checks
)

select check_group, item, status
from (
  select check_group, item, status, 0 as ord from summary
  union all
  select check_group, item, status,
         case when status like '✗%' then 1 else 2 end as ord
  from all_checks
) t
order by ord, check_group, item;
