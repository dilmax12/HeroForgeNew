CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE item_type AS ENUM ('weapon','armor','accessory');
CREATE TYPE item_rarity AS ENUM ('common','uncommon','rare','epic','legendary');
CREATE TYPE mission_difficulty AS ENUM ('easy','normal','hard','epic');
CREATE TYPE progress_status AS ENUM ('not_started','in_progress','completed','failed');
CREATE TYPE npc_role AS ENUM ('merchant','trainer','guild_master','quest_giver','blacksmith','healer');

CREATE TABLE hero_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  base_attributes JSONB NOT NULL,
  base_skills JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE heroes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT,
  class TEXT REFERENCES hero_classes(name),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  rarity TEXT NOT NULL,
  stats JSONB,
  set_id TEXT,
  price INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  region TEXT,
  biome TEXT,
  level_min INT NOT NULL DEFAULT 1 CHECK (level_min >= 1),
  level_max INT NOT NULL DEFAULT 100 CHECK (level_max >= level_min),
  coordinates JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL,
  recommended_level INT NOT NULL DEFAULT 1 CHECK (recommended_level >= 1),
  rewards JSONB NOT NULL,
  is_epic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE npcs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  dialog JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hero_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id UUID NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  equipped_slot TEXT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hero_id, item_id, equipped_slot)
);

CREATE TABLE hero_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id UUID NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status progress_status NOT NULL DEFAULT 'not_started',
  progress JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (hero_id, mission_id)
);

CREATE TABLE mission_locations (
  mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, location_id)
);

CREATE TABLE npc_locations (
  npc_id TEXT NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  PRIMARY KEY (npc_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_heroes_user_id ON heroes(user_id);
CREATE INDEX IF NOT EXISTS idx_heroes_updated_at ON heroes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
CREATE INDEX IF NOT EXISTS idx_inventory_hero ON hero_inventory(hero_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON hero_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_progress_hero_status ON hero_mission_progress(hero_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_mission_status ON hero_mission_progress(mission_id, status);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_npcs_role ON npcs(role);

CREATE OR REPLACE FUNCTION heroes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_heroes_set_updated_at ON heroes;
CREATE TRIGGER trg_heroes_set_updated_at
BEFORE UPDATE ON heroes
FOR EACH ROW
EXECUTE FUNCTION heroes_set_updated_at();