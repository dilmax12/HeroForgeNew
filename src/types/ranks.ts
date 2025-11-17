// Sistema de Ranks e Progressão Visual - HeroForge v2.2

export type RankLevel = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface RankInfo {
  level: RankLevel;
  name: string;
  color: string;
  icon: string;
  description: string;
  gradient: string;
  textColor: string;
  glowColor: string;
}

export interface RankThreshold {
  xp: number;
  missions: number;
  titles?: number;
  specialRequirements?: string[];
}

export interface RankReward {
  type: 'visual' | 'gameplay' | 'cosmetic' | 'special';
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface RankProgress {
  currentRank: RankLevel;
  nextRank: RankLevel | null;
  currentXP: number;
  requiredXP: number;
  currentMissions: number;
  requiredMissions: number;
  progressPercentage: number;
  canPromote: boolean;
}

export interface RankHistory {
  rank: RankLevel;
  achievedAt: Date;
  heroLevel: number;
  notableAchievement: string;
  celebrationViewed: boolean;
}

export interface RankCelebration {
  rank: RankLevel;
  title: string;
  message: string;
  rewards: RankReward[];
  animationType: 'ascension' | 'legendary' | 'epic';
  soundEffect: string;
  particleEffect: string;
}

export interface HeroRankData {
  currentRank: RankLevel;
  rankHistory: RankHistory[];
  totalRankPoints: number;
  rankProgress: RankProgress;
  unlockedRewards: RankReward[];
  pendingCelebrations: RankCelebration[];
  rankAchievements: {
    fastestPromotion: number; // dias
    highestRankReached: RankLevel;
    totalPromotions: number;
    legendaryStoriesUnlocked: number;
  };
}

export interface RankComparison {
  heroId: string;
  heroName: string;
  rank: RankLevel;
  level: number;
  totalXP: number;
  missionsCompleted: number;
  rankPoints: number;
  position: number;
}

export interface RankLeaderboard {
  global: RankComparison[];
  byClass: Record<string, RankComparison[]>;
  recent: RankComparison[]; // últimas 24h
  friends: RankComparison[];
}

// Configurações visuais para cada rank
export const RANK_CONFIG: Record<RankLevel, RankInfo> = {
  F: {
    level: 'F',
    name: 'Novato',
    color: '#9CA3AF', // Cinza metálico
    icon: '⚪',
    description: 'Um recém-chegado ao mundo das aventuras.',
    gradient: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-600',
    glowColor: 'shadow-gray-400/50'
  },
  E: {
    level: 'E',
    name: 'Aventureiro',
    color: '#10B981', // Verde esmeralda
    icon: '🟢',
    description: 'Um viajante experiente com pequenas vitórias.',
    gradient: 'from-emerald-400 to-emerald-600',
    textColor: 'text-emerald-600',
    glowColor: 'shadow-emerald-400/50'
  },
  D: {
    level: 'D',
    name: 'Explorador',
    color: '#3B82F6', // Azul safira
    icon: '🔵',
    description: 'Aventureiro constante, conhecido nas tavernas.',
    gradient: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-600',
    glowColor: 'shadow-blue-400/50'
  },
  C: {
    level: 'C',
    name: 'Herói Local',
    color: '#8B5CF6', // Roxo real
    icon: '🟣',
    description: 'Reconhecido em cidades e aldeias.',
    gradient: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-600',
    glowColor: 'shadow-purple-400/50'
  },
  B: {
    level: 'B',
    name: 'Guardião',
    color: '#F59E0B', // Dourado
    icon: '🟡',
    description: 'Um protetor notável, admirado pelo povo.',
    gradient: 'from-amber-400 to-amber-600',
    textColor: 'text-amber-600',
    glowColor: 'shadow-amber-400/50'
  },
  A: {
    level: 'A',
    name: 'Campeão',
    color: '#EF4444', // Vermelho rubi
    icon: '🔴',
    description: 'Herói de elite, famoso em todo o reino.',
    gradient: 'from-red-400 to-red-600',
    textColor: 'text-red-600',
    glowColor: 'shadow-red-400/50'
  },
  S: {
    level: 'S',
    name: 'Lenda Viva',
    color: '#FFD700', // Dourado com brilho
    icon: '⭐',
    description: 'Um mito vivo, símbolo de glória eterna.',
    gradient: 'from-yellow-300 via-yellow-400 to-amber-500',
    textColor: 'text-yellow-600',
    glowColor: 'shadow-yellow-400/75 animate-pulse'
  }
  ,
  SS: {
    level: 'SS',
    name: 'Ícone Imortal',
    color: '#FFE55C',
    icon: '🌟',
    description: 'Além da lenda: referência viva de todos os heróis.',
    gradient: 'from-amber-300 via-amber-400 to-yellow-500',
    textColor: 'text-amber-600',
    glowColor: 'shadow-amber-300/80 animate-pulse'
  },
  SSS: {
    level: 'SSS',
    name: 'Mito Absoluto',
    color: '#FFF1A6',
    icon: '👑',
    description: 'O pináculo da guilda: inspiração eterna.',
    gradient: 'from-yellow-200 via-yellow-300 to-amber-400',
    textColor: 'text-yellow-700',
    glowColor: 'shadow-yellow-200/90 animate-pulse'
  }
};

// Thresholds para progressão de rank
export const RANK_THRESHOLDS: Record<RankLevel, RankThreshold> = {
  F: { xp: 0, missions: 0 },
  E: { xp: 200, missions: 2 },
  D: { xp: 600, missions: 5 },
  C: { xp: 1200, missions: 10, titles: 1 },
  B: { xp: 2500, missions: 20, titles: 2 },
  A: { xp: 4000, missions: 30, titles: 3, specialRequirements: ['legendary_quest'] },
  S: { xp: 7000, missions: 50, titles: 5, specialRequirements: ['legendary_quest', 'epic_achievement'] },
  SS: { xp: 9500, missions: 70, titles: 6, specialRequirements: ['legendary_quest', 'epic_achievement'] },
  SSS: { xp: 13000, missions: 100, titles: 8, specialRequirements: ['legendary_quest', 'epic_achievement'] }
};

// Ordem dos ranks para progressão
export const RANK_ORDER: RankLevel[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

// Recompensas por rank
export const RANK_REWARDS: Record<RankLevel, RankReward[]> = {
  F: [
    {
      type: 'visual',
      name: 'Emblema de Novato',
      description: 'Seu primeiro emblema de aventureiro',
      icon: '🛡️',
      unlocked: true
    }
  ],
  E: [
    {
      type: 'cosmetic',
      name: 'Capa Verde',
      description: 'Uma capa simples mas digna',
      icon: '🧥',
      unlocked: false
    },
    {
      type: 'gameplay',
      name: '+5% XP Bonus',
      description: 'Experiência adicional em missões',
      icon: '⚡',
      unlocked: false
    }
  ],
  D: [
    {
      type: 'visual',
      name: 'Brasão de Explorador',
      description: 'Símbolo de um verdadeiro explorador',
      icon: '🏅',
      unlocked: false
    },
    {
      type: 'gameplay',
      name: 'Missões Especiais',
      description: 'Acesso a missões de dificuldade média',
      icon: '📜',
      unlocked: false
    }
  ],
  C: [
    {
      type: 'cosmetic',
      name: 'Armadura Roxa',
      description: 'Armadura digna de um herói local',
      icon: '⚔️',
      unlocked: false
    },
    {
      type: 'gameplay',
      name: '+10% Gold Bonus',
      description: 'Ouro adicional em recompensas',
      icon: '💰',
      unlocked: false
    }
  ],
  B: [
    {
      type: 'visual',
      name: 'Aura Dourada',
      description: 'Uma aura que demonstra seu poder',
      icon: '✨',
      unlocked: false
    },
    {
      type: 'special',
      name: 'Título de Guardião',
      description: 'Reconhecimento oficial do reino',
      icon: '👑',
      unlocked: false
    }
  ],
  A: [
    {
      type: 'cosmetic',
      name: 'Capa de Campeão',
      description: 'Capa vermelha dos grandes heróis',
      icon: '🎭',
      unlocked: false
    },
    {
      type: 'special',
      name: 'História Épica IA',
      description: 'História personalizada gerada por IA',
      icon: '📖',
      unlocked: false
    }
  ],
  S: [
    {
      type: 'special',
      name: 'Lenda Personalizada',
      description: 'História e imagem lendária única',
      icon: '🌟',
      unlocked: false
    },
    {
      type: 'visual',
      name: 'Efeito Lendário',
      description: 'Partículas e brilho permanente',
      icon: '💫',
      unlocked: false
    },
    {
      type: 'gameplay',
      name: 'Acesso Total',
      description: 'Todas as funcionalidades desbloqueadas',
      icon: '🗝️',
      unlocked: false
    }
  ],
  SS: [
    {
      type: 'gameplay',
      name: 'Habilidade Exclusiva: Ordem Superior',
      description: 'Nova habilidade de elite disponível na árvore de talentos',
      icon: '🌀',
      unlocked: false
    },
    {
      type: 'cosmetic',
      name: 'Traje Ícone Imortal',
      description: 'Visual único da guilda para SS',
      icon: '👗',
      unlocked: false
    },
    {
      type: 'visual',
      name: 'Aura Mítica',
      description: 'Aura dourada reforçada',
      icon: '✨',
      unlocked: false
    }
  ],
  SSS: [
    {
      type: 'special',
      name: 'Carta de Parabenização da Guilda',
      description: 'Mensagem oficial celebrando sua ascensão ao topo',
      icon: '📜',
      unlocked: false
    },
    {
      type: 'gameplay',
      name: 'Convite para Missões Míticas',
      description: 'Desbloqueia missão de raridade mítica',
      icon: '🗡️',
      unlocked: false
    },
    {
      type: 'cosmetic',
      name: 'Coroa do Mito Absoluto',
      description: 'Adorno único para SSS',
      icon: '👑',
      unlocked: false
    }
  ]
};

// Bônus de XP por Rank (cada promoção concede +5%)
export const RANK_XP_BONUS_PERCENT: Record<RankLevel, number> = {
  F: 0,
  E: 5,
  D: 10,
  C: 15,
  B: 20,
  A: 25,
  S: 30,
  SS: 35,
  SSS: 45
};

// Perfil de missões por Rank (melhoria de qualidade e raridade)
export const RANK_MISSION_PROFILE: Record<RankLevel, { epicSlots: number; rewardMultiplier: number }> = {
  F: { epicSlots: 1, rewardMultiplier: 1.0 },
  E: { epicSlots: 1, rewardMultiplier: 1.05 },
  D: { epicSlots: 1, rewardMultiplier: 1.1 },
  C: { epicSlots: 1, rewardMultiplier: 1.12 },
  B: { epicSlots: 1, rewardMultiplier: 1.15 },
  A: { epicSlots: 1, rewardMultiplier: 1.18 },
  S: { epicSlots: 2, rewardMultiplier: 1.22 },
  SS: { epicSlots: 2, rewardMultiplier: 1.25 },
  SSS: { epicSlots: 3, rewardMultiplier: 1.3 }
};