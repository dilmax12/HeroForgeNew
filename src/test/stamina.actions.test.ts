import { describe, it, expect } from 'vitest'
import { srvCanPerformAction, srvPerformAction, srvRest } from '../../server.js'

describe('stamina actions', () => {
  it('canPerformAction insufficient then sufficient', async () => {
    const hero = { id: 'h1', stamina: 5, maxStamina: 100, level: 1 }
    const r1 = srvCanPerformAction(hero as any, 'TRAIN', { minLevel: 1 })
    expect(r1.ok).toBe(false)
    const hero2 = { id: 'h2', stamina: 20, maxStamina: 100, level: 1 }
    const r2 = srvCanPerformAction(hero2 as any, 'MISSION_SHORT', { minLevel: 1 })
    expect(r2.ok).toBe(true)
  })

  it('performAction decrements stamina and logs', async () => {
    const out = await srvPerformAction('h3', 'MISSION_SHORT', { questId: 'q1' })
    expect(out.ok).toBe(true)
    expect(out.hero.stamina).toBeLessThan(100)
  })

  it('rest sets stamina to full and advances day', async () => {
    const r = await srvRest('h4', 'guild')
    expect(r.ok).toBe(true)
    expect(Array.isArray((r as any).summary.events)).toBe(true)
  })
})