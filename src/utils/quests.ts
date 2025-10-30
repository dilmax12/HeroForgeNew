/**
 * Sistema de Missões - Geração Procedural e Templates
 */

import { Quest, QuestType, QuestDifficulty, QuestReward, QuestEnemy } from '../types/hero';

// === TEMPLATES DE MISSÕES ===

interface QuestTemplate {
  id: string;
  titleTemplate: string;
  descriptionTemplate: string;
  type: QuestType;
  baseReward: QuestReward;
  enemies?: QuestEnemy[];
  modifiers?: string[];
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  // CONTRATOS (Entrega/Escolta)
  {
    id: 'contrato-entrega',
    titleTemplate: 'Entrega para {location}',
    descriptionTemplate: 'Leve esta {item} para {npc} em {location}. Cuidado com {threat} no caminho.',
    type: 'contrato',
    baseReward: { gold: 30, xp: 20 },
    modifiers: ['neblina', 'bandidos', 'tempo-ruim']
  },
  {
    id: 'contrato-escolta',
    titleTemplate: 'Escolta de {npc}',
    descriptionTemplate: 'Proteja {npc} durante a viagem até {location}. Há relatos de {threat} na região.',
    type: 'contrato',
    baseReward: { gold: 50, xp: 35 },
    enemies: [{ type: 'Bandido', count: 2 }]
  },

  // CAÇA (Derrotar inimigos)
  {
    id: 'caca-lobos',
    titleTemplate: 'Perigo na {location}',
    descriptionTemplate: 'Uma matilha de {enemy} está aterrorizando {location}. Derrote {count} deles.',
    type: 'caca',
    baseReward: { gold: 40, xp: 30 },
    enemies: [{ type: 'Lobo', count: 3 }]
  },
  {
    id: 'caca-goblins',
    titleTemplate: 'Invasão Goblin',
    descriptionTemplate: 'Goblins estão saqueando {location}. Elimine {count} invasores.',
    type: 'caca',
    baseReward: { gold: 60, xp: 45 },
    enemies: [{ type: 'Goblin', count: 4 }]
  },

  // EXPLORAÇÃO (Encontrar/Descobrir)
  {
    id: 'exploracao-artefato',
    titleTemplate: 'Artefato Perdido',
    descriptionTemplate: 'Encontre o {artifact} perdido nas {location}. Dizem que está guardado por {guardian}.',
    type: 'exploracao',
    baseReward: { gold: 80, xp: 60, items: [{ id: 'pocao-media', qty: 1 }] },
    enemies: [{ type: 'Esqueleto', count: 2 }]
  },
  {
    id: 'exploracao-mapa',
    titleTemplate: 'Mapeamento de {location}',
    descriptionTemplate: 'Explore e mapeie a região de {location}. Registre pontos de interesse e perigos.',
    type: 'exploracao',
    baseReward: { gold: 70, xp: 50 }
  },

  // HISTÓRIA (Ramificada)
  {
    id: 'historia-misterio',
    titleTemplate: 'Mistério em {location}',
    descriptionTemplate: 'Estranhos eventos ocorrem em {location}. Investigue e descubra a verdade.',
    type: 'historia',
    baseReward: { gold: 100, xp: 80, items: [{ id: 'pergaminho-xp', qty: 1 }] }
  }
];

// === DADOS PARA GERAÇÃO PROCEDURAL ===

const LOCATIONS = [
  'Vila do Vale', 'Bosque Sombrio', 'Montanhas Geladas', 'Pântano Negro',
  'Ruínas Antigas', 'Porto dos Ventos', 'Cavernas Profundas', 'Torre Abandonada',
  'Floresta Encantada', 'Deserto Ardente', 'Cidade Perdida', 'Cemitério Assombrado'
];

const NPCS = [
  'Mercador Aldric', 'Sábia Elara', 'Ferreiro Gorin', 'Curandeira Mira',
  'Capitão Theron', 'Escriba Lysander', 'Caçador Kael', 'Bruxa Morgana'
];

const ITEMS = [
  'carta importante', 'poção rara', 'mapa antigo', 'gema preciosa',
  'pergaminho mágico', 'relíquia sagrada', 'chave misteriosa', 'amuleto protetor'
];

const ARTIFACTS = [
  'Orbe de Cristal', 'Espada Élfica', 'Anel dos Antigos', 'Cajado do Poder',
  'Escudo Sagrado', 'Coroa Perdida', 'Livro dos Segredos', 'Cálice Dourado'
];

const THREATS = [
  'bandidos', 'lobos famintos', 'espíritos inquietos', 'goblins selvagens',
  'trolls das montanhas', 'serpentes venenosas', 'mortos-vivos', 'dragões jovens'
];

const GUARDIANS = [
  'um golem de pedra', 'esqueletos guerreiros', 'um troll antigo',
  'espíritos guardiões', 'uma hidra menor', 'gárgulas de pedra'
];

// === MODIFICADORES DE DIFICULDADE ===

