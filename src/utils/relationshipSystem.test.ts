import { computeTier, updateOnSocial, applyDecay } from './relationshipSystem';

const mkNPC = (id: string) => ({
  id,
  name: 'NPC',
  class: 'guerreiro',
  race: 'humano',
  level: 1,
  attributes: { forca: 3, destreza: 3, constituicao: 3, inteligencia: 3, sabedoria: 3, carisma: 3 },
  derivedAttributes: { hp: 30, mp: 10, initiative: 10, armorClass: 10, currentHp: 30, currentMp: 10, luck: 0, power: 20 },
  progression: { xp: 0, level: 1, gold: 0, reputation: 0, achievements: [], titles: [] },
  inventory: { items: {} },
  element: 'physical',
  skills: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activeQuests: [],
  completedQuests: [],
  stats: { questsCompleted: 0, totalCombats: 0, totalPlayTime: 0, lastActiveAt: new Date().toISOString() },
  titles: [],
  reputationFactions: [],
  dailyGoals: [],
  achievements: [],
  socialRelations: {},
  npcMemory: { interactions: [], preferences: {}, scoreByAction: {}, friendStatusByHeroId: {}, lastContactByHeroId: {}, lastInteractionByType: {} },
} as any);

const mkPlayer = (id: string) => ({ ...mkNPC(id), name: 'Jogador' });

test('computeTier thresholds', () => {
  expect(computeTier(0)).toBe('neutro');
  expect(computeTier(15)).toBe('conhecido');
});

test('updateOnSocial increases relation on friendly', () => {
  const n = mkNPC('n1');
  const p = mkPlayer('p1');
  const res = updateOnSocial(n, p, 'amigável');
  expect(res.value).toBeGreaterThan(0);
});

test('applyDecay reduces relation over days', () => {
  const n = mkNPC('n2');
  const p = mkPlayer('p2');
  n.socialRelations[p.id] = 50;
  n.npcMemory.lastContactByHeroId[p.id] = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const val = applyDecay(n, p.id);
  expect(val).toBeLessThan(50);
});