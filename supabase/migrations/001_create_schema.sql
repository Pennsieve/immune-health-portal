-- ============================================================
-- Admin Console Schema
-- Run this in the Supabase SQL editor (Project → SQL Editor)
-- ============================================================

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
  notes              jsonb default '[]'::jsonb,
  feasibility        jsonb default '[]'::jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Studies: activated research studies
create table if not exists studies (
  id               text primary key,
  name             text not null,
  abbreviation     text,
  pi               jsonb,   -- { name, email }
  study_lead       jsonb,   -- { name, email }
  affiliation      text,
  affiliation_org  text,
  irb              text,
  stage            text not null default 'Inquiry',
  is_locked        boolean default false,
  cohort           jsonb,   -- { subjects, timepoints, totalSamples, processedSamples, sampleType }
  budget           jsonb,   -- { committed, invoiced, remaining, pctInvoiced, accountCode, billingContact, lines[] }
  integrations     jsonb default '{}'::jsonb,  -- { redcap, labvantage, pennsieve }
  started_date     text,
  department       text,
  objectives       text,
  phlebotomy       text,
  metadata_desc    text,
  lifecycle        jsonb default '[]'::jsonb,  -- [{ label, date, status }]
  updated_relative text,
  quick_stats      jsonb,   -- { samplesReceived, samplesTotal, cytofAcquired, ... }
  activity         jsonb default '[]'::jsonb,  -- [{ dotClass, title, date, author, note }]
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Agreements: one row per (study, agreement_type) — updated individually for signing
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

-- ============================================================
-- Row Level Security
-- All tables: authenticated users (admin staff) have full access
-- The PI signing flow uses a service-role server API route (bypasses RLS)
-- ============================================================

alter table inquiries  enable row level security;
alter table studies    enable row level security;
alter table agreements enable row level security;

create policy "Admin full access on inquiries"
  on inquiries for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin full access on studies"
  on studies for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin full access on agreements"
  on agreements for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- updated_at trigger
-- ============================================================

create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger inquiries_updated_at  before update on inquiries  for each row execute procedure handle_updated_at();
create trigger studies_updated_at    before update on studies    for each row execute procedure handle_updated_at();
