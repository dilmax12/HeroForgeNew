CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hero_id UUID NOT NULL REFERENCES public.heroes(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quests_user_id_idx ON public.quests (user_id);
CREATE INDEX IF NOT EXISTS quests_hero_id_idx ON public.quests (hero_id);
CREATE INDEX IF NOT EXISTS quests_updated_at_idx ON public.quests (updated_at DESC);

CREATE OR REPLACE FUNCTION quests_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quests_set_updated_at ON public.quests;
CREATE TRIGGER trg_quests_set_updated_at
BEFORE UPDATE ON public.quests
FOR EACH ROW
EXECUTE FUNCTION quests_set_updated_at();