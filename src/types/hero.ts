/**
 * Tipos relacionados ao sistema de heróis
 */

import { HeroRankData } from './ranks';

export type Attribute = 'forca' | 'destreza' | 'constituicao' | 'inteligencia' | 'sabedoria' | 'carisma';

export type HeroClass = 'guerreiro' | 'mago' | 'ladino' | 'clerigo' | 'patrulheiro' | 'paladino';

export type HeroRace = 'humano' | 'elfo' | 'anao' | 'orc' | 'halfling';

export type Alignment = 'leal-bom' | 'neutro-bom' | 'caotico-bom' | 
                        'leal-neutro' | 'neutro-puro' | 'caotico-neutro' | 
                        'leal-mal' | 'neutro-mal' | 'caotico-mal';

// === NOVOS TIPOS PARA O SISTEMA ÉPICO ===

export type QuestType = 'contrato' | 'caca' | 'exploracao' | 'historia';
export type QuestDifficulty = 'rapida' | 'padrao' | 'epica';
export type ItemRarity = 'comum' | 'raro' | 'epico' | 'lendario';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'cosmetic';

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

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  price: number;
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
}

export interface HeroCreationData {
  name: string;
  race: HeroRace;
  class: HeroClass;
  alignment: Alignment;
  background: string;
  attributes: HeroAttributes;
  avatar?: string;
  backstory?: string;
  shortBio?: string;
}