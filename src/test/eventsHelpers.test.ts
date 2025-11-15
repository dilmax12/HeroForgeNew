import { describe, it, expect } from 'vitest'
import { computeOccupancyPercent, isNearFull } from '../utils/eventsHelpers'

describe('eventsHelpers', () => {
  it('computeOccupancyPercent returns 0-100 bounded', () => {
    expect(computeOccupancyPercent(100, { a: 'yes', b: 'no' })).toBe(1)
    expect(computeOccupancyPercent(10, { a: 'yes', b: 'yes' })).toBe(20)
    expect(computeOccupancyPercent(0, {})).toBe(0)
  })

  it('isNearFull detects threshold', () => {
    expect(isNearFull(10, { a: 'yes', b: 'yes', c: 'yes', d: 'yes', e: 'yes', f: 'yes', g: 'yes', h: 'yes', i: 'yes' }, 0.9)).toBe(true)
    expect(isNearFull(10, { a: 'yes', b: 'yes' }, 0.9)).toBe(false)
  })
})