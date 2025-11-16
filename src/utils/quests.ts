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
    baseReward: { gold: 30, xp: 20, glory: 2 },
    modifiers: ['neblina', 'bandidos', 'tempo-ruim']
  },
  {
    id: 'contrato-escolta',
    titleTemplate: 'Escolta de {npc}',
    descriptionTemplate: 'Proteja {npc} durante a viagem até {location}. Há relatos de {threat} na região.',
    type: 'contrato',
    baseReward: { gold: 50, xp: 35, glory: 3 },
    enemies: [{ type: 'Bandido', count: 2 }]
  },

  // CAÇA (Derrotar inimigos)
  {
    id: 'caca-lobos',
    titleTemplate: 'Perigo na {location}',
    descriptionTemplate: 'Uma matilha de {enemy} está aterrorizando {location}. Derrote {count} deles.',
    type: 'caca',
    baseReward: { gold: 40, xp: 30, glory: 2 },
    enemies: [{ type: 'Lobo', count: 3 }]
  },
  {
    id: 'caca-goblins',
    titleTemplate: 'Invasão Goblin',
    descriptionTemplate: 'Goblins estão saqueando {location}. Elimine {count} invasores.',
    type: 'caca',
    baseReward: { gold: 60, xp: 45, glory: 3 },
    enemies: [{ type: 'Goblin', count: 4 }]
  },

  // EXPLORAÇÃO (Encontrar/Descobrir)
  {
    id: 'exploracao-artefato',
    titleTemplate: 'Artefato Perdido',
    descriptionTemplate: 'Encontre o {artifact} perdido nas {location}. Dizem que está guardado por {guardian}.',
    type: 'exploracao',
    baseReward: { gold: 80, xp: 60, glory: 4, arcaneEssence: 1, items: [{ id: 'pocao-media', qty: 1 }] },
    enemies: [{ type: 'Esqueleto', count: 2 }]
  },
  {
    id: 'exploracao-mapa',
    titleTemplate: 'Mapeamento de {location}',
    descriptionTemplate: 'Explore e mapeie a região de {location}. Registre pontos de interesse e perigos.',
    type: 'exploracao',
    baseReward: { gold: 70, xp: 50, glory: 3 }
  },

  // HISTÓRIA (Ramificada)
  {
    id: 'historia-misterio',
    titleTemplate: 'Mistério em {location}',
    descriptionTemplate: 'Estranhos eventos ocorrem em {location}. Investigue e descubra a verdade.',
    type: 'historia',
    baseReward: { gold: 100, xp: 80, glory: 5, arcaneEssence: 1, items: [{ id: 'pergaminho-xp', qty: 1 }] }
  }
];

