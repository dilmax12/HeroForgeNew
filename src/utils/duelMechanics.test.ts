import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { clamp, baseAttack, tickStatuses, performDuelTurn, Entity, Status, validateEntity } from './duelMechanics'

let hero: Entity
let enemy: Entity

beforeEach(() => {
  hero = { name: 'Hero', hp: 50, maxHp: 50, armor: 5, attrs: { forca: 8, destreza: 6, constituicao: 6, inteligencia: 4 } }
  enemy = { name: 'Enemy', hp: 40, maxHp: 40, armor: 3, attrs: { forca: 6, destreza: 5, constituicao: 5, inteligencia: 3 } }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('clamp', () => {
  it('limita valores', () => {
    expect(clamp(10, 0, 5)).toBe(5)
    expect(clamp(-1, 0, 5)).toBe(0)
    expect(clamp(3, 0, 5)).toBe(3)
  })
})

describe('baseAttack', () => {
  it('causa dano quando acerta', () => {
    const res = baseAttack(hero, enemy)
    expect(typeof res.damage).toBe('number')
  })
})

describe('tickStatuses', () => {
  it('aplica veneno e reduz turnos', () => {
    const statuses: Status[] = [{ id: 'p1', type: 'poison', target: 'enemy', turns: 2 }]
    const next = tickStatuses(statuses, hero, enemy)
    expect(next[0].turns).toBe(1)
    expect(enemy.hp).toBeLessThan(enemy.maxHp)
  })
})

describe('performDuelTurn', () => {
  it('executa ataque físico na ordem correta', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { enemy: e2 } = performDuelTurn({ hero, enemy, statuses: [], heroActsFirst: true, action: 'fisico' })
    expect(e2.hp).toBeLessThan(40)
  })
  it('aplica especial como veneno', () => {
    const { statuses } = performDuelTurn({ hero, enemy, statuses: [], heroActsFirst: true, action: 'especial' })
    expect(statuses.some(s => s.type === 'poison')).toBe(true)
  })
})

describe('validateEntity', () => {
  it('detecta hp inválido e atributos', () => {
    const bad: Entity = { name: '', hp: 200, maxHp: 50, armor: 0, attrs: { forca: -1, destreza: 6, constituicao: 6, inteligencia: 4 } }
    const v = validateEntity(bad)
    expect(v.isValid).toBe(false)
    expect(v.errors.length).toBeGreaterThan(0)
  })
  it('aceita entidade válida', () => {
    const v = validateEntity(hero)
    expect(v.isValid).toBe(true)
  })
})