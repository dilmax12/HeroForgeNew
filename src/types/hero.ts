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
export type ItemRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'cosmetic' | 'material';

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
  factions: Record<FactionId, {
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
  sticky?: boolean; // manter visível entre atualizações do quadro
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
  level?: number; // nível do item para precificação dinâmica
  price: number;
  currency?: 'gold' | 'glory' | 'arcaneEssence';
  icon?: string; // Emoji or icon representation
  // Identificador opcional de conjunto. Itens com o mesmo setId podem ativar bônus de set.
  setId?: string;
  bonus?: Partial<HeroAttributes>;
  effects?: {
    hp?: number;
    mp?: number;
    duration?: number; // em minutos para efeitos temporários
    special?: string; // efeitos especiais de encantamento (ex.: lifesteal)
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
  id: FactionId;
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
  claimed?: boolean;
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
  // Nível da guilda (derivado de guildXP, mas armazenado para conveniência)
  level?: number;
  // Papéis dos membros na guilda
  roles?: Record<string, 'lider' | 'oficial' | 'membro'>;
  // Conselho da Guilda: membros com Rank S
  councilMembers?: string[];
  // Políticas ativas da guilda (buffs e eventos)
  policies?: {
    xpBuffPercent?: number;
    trainingDiscountPercent?: number;
    activeEventName?: string;
    eventExpiresAt?: string; // ISO
    lastEventActivatedAt?: string; // ISO, para cooldown
  };
  // Solicitações de alianças de parties aguardando aprovação do Conselho
  pendingAlliances?: {
    id: string;
    partyId: string;
    partyName: string;
    requestedBy: string; // heroId
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string; // ISO
    decidedAt?: string; // ISO
    decidedBy?: string; // council member id
  }[];
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
  glory?: number; // Moeda avançada (rankings/eventos)
  arcaneEssence?: number; // Drop raro de chefes
  reputation: number;
  titles: string[]; // IDs dos títulos conquistados
  achievements: Achievement[];
  stars?: number; // Estrelas acumuladas por level up
  guildId?: string;
  partyId?: string;
  fatigue?: number; // Fadiga acumulada por treinos
}

export interface HeroInventory {
  items: { [itemId: string]: number }; // itemId -> quantidade
  equippedWeapon?: string;
  equippedArmor?: string;
  equippedAccessory?: string;
  upgrades?: { [itemId: string]: number }; // níveis de aprimoramento por item
  refined?: { [itemId: string]: ItemRarity }; // raridade refinada por item equipado
  enchantments?: { [itemId: string]: { special?: string } }; // encantos aplicados por item
  customItems?: { [itemId: string]: Item }; // itens gerados por forja/fusão
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
  attributePoints?: number;
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
    // Streak de metas diárias: incrementa ao menos uma meta concluída por dia
    dailyCompletionStreak?: number;
    lastDailyCompletion?: Date | string;
    // Limite diário de treinos
    trainingsToday?: number;
    lastTrainingDate?: string; // ISO string
    trainingDailyLimit?: number; // padrão: 5
    // Status de treino ativo (para HUD)
    trainingActiveUntil?: string; // ISO de término do treino atual
    trainingActiveName?: string; // nome da opção de treino ativa
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
  // Capítulos da Jornada (persistentes)
  journeyChapters?: JourneyChapter[];
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
  leaderId?: string;
  invites?: string[]; // hero IDs convidados que ainda não aceitaram
}

// === Tipos de Capítulos da Jornada ===
export interface JourneyChapter {
  id: string;
  index: number; // 1..5
  title: string;
  summary: string;
  createdAt: string;
  levelMilestone: number; // 4,8,12,16,20
  locked: boolean; // registro fixo após criação
  relatedQuests?: string[]; // IDs de quests relacionadas
}

// Sistema de convites/indicações
export interface ReferralInvite {
  id: string;
  code: string; // código único compartilhável
  inviterHeroId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'expired';
  acceptedHeroId?: string;
  acceptedAt?: string;
  rewardGranted?: boolean;
}
