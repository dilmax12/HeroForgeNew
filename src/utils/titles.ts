/**
 * Sistema de Títulos e Reputação
 */

import { Title, Achievement, ReputationFaction, Hero } from '../types/hero';

// === TÍTULOS PREDEFINIDOS ===

export const AVAILABLE_TITLES: Title[] = [
  // Títulos de Combate
  {
    id: 'wolf-slayer',
    name: 'Caçador de Lobos',
    description: 'Derrotou 50 lobos em combate',
    rarity: 'comum',
    category: 'combat',
    badge: '🐺',
    unlockedAt: new Date()
  },
  {
    id: 'dragon-bane',
    name: 'Perdição dos Dragões',
    description: 'Derrotou um dragão lendário',
    rarity: 'lendario',
    category: 'combat',
    badge: '🐉',
    unlockedAt: new Date()
  },
  {
    id: 'undead-hunter',
    name: 'Caçador de Mortos-Vivos',
    description: 'Derrotou 100 criaturas mortas-vivas',
    rarity: 'raro',
    category: 'combat',
    badge: '💀',
    unlockedAt: new Date()
  },
  {
    id: 'berserker',
    name: 'Berserker',
    description: 'Venceu 10 combates consecutivos sem usar poções',
    rarity: 'epico',
    category: 'combat',
    badge: '⚔️',
    unlockedAt: new Date()
  },

  // Títulos de Exploração
  {
    id: 'pathfinder',
    name: 'Desbravador',
    description: 'Completou 25 missões de exploração',
    rarity: 'comum',
    category: 'exploration',
    badge: '🗺️',
    unlockedAt: new Date()
  },
  {
    id: 'treasure-hunter',
    name: 'Caçador de Tesouros',
    description: 'Encontrou 50 itens raros ou superiores',
    rarity: 'raro',
    category: 'exploration',
    badge: '💎',
    unlockedAt: new Date()
  },
  {
    id: 'master-explorer',
    name: 'Explorador Mestre',
    description: 'Visitou todas as regiões conhecidas',
    rarity: 'epico',
    category: 'exploration',
    badge: '🌍',
    unlockedAt: new Date()
  },

  // Títulos Sociais
  {
    id: 'guild-founder',
    name: 'Fundador de Guilda',
    description: 'Criou uma guilda próspera',
    rarity: 'raro',
    category: 'social',
    badge: '🏰',
    unlockedAt: new Date()
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Ajudou 10 novos heróis em suas primeiras missões',
    rarity: 'comum',
    category: 'social',
    badge: '👨‍🏫',
    unlockedAt: new Date()
  },
  {
    id: 'legend',
    name: 'Lenda Viva',
    description: 'Alcançou reputação máxima com todas as facções',
    rarity: 'lendario',
    category: 'social',
    badge: '👑',
    unlockedAt: new Date()
  },

  // Títulos de Achievement
  {
    id: 'completionist',
    name: 'Completista',
    description: 'Desbloqueou todos os achievements básicos',
    rarity: 'epico',
    category: 'achievement',
    badge: '🏆',
    unlockedAt: new Date()
  },
  {
    id: 'wealthy',
    name: 'Magnata',
    description: 'Acumulou 10.000 moedas de ouro',
    rarity: 'raro',
    category: 'achievement',
    badge: '💰',
    unlockedAt: new Date()
  },

  // Títulos Especiais
  {
    id: 'beta-tester',
    name: 'Testador Beta',
    description: 'Participou dos testes iniciais do Hero Forge',
    rarity: 'especial',
    category: 'special',
    badge: '🧪',
    unlockedAt: new Date()
  },
  {
    id: 'first-hero',
    name: 'Primeiro Herói',
    description: 'Criou o primeiro herói no Hero Forge',
    rarity: 'especial',
    category: 'special',
    badge: '🥇',
    unlockedAt: new Date()
  }
];

// === ACHIEVEMENTS PARA TÍTULOS ===

export const TITLE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'wolf-slayer-achievement',
    name: 'Caçador de Lobos',
    description: 'Derrote 50 lobos em combate',
    rarity: 'comum',
    unlocked: false,
    progress: 0,
    maxProgress: 50,
    rewards: {
      xp: 500,
      gold: 200,
      title: 'wolf-slayer'
    }
  },
  {
    id: 'dragon-bane-achievement',
    name: 'Perdição dos Dragões',
    description: 'Derrote um dragão lendário',
    rarity: 'lendario',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rewards: {
      xp: 5000,
      gold: 2000,
      title: 'dragon-bane'
    }
  },
  {
    id: 'pathfinder-achievement',
    name: 'Desbravador',
    description: 'Complete 25 missões de exploração',
    rarity: 'comum',
    unlocked: false,
    progress: 0,
    maxProgress: 25,
    rewards: {
      xp: 750,
      gold: 300,
      title: 'pathfinder'
    }
  },
  {
    id: 'treasure-hunter-achievement',
    name: 'Caçador de Tesouros',
    description: 'Encontre 50 itens raros ou superiores',
    rarity: 'raro',
    unlocked: false,
    progress: 0,
    maxProgress: 50,
    rewards: {
      xp: 1000,
      gold: 500,
      title: 'treasure-hunter'
    }
  },
  {
    id: 'wealthy-achievement',
    name: 'Magnata',
    description: 'Acumule 10.000 moedas de ouro',
    rarity: 'raro',
    unlocked: false,
    progress: 0,
    maxProgress: 10000,
    rewards: {
      xp: 2000,
      title: 'wealthy'
    }
  }
];

