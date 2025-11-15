import { describe, it, expect } from 'vitest'
import { rankSystem } from './rankSystem'
import { type Hero } from '../types/hero'

const makeHero = (): Hero => {
  const now = new Date().toISOString()
  return {
    id: 'h1',
    name: 'Teste',
    race: 'humano',
    class: 'guerreiro',
    level: 1,
    alignment: 'neutro-puro',
    background: 'origem',
    attributes: { forca: 5, destreza: 5, constituicao: 5, inteligencia: 5, sabedoria: 5, carisma: 5 },
    derivedAttributes: { hp: 10, mp: 10, initiative: 1, armorClass: 10, power: 20 },
    progression: { xp: 0, level: 1, gold: 0, reputation: 0, titles: [], achievements: [] },
    inventory: { items: {}, upgrades: {} },
    element: 'physical',
    skills: [],
    createdAt: now,
    updatedAt: now,
    activeQuests: [],
    completedQuests: [],
    stats: {
      questsCompleted: 0,
      totalCombats: 0,
      totalPlayTime: 0,
      lastActiveAt: now,
      enemiesDefeated: 0,
      goldEarned: 0,
      itemsFound: 0,
      achievementsUnlocked: 0,
      loginStreak: 0,
      lastLogin: new Date()
    },
    titles: [],
    reputationFactions: [],
    dailyGoals: [],
    achievements: [],
    rankData: undefined as any,
    worldState: undefined,
  } as any
}

describe('RankSystem promotion history', () => {
  it('registra histórico ao subir de F para E', () => {
    const hero = makeHero()
    hero.rankData = rankSystem.initializeRankData(hero)
    hero.progression.xp = 200
    hero.stats.questsCompleted = 2
    const updated = rankSystem.updateRankData(hero, hero.rankData)
    expect(updated.currentRank).toBe('E')
    expect(updated.rankHistory.length).toBe(hero.rankData.rankHistory.length + 1)
    expect(updated.rankHistory[updated.rankHistory.length - 1].rank).toBe('E')
  })

  it('registra histórico ao subir novamente para D', () => {
    const hero = makeHero()
    hero.rankData = rankSystem.initializeRankData(hero)
    hero.progression.xp = 200
    hero.stats.questsCompleted = 2
    let updated = rankSystem.updateRankData(hero, hero.rankData)
    hero.rankData = updated
    hero.progression.xp = 600
    hero.stats.questsCompleted = 5
    updated = rankSystem.updateRankData(hero, hero.rankData)
    expect(updated.currentRank).toBe('D')
    expect(updated.rankHistory[updated.rankHistory.length - 1].rank).toBe('D')
  })
})