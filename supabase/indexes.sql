CREATE INDEX IF NOT EXISTS heroes_user_id_idx ON public.heroes (user_id);
CREATE INDEX IF NOT EXISTS quests_user_id_idx ON public.quests (user_id);
CREATE INDEX IF NOT EXISTS quests_hero_id_idx ON public.quests (hero_id);