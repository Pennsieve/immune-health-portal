-- ============================================================
-- I3H Portal — schema setup for a fresh database
-- Run this in the Supabase SQL editor (Project → SQL Editor)
-- before running seed.sql.
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

-- Inquiries: one row per lead / PI intake submission.
-- A row starts as a bare lead (status 'Lead', no study fields) and is
-- upgraded in place when the billing form is submitted via the emailed
-- token link (status 'New').
create table inquiries (
  id                 text primary key,
  study_name         text,            -- null until the full intake is submitted
  abbreviation       text,
  status             text not null default 'New',
  submitted_date     text,
  submitted_relative text,
  pi                 jsonb,           -- { name, email }
  study_lead         jsonb,           -- { name, email }
  affiliation        text,
  affiliation_org    text,
  irb                text,
  cohort_subjects    integer,
  services           text,
  services_detail    jsonb default '[]'::jsonb,
  estimate           numeric,
  budget_code        text,
  funding_name       text,
  ba_name            text,
  ba_email           text,
  contracting_contact text,
  additional_notes   text,
  notes              jsonb default '[]'::jsonb,
  feasibility        jsonb default '[]'::jsonb,
  intake_details     jsonb default '{}'::jsonb,   -- expanded intake answers
  sample_schedule    jsonb default '[]'::jsonb,   -- cohort sample matrix
  collection_visits  jsonb default '[]'::jsonb,   -- study-defined visit schedule the matrix's columns derive from
  lead_details       jsonb default '{}'::jsonb,   -- lead-form answers (role, referral source, …)
  key_personnel      jsonb default '[]'::jsonb,   -- CRCs, other physicians, etc. helping launch the study
  intake_sent_date   text,                        -- when the full-intake link was emailed
  lead_decision      text,                        -- 'proceed' | 'hold' | null: go/no-go after the intro meeting
  hold_until         text,                        -- follow-up date (YYYY-MM-DD) while status = 'On Hold'
  activity           jsonb default '[]'::jsonb,   -- audit log: field edits, status changes, …
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Studies: activated research studies
create table studies (
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
  additional_notes text,                              -- PI's additional notes carried from the inquiry
  key_personnel    jsonb default '[]'::jsonb,          -- carried from the inquiry
  lifecycle        jsonb default '[]'::jsonb,
  updated_relative text,
  activity         jsonb default '[]'::jsonb,
  intake_details   jsonb default '{}'::jsonb,          -- expanded intake answers carried from the inquiry
  status_token_version integer not null default 1,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Agreements: one row per (study, agreement_type)
create table agreements (
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
  snapshot       jsonb,               -- resolved document field values, frozen at generation time
  primary key (study_id, id)
);

-- ── Row Level Security ──────────────────────────────────────
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

-- ── updated_at trigger ──────────────────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger inquiries_updated_at before update on inquiries for each row execute procedure handle_updated_at();
create trigger studies_updated_at   before update on studies   for each row execute procedure handle_updated_at();
