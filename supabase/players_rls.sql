alter table public.players enable row level security;

create policy if not exists players_own_read on public.players for select using (auth.uid() = id);
create policy if not exists players_own_update on public.players for update using (auth.uid() = id);

