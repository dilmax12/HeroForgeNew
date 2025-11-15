import { describe, it, expect, beforeEach } from 'vitest'
import { useHeroStore } from './heroStore'
import { worldStateManager } from '../utils/worldState'

describe('Persistência de missões após regeneração', () => {
  beforeEach(() => {
    try { localStorage.clear() } catch {}
    useHeroStore.setState({ heroes: [], selectedHeroId: null, availableQuests: [] })
  })

  it('não reseta missões concluídas após tick de regeneração', () => {
    const hero = useHeroStore.getState().createHero({
      name: 'Teste',
      class: 'Guerreiro' as any,
      attributes: { forca: 5, destreza: 4, inteligencia: 4, vitalidade: 5 } as any,
      skills: [],
      element: 'terra' as any,
      image: '🛡️',
      battleQuote: 'Força e honra!'
    })

    const quest = {
      id: 'q1',
      title: 'Missão de Teste',
      description: 'Complete para validar persistência',
      type: 'caca',
      difficulty: 'facil',
      levelRequirement: 1,
      rewards: { gold: 10, xp: 50 },
      enemies: [],
      repeatable: false,
      sticky: false
    } as any

    useHeroStore.setState({ availableQuests: [quest] })
    const okAccept = useHeroStore.getState().acceptQuest(hero.id, quest.id)
    expect(okAccept).toBe(true)

    useHeroStore.getState().completeQuest(hero.id, quest.id, true)

    const afterComplete = useHeroStore.getState().heroes.find(h => h.id === hero.id)!
    const prevCount = afterComplete.stats.questsCompleted
    const prevCompletedLen = afterComplete.completedQuests.length

    const h = {
      ...afterComplete,
      derivedAttributes: { ...afterComplete.derivedAttributes },
      stamina: { ...(afterComplete.stamina as any) },
      stats: { ...afterComplete.stats }
    } as any
    worldStateManager.updateVitals(h)
    worldStateManager.updateStamina(h)

    const latest = useHeroStore.getState().heroes.find(x => x.id === h.id)
    const mergedStats = { ...(latest?.stats || {}), lastActiveAt: h.stats.lastActiveAt } as any
    useHeroStore.getState().updateHero(h.id, { derivedAttributes: h.derivedAttributes, stamina: h.stamina, stats: mergedStats })

    const afterTick = useHeroStore.getState().heroes.find(h => h.id === hero.id)!
    expect(afterTick.stats.questsCompleted).toBe(prevCount)
    expect(afterTick.completedQuests.length).toBe(prevCompletedLen)
  })

  it('ganha reputação de facção ao concluir missão', () => {
    const hero = useHeroStore.getState().createHero({
      name: 'Reputacao',
      class: 'Guerreiro' as any,
      attributes: { forca: 5, destreza: 4, inteligencia: 4, vitalidade: 5 } as any,
      skills: [],
      element: 'terra' as any,
      image: '🛡️',
      battleQuote: 'Avante!'
    })

    const quest = {
      id: 'q2',
      title: 'Contrato de Patrulha',
      description: 'Proteger as estradas',
      type: 'contrato',
      difficulty: 'padrao',
      levelRequirement: 1,
      rewards: { gold: 5, xp: 20 },
      enemies: [],
      repeatable: false,
      sticky: false
    } as any

    useHeroStore.setState({ availableQuests: [quest] })
    const okAccept = useHeroStore.getState().acceptQuest(hero.id, quest.id)
    expect(okAccept).toBe(true)

    useHeroStore.getState().completeQuest(hero.id, quest.id, true)

    const after = useHeroStore.getState().heroes.find(h => h.id === hero.id)!
    const ordem = (after.reputationFactions || []).find(f => f.name === 'Ordem')
    expect(ordem?.reputation).toBeGreaterThan(0)
  })

  it('exploração concede reputação à facção Livre', () => {
    const hero = useHeroStore.getState().createHero({
      name: 'Explorador',
      class: 'Guerreiro' as any,
      attributes: { forca: 5, destreza: 4, inteligencia: 4, vitalidade: 5 } as any,
      skills: [],
      element: 'terra' as any,
      image: '🛡️',
      battleQuote: 'Explorar e mapear!'
    })

    const quest = {
      id: 'q3',
      title: 'Mapear Ruínas',
      description: 'Explorar ruínas antigas',
      type: 'exploracao',
      difficulty: 'padrao',
      levelRequirement: 1,
      rewards: { gold: 5, xp: 20 },
      enemies: [],
      repeatable: false,
      sticky: false
    } as any

    useHeroStore.setState({ availableQuests: [quest] })
    const okAccept = useHeroStore.getState().acceptQuest(hero.id, quest.id)
    expect(okAccept).toBe(true)

    useHeroStore.getState().completeQuest(hero.id, quest.id, true)

    const after = useHeroStore.getState().heroes.find(h => h.id === hero.id)!
    const livre = (after.reputationFactions || []).find(f => f.name === 'Livre')
    expect(livre?.reputation).toBeGreaterThan(0)
  })

  it('história concede reputação à facção Ordem', () => {
    const hero = useHeroStore.getState().createHero({
      name: 'Narrador',
      class: 'Guerreiro' as any,
      attributes: { forca: 5, destreza: 4, inteligencia: 4, vitalidade: 5 } as any,
      skills: [],
      element: 'terra' as any,
      image: '🛡️',
      battleQuote: 'Proteger o reino!'
    })

    const quest = {
      id: 'q4',
      title: 'Defender a Cidade',
      description: 'Da campanha principal',
      type: 'historia',
      difficulty: 'padrao',
      levelRequirement: 1,
      rewards: { gold: 5, xp: 20 },
      enemies: [],
      repeatable: false,
      sticky: false
    } as any

    useHeroStore.setState({ availableQuests: [quest] })
    const okAccept = useHeroStore.getState().acceptQuest(hero.id, quest.id)
    expect(okAccept).toBe(true)

    useHeroStore.getState().completeQuest(hero.id, quest.id, true)

    const after = useHeroStore.getState().heroes.find(h => h.id === hero.id)!
    const ordem = (after.reputationFactions || []).find(f => f.name === 'Ordem')
    expect(ordem?.reputation).toBeGreaterThan(0)
  })
})