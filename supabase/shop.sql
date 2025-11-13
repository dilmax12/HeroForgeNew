-- Empório do Aventureiro — Esquema de Loja

create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,        -- consumable | equipment | artifact | guild
  rarity text not null,          -- common | rare | epic | legendary
  price int not null,
  currency text not null default 'gold',  -- gold | glory | arcaneEssence
  effect jsonb,                  -- efeito/aplicação do item
  available_until timestamptz,   -- para ofertas temporárias
  icon text,                     -- emoji/caminho
  description text,
  tags text[]
);

create table if not exists shop_rotations (
  id uuid primary key default gen_random_uuid(),
  city_id text,
  started_at timestamptz default now(),
  ends_at timestamptz,
  items jsonb not null           -- lista de itens da rotação: ids/custos
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  hero_id uuid not null,
  item_id uuid not null,
  quantity int not null default 1,
  price_paid int not null,
  currency text not null default 'gold',
  purchased_at timestamptz default now()
);

-- Índices úteis
create index if not exists idx_purchases_hero on purchases(hero_id);
create index if not exists idx_shop_items_rarity on shop_items(rarity);
create index if not exists idx_shop_items_currency on shop_items(currency);

