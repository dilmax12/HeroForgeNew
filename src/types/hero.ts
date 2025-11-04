/**
 * Tipos relacionados ao sistema de heróis
 */

import { HeroRankData } from './ranks';

export type Attribute = 'forca' | 'destreza' | 'constituicao' | 'inteligencia' | 'sabedoria' | 'carisma';

export type HeroClass = 'guerreiro' | 'mago' | 'ladino' | 'clerigo' | 'patrulheiro' | 'paladino' | 'arqueiro';

export type HeroRace = 'humano' | 'elfo' | 'anao' | 'orc' | 'halfling';

export type Element = 'fire' | 'ice' | 'thunder' | 'earth' | 'light' | 'dark' | 'physical';

export type SkillType = 'attack' | 'buff' | 'support';

export type SkillTarget = 'single' | 'aoe' | 'self' | 'ally';

export type Alignment = 'leal-bom' | 'neutro-bom' | 'caotico-bom' | 
                        'leal-neutro' | 'neutro-puro' | 'caotico-neutro' | 
                        'leal-mal' | 'neutro-mal' | 'caotico-mal';

// === NOVOS TIPOS PARA O SISTEMA ÉPICO ===

export type QuestType = 'contrato' | 'caca' | 'exploracao' | 'historia' | 'narrative';
export type QuestDifficulty = 'rapida' | 'padrao' | 'epica' | 'facil' | 'medio' | 'dificil';
export type ItemRarity = 'comum' | 'raro' | 'epico' | 'lendario';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'cosmetic';

// === NOVOS TIPOS PARA SISTEMA DE DECISÕES E MUNDO ===

export interface DecisionLogEntry {
  id: string;
  heroId: string;
  questId: string;
  choiceId: string;
  choiceText: string;
  timestamp: string;
  impact: {
    immediate: {
      gold?: number;
      xp?: number;
      reputation?: Record<string, number>;
      items?: string[];
    };
    longTerm: {
      npcRelations?: Record<string, number>;
      worldEvents?: string[];
      futureQuestUnlocks?: string[];
      futureQuestBlocks?: string[];
    };
  };
  rollResult?: {
    roll: number;
    modifiers: number;
    threshold: number;
    success: boolean;
  };
}

export interface WorldState {
  factions: Record<string, {
    reputation: number;
    alliances: string[];
    enemies: string[];
    influence: number; // 0-100
  }>;
  activeEvents: string[];
  npcStatus: Record<string, {
    alive: boolean;
    relationToPlayer: number; // -100 a +100
    lastInteraction?: string;
    currentLocation?: string;
    questsAvailable?: string[];
  }>;
  decisionLog: DecisionLogEntry[];
  worldEvents: {
    id: string;
    name: string;
    description: string;
    active: boolean;
    startDate: string;
    endDate?: string;
    effects: {
      lootMultiplier?: number;
      xpMultiplier?: number;
      specialEnemies?: boolean;
      rareQuestChance?: number;
    };
  }[];
  locations: Record<string, {
    discovered: boolean;
    reputation: number;
    specialEvents?: string[];
    questsCompleted: number;
  }>;
}

export interface QuestChoiceEffect {
  type: 'gold' | 'xp' | 'reputation' | 'item' | 'npc_relation' | 'world_event' | 'spawn_enemy';
  target?: string; // faction, npc, item id, etc.
  value?: number;
  probability?: number; // 0-1, chance do efeito acontecer
  description?: string;
}

export interface EnhancedQuestChoice {
  id: string;
  text: string;
  description: string;
  riskThreshold?: number; // 0-100, dificuldade do roll
  rollModifiers?: {
    attribute?: Attribute;
    multiplier?: number;
    bonus?: number;
  };
  successEffects: QuestChoiceEffect[];
  failureEffects?: QuestChoiceEffect[];
  requirements?: {
    level?: number;
    class?: HeroClass;
    reputation?: Record<string, number>;
    items?: string[];
    previousChoices?: string[]; // IDs de escolhas anteriores necessárias
  };
}

export interface QuestReward {
  gold: number;
  xp: number;
  items?: QuestItem[];
}

export interface QuestItem {
  id: string;
  qty: number;
}

export interface QuestEnemy {
  type: string;
  count: number;
  level?: number;
}

export interface QuestChoice {
  id: string;
  text: string;
  description: string;
  consequences: {
    reputation?: number;
    gold?: number;
    xp?: number;
    items?: string[];
    risk?: number; // 0-100, chance de falha
    reputationChanges?: Record<string, number>;
  };
  requirements?: {
    level?: number;
    class?: HeroClass;
    reputation?: number;
    items?: string[];
  };
}