// === TEMPLATES DE MISSÕES DE COMPANHEIROS (GUILDA) ===
const COMPANION_GUILD_TEMPLATES: QuestTemplate[] = [
  {
    id: 'guild-treinar-mascote',
    titleTemplate: 'Treinar o Mascote com {npc}',
    descriptionTemplate: 'Participe de treinos supervisionados em {location} com {npc}. Aumente a experiência do seu mascote.',
    type: 'caca',
    baseReward: { gold: 40, xp: 35, glory: 3, items: [{ id: 'racao-basica', qty: 2 }, { id: 'pedra-alma', qty: 1 }] }
  },
  {
    id: 'guild-capturar-criatura',
    titleTemplate: 'Capturar uma Criatura Jovem em {location}',
    descriptionTemplate: 'Localize e capture uma criatura jovem com a ajuda de {npc}. Traga o espécime para estudo.',
    type: 'exploracao',
    baseReward: { gold: 60, xp: 50, glory: 4, arcaneEssence: 1, items: [{ id: 'essencia-vinculo', qty: 1 }] }
  },
  {
    id: 'guild-acalmar-fera',
    titleTemplate: 'Acalmar uma Fera Selvagem perto de {location}',
    descriptionTemplate: 'Aproxime-se com cuidado e acalme a fera sob orientação de {npc}. Evite confrontos desnecessários.',
    type: 'caca',
    baseReward: { gold: 70, xp: 55, glory: 4, items: [{ id: 'racao-deluxe', qty: 1 }] },
    enemies: [{ type: 'Lobo', count: 1 }]
  },
  {
    id: 'guild-essencia-bestial',
    titleTemplate: 'Encontrar a Essência Bestial em {location}',
    descriptionTemplate: 'Explore ruínas e cavernas antigas com {npc} para recuperar a Essência Bestial.',
    type: 'exploracao',
    baseReward: { gold: 90, xp: 70, glory: 5, arcaneEssence: 1, items: [{ id: 'essencia-bestial', qty: 1 }] }
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
    timeLimit: 3 // 3 minutos (ajuste para testes)
  },
  padrao: {
    goldMultiplier: 1.0,
    xpMultiplier: 1.0,
    enemyCountMultiplier: 1.0,
    timeLimit: 3 // 3 minutos (ajuste para testes)
  },
  epica: {
    goldMultiplier: 1.5,
    xpMultiplier: 1.8,
    enemyCountMultiplier: 1.4,
    timeLimit: 3 // 3 minutos (ajuste para testes)
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
    items: baseReward.items,
    glory: baseReward.glory ? Math.floor(baseReward.glory * modifier.goldMultiplier) : undefined,
    arcaneEssence: baseReward.arcaneEssence ? Math.floor(baseReward.arcaneEssence * modifier.goldMultiplier) : undefined
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
  const template = isGuildQuest ? getRandomElement(COMPANION_GUILD_TEMPLATES) : getRandomElement(QUEST_TEMPLATES);
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
  
  const quest = {
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
    failurePenalty: difficulty === 'epica' ? { gold: 20, reputation: -5 } : undefined,
    templateId: template.id,
    categoryHint: template.id === 'contrato-escolta' ? 'escolta' : (template.type === 'caca' ? 'controle' : (template.type === 'exploracao' ? 'coleta' : undefined)),
    biomeHint: (() => {
      const loc = variables.location;
      if (loc === 'Ruínas Antigas') return 'Ruínas Antigas';
      if (loc === 'Cavernas Profundas') return 'Caverna Antiga';
      if (loc === 'Floresta Encantada') return 'Floresta Nebulosa';
      if (loc === 'Bosque Sombrio') return 'Floresta Umbral';
      if (loc === 'Montanhas Geladas') return 'Colinas de Boravon';
      if (loc === 'Porto dos Ventos' || loc === 'Rio Marfim') return 'Rio Marfim';
      return 'Floresta Nebulosa';
    })(),
    phasesHint: difficulty === 'rapida' ? 2 : difficulty === 'epica' ? 4 : 3,
    baseRewardsHint: { xp: rewards.xp, gold: rewards.gold }
  };
  
  if (isGuildQuest) {
    console.log('🏰 Missão de guilda gerada:', quest.title, '- Dificuldade:', difficulty);
  }
  
  return quest;
}

export function generateQuestBoard(heroLevel: number = 1, guildLevel: number = 0): Quest[] {
  console.log('🎯 generateQuestBoard chamada:', { heroLevel, guildLevel });
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
  console.log('🏰 Verificando missões de guilda - guildLevel:', guildLevel);
  if (guildLevel > 0) {
    console.log('✅ Gerando missão de guilda padrão');
    quests.push(generateQuest('padrao', heroLevel, true));
    if (guildLevel >= 3) {
      console.log('✅ Gerando missão de guilda épica');
      quests.push(generateQuest('epica', heroLevel, true));
    }
  } else {
    console.log('❌ Nenhuma missão de guilda gerada - guildLevel é 0');
  }
  
  const guildQuests = quests.filter(q => q.isGuildQuest);
  console.log('📋 Missões geradas:', {
    total: quests.length,
    guildQuests: guildQuests.length,
    guildQuestTitles: guildQuests.map(q => q.title)
  });
  
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
  ,
  {
    id: 'amigo-dos-animais',
    title: 'Amigo dos Animais',
    description: 'Complete 5 missões de companheiros da guilda',
    icon: '🐾',
    maxProgress: 5
  },
  {
    id: 'domador-de-feras',
    title: 'Domador de Feras',
    description: 'Coletar 3 Essências Bestiais',
    icon: '🧬',
    maxProgress: 3
  },
  {
    id: 'cavaleiro-mitico',
    title: 'Cavaleiro Mítico',
    description: 'Encontrar 2 Pergaminhos de Montaria',
    icon: '📜',
    maxProgress: 2
  }
];
