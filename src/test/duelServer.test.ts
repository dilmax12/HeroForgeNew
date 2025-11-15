import { describe, it, expect } from 'vitest'
import { resolveServerCombat } from '../../api/duel-combat.js'

describe('resolveServerCombat', () => {
  const hero = { name: 'Teste', hp: 40, maxHp: 40, armor: 4, forca: 8, destreza: 6, constituicao: 6, level: 3 }
  it('retorna resultado válido com seed fixo', () => {
    const r1 = resolveServerCombat(hero, undefined, 12345)
    const r2 = resolveServerCombat(hero, undefined, 12345)
    expect(r1.victory).toBe(r2.victory)
    expect(r1.xpGained).toBe(r2.xpGained)
    expect(Array.isArray(r1.log)).toBe(true)
  })
})