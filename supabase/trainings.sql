-- Campo dos Heróis — Esquema de Treinamentos

create table if not exists training_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,     -- forge, agility, wisdom, spirit, defense
  name text not null,
  description text,
  base_reward jsonb,             -- xp/atributos base
  cost jsonb,                    -- custo em moedas (ex: { glory: 10 })
  unlock_req jsonb               -- requisitos de unlock (nível, reputação, glória)
);

create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  hero_id uuid references heroes(id),
  type text not null,
  started_at timestamptz default now(),
  duration int not null,         -- minutos
  status text default 'active',  -- active | completed | canceled
  reward jsonb,                  -- recompensa aplicada ao concluir
  fatigue_applied int default 0  -- fadiga atribuída
);

create index if not exists idx_trainings_hero on trainings(hero_id);
create index if not exists idx_trainings_status on trainings(status);

