import { simulateDuel } from './duel';

const mkHero = (id: string, name: string, level: number) => ({
  id,
  name,
  class: 'guerreiro',
  race: 'humano',
  level,
  attributes: { forca: 6, destreza: 5, constituicao: 6, inteligencia: 4, sabedoria: 4, carisma: 3 },
  derivedAttributes: { hp: 60, mp: 20, initiative: 10, armorClass: 12, currentHp: 60, currentMp: 20, luck: 2, power: 80 },
  progression: { xp: 0, level, gold: 0, reputation: 0, achievements: [], titles: [] },
  inventory: { items: {} },
  element: 'physical',
  skills: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activeQuests: [],
  completedQuests: [],
  stats: { questsCompleted: 0, totalCombats: 0, totalPlayTime: 0, lastActiveAt: new Date().toISOString(), duelsPlayed: 0, duelsWon: 0, duelsLost: 0 },
  titles: [],
  reputationFactions: [],
  dailyGoals: [],
  achievements: [],
  rankData: { currentRank: 'F', xpToNext: 100, currentXp: 0 },
});

test('simulateDuel returns log and rewards', () => {
  const a = mkHero('a1','Herói A', 5) as any;
  const b = mkHero('b1','Herói B', 5) as any;
  const res = simulateDuel(a, b, 'treino');
  expect(res.turns).toBeGreaterThan(0);
  expect(res.log.length).toBeGreaterThan(0);
  expect(res.rewards.xp).toBeGreaterThanOrEqual(0);
});