alter table public.heroes enable row level security;
alter table public.quests enable row level security;

drop policy if exists heroes_own_read on public.heroes;
drop policy if exists heroes_own_write on public.heroes;

drop policy if exists quests_own_read on public.quests;
drop policy if exists quests_own_write on public.quests;

create policy heroes_own_read 
on public.heroes 
for select 
using (auth.uid() = user_id);

create policy heroes_own_write
on public.heroes
for update
using (auth.uid() = user_id);

create policy quests_own_read 
on public.quests 
for select 
using (auth.uid() = user_id);

create policy quests_own_write
on public.quests
for update
using (auth.uid() = user_id);
