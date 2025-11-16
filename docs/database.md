# Banco de Dados — Forjador de Heróis

## Diagrama ER (Mermaid)
```mermaid
erDiagram
  heroes {
    uuid id PK
    uuid user_id
    text name
    text class
    jsonb data
    timestamptz created_at
    timestamptz updated_at
  }
  hero_classes {
    uuid id PK
    text name UK
    jsonb base_attributes
    jsonb base_skills
    timestamptz created_at
  }
  items {
    text id PK
    text name
    text type
    text rarity
    jsonb stats
    text set_id
    int price
    timestamptz created_at
  }
  locations {
    text id PK
    text name UK
    text region
    text biome
    int level_min
    int level_max
    jsonb coordinates
    timestamptz created_at
  }
  missions {
    text id PK
    text title
    text description
    text difficulty
    int recommended_level
    jsonb rewards
    boolean is_epic
    timestamptz created_at
  }
  npcs {
    text id PK
    text name
    text role
    jsonb dialog
    timestamptz created_at
  }
  hero_inventory {
    uuid id PK
    uuid hero_id FK
    text item_id FK
    int quantity
    text equipped_slot
    timestamptz acquired_at
  }
  hero_mission_progress {
    uuid id PK
    uuid hero_id FK
    text mission_id FK
    text status
    jsonb progress
    timestamptz started_at
    timestamptz completed_at
  }
  quests {
    uuid id PK
    uuid user_id
    uuid hero_id FK
    jsonb data
    text status
    timestamptz created_at
    timestamptz updated_at
  }
  mission_locations {
    text mission_id FK
    text location_id FK
  }
  npc_locations {
    text npc_id FK
    text location_id FK
  }

  hero_classes ||--o{ heroes : "class"
  heroes ||--o{ hero_inventory : "inventory"
  items ||--o{ hero_inventory : "items"
  heroes ||--o{ hero_mission_progress : "progress"
  missions ||--o{ hero_mission_progress : "missions"
  missions ||--o{ mission_locations : "at"
  locations ||--o{ mission_locations : "has"
  npcs ||--o{ npc_locations : "at"
  locations ||--o{ npc_locations : "hosts"
  heroes ||--o{ quests : "has"
```

## Restrições e Integridade
- `heroes.user_id` obrigatório; RLS por `auth.uid()` em leitura/atualização.
- Chaves estrangeiras com `ON DELETE CASCADE` em inventário e progresso.
- `missions` e `npcs` vinculados a `locations` via tabelas de junção.
- `quests.status` restrito a `active`, `completed`, `failed`.

## Índices
- `heroes(user_id)`, `heroes(updated_at)`.
- `quests(user_id)`, `quests(hero_id)`, `quests(updated_at)`.
- `hero_inventory(hero_id)`, `hero_inventory(item_id)`.
- `hero_mission_progress(hero_id, status)`, `hero_mission_progress(mission_id, status)`.
- `items(type)`, `items(rarity)`, `locations(name)`, `npcs(role)`.

## Scripts
- Criação de schema: `supabase/heroforge_schema.sql`.
- Tabela de `quests`: `supabase/quests.sql`.
- Seeds iniciais: `supabase/seed_core.sql`.
- Políticas RLS: `supabase/heroes_quests_rls.sql`.
- Índices adicionais: `supabase/indexes.sql`.

## Aplicação
- Executar os scripts no painel SQL do Supabase na ordem: schema → quests → RLS → índices → seeds.
- As tabelas `heroes` e `quests` são usadas pelo app via `supabase.from('heroes'|'quests')`.