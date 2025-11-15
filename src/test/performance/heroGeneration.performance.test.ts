import { describe, it, expect } from 'vitest'
import { calculateDerivedAttributes, useHeroStore } from '../../store/heroStore'
import { resolveAttack, resolveCombat } from '../../utils/combat'
import { Alignment } from '../../types/hero'

describe('Desempenho de geração de herói', () => {
  it('calcula atributos derivados rapidamente', () => {
    const attrs = { forca: 6, destreza: 5, constituicao: 6, inteligencia: 4, sabedoria: 3, carisma: 2 } as any
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      calculateDerivedAttributes(attrs, 'guerreiro', 1)
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(120)
  })

  it('valida criação de herói em tempo adequado', () => {
    try { (useHeroStore as any).persist?.clearStorage?.() } catch {}
    useHeroStore.setState({ heroes: [], selectedHeroId: null, availableQuests: [], guilds: [], parties: [], referralInvites: [] } as any)
    const data = {
      name: 'Teste',
      race: 'humano',
      class: 'guerreiro',
      alignment: 'neutro-puro',
      attributes: { forca: 4, destreza: 3, constituicao: 4, inteligencia: 3, sabedoria: 2, carisma: 2 },
      background: '',
      backstory: '',
      element: 'physical',
      skills: [],
      image: '',
      battleQuote: ''
    } as any
    const start = performance.now()
    const created = useHeroStore.getState().createHero(data)
    const elapsed = performance.now() - start
    expect(created).toBeTruthy()
    expect(elapsed).toBeLessThan(200)
  })

  it('alinhamento leal aumenta chance de acerto e bom aumenta dano vs dark', () => {
    const attackerBase: any = { name: 'A', hp: 30, maxHp: 30, forca: 10, destreza: 10, constituicao: 5, inteligencia: 3, sabedoria: 3, carisma: 2, armor: 0, weapon: { name: 'Teste', atk: 0, critChance: 0.05 } }
    const defender: any = { name: 'E', hp: 30, maxHp: 30, forca: 5, destreza: 10, constituicao: 5, inteligencia: 3, sabedoria: 3, carisma: 2, armor: 0 }
    const attackerLealBom = { ...attackerBase, alignment: 'leal-bom' as Alignment }
    const attackerNeutro = { ...attackerBase, alignment: 'neutro-puro' as Alignment }
    const spy = (globalThis as any).vi.spyOn(Math, 'random')
    spy.mockImplementationOnce(() => 0.52)
    const rNeutral = resolveAttack(attackerNeutro, defender, { attackElement: 'physical', defendElement: 'dark' })
    spy.mockRestore()
    const spy2 = (globalThis as any).vi.spyOn(Math, 'random')
    spy2.mockImplementationOnce(() => 0.52)
    const rLealBom = resolveAttack(attackerLealBom, defender, { attackElement: 'physical', defendElement: 'dark' })
    spy2.mockRestore()
    expect(rNeutral.hit).toBe(false)
    expect(rLealBom.hit).toBe(true)
  })

  it('alinhamento caótico aumenta críticos e mal concede drenagem de vida no combate', () => {
    const attackerCaoticoMal: any = { name: 'C', hp: 30, maxHp: 30, forca: 10, destreza: 10, constituicao: 5, inteligencia: 3, sabedoria: 3, carisma: 2, armor: 0, weapon: { name: 'Teste', atk: 0, critChance: 0.05 }, alignment: 'caotico-mal' as Alignment }
    const defender: any = { name: 'E', hp: 30, maxHp: 30, forca: 5, destreza: 10, constituicao: 5, inteligencia: 3, sabedoria: 3, carisma: 2, armor: 0 }
    const spy = (globalThis as any).vi.spyOn(Math, 'random')
    spy.mockImplementationOnce(() => 0.40)
    spy.mockImplementationOnce(() => 0.06)
    const r = resolveAttack(attackerCaoticoMal, defender, { attackElement: 'physical', defendElement: 'physical' })
    spy.mockRestore()
    expect(r.hit).toBe(true)
    expect(r.crit).toBe(true)

    const hero: any = {
      id: 'h1', name: 'Vil', race: 'humano', class: 'guerreiro', level: 1, alignment: 'caotico-mal', background: '',
      attributes: { forca: 15, destreza: 12, constituicao: 6, inteligencia: 3, sabedoria: 2, carisma: 2 },
      derivedAttributes: { hp: 40, mp: 10, initiative: 0, armorClass: 2, power: 0 },
      progression: { xp: 0, level: 1, gold: 0, reputation: 0, achievements: [], titles: [] },
      inventory: { items: {} }, element: 'physical', skills: [], createdAt: '', updatedAt: '', activeQuests: [], completedQuests: [],
      stats: { questsCompleted: 0, totalCombats: 0, totalPlayTime: 0, lastActiveAt: '', enemiesDefeated: 0, goldEarned: 0, itemsFound: 0, achievementsUnlocked: 0, loginStreak: 0, lastLogin: new Date() },
      titles: [], reputationFactions: [], dailyGoals: [], achievements: [], rankData: { globalRank: 0, classRank: 0, weeklyRank: 0, achievements: 0, totalScore: 0 }
    }
    const res = resolveCombat(hero, [{ type: 'Goblin', count: 1 }])
    const drainLine = res.log.find(l => l.includes('drena'))
    expect(drainLine).toBeTruthy()
  })
})