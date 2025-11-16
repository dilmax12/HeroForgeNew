INSERT INTO public.hero_classes (name, base_attributes, base_skills)
VALUES
('guerreiro', '{"forca": 8, "destreza": 4, "constituicao": 7, "inteligencia": 2, "sabedoria": 3, "carisma": 3}', '["golpe-pesado","bloqueio"]'),
('mago', '{"forca": 2, "destreza": 3, "constituicao": 3, "inteligencia": 9, "sabedoria": 6, "carisma": 3}', '["boladefogo","escudo-arcano"]'),
('ladino', '{"forca": 4, "destreza": 8, "constituicao": 4, "inteligencia": 4, "sabedoria": 3, "carisma": 5}', '["ataque-preciso","furtividade"]'),
('clerigo', '{"forca": 3, "destreza": 3, "constituicao": 5, "inteligencia": 5, "sabedoria": 8, "carisma": 4}', '["cura","luz-sagrada"]'),
('patrulheiro', '{"forca": 5, "destreza": 7, "constituicao": 5, "inteligencia": 4, "sabedoria": 4, "carisma": 3}', '["tiro-certo","companheiro"]'),
('paladino', '{"forca": 7, "destreza": 3, "constituicao": 7, "inteligencia": 3, "sabedoria": 6, "carisma": 4}', '["juramento","golpe-sagrado"]'),
('arqueiro', '{"forca": 4, "destreza": 9, "constituicao": 4, "inteligencia": 3, "sabedoria": 3, "carisma": 3}', '["disparo-rapido","foco"]'),
('bardo', '{"forca": 3, "destreza": 5, "constituicao": 4, "inteligencia": 5, "sabedoria": 4, "carisma": 8}', '["canção-inspiradora","satira"]'),
('monge', '{"forca": 6, "destreza": 7, "constituicao": 5, "inteligencia": 3, "sabedoria": 5, "carisma": 2}', '["palma-aton","meditação"]'),
('assassino', '{"forca": 5, "destreza": 9, "constituicao": 4, "inteligencia": 4, "sabedoria": 3, "carisma": 2}', '["golpe-sombra","veneno"]'),
('barbaro', '{"forca": 9, "destreza": 4, "constituicao": 8, "inteligencia": 2, "sabedoria": 2, "carisma": 2}', '["fúria","rugido"]'),
('lanceiro', '{"forca": 7, "destreza": 6, "constituicao": 6, "inteligencia": 3, "sabedoria": 3, "carisma": 2}', '["investida","parede-de-lanças"]'),
('druida', '{"forca": 3, "destreza": 3, "constituicao": 5, "inteligencia": 6, "sabedoria": 8, "carisma": 3}', '["forma-selvagem","raizes"]'),
('feiticeiro', '{"forca": 2, "destreza": 4, "constituicao": 4, "inteligencia": 8, "sabedoria": 5, "carisma": 5}', '["raio","escudo-feiticeiro"]');

INSERT INTO public.items (id, name, type, rarity, stats, set_id, price)
VALUES
('espada-aprendiz','Espada de Aprendiz','weapon','comum','{"bonus":{"forca":1}}',NULL,50),
('armadura-novato','Armadura de Novato','armor','comum','{"bonus":{"constituicao":1}}',NULL,80),
('capacete-ferro','Capacete de Ferro','armor','comum','{"bonus":{"constituicao":1}}',NULL,40),
('cinto-couro','Cinto de Couro','armor','comum','{"bonus":{"destreza":1}}',NULL,20),
('luvas-couro','Luvas de Couro','armor','comum','{"bonus":{"destreza":1}}',NULL,25),
('botas-caminhante','Botas do Caminhante','armor','comum','{"bonus":{"destreza":1}}',NULL,30),
('capa-iniciante','Capa do Iniciante','armor','comum','{"bonus":{"carisma":1}}',NULL,15),
('anel-bronze','Anel de Bronze','accessory','comum','{"bonus":{"carisma":1}}',NULL,10),
('anel-vitalidade','Anel da Vitalidade','accessory','incomum','{"bonus":{"constituicao":2}}','vitalidade',120),
('colar-madeira','Colar de Madeira','accessory','comum','{"bonus":{"sabedoria":1}}',NULL,12);

INSERT INTO public.locations (id, name, region, biome)
VALUES
('cidade-inicial','Cidade Inicial','Planície do Leste','urbano'),
('floresta-dos-ecos','Floresta dos Ecos','Terras Verdes','floresta'),
('montanha-sombria','Montanha Sombria','Norte Gélido','montanha'),
('porto-das-brumas','Porto das Brumas','Costa Oeste','litoral'),
('deserto-dourado','Deserto Dourado','Sul Árido','deserto');

INSERT INTO public.missions (id, title, description, difficulty, recommended_level, rewards, is_epic)
VALUES
('primeiros-passos','Primeiros Passos','Aprenda o básico com o Mestre da Guilda','facil',1,'{"xp":50,"gold":20}',false),
('caca-ao-lobo','Caça ao Lobo','Derrote lobos na Floresta dos Ecos','medio',3,'{"xp":120,"gold":45,"items":[{"id":"anel-bronze","qty":1}]}',false),
('entrega-urgente','Entrega Urgente','Leve suprimentos ao Porto das Brumas','facil',2,'{"xp":80,"gold":30}',false),
('ruinas-antigas','Explorar Ruínas Antigas','Investigue ruínas na Montanha Sombria','dificil',6,'{"xp":250,"gold":100,"items":[{"id":"anel-vitalidade","qty":1}]}',false);

INSERT INTO public.npcs (id, name, role)
VALUES
('ferreiro-alden','Ferreiro Alden','blacksmith'),
('mestre-guilda-liora','Mestre da Guilda Liora','guild_master'),
('treinador-borin','Treinador Borin','trainer'),
('mercador-silas','Mercador Silas','merchant'),
('curandeira-elyra','Curandeira Elyra','healer');

INSERT INTO public.mission_locations (mission_id, location_id)
VALUES
('primeiros-passos','cidade-inicial'),
('caca-ao-lobo','floresta-dos-ecos'),
('entrega-urgente','porto-das-brumas'),
('ruinas-antigas','montanha-sombria');

INSERT INTO public.npc_locations (npc_id, location_id)
VALUES
('ferreiro-alden','cidade-inicial'),
('mestre-guilda-liora','cidade-inicial'),
('treinador-borin','cidade-inicial'),
('mercador-silas','porto-das-brumas'),
('curandeira-elyra','cidade-inicial');