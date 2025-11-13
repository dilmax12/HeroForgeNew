-- Guilda dos Aventureiros e Dungeon 20 Andares — Schema inicial
-- Execute este arquivo no seu projeto Supabase para habilitar persistência.

-- Extensões úteis
create extension if not exists pgcrypto;

-- Tabela de membros da guilda
create table if not exists public.guild_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  hero_id text not null,
  hero_name text not null,
  rank char(1) not null default 'F',
  reputation integer not null default 0,
  joined_at timestamptz not null default now(),
  unique(user_id, hero_id)
);

-- Índices
create index if not exists guild_members_user_idx on public.guild_members(user_id);
create index if not exists guild_members_rep_idx on public.guild_members(reputation desc);

-- RLS
alter table public.guild_members enable row level security;

-- Políticas: usuários autenticados podem gerenciar seus próprios registros
create policy if not exists guild_members_select on public.guild_members
  for select to authenticated
  using (true);

create policy if not exists guild_members_insert on public.guild_members
  for insert to authenticated
  with check (user_id = auth.uid());

create policy if not exists guild_members_update on public.guild_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Leaderboard de reputação (view pública)
create or replace view public.guild_rankings as
  select hero_name, rank, reputation, joined_at
  from public.guild_members
  order by reputation desc, joined_at asc;

-- Tabela de tentativas da masmorra de 20 andares
create table if not exists public.dungeon_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  hero_id text not null,
  hero_name text not null,
  max_floor_reached integer not null default 0,
  victory boolean not null default false,
  total_xp integer not null default 0,
  total_gold integer not null default 0,
  logs jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists dungeon_runs_user_idx on public.dungeon_runs(user_id);
create index if not exists dungeon_runs_hero_idx on public.dungeon_runs(hero_id);
create index if not exists dungeon_runs_finished_idx on public.dungeon_runs(finished_at desc);

alter table public.dungeon_runs enable row level security;

create policy if not exists dungeon_runs_select on public.dungeon_runs
  for select to authenticated
  using (user_id = auth.uid());

create policy if not exists dungeon_runs_insert on public.dungeon_runs
  for insert to authenticated
  with check (user_id = auth.uid());

create policy if not exists dungeon_runs_update on public.dungeon_runs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- View de leaderboard da dungeon (pública)
create or replace view public.dungeon_leaderboard as
  select hero_name, max_floor_reached, total_xp, total_gold, finished_at
  from public.dungeon_runs
  where finished_at is not null
  order by max_floor_reached desc, total_xp desc, finished_at asc;

