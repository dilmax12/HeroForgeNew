alter table public.heroes enable row level security;
alter table public.quests enable row level security;

create policy if not exists heroes_own_read on public.heroes for select using (auth.uid() = user_id);
create policy if not exists heroes_own_write on public.heroes for update using (auth.uid() = user_id);

create policy if not exists quests_own_read on public.quests for select using (auth.uid() = user_id);
create policy if not exists quests_own_write on public.quests for update using (auth.uid() = user_id);