import { describe, it, expect } from 'vitest'
import { updateElo, ratingTier } from './duelRating'

describe('updateElo', () => {
  it('increases rating on win', () => {
    const next = updateElo(1000, 1000, true)
    expect(next).toBeGreaterThan(1000)
  })
  it('decreases rating on loss', () => {
    const next = updateElo(1000, 1000, false)
    expect(next).toBeLessThan(1000)
  })
  it('maps rating to tier', () => {
    expect(ratingTier(900)).toBe('Bronze')
    expect(ratingTier(1100)).toBe('Prata')
    expect(ratingTier(1300)).toBe('Ouro')
    expect(ratingTier(1500)).toBe('Platina')
    expect(ratingTier(1700)).toBe('Diamante')
    expect(ratingTier(1900)).toBe('Lendário')
  })
})