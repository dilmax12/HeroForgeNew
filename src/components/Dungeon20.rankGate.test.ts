import { describe, it, expect } from 'vitest'
import { rankSystem } from '../utils/rankSystem'
import type { Hero } from '../types/hero'

const makeHero = (overrides: Partial<Hero> = {}): Hero => ({
  id: 'h1',
  name: 'Tester',
  class: 'guerreiro',
  attributes: {
    forca: 8,
    destreza: 6,
    constituicao: 7,
    inteligencia: 5,
    sabedoria: 4,
    carisma: 5
  } as any,
  level: 5,
  attributePoints: 0,
  derivedAttributes: {
    hp: 40,
    mp: 10,
    initiative: 5,
    armorClass: 12,
    currentHp: 40,
    currentMp: 10,
    luck: 5,
    power: 30
  },
  element: 'terra' as any,
  skills: [],
  image: '',
  battleQuote: '',
  progression: {
    xp: 0,
    level: 5,
    gold: 0,
    glory: 0,
    arcaneEssence: 0,
    fatigue: 0,
    reputation: 0,
    titles: [],
    achievements: [],
    stars: 0
  } as any,
  journeyChapters: [],
  titles: [],
  activeTitle: undefined,
  inventory: { items: {}, upgrades: {} } as any,
  activeQuests: [],
  completedQuests: [],
  reputationFactions: [],
  dailyGoals: [],
  achievements: [],
  stats: { questsCompleted: 0, totalCombats: 0, lastActiveAt: new Date().toISOString() } as any,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

describe('Dungeon Infinita rank gate', () => {
  it('habilita entrada para herói de rank D', () => {
    const hero = makeHero({ progression: { xp: 600, level: 5, gold: 0, glory: 0, arcaneEssence: 0, fatigue: 0, reputation: 0, titles: [], achievements: [], stars: 0 } as any, stats: { questsCompleted: 5 } as any });
    const heroRank = rankSystem.calculateRank(hero);
    const disabled = !hero || !heroRank || heroRank === 'F' || heroRank === 'E';
    expect(heroRank).toBe('D');
    expect(disabled).toBe(false);
  });

  it('bloqueia entrada para herói de rank E', () => {
    const hero = makeHero({ progression: { xp: 200, level: 3, gold: 0, glory: 0, arcaneEssence: 0, fatigue: 0, reputation: 0, titles: [], achievements: [], stars: 0 } as any, stats: { questsCompleted: 2 } as any });
    const heroRank = rankSystem.calculateRank(hero);
    const disabled = !hero || !heroRank || heroRank === 'F' || heroRank === 'E';
    expect(heroRank).toBe('E');
    expect(disabled).toBe(true);
  });
});