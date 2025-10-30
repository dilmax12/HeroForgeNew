import { Hero, Leaderboard, LeaderboardEntry, RankingSystem } from '../types/hero';

export interface LeaderboardConfig {
  id: string;
  name: string;
  description: string;
  type: 'xp' | 'gold' | 'quests' | 'achievements' | 'reputation' | 'playtime';
  icon: string;
  color: string;
  getValue: (hero: Hero) => number;
  formatValue: (value: number) => string;
}

export const LEADERBOARD_CONFIGS: LeaderboardConfig[] = [
  {
    id: 'xp',
    name: 'Experiência Total',
    description: 'Heróis com mais experiência acumulada',
    type: 'xp',
    icon: '⭐',
    color: 'text-yellow-400',
    getValue: (hero) => hero.progression.experience,
    formatValue: (value) => `${value.toLocaleString()} XP`
  },
  {
    id: 'level',
    name: 'Nível Mais Alto',
    description: 'Heróis com o maior nível alcançado',
    type: 'xp',
    icon: '🏆',
    color: 'text-amber-400',
    getValue: (hero) => hero.progression.level,
    formatValue: (value) => `Nível ${value}`
  },
  {
    id: 'gold',
    name: 'Riqueza',
    description: 'Heróis com mais ouro acumulado',
    type: 'gold',
    icon: '💰',
    color: 'text-yellow-500',
    getValue: (hero) => hero.progression.gold,
    formatValue: (value) => `${value.toLocaleString()} 🪙`
  },
  {
    id: 'quests',
    name: 'Missões Completadas',
    description: 'Heróis que completaram mais missões',
    type: 'quests',
    icon: '📜',
    color: 'text-blue-400',
    getValue: (hero) => hero.completedQuests.length,
    formatValue: (value) => `${value} missões`
  },
  {
    id: 'achievements',
    name: 'Conquistas',
    description: 'Heróis com mais conquistas desbloqueadas',
    type: 'achievements',
    icon: '🏅',
    color: 'text-purple-400',
    getValue: (hero) => hero.achievements.filter(a => a.unlockedAt).length,
    formatValue: (value) => `${value} conquistas`
  },
  {
    id: 'reputation',
    name: 'Reputação Total',
    description: 'Heróis com melhor reputação geral',
    type: 'reputation',
    icon: '⭐',
    color: 'text-green-400',
    getValue: (hero) => hero.reputationFactions.reduce((sum, faction) => sum + Math.max(0, faction.reputation), 0),
    formatValue: (value) => `${value} pontos`
  },
  {
    id: 'playtime',
    name: 'Tempo de Jogo',
    description: 'Heróis com mais tempo jogado',
    type: 'playtime',
    icon: '⏰',
    color: 'text-indigo-400',
    getValue: (hero) => hero.stats.totalPlayTime || 0,
    formatValue: (value) => `${Math.floor(value / 60)}h ${value % 60}m`
  }
];

export function generateLeaderboard(
  heroes: Hero[], 
  config: LeaderboardConfig,
  limit: number = 50
): Leaderboard {
  // Filtrar heróis válidos e calcular valores
  const validEntries = heroes
    .filter(hero => hero.progression.level > 0) // Apenas heróis que começaram a jogar
    .map(hero => ({
      heroId: hero.id,
      heroName: hero.name,
      heroClass: hero.class,
      heroRace: hero.race,
      value: config.getValue(hero),
      rank: 0, // Será definido após ordenação
      change: 0, // TODO: Implementar comparação com ranking anterior
      lastUpdated: new Date()
    }))
    .sort((a, b) => b.value - a.value) // Ordenar por valor (maior primeiro)
    .slice(0, limit); // Limitar número de entradas

  // Atribuir ranks
  validEntries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    type: config.type,
    entries: validEntries,
    lastUpdated: new Date()
  };
}

export function generateAllLeaderboards(heroes: Hero[]): Leaderboard[] {
  return LEADERBOARD_CONFIGS.map(config => 
    generateLeaderboard(heroes, config)
  );
}

export function getHeroRanking(hero: Hero, heroes: Hero[]): RankingSystem {
  const leaderboards = generateAllLeaderboards(heroes);
  
  // Encontrar posição do herói em cada leaderboard
  const xpLeaderboard = leaderboards.find(lb => lb.id === 'xp');
  const globalRank = xpLeaderboard?.entries.findIndex(entry => entry.heroId === hero.id) + 1 || 0;
  
  // Ranking por classe
  const sameClassHeroes = heroes.filter(h => h.class === hero.class);
  const classLeaderboard = generateLeaderboard(sameClassHeroes, LEADERBOARD_CONFIGS[0]);
  const classRank = classLeaderboard.entries.findIndex(entry => entry.heroId === hero.id) + 1 || 0;
  
  // Calcular pontuação total baseada em múltiplos fatores
  const totalScore = calculateTotalScore(hero);
  
  return {
    globalRank,
    classRank,
    weeklyRank: 0, // TODO: Implementar ranking semanal
    achievements: hero.achievements.filter(a => a.unlockedAt).length,
    totalScore
  };
}

