create table if not exists public.player_progress (
  user_id uuid primary key,
  missions_completed integer not null default 0,
  achievements_unlocked integer not null default 0,
  playtime_minutes integer not null default 0,
  last_login timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.player_progress enable row level security;

create policy "own_read" on public.player_progress for select using (auth.uid() = user_id);
create policy "own_write" on public.player_progress for update using (auth.uid() = user_id);

create index if not exists player_progress_updated_idx on public.player_progress (updated_at);