// === FACÇÕES DE REPUTAÇÃO ===

export const DEFAULT_FACTIONS: ReputationFaction[] = [
  {
    id: 'merchants-guild',
    name: 'Guilda dos Mercadores',
    reputation: 0,
    level: 'neutral'
  },
  {
    id: 'royal-guard',
    name: 'Guarda Real',
    reputation: 0,
    level: 'neutral'
  },
  {
    id: 'thieves-guild',
    name: 'Guilda dos Ladrões',
    reputation: 0,
    level: 'neutral'
  },
  {
    id: 'mages-circle',
    name: 'Círculo dos Magos',
    reputation: 0,
    level: 'neutral'
  },
  {
    id: 'temple-order',
    name: 'Ordem do Templo',
    reputation: 0,
    level: 'neutral'
  }
];

// === FUNÇÕES UTILITÁRIAS ===

export function getReputationLevel(reputation: number): ReputationFaction['level'] {
  if (reputation <= -500) return 'hostile';
  if (reputation <= -200) return 'unfriendly';
  if (reputation <= 200) return 'neutral';
  if (reputation <= 500) return 'friendly';
  if (reputation <= 800) return 'honored';
  return 'revered';
}

export function updateFactionReputation(
  factions: ReputationFaction[], 
  factionId: string, 
  change: number
): ReputationFaction[] {
  return factions.map(faction => {
    if (faction.id === factionId) {
      const newReputation = Math.max(-1000, Math.min(1000, faction.reputation + change));
      return {
        ...faction,
        reputation: newReputation,
        level: getReputationLevel(newReputation)
      };
    }
    return faction;
  });
}

export function checkTitleUnlock(hero: Hero, achievementId: string): Title | null {
  const achievement = hero.achievements.find(a => a.id === achievementId);
  if (!achievement || !achievement.unlocked || !achievement.rewards.title) {
    return null;
  }

  const titleId = achievement.rewards.title;
  const title = AVAILABLE_TITLES.find(t => t.id === titleId);
  
  if (title && !hero.titles.some(t => t.id === titleId)) {
    return {
      ...title,
      unlockedAt: new Date()
    };
  }

  return null;
}

export function getTitlesByCategory(titles: Title[], category: Title['category']): Title[] {
  return titles.filter(title => title.category === category);
}

export function getTitlesByRarity(titles: Title[], rarity: Title['rarity']): Title[] {
  return titles.filter(title => title.rarity === rarity);
}

export function getActiveTitle(hero: Hero): Title | null {
  if (!hero.activeTitle) return null;
  return hero.titles.find(title => title.id === hero.activeTitle) || null;
}

export function formatTitleDisplay(hero: Hero): string {
  const activeTitle = getActiveTitle(hero);
  if (!activeTitle) return hero.name;
  
  return `${activeTitle.badge} ${hero.name}, ${activeTitle.name}`;
}

// === SISTEMA DE CONQUISTAS BASEADAS EM ESTATÍSTICAS ===

export function updateAchievementProgress(hero: Hero): Achievement[] {
  return hero.achievements.map(achievement => {
    if (achievement.unlocked) return achievement;

    let newProgress = achievement.progress;

    switch (achievement.id) {
      case 'wolf-slayer-achievement':
        // Assumindo que temos uma estatística específica para lobos mortos
        newProgress = hero.stats.enemiesDefeated; // Simplificado
        break;
      
      case 'pathfinder-achievement':
        // Contar missões de exploração completadas
        newProgress = hero.completedQuests.filter(q => q.type === 'exploration').length;
        break;
      
      case 'treasure-hunter-achievement':
        newProgress = hero.stats.itemsFound;
        break;
      
      case 'wealthy-achievement':
        newProgress = hero.progression.gold;
        break;
    }

    const unlocked = newProgress >= achievement.maxProgress;

    return {
      ...achievement,
      progress: Math.min(newProgress, achievement.maxProgress),
      unlocked,
      unlockedAt: unlocked && !achievement.unlocked ? new Date() : achievement.unlockedAt
    };
  });
}

export function getRarityColor(rarity: Title['rarity']): string {
  switch (rarity) {
    case 'comum': return 'text-gray-400';
    case 'raro': return 'text-blue-400';
    case 'epico': return 'text-purple-400';
    case 'lendario': return 'text-yellow-400';
    case 'especial': return 'text-pink-400';
    default: return 'text-gray-400';
  }
}

export function getRarityBg(rarity: Title['rarity']): string {
  switch (rarity) {
    case 'comum': return 'bg-gray-900/20';
    case 'raro': return 'bg-blue-900/20';
    case 'epico': return 'bg-purple-900/20';
    case 'lendario': return 'bg-yellow-900/20';
    case 'especial': return 'bg-pink-900/20';
    default: return 'bg-gray-900/20';
  }
}