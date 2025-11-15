/**
 * Sistema de Títulos e Reputação
 */

import { Title, Achievement, ReputationFaction, Hero, HeroAttributes } from '../types/hero';

// === TÍTULOS PREDEFINIDOS ===

export const AVAILABLE_TITLES: Title[] = [
  // Títulos simples por level
  {
    id: 'aprendiz',
    name: 'Aprendiz',
    description: 'Alcançou o nível 2',
    rarity: 'comum',
    category: 'achievement',
    badge: '⭐',
    unlockedAt: new Date()
  },
  {
    id: 'veterano',
    name: 'Veterano',
    description: 'Alcançou o nível 5',
    rarity: 'raro',
    category: 'achievement',
    badge: '🌟',
    unlockedAt: new Date()
  },
  {
    id: 'campeao',
    name: 'Campeão',
    description: 'Alcançou o nível 10',
    rarity: 'epico',
    category: 'achievement',
    badge: '🏆',
    unlockedAt: new Date()
  },
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
  ,
  // === Propostas do usuário: Títulos de Classe ===
  {
    id: 'campeao-de-ferro',
    name: 'Campeão de Ferro',
    description: 'Guerreiro que alcançou marcos de domínio',
    rarity: 'raro',
    category: 'achievement',
    badge: '🛡️',
    unlockedAt: new Date()
  },
  {
    id: 'portador-da-lamina-sagrada',
    name: 'Portador da Lâmina Sagrada',
    description: 'Guerreiro celebrado por sua lâmina consagrada',
    rarity: 'raro',
    category: 'achievement',
    badge: '⚔️',
    unlockedAt: new Date()
  },
  {
    id: 'teurgo-do-veu',
    name: 'Teurgo do Véu',
    description: 'Mago que tocou os véus do arcano',
    rarity: 'raro',
    category: 'achievement',
    badge: '🪄',
    unlockedAt: new Date()
  },
  {
    id: 'guardiao-dos-arcanos',
    name: 'Guardião dos Arcanos',
    description: 'Mago que resguarda segredos antigos',
    rarity: 'epico',
    category: 'achievement',
    badge: '📜',
    unlockedAt: new Date()
  },
  {
    id: 'olho-de-falcao',
    name: 'Olho de Falcão',
    description: 'Arqueiro de mira impecável',
    rarity: 'raro',
    category: 'achievement',
    badge: '🎯',
    unlockedAt: new Date()
  },
  {
    id: 'cacador-das-sombras',
    name: 'Caçador das Sombras',
    description: 'Arqueiro que caça sem ser visto',
    rarity: 'epico',
    category: 'achievement',
    badge: '🏹',
    unlockedAt: new Date()
  },
  {
    id: 'mao-da-luz',
    name: 'Mão da Luz',
    description: 'Clérigo de devoção e cura',
    rarity: 'raro',
    category: 'achievement',
    badge: '✨',
    unlockedAt: new Date()
  },
  {
    id: 'protetor-das-almas',
    name: 'Protetor das Almas',
    description: 'Clérigo que guarda o bem-estar espiritual',
    rarity: 'epico',
    category: 'achievement',
    badge: '🕊️',
    unlockedAt: new Date()
  },

  // === Títulos de Conquista ===
  {
    id: 'explorador-do-desconhecido',
    name: 'Explorador do Desconhecido',
    description: 'Aventurou-se por territórios inexplorados',
    rarity: 'raro',
    category: 'exploration',
    badge: '🧭',
    unlockedAt: new Date()
  },
  {
    id: 'vencedor-das-profundezas',
    name: 'Vencedor das Profundezas',
    description: 'Concluiu uma masmorra completa',
    rarity: 'epico',
    category: 'exploration',
    badge: '🔱',
    unlockedAt: new Date()
  },
  {
    id: 'domador-da-fortuna',
    name: 'Domador da Fortuna',
    description: 'Encontrou vários tesouros raros',
    rarity: 'raro',
    category: 'exploration',
    badge: '💰',
    unlockedAt: new Date()
  },
  {
    id: 'sombra-invicta',
    name: 'Sombra Invicta',
    description: 'Venceu batalhas consecutivas com maestria',
    rarity: 'epico',
    category: 'combat',
    badge: '🗡️',
    unlockedAt: new Date()
  },
  {
    id: 'o-persistente',
    name: 'O Persistente',
    description: 'Não desiste diante de falhas',
    rarity: 'comum',
    category: 'achievement',
    badge: '🪨',
    unlockedAt: new Date()
  },
  {
    id: 'o-iluminado',
    name: 'O Iluminado',
    description: 'Atingiu grandes patamares de sabedoria',
    rarity: 'lendario',
    category: 'special',
    badge: '🔆',
    unlockedAt: new Date()
  },

  // === Progressão / Reputação ===
  {
    id: 'aventureiro-iniciante',
    name: 'Aventureiro Iniciante',
    description: 'Primeiros passos na aventura',
    rarity: 'comum',
    category: 'achievement',
    badge: '🌱',
    unlockedAt: new Date()
  },
  {
    id: 'veterano-das-estradas',
    name: 'Veterano das Estradas',
    description: 'Longa jornada pelos caminhos do reino',
    rarity: 'raro',
    category: 'achievement',
    badge: '🛣️',
    unlockedAt: new Date()
  },
  {
    id: 'heroi-local',
    name: 'Herói Local',
    description: 'Respeitado pelas pessoas da região',
    rarity: 'raro',
    category: 'social',
    badge: '🏡',
    unlockedAt: new Date()
  },
  {
    id: 'guardiao-do-reino',
    name: 'Guardião do Reino',
    description: 'Defensor da paz e da ordem',
    rarity: 'epico',
    category: 'social',
    badge: '🛡️',
    unlockedAt: new Date()
  },
  // Lenda Viva já existe como 'legend'

  // === Raros / Épicos ===
  {
    id: 'escolhido-pelo-destino',
    name: 'O Escolhido pelo Destino',
    description: 'Marcado por eventos únicos',
    rarity: 'lendario',
    category: 'special',
    badge: '♾️',
    unlockedAt: new Date()
  },
  {
    id: 'andarilho-eterno',
    name: 'Andarilho Eterno',
    description: 'Explorou incontáveis lugares',
    rarity: 'epico',
    category: 'exploration',
    badge: '🧙‍♂️',
    unlockedAt: new Date()
  },
  {
    id: 'coracao-de-dragao',
    name: 'Coração de Dragão',
    description: 'Provou coragem frente ao fogo dracônico',
    rarity: 'lendario',
    category: 'combat',
    badge: '❤️‍🔥',
    unlockedAt: new Date()
  },
  {
    id: 'mente-da-eternidade',
    name: 'Mente da Eternidade',
    description: 'Alcançou sabedoria transcendente',
    rarity: 'epico',
    category: 'achievement',
    badge: '🧠',
    unlockedAt: new Date()
  },
  {
    id: 'o-insone',
    name: 'O Insone',
    description: 'Sempre presente nas vigílias noturnas',
    rarity: 'raro',
    category: 'special',
    badge: '🌙',
    unlockedAt: new Date()
  },

  // === Sociais e Cosméticos ===
  {
    id: 'o-generoso',
    name: 'O Generoso',
    description: 'Conhecido por ajudar outros heróis',
    rarity: 'comum',
    category: 'social',
    badge: '🎁',
    unlockedAt: new Date()
  },
  {
    id: 'forjador-original',
    name: 'O Forjador Original',
    description: 'Fundador honrado do projeto',
    rarity: 'epico',
    category: 'special',
    badge: '🏅',
    unlockedAt: new Date()
  },
  {
    id: 'lenda-do-povo',
    name: 'A Lenda do Povo',
    description: 'Amado e celebrado nas tavernas',
    rarity: 'raro',
    category: 'social',
    badge: '🍻',
    unlockedAt: new Date()
  },
  {
    id: 'colecionador-de-reliquias',
    name: 'Colecionador de Relíquias',
    description: 'Reuniu um acervo lendário',
    rarity: 'epico',
    category: 'achievement',
    badge: '🏺',
    unlockedAt: new Date()
  },
  {
    id: 'mestre-dos-herois',
    name: 'Mestre dos Heróis',
    description: 'Criou heróis memoráveis',
    rarity: 'epico',
    category: 'social',
    badge: '👨‍👩‍👦',
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
  { id: 'ordem', name: 'Ordem', reputation: 0, level: 'neutral' },
  { id: 'sombra', name: 'Sombra', reputation: 0, level: 'neutral' },
  { id: 'livre', name: 'Livre', reputation: 0, level: 'neutral' }
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
  const achievement = (hero.achievements || []).find(a => a.id === achievementId);
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
  return (hero.achievements || []).map(achievement => {
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

// === BÔNUS PASSIVOS DE TÍTULOS ===
// Bônus simples baseados em atributos para cada título.
// São somados aos atributos totais (após equipamentos) e impactam os derivados.
export const TITLE_PASSIVE_ATTRIBUTE_BONUSES: Record<string, Partial<HeroAttributes>> = {
  // Título inicial
  'novato': {},
  // Level-based simples
  'aprendiz': { inteligencia: 1 },
  'veterano': { constituicao: 1 },
  'campeao': { carisma: 1 },

  // Combate
  'wolf-slayer': { forca: 1 },
  'dragon-bane': { forca: 2, constituicao: 2 },
  'undead-hunter': { forca: 1, sabedoria: 1 },
  'berserker': { forca: 2 },

  // Exploração
  'pathfinder': { destreza: 2 },
  'treasure-hunter': { destreza: 1, inteligencia: 1 },
  'master-explorer': { destreza: 1, sabedoria: 1 },

  // Social
  'guild-founder': { sabedoria: 1, carisma: 1 },
  'mentor': { carisma: 1 },
  'legend': { forca: 1, destreza: 1, constituicao: 1, inteligencia: 1, sabedoria: 1, carisma: 1 },

  // Achievement
  'completionist': { inteligencia: 1, sabedoria: 1 },
  'wealthy': { carisma: 1 },

  // Especiais
  'beta-tester': { inteligencia: 1 },
  'first-hero': { constituicao: 1 }
  ,
  // === Propostas do usuário: bônus mapeados a atributos existentes ===
  'campeao-de-ferro': { constituicao: 2 }, // aproxima +defesa
  'portador-da-lamina-sagrada': { forca: 3 },
  'teurgo-do-veu': { inteligencia: 2 }, // aproxima +MP
  'guardiao-dos-arcanos': { inteligencia: 1, sabedoria: 1 },
  'olho-de-falcao': { destreza: 2 },
  'cacador-das-sombras': { destreza: 1, forca: 1 },
  'mao-da-luz': { sabedoria: 2 },
  'protetor-das-almas': { sabedoria: 1, constituicao: 1 },
  'explorador-do-desconhecido': { inteligencia: 1 },
  'vencedor-das-profundezas': { sabedoria: 1 },
  'domador-da-fortuna': { carisma: 1 },
  'sombra-invicta': { destreza: 1, forca: 1 },
  'o-persistente': { constituicao: 1 },
  'o-iluminado': { sabedoria: 2 },
  'aventureiro-iniciante': {},
  'veterano-das-estradas': { carisma: 1 },
  'heroi-local': { carisma: 1 },
  'guardiao-do-reino': { forca: 1, destreza: 1, constituicao: 1, inteligencia: 1, sabedoria: 1, carisma: 1 },
  'escolhido-pelo-destino': { forca: 1, destreza: 1, constituicao: 1, inteligencia: 1, sabedoria: 1, carisma: 1 },
  'andarilho-eterno': { inteligencia: 1 },
  'coracao-de-dragao': { constituicao: 2 },
  'mente-da-eternidade': { inteligencia: 2 },
  'o-insone': {},
  'o-generoso': { carisma: 1 },
  'forjador-original': { carisma: 1 },
  'lenda-do-povo': { carisma: 2 },
  'colecionador-de-reliquias': { inteligencia: 1 },
  'mestre-dos-herois': { carisma: 1 },
  'mestre-dos-dados': { carisma: 2, sabedoria: 1 }
};

export function getTitleAttributeBonus(titleId?: string): Partial<HeroAttributes> {
  if (!titleId) return {};
  return TITLE_PASSIVE_ATTRIBUTE_BONUSES[titleId] || {};
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

export function scoreTitleForHero(title: Title, hero: Hero): number {
  const rarityRank: Record<Title['rarity'], number> = { comum: 1, raro: 2, epico: 3, lendario: 4, especial: 5 } as const;
  const bonus = getTitleAttributeBonus(title.id);
  const bonusSum = Object.values(bonus).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
  const recentBoost = Date.now() - new Date(title.unlockedAt).getTime() < 24 * 60 * 60 * 1000 ? 1 : 0;
  return (rarityRank[title.rarity] || 0) * 10 + bonusSum * 2 + recentBoost;
}

export function getTopTitlesForHero(hero: Hero, topN: number): Title[] {
  return [...(hero.titles || [])]
    .map(t => ({ t, s: scoreTitleForHero(t, hero) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(0, topN))
    .map(x => x.t);
}

export function getRecommendedTitleByClass(hero: Hero): Title | undefined {
  const weights: Record<string, Partial<HeroAttributes>> = {
    guerreiro: { forca: 1, constituicao: 0.8 },
    mago: { inteligencia: 1, sabedoria: 0.8 },
    ladino: { destreza: 1, carisma: 0.6 },
    clerigo: { sabedoria: 1, carisma: 0.6 },
    patrulheiro: { destreza: 1, sabedoria: 0.6 },
    paladino: { forca: 1, carisma: 0.8 },
    arqueiro: { destreza: 1, inteligencia: 0.6 },
    bardo: { carisma: 1, sabedoria: 0.6 },
    monge: { destreza: 1, sabedoria: 0.6 },
    assassino: { destreza: 1, forca: 0.6 },
    barbaro: { forca: 1, constituicao: 0.8 },
    lanceiro: { destreza: 1, forca: 0.8 },
    druida: { sabedoria: 1, inteligencia: 0.6 },
    feiticeiro: { inteligencia: 1, carisma: 0.6 },
  };
  const w = weights[String(hero.class)] || {};
  let best: { t: Title; s: number } | null = null;
  for (const t of hero.titles || []) {
    const bonus = getTitleAttributeBonus(t.id);
    const s = Object.entries(w).reduce((acc, [attr, weight]) => {
      const val = (bonus as any)[attr] || 0;
      return acc + (Number(weight) * Number(val));
    }, 0);
    if (!best || s > best.s) best = { t, s };
  }
  return best?.t;
}
