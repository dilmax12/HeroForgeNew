/**
 * Tipos relacionados ao sistema de heróis
 */

import { HeroRankData } from './ranks';

export type Attribute = 'forca' | 'destreza' | 'constituicao' | 'inteligencia' | 'sabedoria' | 'carisma';

export type HeroClass =
  | 'guerreiro'
  | 'mago'
  | 'ladino'
  | 'clerigo'
  | 'patrulheiro'
  | 'paladino'
  | 'arqueiro'
  | 'bardo'
  | 'monge'
  | 'assassino'
  | 'barbaro'
  | 'lanceiro'
  | 'druida'
  | 'feiticeiro';

export type HeroRace = 'humano' | 'elfo' | 'anao' | 'orc' | 'halfling';

export type Element = 'fire' | 'water' | 'earth' | 'air' | 'thunder' | 'light' | 'dark' | 'physical';

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
// Sistema de Mascotes e Ovos
export type EggRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'mistico';
export type EggStatus = 'misterioso' | 'identificado' | 'incubando' | 'pronto_para_chocar' | 'chocado';
export type PetElementType = 'feral' | 'arcano' | 'sagrado' | 'sombrio';
export type PetClass = 'coleta' | 'combate' | 'suporte';
export type PetStage = 'bebe' | 'jovem' | 'adulto' | 'forma_final';

export interface EggIdentifiedInfo {
  type: PetElementType;
  petClass: PetClass;
  rarity: EggRarity;
  initialBonus?: Partial<HeroAttributes>;
  skillChancePercent?: number; // 0-100
  revealedName?: string; // ex.: "Ovo Feral Raro"
  candidates?: string[];
}

export interface Egg {
  id: string;
  name: string;
  status: EggStatus;
  baseRarity: EggRarity; // raridade antes da identificação
  description?: string;
  identified?: EggIdentifiedInfo;
  incubationEndsAt?: string; // ISO
  incubatingSlot?: number; // 0..2
  createdAt: string; // ISO
}

export interface PetMutationInfo {
  variant?: 'albino' | 'sombrio_corrupto' | 'arcano_puro' | 'feral_brutal' | 'sagrado';
  visualBadge?: string; // ex.: '✨', '🌑', etc.
}

export interface Pet {
  id: string;
  name: string;
  type: PetElementType;
  petClass: PetClass;
  rarity: EggRarity;
  qualityRoll: number; // 0-100 dentro da raridade
  level: number;
  stage: PetStage;
  mutation?: PetMutationInfo;
  attributes?: Partial<HeroAttributes>;
  exclusiveSkill?: string;
  refineLevel?: number;
  energy?: number;
  createdAt: string; // ISO
}

export type MountRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'mistico';
export type MountStage = 'comum' | 'encantada' | 'lendaria';