// Versão aprimorada para o novo sistema
export interface EnhancedQuest extends Omit<Quest, 'choices'> {
  enhancedChoices?: EnhancedQuestChoice[];
  storySeeds?: {
    context: string;
    tone: string;
    previousDecisions?: string[];
  };
  worldStateRequirements?: {
    factionReputation?: Record<string, number>;
    npcStatus?: Record<string, boolean>;
    completedQuests?: string[];
  };
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  levelRequirement: number;
  timeLimit?: number; // em minutos
  enemies?: QuestEnemy[];
  rewards: QuestReward;
  repeatable: boolean;
  isGuildQuest?: boolean;
  failurePenalty?: {
    gold?: number;
    reputation?: number;
  };
  // Novos campos para missões narrativas
  hasChoices?: boolean;
  choices?: QuestChoice[];
  choiceMade?: string; // ID da escolha feita
  narrative?: {
    intro: string;
    situation: string;
    outcome?: string;
  };
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  cost: number; // mana/energia
  basePower?: number; // para ataques
  duration?: number; // para buffs em turnos
  cooldown?: number; // em turnos
  element?: Element;
  target: SkillTarget;
  effects?: {
    heal?: number;
    buff?: {
      attribute?: keyof HeroAttributes;
      value?: number;
      percentage?: number;
    };
    debuff?: {
      attribute?: keyof HeroAttributes;
      value?: number;
      percentage?: number;
    };
    special?: string; // efeitos especiais como teleporte, confusão, etc.
  };
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  price: number;
  icon?: string; // Emoji or icon representation
  bonus?: Partial<HeroAttributes>;
  effects?: {
    hp?: number;
    mp?: number;
    duration?: number; // em minutos para efeitos temporários
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  rewards: {
    xp?: number;
    gold?: number;
    items?: Item[];
    title?: string;
  };
}

export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  unlockedAt: Date;
  category: 'combat' | 'exploration' | 'social' | 'achievement' | 'special';
  badge?: string; // Emoji ou ícone
}

export interface ReputationFaction {
  id: string;
  name: string;
  reputation: number; // -1000 a +1000
  level: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'honored' | 'revered';
}

export interface DailyGoal {
  id: string;
  description: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  rewards: {
    xp: number;
    gold: number;
    items?: Item[];
  };
  expiresAt: Date;
}

export interface WorldEvent {
  id: string;
  name: string;
  description: string;
  type: 'loot_bonus' | 'xp_bonus' | 'special_enemies' | 'rare_quests';
  modifier: number; // Multiplicador ou bônus
  startDate: Date;
  endDate: Date;
  active: boolean;
}

export interface LeaderboardEntry {
  heroId: string;
  heroName: string;
  heroClass: string;
  heroRace: string;
  value: number;
  rank: number;
  change: number; // Mudança de posição desde a última atualização
  lastUpdated: Date;
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  type: 'xp' | 'gold' | 'quests' | 'achievements' | 'reputation' | 'playtime';
  entries: LeaderboardEntry[];
  lastUpdated: Date;
  season?: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
}

export interface RankingSystem {
  globalRank: number;
  classRank: number;
  weeklyRank: number;
  seasonRank?: number;
  achievements: number;
  totalScore: number;
}

export interface Guild {
  id: string;
  name: string;
  description: string;
  members: string[]; // hero IDs
  guildXP: number;
  bankGold: number;
  createdAt: string;
  quests: Quest[];
}

export interface CombatResult {
  victory: boolean;
  damage: number;
  xpGained: number;
  goldGained: number;
  itemsGained: Item[];
  log: string[];
}

// === INTERFACES EXPANDIDAS ===

export interface HeroAttributes {
  forca: number;
  destreza: number;
  constituicao: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;
}

export interface DerivedAttributes {
  hp: number;
  mp: number;
  initiative: number;
  armorClass: number;
  currentHp?: number; // HP atual (para combate)
  currentMp?: number; // MP atual
  luck?: number;      // Novo: sorte que afeta rolls, loot e eventos
}

export interface HeroProgression {
  xp: number;
  level: number;
  gold: number;
  reputation: number;
  titles: string[]; // IDs dos títulos conquistados
  achievements: Achievement[];
  guildId?: string;
}

export interface HeroInventory {
  items: { [itemId: string]: number }; // itemId -> quantidade
  equippedWeapon?: string;
  equippedArmor?: string;
  equippedAccessory?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  attribute: Attribute;
  trained: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable';
  bonus?: Partial<HeroAttributes>;
  description: string;
}

export interface Hero {
  id: string;
  name: string;
  race: HeroRace;
  class: HeroClass;
  level: number;
  alignment: Alignment;
  background: string;
  attributes: HeroAttributes;
  derivedAttributes: DerivedAttributes;
  progression: HeroProgression;
  inventory: HeroInventory;
  element: Element;
  skills: Skill[];
  image?: string;
  battleQuote?: string;
  avatar?: string;
  backstory?: string;
  shortBio?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  
  // Missões ativas
  activeQuests: string[]; // Quest IDs
  completedQuests: string[]; // Quest IDs
  
  // Estatísticas para playtest
  stats: {
    questsCompleted: number;
    totalCombats: number;
    totalPlayTime: number; // em minutos
    lastActiveAt: string; // ISO string
    enemiesDefeated: number;
    goldEarned: number;
    itemsFound: number;
    achievementsUnlocked: number;
    loginStreak: number;
    lastLogin: Date;
  };
  
  // Advanced Features
  titles: Title[];
  activeTitle?: string; // ID do título ativo
  reputationFactions: ReputationFaction[];
  dailyGoals: DailyGoal[];
  achievements: Achievement[];
  
  // Rank System v2.2
  rankData: HeroRankData;
  
  // === SISTEMA DE MUNDO E DECISÕES ===
  worldState?: WorldState;
  stamina?: {
    current: number;
    max: number;
    lastRecovery: string; // ISO timestamp
    recoveryRate: number; // pontos por hora
  };
}

export interface HeroCreationData {
  name: string;
  race: HeroRace;
  class: HeroClass;
  alignment: Alignment;
  background: string;
  attributes: HeroAttributes;
  element: Element;
  skills: Skill[];
  image?: string;
  battleQuote?: string;
  avatar?: string;
  backstory?: string;
  shortBio?: string;
}

export interface Party {
  id: string;
  name: string;
  members: string[]; // hero IDs
  createdAt: string;
  sharedLoot?: boolean;
  sharedXP?: boolean;
}