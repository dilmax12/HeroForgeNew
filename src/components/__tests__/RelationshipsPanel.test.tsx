import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import RelationshipsPanel from '../RelationshipsPanel'
import { useHeroStore } from '../../store/heroStore'

describe('RelationshipsPanel', () => {
  beforeEach(() => {
    useHeroStore.setState({
      heroes: [
        {
          id: 'player',
          name: 'Jogador',
          race: 'humano',
          class: 'guerreiro',
          level: 1,
          attributes: { forca: 3, destreza: 3, constituicao: 3, inteligencia: 3, sabedoria: 3, carisma: 3 },
          derivedAttributes: { hp: 10, mp: 5, initiative: 1, armorClass: 10, power: 1 },
          progression: { xp: 0, level: 1, gold: 0, reputation: 0, achievements: [], titles: [] },
          inventory: { items: {} },
          element: 'physical',
          skills: [],
          socialRelations: { npc1: 15 },
          activeQuests: [],
          completedQuests: [],
          stats: { questsCompleted: 0, totalCombats: 0, totalPlayTime: 0, lastActiveAt: new Date().toISOString(), enemiesDefeated: 0, goldEarned: 0, itemsFound: 0, achievementsUnlocked: 0, loginStreak: 0, lastLogin: new Date() },
          titles: [],
          rankData: { currentRank: 'F', score: 0, nextRankThreshold: 100 }
        } as any,
        {
          id: 'npc1',
          name: 'NPC 1',
          race: 'humano',
          class: 'guerreiro',
          level: 1,
          attributes: { forca: 3, destreza: 3, constituicao: 3, inteligencia: 3, sabedoria: 3, carisma: 3 },
          derivedAttributes: { hp: 10, mp: 5, initiative: 1, armorClass: 10, power: 1 },
          progression: { xp: 0, level: 1, gold: 0, reputation: 0, achievements: [], titles: [] },
          inventory: { items: {} },
          element: 'physical',
          skills: [],
          socialRelations: { player: -10 },
          npcMemory: { friendStatusByHeroId: {} },
          activeQuests: [],
          completedQuests: [],
          stats: { questsCompleted: 0, totalCombats: 0, totalPlayTime: 0, lastActiveAt: new Date().toISOString(), enemiesDefeated: 0, goldEarned: 0, itemsFound: 0, achievementsUnlocked: 0, loginStreak: 0, lastLogin: new Date() },
          titles: [],
          rankData: { currentRank: 'F', score: 0, nextRankThreshold: 100 }
        } as any
      ],
      selectedHeroId: 'player'
    } as any)
  })

  it('exibe relações usando fallback de socialRelations quando não há friendStatusByHeroId', () => {
    render(<RelationshipsPanel />)
    expect(screen.getByText('🤝 Relações')).toBeDefined()
    expect(screen.queryByText('Nenhuma relação encontrada para este filtro.')).toBeNull()
    expect(screen.getByText(/Status:/)).toBeDefined()
    expect(screen.getByText(/Relação:/)).toBeDefined()
  })
})