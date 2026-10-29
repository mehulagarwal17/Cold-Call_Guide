create extension if not exists pgcrypto;

create table stages (
  id smallint primary key,            -- 1 to 8
  name text not null,
  purpose text not null,
  prospect_says jsonb not null default '[]',   -- exactly 3 strings
  tap_options jsonb not null default '[]',     -- exactly 4 objects: key and label
  sort_order smallint not null
);

create table calls (
  id uuid primary key default gen_random_uuid(),
  prospect_name text not null,
  prospect_role text not null,
  company text not null,
  status text not null default 'in_progress' check (status in ('in_progress','closed')),
  current_stage smallint not null default 1,
  furthest_stage smallint not null default 1,
  outcome text check (outcome in ('meeting_booked','follow_up_agreed','not_interested','no_conversation','ended_early')),
  summary text,
  summary_status text not null default 'pending' check (summary_status in ('pending','done','failed','skipped')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table stage_results (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references calls(id) on delete cascade,
  stage_id smallint not null references stages(id),
  tap_key text,
  prospect_words text,
  saved_at timestamptz not null default now(),
  unique (call_id, stage_id)
);

create index on calls (started_at desc);
create index on stage_results (call_id);

alter table stages enable row level security;
alter table calls enable row level security;
alter table stage_results enable row level security;
-- No policies: only the backend (service role) can read or write.