export function calculateTotalScore(hero: Hero): number {
  const weights = {
    level: 100,
    xp: 0.1,
    gold: 0.01,
    quests: 50,
    achievements: 25,
    reputation: 1
  };

  return Math.floor(
    hero.progression.level * weights.level +
    hero.progression.experience * weights.xp +
    hero.progression.gold * weights.gold +
    hero.completedQuests.length * weights.quests +
    hero.achievements.filter(a => a.unlockedAt).length * weights.achievements +
    hero.reputationFactions.reduce((sum, faction) => sum + Math.max(0, faction.reputation), 0) * weights.reputation
  );
}

export function getLeaderboardPosition(heroId: string, leaderboard: Leaderboard): number {
  const entry = leaderboard.entries.find(e => e.heroId === heroId);
  return entry?.rank || 0;
}

export function getTopHeroes(leaderboard: Leaderboard, count: number = 10): LeaderboardEntry[] {
  return leaderboard.entries.slice(0, count);
}

export function getHeroesAroundRank(
  leaderboard: Leaderboard, 
  heroId: string, 
  range: number = 5
): LeaderboardEntry[] {
  const heroIndex = leaderboard.entries.findIndex(e => e.heroId === heroId);
  if (heroIndex === -1) return [];
  
  const start = Math.max(0, heroIndex - range);
  const end = Math.min(leaderboard.entries.length, heroIndex + range + 1);
  
  return leaderboard.entries.slice(start, end);
}

export function formatRankChange(change: number): string {
  if (change > 0) return `↗️ +${change}`;
  if (change < 0) return `↘️ ${change}`;
  return '➡️ 0';
}

export function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'; // Ouro
  if (rank === 2) return 'text-gray-300'; // Prata
  if (rank === 3) return 'text-orange-400'; // Bronze
  if (rank <= 10) return 'text-purple-400'; // Top 10
  if (rank <= 50) return 'text-blue-400'; // Top 50
  return 'text-gray-400'; // Outros
}

export function getRankIcon(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank <= 10) return '🏆';
  if (rank <= 50) return '⭐';
  return '📊';
}

// Função para simular dados de leaderboard para demonstração
export function generateMockLeaderboardData(currentHero: Hero): Hero[] {
  const mockHeroes: Hero[] = [];
  
  // Adicionar o herói atual
  mockHeroes.push(currentHero);
  
  // Gerar heróis fictícios para popular o leaderboard
  const names = ['Aragorn', 'Legolas', 'Gimli', 'Gandalf', 'Boromir', 'Frodo', 'Sam', 'Merry', 'Pippin', 'Faramir'];
  const classes = ['warrior', 'mage', 'rogue', 'paladin', 'ranger'];
  const races = ['human', 'elf', 'dwarf', 'halfling', 'orc'];
  
  for (let i = 0; i < 20; i++) {
    const mockHero: Hero = {
      id: `mock-${i}`,
      name: names[i % names.length] + ` ${i + 1}`,
      race: races[Math.floor(Math.random() * races.length)],
      class: classes[Math.floor(Math.random() * classes.length)],
      alignment: 'neutral',
      attributes: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
      },
      progression: {
        level: Math.floor(Math.random() * 20) + 1,
        experience: Math.floor(Math.random() * 10000),
        gold: Math.floor(Math.random() * 5000),
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100
      },
      inventory: [],
      equipment: {},
      activeQuests: [],
      completedQuests: Array(Math.floor(Math.random() * 50)).fill(null).map((_, idx) => ({
        id: `quest-${idx}`,
        title: `Missão ${idx + 1}`,
        description: 'Missão completada',
        type: 'combat',
        difficulty: 'normal' as const,
        rewards: { xp: 100, gold: 50 },
        requirements: {},
        isCompleted: true
      })),
      stats: {
        totalPlayTime: Math.floor(Math.random() * 1000),
        loginStreak: Math.floor(Math.random() * 30),
        lastLogin: new Date()
      },
      titles: [],
      activeTitle: undefined,
      reputationFactions: [
        { name: 'Guarda da Cidade', reputation: Math.floor(Math.random() * 2000) - 1000 },
        { name: 'Comerciantes', reputation: Math.floor(Math.random() * 2000) - 1000 },
        { name: 'Ladrões', reputation: Math.floor(Math.random() * 2000) - 1000 }
      ],
      dailyGoals: [],
      achievements: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    mockHeroes.push(mockHero);
  }
  
  return mockHeroes;
}