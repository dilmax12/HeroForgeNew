ALTER TABLE public.players ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_login timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS players_username_unique ON public.players (lower(username)) WHERE username IS NOT NULL;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();