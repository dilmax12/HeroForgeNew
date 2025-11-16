WITH cls AS (
  INSERT INTO hero_classes (name, base_attributes, base_skills)
  VALUES
    ('Warrior', '{"strength":8,"agility":4,"intelligence":3,"vitality":7}', '["Slash","Shield Bash"]'),
    ('Mage', '{"strength":3,"agility":4,"intelligence":9,"vitality":4}', '["Fireball","Arcane Shield"]'),
    ('Archer', '{"strength":5,"agility":8,"intelligence":4,"vitality":5}', '["Quick Shot","Eagle Eye"]')
  RETURNING id, name
), loc AS (
  INSERT INTO locations (id, name, region, biome, level_min, level_max, coordinates)
  VALUES
    ('loc_capital','Capital of Altharion','Central Kingdom','city',1,100,'{"lat":0,"lng":0}'),
    ('loc_greenwood','Greenwood Forest','Northern Wilds','forest',1,30,'{"lat":12.3,"lng":-7.8}'),
    ('loc_echoes','Dungeon of Echoes','Underrealm','dungeon',10,60,'{"lat":-3.2,"lng":4.1}')
  RETURNING id, name
), itm AS (
  INSERT INTO items (id, name, type, rarity, stats, set_id)
  VALUES
    ('item_rusty_sword','Rusty Sword','weapon','common','{"attack":5}', NULL),
    ('item_apprentice_staff','Apprentice Staff','weapon','common','{"attack":4,"mana":10}', NULL),
    ('item_simple_bow','Simple Bow','weapon','common','{"attack":5}', NULL),
    ('item_leather_armor','Leather Armor','armor','common','{"defense":3}', NULL),
    ('item_wooden_shield','Wooden Shield','armor','common','{"defense":2}', NULL),
    ('item_traveler_ring','Traveler Ring','accessory','uncommon','{"luck":1}', NULL)
  RETURNING id, name
), npc AS (
  INSERT INTO npcs (id, name, role, dialog)
  VALUES
    ('npc_trainer','Elder Trainer','trainer','{"lines":["Welcome, hero.","Train hard to grow stronger."]}'),
    ('npc_guild_master','Guild Master','guild_master','{"lines":["Join the guild.","We have missions for you."]}'),
    ('npc_merchant','Wandering Merchant','merchant','{"lines":["Fine goods for brave adventurers."]}')
  RETURNING id, name
), mis AS (
  INSERT INTO missions (id, title, description, difficulty, recommended_level, rewards, is_epic)
  VALUES
    ('mis_first_steps','First Steps','Speak to the Elder Trainer in the capital.','easy',1,'{"xp":50,"gold":10}',false),
    ('mis_forest_hunt','Forest Hunt','Defeat 5 boars in Greenwood Forest.','normal',3,'{"xp":120,"gold":25}',false),
    ('mis_dungeon_depths','Dungeon Depths','Explore the first level of the Dungeon of Echoes.','hard',10,'{"xp":300,"gold":50}',false)
  RETURNING id, title
)
INSERT INTO mission_locations (mission_id, location_id)
SELECT (SELECT id FROM mis WHERE title = 'First Steps'), (SELECT id FROM loc WHERE name = 'Capital of Altharion')
UNION ALL
SELECT (SELECT id FROM mis WHERE title = 'Forest Hunt'), (SELECT id FROM loc WHERE name = 'Greenwood Forest')
UNION ALL
SELECT (SELECT id FROM mis WHERE title = 'Dungeon Depths'), (SELECT id FROM loc WHERE name = 'Dungeon of Echoes');

INSERT INTO npc_locations (npc_id, location_id)
SELECT (SELECT id FROM npc WHERE name = 'Elder Trainer'), (SELECT id FROM loc WHERE name = 'Capital of Altharion')
UNION ALL
SELECT (SELECT id FROM npc WHERE name = 'Guild Master'), (SELECT id FROM loc WHERE name = 'Capital of Altharion')
UNION ALL
SELECT (SELECT id FROM npc WHERE name = 'Wandering Merchant'), (SELECT id FROM loc WHERE name = 'Greenwood Forest');