const DIFFICULTY_MODIFIERS = {
  rapida: {
    goldMultiplier: 0.7,
    xpMultiplier: 0.8,
    enemyCountMultiplier: 0.7,
    timeLimit: 30 // 30 minutos
  },
  padrao: {
    goldMultiplier: 1.0,
    xpMultiplier: 1.0,
    enemyCountMultiplier: 1.0,
    timeLimit: 60 // 1 hora
  },
  epica: {
    goldMultiplier: 1.5,
    xpMultiplier: 1.8,
    enemyCountMultiplier: 1.4,
    timeLimit: 120 // 2 horas
  }
};

// === FUNÇÕES DE GERAÇÃO ===

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
}

function applyDifficultyModifier(baseReward: QuestReward, difficulty: QuestDifficulty): QuestReward {
  const modifier = DIFFICULTY_MODIFIERS[difficulty];
  
  return {
    gold: Math.floor(baseReward.gold * modifier.goldMultiplier),
    xp: Math.floor(baseReward.xp * modifier.xpMultiplier),
    items: baseReward.items
  };
}

function generateEnemies(baseEnemies: QuestEnemy[] = [], difficulty: QuestDifficulty): QuestEnemy[] {
  const modifier = DIFFICULTY_MODIFIERS[difficulty];
  
  return baseEnemies.map(enemy => ({
    ...enemy,
    count: Math.max(1, Math.floor(enemy.count * modifier.enemyCountMultiplier)),
    level: difficulty === 'rapida' ? 1 : difficulty === 'padrao' ? 2 : 3
  }));
}

export function generateQuest(
  difficulty: QuestDifficulty = 'padrao',
  heroLevel: number = 1,
  isGuildQuest: boolean = false
): Quest {
  const template = getRandomElement(QUEST_TEMPLATES);
  const modifier = DIFFICULTY_MODIFIERS[difficulty];
  
  // Variáveis para interpolação
  const variables = {
    location: getRandomElement(LOCATIONS),
    npc: getRandomElement(NPCS),
    item: getRandomElement(ITEMS),
    artifact: getRandomElement(ARTIFACTS),
    threat: getRandomElement(THREATS),
    guardian: getRandomElement(GUARDIANS),
    enemy: template.enemies?.[0]?.type || 'Inimigo',
    count: template.enemies?.[0]?.count.toString() || '1'
  };
  
  // Gerar ID único
  const questId = `quest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Aplicar modificadores
  const rewards = applyDifficultyModifier(template.baseReward, difficulty);
  const enemies = template.enemies ? generateEnemies(template.enemies, difficulty) : undefined;
  
  return {
    id: questId,
    title: interpolateTemplate(template.titleTemplate, variables),
    description: interpolateTemplate(template.descriptionTemplate, variables),
    type: template.type,
    difficulty,
    levelRequirement: Math.max(1, heroLevel - 1),
    timeLimit: modifier.timeLimit,
    enemies,
    rewards,
    repeatable: template.type === 'caca' || template.type === 'contrato',
    isGuildQuest,
    failurePenalty: difficulty === 'epica' ? { gold: 20, reputation: -5 } : undefined
  };
}

export function generateQuestBoard(heroLevel: number = 1, guildLevel: number = 0): Quest[] {
  const quests: Quest[] = [];
  
  // 2 missões rápidas
  quests.push(generateQuest('rapida', heroLevel));
  quests.push(generateQuest('rapida', heroLevel));
  
  // 3 missões padrão
  quests.push(generateQuest('padrao', heroLevel));
  quests.push(generateQuest('padrao', heroLevel));
  quests.push(generateQuest('padrao', heroLevel));
  
  // 1 missão épica
  quests.push(generateQuest('epica', heroLevel));
  
  // Missões de guilda (se aplicável)
  if (guildLevel > 0) {
    quests.push(generateQuest('padrao', heroLevel, true));
    if (guildLevel >= 3) {
      quests.push(generateQuest('epica', heroLevel, true));
    }
  }
  
  return quests;
}

// === SISTEMA DE ACHIEVEMENTS RELACIONADOS A MISSÕES ===

export const QUEST_ACHIEVEMENTS = [
  {
    id: 'primeira-missao',
    title: 'Primeira Missão',
    description: 'Complete sua primeira missão',
    icon: '🎯',
    maxProgress: 1
  },
  {
    id: 'heroi-da-vila',
    title: 'Herói da Vila',
    description: 'Complete 10 missões',
    icon: '🏆',
    maxProgress: 10
  },
  {
    id: 'cacador-experiente',
    title: 'Caçador Experiente',
    description: 'Complete 5 missões de caça',
    icon: '🏹',
    maxProgress: 5
  },
  {
    id: 'explorador-corajoso',
    title: 'Explorador Corajoso',
    description: 'Complete 3 missões de exploração',
    icon: '🗺️',
    maxProgress: 3
  },
  {
    id: 'lenda-epica',
    title: 'Lenda Épica',
    description: 'Complete uma missão épica',
    icon: '⚔️',
    maxProgress: 1
  }
];