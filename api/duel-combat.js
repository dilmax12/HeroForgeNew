// Resolução de combate no servidor com PRNG determinístico

function mulberry32(seed) {
  let t = seed >>> 0
  return function() {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

const ELEMENT_ADV = { fire: { beats: ['ice'] }, ice: { beats: ['thunder'] }, thunder: { beats: ['earth'] }, earth: { beats: ['fire'] }, light: { beats: ['dark'] }, dark: { beats: ['light'] }, physical: { beats: [] } }
function elementMult(atkElem, defElem) {
  let base = 1
  if ((ELEMENT_ADV[atkElem]?.beats || []).includes(defElem)) base *= 1.3
  if ((ELEMENT_ADV[defElem]?.beats || []).includes(atkElem)) base *= 0.75
  return clamp(base, 0.4, 2.5)
}
function baseAttack(attacker, defender, rng, attackElement = 'physical', defendElement = 'physical') {
  const baseHit = 50 + (attacker.destreza - defender.destreza) * 3
  const hitChance = clamp(baseHit, 5, 95)
  const roll = Math.floor(rng() * 100) + 1
  if (roll > hitChance) return { hit: false, damage: 0, crit: false }
  const weaponAtk = 2
  const baseDamage = attacker.forca + weaponAtk
  const crit = rng() < 0.05
  const em = elementMult(attackElement, defendElement)
  const dmg = Math.max(1, Math.floor(baseDamage * (crit ? 1.5 : 1) * em - defender.armor))
  return { hit: true, damage: dmg, crit, em }
}

function createEnemyFromLevel(level, rng) {
  const names = ['Lobo','Goblin','Bandido','Esqueleto','Troll']
  const name = names[Math.floor(rng() * names.length)]
  const mult = 1 + (level - 1) * 0.3
  const hp = Math.floor((20 + level * 5) * mult)
  return {
    name,
    hp,
    maxHp: hp,
    armor: Math.floor(2 * mult),
    forca: Math.floor(5 * mult),
    destreza: Math.floor(5 * mult),
    constituicao: Math.floor(5 * mult)
  }
}

export function resolveServerCombat(hero, opponent, seed = Date.now()) {
  const rng = mulberry32(typeof seed === 'number' ? seed : Number(String(seed).slice(-8)))
  const log = []
  const h = {
    name: hero.name,
    hp: hero.hp,
    maxHp: hero.maxHp,
    armor: hero.armor,
    forca: hero.forca,
    destreza: hero.destreza,
    constituicao: hero.constituicao,
    element: hero.element || 'physical'
  }
  const e = opponent && opponent.name ? { ...opponent } : createEnemyFromLevel(hero.level || 1, rng)
  const heroElem = h.element || 'physical'
  const enemyElem = ['fire','ice','thunder','earth','light','dark'][Math.floor(rng() * 6)]
  log.push(`${h.name} desafia ${e.name}!`)
  const heroFirst = h.destreza >= e.destreza
  let turn = 1
  const maxTurns = 20
  let enemyFrozenTurns = 0

  while (h.hp > 0 && e.hp > 0 && turn <= maxTurns) {
    const ramp = 1 + Math.min(0.10 + turn * 0.06, 2.0)
    if (heroFirst) {
      const r1 = baseAttack(h, e, rng, heroElem, enemyElem)
      e.hp = clamp(e.hp - Math.floor(r1.damage * ramp), 0, e.maxHp)
      log.push(`Turno ${turn}: ${h.name} ${r1.hit ? `causa ${Math.floor(r1.damage * ramp)}${r1.crit ? ' CRÍTICO!' : ''}${r1.em > 1 ? ' (super efetivo!)' : r1.em < 1 ? ' (pouco efetivo)' : ''}` : 'erra o ataque!'}`)
      if (e.hp > 0 && enemyFrozenTurns <= 0) {
        const r2 = baseAttack(e, h, rng, enemyElem, heroElem)
        h.hp = clamp(h.hp - Math.floor(r2.damage * ramp), 0, h.maxHp)
        log.push(`Turno ${turn}: ${e.name} ${r2.hit ? `causa ${Math.floor(r2.damage * ramp)}${r2.crit ? ' CRÍTICO!' : ''}${r2.em > 1 ? ' (super efetivo!)' : r2.em < 1 ? ' (pouco efetivo)' : ''}` : 'erra o ataque!'}`)
      }
    } else {
      const r1 = baseAttack(e, h, rng, enemyElem, heroElem)
      h.hp = clamp(h.hp - Math.floor(r1.damage * ramp), 0, h.maxHp)
      log.push(`Turno ${turn}: ${e.name} ${r1.hit ? `causa ${Math.floor(r1.damage * ramp)}${r1.crit ? ' CRÍTICO!' : ''}${r1.em > 1 ? ' (super efetivo!)' : r1.em < 1 ? ' (pouco efetivo)' : ''}` : 'erra o ataque!'}`)
      if (h.hp > 0) {
        const r2 = baseAttack(h, e, rng, heroElem, enemyElem)
        e.hp = clamp(e.hp - Math.floor(r2.damage * ramp), 0, e.maxHp)
        log.push(`Turno ${turn}: ${h.name} ${r2.hit ? `causa ${Math.floor(r2.damage * ramp)}${r2.crit ? ' CRÍTICO!' : ''}${r2.em > 1 ? ' (super efetivo!)' : r2.em < 1 ? ' (pouco efetivo)' : ''}` : 'erra o ataque!'}`)
      }
    }
    // Chance pequena de congelar inimigo por 1 turno
    if (rng() < 0.05) {
      enemyFrozenTurns = 1
      log.push(`❄️ ${e.name} fica congelado e perde a ação`)
    } else {
      enemyFrozenTurns = Math.max(0, enemyFrozenTurns - 1)
    }
    turn++
  }

  let victory = e.hp <= 0 && h.hp > 0
  if (!victory && h.hp > 0 && e.hp > 0) {
    // Empate por tempo: considerar vitória parcial do herói se causou mais dano
    const heroDamage = h.maxHp - h.hp
    const enemyDamage = e.maxHp - e.hp
    victory = enemyDamage >= heroDamage
  }

  const xp = victory ? Math.floor(e.maxHp + e.forca + e.destreza) : Math.floor((e.maxHp + e.forca) * 0.2)
  const gold = victory ? Math.floor((e.maxHp + e.forca) * 0.6) : Math.floor((e.maxHp) * 0.1)
  log.push(victory ? `🎉 Vitória! +${xp} XP, +${gold} ouro` : `💥 Derrota. +${xp} XP, +${gold} ouro`)

  return {
    victory,
    damage: h.maxHp - h.hp,
    xpGained: xp,
    goldGained: gold,
    log
  }
}

export function buildOpponentFromHero(hero) {
  return {
    name: hero.name,
    hp: hero.derivedAttributes?.hp || 30,
    maxHp: hero.derivedAttributes?.hp || 30,
    armor: hero.derivedAttributes?.armorClass || 2,
    forca: hero.attributes?.forca || 5,
    destreza: hero.attributes?.destreza || 5,
    constituicao: hero.attributes?.constituicao || 5
  }
}