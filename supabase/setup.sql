-- ============================================================
-- I3H Portal — full idempotent schema setup
-- Run this in the Supabase SQL editor (Project → SQL Editor).
--
-- Safe to run on a fresh database OR one that already has some of
-- these tables/columns. It creates anything missing and refreshes
-- the RLS policies and triggers without erroring on re-run.
--
-- This is the union of migrations 001, 002, and 003.
-- It does NOT insert any demo data (see seed.sql for that).
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

-- Inquiries: one row per PI intake submission
create table if not exists inquiries (
  id                 text primary key,
  study_name         text not null,
  abbreviation       text,
  status             text not null default 'New',
  submitted_date     text,
  submitted_relative text,
  is_stale           boolean default false,
  objectives         text,
  pi                 jsonb,           -- { name, email }
  study_lead         jsonb,           -- { name, email }
  affiliation        text,
  affiliation_org    text,
  irb                text,
  cohort_subjects    integer,
  cohort_timepoints  integer,
  services           text,
  services_detail    jsonb default '[]'::jsonb,
  estimate           numeric,
  sample_type        text,
  phlebotomy         text,
  metadata           text,
  budget_code        text,
  funding_name       text,
  ba_name            text,
  ba_email           text,
  contracting_contact text,
  additional_notes   text,
  notes              jsonb default '[]'::jsonb,
  feasibility        jsonb default '[]'::jsonb,
  intake_details     jsonb default '{}'::jsonb,   -- expanded intake answers (migration 003)
  sample_schedule    jsonb default '[]'::jsonb,   -- cohort sample matrix (migration 003)
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Studies: activated research studies
create table if not exists studies (
  id               text primary key,
  name             text not null,
  abbreviation     text,
  pi               jsonb,
  study_lead       jsonb,
  affiliation      text,
  affiliation_org  text,
  irb              text,
  stage            text not null default 'Inquiry',
  is_locked        boolean default false,
  cohort           jsonb,
  budget           jsonb,
  integrations     jsonb default '{}'::jsonb,
  started_date     text,
  department       text,
  objectives       text,
  phlebotomy       text,
  metadata_desc    text,
  lifecycle        jsonb default '[]'::jsonb,
  updated_relative text,
  quick_stats      jsonb,
  activity         jsonb default '[]'::jsonb,
  status_token_version integer not null default 1,   -- migration 002
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Agreements: one row per (study, agreement_type)
create table if not exists agreements (
  id             text not null,
  study_id       text not null references studies(id) on delete cascade,
  name           text not null,
  description    text,
  status         text not null default 'Pending',
  signed_by      text,
  signed_date    text,
  signed_email   text,
  sent_date      text,
  reminder_date  text,
  primary key (study_id, id)
);

-- ── Columns added by later migrations ───────────────────────
-- (in case the tables above already existed before those migrations)
alter table inquiries add column if not exists intake_details  jsonb default '{}'::jsonb;
alter table inquiries add column if not exists sample_schedule jsonb default '[]'::jsonb;
alter table studies   add column if not exists status_token_version integer not null default 1;

-- ── Row Level Security ──────────────────────────────────────
alter table inquiries  enable row level security;
alter table studies    enable row level security;
alter table agreements enable row level security;

drop policy if exists "Admin full access on inquiries" on inquiries;
create policy "Admin full access on inquiries"
  on inquiries for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin full access on studies" on studies;
create policy "Admin full access on studies"
  on studies for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin full access on agreements" on agreements;
create policy "Admin full access on agreements"
  on agreements for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── updated_at trigger ──────────────────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inquiries_updated_at on inquiries;
create trigger inquiries_updated_at before update on inquiries for each row execute procedure handle_updated_at();

drop trigger if exists studies_updated_at on studies;
create trigger studies_updated_at   before update on studies   for each row execute procedure handle_updated_at();

-- ── Verify ──────────────────────────────────────────────────
-- After running, this should return the two branch-critical columns:
select column_name
from information_schema.columns
where table_name = 'inquiries'
  and column_name in ('intake_details', 'sample_schedule')
order by column_name;
