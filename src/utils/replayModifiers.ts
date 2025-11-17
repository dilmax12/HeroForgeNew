export function getWeeklyMutatorEnemyElement(): string | null {
  try {
    const raw = localStorage.getItem('replay_weekly_mutator')
    if (!raw) return null
    const obj = JSON.parse(raw)
    const el = obj?.modifiers?.enemy_element
    return typeof el === 'string' ? el : null
  } catch { return null }
}

export function getGlobalCritBonus(): number {
  try {
    const rawRelics = localStorage.getItem('replay_player_relics')
    const list = rawRelics ? JSON.parse(rawRelics) : []
    let bonus = 0
    for (const r of list || []) {
      const b = r?.effect?.global_crit_bonus
      if (typeof b === 'number') bonus += b
    }
    return Math.max(0, Math.min(0.5, bonus))
  } catch { return 0 }
}

export function getEnemyDamageMultiplier(): number {
  try {
    const raw = localStorage.getItem('replay_global_events')
    const list = raw ? JSON.parse(raw) : []
    let mult = 1
    for (const e of list || []) {
      const m = e?.modifiers?.enemy_damage_multiplier
      if (typeof m === 'number') mult *= m
    }
    return Math.max(0.5, Math.min(3, mult))
  } catch { return 1 }
}

export function getRareItemChanceBonus(): number {
  try {
    const raw = localStorage.getItem('replay_global_events')
    const list = raw ? JSON.parse(raw) : []
    let bonus = 0
    for (const e of list || []) {
      const b = e?.modifiers?.rare_item_chance
      if (typeof b === 'number') bonus += b
    }
    return Math.max(0, Math.min(0.5, bonus))
  } catch { return 0 }
}