export interface Mount {
  id: string;
  name: string;
  type: 'cavalo' | 'lobo' | 'grifo' | 'javali' | 'lagarto' | 'draconiano' | 'urso' | 'felino' | 'cervo' | 'alce' | 'hipogrifo' | 'rinoceronte' | 'wyvern';
  rarity: MountRarity;
  stage: MountStage;
  speedBonus: number;
  attributes?: Partial<HeroAttributes>;
  refineLevel?: number;
  mastery?: number;
  locked?: boolean;
  note?: string;
  rewardTier?: number;
  history?: { ts: string; action: 'obtain' | 'evolve' | 'refine' | 'train' | 'activate' | 'deactivate' | 'favorite_set' | 'favorite_removed' | 'release' | 'buy_offer'; details?: string }[];
  createdAt: string;
}

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
  glory?: number;
  arcaneEssence?: number;
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
  templateId?: string;
  categoryHint?: 'controle' | 'coleta' | 'escolta' | 'especial';
  biomeHint?: string;
  phasesHint?: number;
  baseRewardsHint?: { xp: number; gold: number };
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
  requirements?: {
    minLevel?: number;
    classAllow?: HeroClass[];
    classDeny?: HeroClass[];
  };
  slot?: 'mainHand' | 'offHand' | 'helm' | 'chest' | 'belt' | 'gloves' | 'boots' | 'cape' | 'ring' | 'necklace' | 'earring';
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
  rarity: 'comum' | 'raro' | 'epico' | 'lendario' | 'especial';
  unlockedAt: Date;
  category: 'combat' | 'exploration' | 'social' | 'achievement' | 'special';
  badge?: string; // Emoji ou ícone
  favorite?: boolean;
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
    glory?: number;
    arcaneEssence?: number;
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
  isNPC?: boolean;
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
  petEnergyUsed?: number;
  petDamage?: number;
  petHealing?: number;
  petStuns?: number;
  petElementHighlights?: Element[];
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
  power: number;
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
  equippedWeapons?: string[];
  equippedArmorSlots?: string[];
  equippedAccessories?: string[];
  equippedMainHand?: string;
  equippedOffHand?: string;
  equippedHelm?: string;
  equippedChest?: string;
  equippedBelt?: string;
  equippedGloves?: string;
  equippedBoots?: string;
  equippedCape?: string;
  equippedRingLeft?: string;
  equippedRingRight?: string;
  equippedNecklace?: string;
  equippedEarringLeft?: string;
  equippedEarringRight?: string;
  upgrades?: { [itemId: string]: number }; // níveis de aprimoramento por item
  refined?: { [itemId: string]: ItemRarity }; // raridade refinada por item equipado
  enchantments?: { [itemId: string]: { special?: string } }; // encantos aplicados por item
  customItems?: { [itemId: string]: Item }; // itens gerados por forja/fusão
  jewels?: { [jewelKey: string]: number };
  equippedJewelsByItemId?: { [itemId: string]: string[] };
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
  plannedTalents?: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  origin?: 'player' | 'npc';
  controlledByAI?: boolean;
  socialRelations?: Record<string, number>;
  npcPersonality?: {
    archetype: 'competitivo' | 'colaborativo' | 'mercador' | 'explorador' | 'sabio' | 'caotico';
    traits: string[];
    riskAffinity: number;
    chatStyle: 'amigavel' | 'sarcastico' | 'formal' | 'quieto';
    prefersParty?: boolean;
    likesItems?: string[];
    dislikesItems?: string[];
    rumorPriceBias?: number; // 0.8 barato, 1.2 caro
  };
  npcTier?: 'beginner' | 'intermediate' | 'veteran';
  npcMood?: 'feliz' | 'tranquilo' | 'neutro' | 'estressado' | 'irritado' | 'triste' | 'cansado';
  npcNeeds?: { fadiga: number; fome: number; social: number; aventura: number; tarefa: number };
  npcMemory?: {
    interactions: { heroId: string; ts: string; summary: string; impact?: number }[];
    preferences?: { quests?: string[]; items?: string[]; locations?: string[] };
    scoreByAction?: Record<string, number>;
    friendStatusByHeroId?: Record<string, 'rival' | 'conhecido' | 'amigo' | 'melhor_amigo' | 'aliado'>;
    lastContactByHeroId?: Record<string, string>;
    lastInteractionByType?: Record<string, string>;
    socialNotesByHeroId?: Record<string, string[]>;
  };
  npcRoutine?: { start: string; end: string; activity: string; location?: string }[];
  npcLore?: { passado?: string; objetivo?: string; problema?: string; medo?: string; sonho?: string; unlocked?: string[] };
  
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
    trainingAttemptsByStatus?: Record<string, number>;
    missionRunState?: Record<string, { phase: number; npcIntegrity?: number; running?: boolean; finished?: boolean; logs: Array<{ phase: number; xp: number; gold: number; narrative: string }> }>;
    // Status de treino ativo (para HUD)
    trainingActiveUntil?: string; // ISO de término do treino atual
    trainingActiveName?: string; // nome da opção de treino ativa
    talentsUnlockedPlanned?: number; // progresso de talentos planejados
    companionQuestsCompleted?: number;
    beastEssenceCollected?: number;
    mountScrollsFound?: number;
    suggestedCompanionMissions?: number;
    duelsWon?: number;
    duelsLost?: number;
    duelsPlayed?: number;
    // Mini-jogos
    tavernDiceRolls?: number;
    tavernBestRoll?: number;
    tavernCrits?: number;
    tavernRollDate?: string;
    tavernRollCount?: number;
    tavernRerollDate?: string;
    tavernRerollCount?: number;
    tavernRerollTokens?: number;
    // Cartas
    miniCardsWins?: number;
    miniCardsLosses?: number;
    miniCardsBestScore?: number;
    miniCardsLastDate?: string;
    // Pedra-Papel-Tesoura
    miniRpsWins?: number;
    miniRpsLosses?: number;
    miniRpsStreak?: number;
    miniRpsBestStreak?: number;
    miniRpsLastDate?: string;
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
  // Mascotes e Ovos
  eggs?: Egg[];
  pets?: Pet[];
  hatchHistory?: { eggId: string; petId: string; timestamp: string; rarity?: EggRarity; hatchCost?: number }[];
  activePetId?: string;
  hatchCooldownEndsAt?: string;
  mounts?: Mount[];
  activeMountId?: string;
  favoriteMountId?: string;
  favoriteMountIds?: string[];
  mountBuff?: { speedBonus?: number; expiresAt?: string };
  stableCapacity?: number;
  dungeon?: {
    stamina: { current: number; max: number; lastRecovery: string; recoveryRate: number };
    cooldownEndsAt?: string;
    maxFloor?: number;
    eternalBuffs?: string[];
    rareItemBonusPercent?: number;
    specialSkills?: string[];
    permanentBonusAttributes?: Partial<HeroAttributes>;
  };
  hunting?: {
    cooldownEndsAt?: string;
    lastCompletedAt?: string;
  };
  questing?: {
    cooldownEndsAt?: string;
    lastCompletedAt?: string;
  };
  friends?: string[];
  bestFriends?: string[];
  duelInvites?: { npcId: string; type: 'treino' | 'honra' | 'recompensas'; expiresAt: string; levelDiff: number }[];
}

export interface Party {
  id: string;
  name: string;
  leaderId: string;
  members: string[];
  invites?: string[];
  createdAt: string;
  sharedLoot?: boolean;
  sharedXP?: boolean;
  inviteTerms?: Record<string, { duration: 'one_mission' | 'days'; days?: number; rewardShare?: number; leaderPref?: 'inviter' | 'invitee' | 'none' }>;
  contractByHeroId?: Record<string, { duration: 'one_mission' | 'days'; days?: number; rewardShare: number; leaderPref?: 'inviter' | 'invitee' | 'none' }>;
}

export interface HeroCreationData {
  name: string;
  race: HeroRace;
  class: HeroClass;
  attributes: HeroAttributes;
  element: Element;
  skills: Skill[];
  image?: string;
  battleQuote?: string;
  avatar?: string;
  backstory?: string;
  shortBio?: string;
  plannedTalents?: string[];
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
  expiresAt?: string;
  inviterTag?: string;
  personalizedSlug?: string;
  activity?: { ts: string; action: 'created' | 'shared' | 'accepted' | 'expired' | 'revoked' | 'renewed'; details?: string }[];
}
