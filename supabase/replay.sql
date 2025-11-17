create extension if not exists pgcrypto;

alter type item_type add value if not exists 'relic';

create table if not exists relics (
  id text primary key,
  name text not null,
  rarity text not null,
  effect jsonb not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists player_relics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  relic_id text not null references relics(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  unique(user_id, relic_id)
);

create table if not exists daily_chest_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  claimed_at timestamptz not null default now(),
  rewards jsonb not null,
  streak_count int not null default 0
);

create unique index if not exists daily_chest_claims_user_day_unique
on daily_chest_claims (user_id, (date_trunc('day', claimed_at)));

create index if not exists idx_daily_chest_user_claimed on daily_chest_claims (user_id, claimed_at desc);

create table if not exists global_events (
  id text primary key,
  name text not null,
  type text not null,
  modifiers jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_global_events_time on global_events (starts_at desc);

create table if not exists weekly_mutators (
  id text primary key,
  name text not null,
  description text,
  modifiers jsonb not null,
  week_start timestamptz not null,
  week_end timestamptz not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_weekly_mutators_active on weekly_mutators (active, week_start desc);

create table if not exists minibosses (
  id text primary key,
  name text not null,
  element text,
  level int not null,
  stats jsonb,
  rewards jsonb,
  created_at timestamptz not null default now()
);

create table if not exists location_minibosses (
  location_id text not null references locations(id) on delete cascade,
  miniboss_id text not null references minibosses(id) on delete cascade,
  spawn_chance numeric not null default 0.05,
  primary key (location_id, miniboss_id)
);

alter table if exists missions add column if not exists night_only boolean not null default false;
alter table if exists missions add column if not exists danger_multiplier numeric not null default 1.0;
alter table if exists missions add column if not exists reward_multiplier numeric not null default 1.0;

alter table relics enable row level security;
alter table player_relics enable row level security;
alter table daily_chest_claims enable row level security;
alter table global_events enable row level security;
alter table weekly_mutators enable row level security;
alter table minibosses enable row level security;
alter table location_minibosses enable row level security;

drop policy if exists relics_read_all on relics;
create policy relics_read_all on relics for select using (true);

drop policy if exists player_relics_own_select on player_relics;
create policy player_relics_own_select on player_relics for select using (auth.uid() = user_id);
drop policy if exists player_relics_own_insert on player_relics;
create policy player_relics_own_insert on player_relics for insert with check (auth.uid() = user_id);
drop policy if exists player_relics_own_update on player_relics;
create policy player_relics_own_update on player_relics for update using (auth.uid() = user_id);

drop policy if exists daily_chest_own_select on daily_chest_claims;
create policy daily_chest_own_select on daily_chest_claims for select using (auth.uid() = user_id);
drop policy if exists daily_chest_own_insert on daily_chest_claims;
create policy daily_chest_own_insert on daily_chest_claims for insert with check (auth.uid() = user_id);
drop policy if exists daily_chest_own_update on daily_chest_claims;
create policy daily_chest_own_update on daily_chest_claims for update using (auth.uid() = user_id);

drop policy if exists global_events_read_all on global_events;
create policy global_events_read_all on global_events for select using (approved = true);

drop policy if exists weekly_mutators_read_all on weekly_mutators;
create policy weekly_mutators_read_all on weekly_mutators for select using (true);

drop policy if exists minibosses_read_all on minibosses;
create policy minibosses_read_all on minibosses for select using (true);

drop policy if exists location_minibosses_read_all on location_minibosses;
create policy location_minibosses_read_all on location_minibosses for select using (true);