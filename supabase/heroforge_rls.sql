alter table public.heroes enable row level security;
alter table public.hero_inventory enable row level security;
alter table public.hero_mission_progress enable row level security;
alter table public.items enable row level security;
alter table public.missions enable row level security;
alter table public.locations enable row level security;
alter table public.npcs enable row level security;
alter table public.mission_locations enable row level security;
alter table public.npc_locations enable row level security;

create policy if not exists heroes_own_select on public.heroes for select using (auth.uid() = user_id);
create policy if not exists heroes_own_insert on public.heroes for insert with check (auth.uid() = user_id);
create policy if not exists heroes_own_update on public.heroes for update using (auth.uid() = user_id);
create policy if not exists heroes_own_delete on public.heroes for delete using (auth.uid() = user_id);

create policy if not exists inventory_hero_select on public.hero_inventory for select using (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));
create policy if not exists inventory_hero_insert on public.hero_inventory for insert with check (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));
create policy if not exists inventory_hero_update on public.hero_inventory for update using (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));
create policy if not exists inventory_hero_delete on public.hero_inventory for delete using (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));

create policy if not exists progress_hero_select on public.hero_mission_progress for select using (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));
create policy if not exists progress_hero_insert on public.hero_mission_progress for insert with check (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));
create policy if not exists progress_hero_update on public.hero_mission_progress for update using (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));
create policy if not exists progress_hero_delete on public.hero_mission_progress for delete using (exists (select 1 from public.heroes h where h.id = hero_id and h.user_id = auth.uid()));

create policy if not exists items_read_all on public.items for select using (true);
create policy if not exists missions_read_all on public.missions for select using (true);
create policy if not exists locations_read_all on public.locations for select using (true);
create policy if not exists npcs_read_all on public.npcs for select using (true);
create policy if not exists mission_locations_read_all on public.mission_locations for select using (true);
create policy if not exists npc_locations_read_all on public.npc_locations for select using (true);