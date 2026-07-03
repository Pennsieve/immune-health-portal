alter table studies
  add column if not exists status_token_version integer not null default 1;
