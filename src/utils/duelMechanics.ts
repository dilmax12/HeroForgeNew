export type Attrs = { forca: number; destreza: number; constituicao: number; inteligencia: number }
export type Entity = { name: string; hp: number; maxHp: number; armor: number; attrs: Attrs }
export type Status = { id: string; type: 'poison' | 'freeze' | 'buff' | 'debuff'; target: 'hero' | 'enemy'; turns: number; value?: number; attr?: keyof Attrs }

export function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export function validateEntity(e: Entity) {
  const errors: string[] = []
  if (!e.name || typeof e.name !== 'string') errors.push('name')
  if (e.maxHp <= 0) errors.push('maxHp')
  if (e.hp < 0 || e.hp > e.maxHp) errors.push('hp')
  const a = e.attrs
  ;(['forca','destreza','constituicao','inteligencia'] as (keyof Attrs)[]).forEach(k => {
    const v = a[k]
    if (typeof v !== 'number' || v < 0 || v > 100) errors.push(`attr:${k}`)
  })
  return { isValid: errors.length === 0, errors }
}

export function tickStatuses(statuses: Status[], hero: Entity, enemy: Entity) {
  const next: Status[] = []
  statuses.forEach(s => {
    const t = s.target === 'hero' ? hero : enemy
    if (s.type === 'poison') {
      const dot = Math.max(1, Math.floor((t.maxHp || 10) * 0.03))
      t.hp = clamp(t.hp - dot, 0, t.maxHp)
    } else if (s.type === 'buff' && s.attr && s.value) {
      t.attrs[s.attr] = t.attrs[s.attr] + s.value
    } else if (s.type === 'debuff' && s.attr && s.value) {
      t.attrs[s.attr] = Math.max(0, t.attrs[s.attr] - s.value)
    }
    const rem = Math.max(0, s.turns - 1)
    if (rem > 0) next.push({ ...s, turns: rem })
  })
  return next
}

export function baseAttack(attacker: Entity, defender: Entity) {
  const baseHit = 50 + (attacker.attrs.destreza - defender.attrs.destreza) * 3
  const hitChance = clamp(baseHit, 5, 95)
  const roll = Math.floor(Math.random() * 100) + 1
  if (roll > hitChance) return { hit: false, damage: 0 }
  const weaponAtk = 2
  const baseDamage = attacker.attrs.forca + weaponAtk
  const crit = Math.random() < 0.05
  const dmg = Math.max(1, Math.floor(baseDamage * (crit ? 1.5 : 1) - defender.armor))
  return { hit: true, damage: dmg }
}

export function performDuelTurn(params: { hero: Entity; enemy: Entity; statuses: Status[]; heroActsFirst: boolean; action: 'fisico' | 'especial' }) {
  const { hero, enemy, heroActsFirst } = params
  let statuses = tickStatuses(params.statuses, hero, enemy)
  if (heroActsFirst) {
    if (params.action === 'especial') {
      statuses = [...statuses, { id: `poison-${Date.now()}`, type: 'poison', target: 'enemy', turns: 3 }]
    } else {
      const r = baseAttack(hero, enemy)
      enemy.hp = clamp(enemy.hp - r.damage, 0, enemy.maxHp)
    }
    if (enemy.hp > 0) {
      const r2 = baseAttack(enemy, hero)
      hero.hp = clamp(hero.hp - r2.damage, 0, hero.maxHp)
    }
  } else {
    const r1 = baseAttack(enemy, hero)
    hero.hp = clamp(hero.hp - r1.damage, 0, hero.maxHp)
    if (hero.hp > 0) {
      if (params.action === 'especial') {
        statuses = [...statuses, { id: `poison-${Date.now()}`, type: 'poison', target: 'enemy', turns: 3 }]
      } else {
        const r = baseAttack(hero, enemy)
        enemy.hp = clamp(enemy.hp - r.damage, 0, enemy.maxHp)
      }
    }
  }
  return { hero, enemy, statuses }
}