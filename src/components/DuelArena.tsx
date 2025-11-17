import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHeroStore } from '../store/heroStore'
import type { Hero, Element, Skill, CombatResult } from '../types/hero'
import { resolveSkillUse } from '../utils/combat'
import { notificationBus } from './NotificationSystem'
import { getWeeklyDuelLeadersServer, submitDuelResult, startDuel, queueForDuel, pollMatch, resolveDuelServer, subscribeToMatchUpdates, getDuelHistory, getRating, getRatingLeaderboard, startMatch, completeMatch, getMatches } from '../services/duelService'

type Mode = '1v1' | '2v2' | 'treino'

type StatusEffect = {
  id: string
  type: 'poison' | 'freeze' | 'burn' | 'buff' | 'debuff'
  target: 'hero' | 'enemy'
  turns: number
  value?: number
  attribute?: keyof Hero['attributes']
}

type EntityState = {
  name: string
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  armor: number
  forca: number
  destreza: number
  constituicao: number
  inteligencia: number
  sabedoria: number
  carisma: number
  element: Element
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function baseAttack(attacker: EntityState, defender: EntityState, elemAtk: Element, elemDef: Element) {
  const baseHit = 50 + (attacker.destreza - defender.destreza) * 3
  const hitChance = clamp(baseHit, 5, 95)
  const roll = Math.floor(Math.random() * 100) + 1
  if (roll > hitChance) return { hit: false, damage: 0, message: `${attacker.name} erra o ataque!` }
  const weaponAtk = 2
  const baseDamage = attacker.forca + weaponAtk
  const crit = Math.random() < 0.05
  const elemMult = 1
  const dmg = Math.max(1, Math.floor(baseDamage * (crit ? 1.5 : 1) * elemMult - defender.armor))
  return { hit: true, damage: dmg, message: `${attacker.name} ataca e causa ${dmg} de dano${crit ? ' CRÍTICO!' : ''}` }
}

function applyStatuses(effects: StatusEffect[], hero: EntityState, enemy: EntityState, log: string[]) {
  const next: StatusEffect[] = []
  effects.forEach((s) => {
    const target = s.target === 'hero' ? hero : enemy
    if (s.type === 'poison') {
      const dot = Math.max(1, Math.floor((target.maxHp || 10) * 0.03))
      target.hp = clamp(target.hp - dot, 0, target.maxHp)
      log.push(`☠️ ${s.target === 'hero' ? hero.name : enemy.name} sofre ${dot} de veneno`)
    } else if (s.type === 'burn') {
      const dot = Math.max(1, Math.floor((target.maxHp || 10) * 0.04))
      target.hp = clamp(target.hp - dot, 0, target.maxHp)
      log.push(`🔥 ${s.target === 'hero' ? hero.name : enemy.name} sofre ${dot} de queimadura`)
    } else if (s.type === 'buff' && s.attribute && s.value) {
      ;(target as any)[s.attribute] = (target as any)[s.attribute] + s.value
      log.push(`✨ Buff ativo em ${s.target === 'hero' ? hero.name : enemy.name}`)
    } else if (s.type === 'debuff' && s.attribute && s.value) {
      ;(target as any)[s.attribute] = Math.max(0, (target as any)[s.attribute] - s.value)
      log.push(`🌀 Debuff ativo em ${s.target === 'hero' ? hero.name : enemy.name}`)
    }
    const remaining = Math.max(0, (s.turns || 0) - 1)
    if (remaining > 0) next.push({ ...s, turns: remaining })
  })
  return next
}

function createEnemy(level: number): EntityState {
  const names = ['Lobo', 'Goblin', 'Bandido', 'Esqueleto', 'Troll']
  const name = names[Math.floor(Math.random() * names.length)]
  const mult = 1 + (level - 1) * 0.3
  const hp = Math.floor((20 + level * 5) * mult)
  return {
    name,
    hp,
    maxHp: hp,
    mp: 6 + Math.floor(level / 2),
    maxMp: 6 + Math.floor(level / 2) + 4,
    armor: Math.floor(2 * mult),
    forca: Math.floor(5 * mult),
    destreza: Math.floor(5 * mult),
    constituicao: Math.floor(5 * mult),
    inteligencia: 3,
    sabedoria: 3,
    carisma: 3,
    element: 'physical'
  }
}

function heroToEntity(hero: Hero): EntityState {
  return {
    name: hero.name,
    hp: hero.derivedAttributes.currentHp || hero.derivedAttributes.hp,
    maxHp: hero.derivedAttributes.hp,
    mp: hero.derivedAttributes.currentMp || hero.derivedAttributes.mp,
    maxMp: hero.derivedAttributes.mp,
    armor: hero.derivedAttributes.armorClass,
    forca: hero.attributes.forca,
    destreza: hero.attributes.destreza,
    constituicao: hero.attributes.constituicao,
    inteligencia: hero.attributes.inteligencia,
    sabedoria: hero.attributes.sabedoria,
    carisma: hero.attributes.carisma,
    element: hero.element
  }
}

export default function DuelArena() {
  const { getSelectedHero, gainXP, gainGold, updateHero } = useHeroStore()
  const selectedHero = getSelectedHero()
  const [mode, setMode] = useState<Mode>('1v1')
  const [turnTime, setTurnTime] = useState(15)
  const [timeLeft, setTimeLeft] = useState(turnTime)
  const [heroE, setHeroE] = useState<EntityState | null>(null)
  const [enemyE, setEnemyE] = useState<EntityState | null>(null)
  const [allyE, setAllyE] = useState<EntityState | null>(null)
  const [enemy2E, setEnemy2E] = useState<EntityState | null>(null)
  const [statuses, setStatuses] = useState<StatusEffect[]>([])
  const [isHeroTurn, setIsHeroTurn] = useState(true)
  const [inCombat, setInCombat] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [leaders, setLeaders] = useState<{ heroName: string; wins: number; total: number }[]>([])
  const [matchInfo, setMatchInfo] = useState<any>(null)
  const [manualOpponentId, setManualOpponentId] = useState<string>('')
  const [serverMode, setServerMode] = useState(false)
  const matchUnsubRef = useRef<(() => void) | null>(null)
  const [history, setHistory] = useState<{ hero_name: string; opponent_name: string; victory: boolean; xp: number; gold: number; created_at: string }[]>([])
  const [heroRating, setHeroRating] = useState<number>(1000)
  const [opponentRating, setOpponentRating] = useState<number>(1000)
  const [matches, setMatches] = useState<any[]>([])
  const [matchFilter, setMatchFilter] = useState<'all' | 'pending' | 'started' | 'completed'>('all')
  const timerRef = useRef<number | null>(null)

  const heroSkills = useMemo(() => (selectedHero?.skills || []) as Skill[], [selectedHero?.id])

  useEffect(() => {
    let mounted = true
    getWeeklyDuelLeadersServer().then((r) => {
      if (!mounted) return
      const entries = (r.entries || []) as any[]
      setLeaders(entries.map((e) => ({ heroName: e.heroName || e.hero_name || '—', wins: e.wins || e.best || 0, total: e.count || e.total || 0 })))
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      getWeeklyDuelLeadersServer().then((r)=>{
        const entries = (r.entries || []) as any[]
        setLeaders(entries.map((e) => ({ heroName: e.heroName || e.hero_name || '—', wins: e.wins || e.best || 0, total: e.count || e.total || 0 })))
      }).catch(()=>{})
    }, 30000)
    return () => { window.clearInterval(id) }
  }, [])

  useEffect(() => {
    const h = useHeroStore.getState().getSelectedHero()
    if (!h) return
    getDuelHistory(h.id).then(r => { if (r.events) setHistory(r.events) }).catch(()=>{})
    getMatches(h.id).then(r => { if (r.matches) setMatches(r.matches) }).catch(()=>{})
    const id = window.setInterval(() => {
      getDuelHistory(h.id).then(r => { if (r.events) setHistory(r.events) }).catch(()=>{})
      getMatches(h.id).then(r => { if (r.matches) setMatches(r.matches) }).catch(()=>{})
    }, 30000)
    return () => { window.clearInterval(id) }
  }, [selectedHero?.id])

  useEffect(() => {
    const h = useHeroStore.getState().getSelectedHero()
    if (!h) return
    getRating(h.id).then(r => setHeroRating(r.rating)).catch(()=>{})
  }, [selectedHero?.id])

  useEffect(() => {
    if (!manualOpponentId) { setOpponentRating(1000); return }
    getRating(manualOpponentId).then(r => setOpponentRating(r.rating)).catch(()=>{})
  }, [manualOpponentId])

  useEffect(() => {
    if (!inCombat) return
    setTimeLeft(turnTime)
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(timerRef.current!)
          if (isHeroTurn) handleAction('fisico')
        }
        return Math.max(0, t - 1)
      })
    }, 1000)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [inCombat, isHeroTurn, turnTime])

  function startNewDuel() {
    if (!selectedHero) return
    const h = heroToEntity(selectedHero)
    const e = manualOpponentId
      ? heroToEntity(useHeroStore.getState().heroes.find(x => x.id === manualOpponentId) as Hero)
      : createEnemy(selectedHero.progression.level)
    setHeroE(h)
    setEnemyE(e)
    if (mode === '2v2') {
      const ally = { ...h, name: `${selectedHero.name} (Aliado)` }
      const e2 = createEnemy(selectedHero.progression.level)
      setAllyE(ally)
      setEnemy2E(e2)
    } else {
      setAllyE(null)
      setEnemy2E(null)
    }
    setStatuses([])
    setLog([`${h.name} desafia ${e.name}!`])
    setIsHeroTurn(h.destreza >= e.destreza)
    setInCombat(true)
    startDuel({ heroId: selectedHero.id, heroName: selectedHero.name, opponentName: e.name, mode }).catch(() => {})
  }

  function pushLog(line: string) {
    setLog((L) => [...L, line])
  }

  function endCombat(victory: boolean) {
    setInCombat(false)
    const isTraining = mode === 'treino'
    const xp = isTraining ? 0 : (victory ? Math.floor((enemyE?.maxHp || 10) + (enemyE?.forca || 5)) : 0)
    const gold = isTraining ? 0 : (victory ? Math.floor((enemyE?.maxHp || 10) * 0.6) : 0)
    if (selectedHero) {
      if (!isTraining) {
        gainXP(selectedHero.id, xp)
        gainGold(selectedHero.id, gold)
      }
      const h = useHeroStore.getState().heroes.find(x => x.id === selectedHero.id)
      if (h) {
        const stats = { ...(h.stats || {}) }
        stats.duelsPlayed = (stats.duelsPlayed || 0) + 1
        if (victory) stats.duelsWon = (stats.duelsWon || 0) + 1
        else stats.duelsLost = (stats.duelsLost || 0) + 1
        updateHero(selectedHero.id, { stats })
      }
    }
    const result: CombatResult = { victory, damage: (heroE?.maxHp || 0) - (heroE?.hp || 0), xpGained: xp, goldGained: gold, itemsGained: [], log }
    if (!isTraining) {
      submitDuelResult({ heroId: selectedHero?.id || '', heroName: selectedHero?.name || '', opponentName: enemyE?.name || '', victory, xp, gold, log }).catch(() => {})
    }
    notificationBus.emit({ type: 'quest', title: victory ? (isTraining ? 'Vitória (Treino)' : 'Vitória') : (isTraining ? 'Derrota (Treino)' : 'Derrota'), message: `XP ${xp} • Ouro ${gold}`, duration: 3000 })
  }

  function applyTurnStatuses() {
    if (!heroE || !enemyE) return
    const copyH = { ...heroE }
    const copyE = { ...enemyE }
    const next = applyStatuses(statuses, copyH, copyE, log)
    setHeroE(copyH)
    setEnemyE(copyE)
    setStatuses(next)
  }

  function handleAction(kind: 'fisico' | 'magico' | 'especial', skillId?: string) {
    if (!heroE || !enemyE || !inCombat) return
    const freezeEnemy = statuses.some(s => s.type === 'freeze' && s.target === 'enemy')
    applyTurnStatuses()
    const heroActsFirst = isHeroTurn
    const h = { ...heroE }
    const e = { ...enemyE }
    const ally = allyE ? { ...allyE } : null
    const e2 = enemy2E ? { ...enemy2E } : null
    const turnMsg: string[] = []
    if (heroActsFirst) {
      if (kind === 'fisico') {
        const r = baseAttack(h, e, h.element, e.element)
        e.hp = clamp(e.hp - r.damage, 0, e.maxHp)
        turnMsg.push(r.message)
      } else if (kind === 'magico') {
        const s = (skillId ? heroSkills.find((x) => x.id === skillId) : heroSkills.find((x) => (x as any).type === 'attack')) || heroSkills[0]
        if (s) {
          if (h.mp < (s.cost || 0)) {
            turnMsg.push(`${h.name} tenta usar ${s.name} mas falta MP`)
          } else {
            h.mp = clamp(h.mp - (s.cost || 0), 0, h.maxMp || h.maxHp)
            const res = resolveSkillUse(selectedHero as any, e as any, s as any)
            e.hp = clamp(e.hp - res.damage, 0, e.maxHp)
            if (res.healing && res.healing > 0) {
              h.hp = clamp(h.hp + res.healing, 0, h.maxHp)
            }
            if ((res.effects || []).some((x) => x.includes('freeze'))) {
              setStatuses((S) => [...S, { id: `freeze-${Date.now()}`, type: 'freeze', target: 'enemy', turns: 1 }])
            }
            turnMsg.push(res.message)
          }
        } else {
          const r = baseAttack(h, e, h.element, e.element)
          e.hp = clamp(e.hp - r.damage, 0, e.maxHp)
          turnMsg.push(r.message)
        }
      } else if (kind === 'especial') {
        setStatuses((S) => [...S, { id: `poison-${Date.now()}`, type: 'poison', target: 'enemy', turns: 3 }])
        turnMsg.push('☠️ Veneno aplicado no inimigo')
      }
      if (e.hp > 0 && !freezeEnemy) {
        const r2 = baseAttack(e, h, e.element, h.element)
        h.hp = clamp(h.hp - r2.damage, 0, h.maxHp)
        turnMsg.push(r2.message)
      }
      if (mode === '2v2' && ally && e2 && e2.hp > 0 && ally.hp > 0) {
        const rAlly = baseAttack(ally, e2, ally.element, e2.element)
        e2.hp = clamp(e2.hp - rAlly.damage, 0, e2.maxHp)
        turnMsg.push(`${ally.name} causa ${rAlly.damage} de dano em ${e2.name}`)
        if (e2.hp > 0) {
          const rE2 = baseAttack(e2, ally)
          ally.hp = clamp(ally.hp - rE2.damage, 0, ally.maxHp)
          turnMsg.push(`${e2.name} contra-ataca e causa ${rE2.damage}`)
        }
      }
    } else {
      const r1 = baseAttack(e, h, e.element, h.element)
      h.hp = clamp(h.hp - r1.damage, 0, h.maxHp)
      turnMsg.push(r1.message)
      if (h.hp > 0) {
        if (kind === 'fisico') {
          const r = baseAttack(h, e, h.element, e.element)
          e.hp = clamp(e.hp - r.damage, 0, e.maxHp)
          turnMsg.push(r.message)
        } else if (kind === 'magico') {
          const s = heroSkills.find((x) => (x as any).type === 'attack') || heroSkills[0]
          if (s) {
            if (h.mp < (s.cost || 0)) {
              turnMsg.push(`${h.name} tenta usar ${s.name} mas falta MP`)
            } else {
              h.mp = clamp(h.mp - (s.cost || 0), 0, h.maxMp || h.maxHp)
              const res = resolveSkillUse(selectedHero as any, e as any, s as any)
              e.hp = clamp(e.hp - res.damage, 0, e.maxHp)
              if (res.healing && res.healing > 0) {
                h.hp = clamp(h.hp + res.healing, 0, h.maxHp)
              }
              turnMsg.push(res.message)
            }
          } else {
            const r = baseAttack(h, e, h.element, e.element)
            e.hp = clamp(e.hp - r.damage, 0, e.maxHp)
            turnMsg.push(r.message)
          }
        } else if (kind === 'especial') {
          setStatuses((S) => [...S, { id: `poison-${Date.now()}`, type: 'poison', target: 'enemy', turns: 3 }])
          turnMsg.push('☠️ Veneno aplicado no inimigo')
        }
      }
      if (mode === '2v2' && ally && e2) {
        if (ally.hp > 0) {
          const rAlly = baseAttack(ally, e2, ally.element, e2.element)
          e2.hp = clamp(e2.hp - rAlly.damage, 0, e2.maxHp)
          turnMsg.push(`${ally.name} causa ${rAlly.damage} em ${e2.name}`)
        }
        if (e2.hp > 0) {
          const rE2 = baseAttack(e2, ally)
          ally.hp = clamp(ally.hp - rE2.damage, 0, ally.maxHp)
          turnMsg.push(`${e2.name} causa ${rE2.damage} em ${ally.name}`)
        }
      }
    }
    setHeroE(h)
    setEnemyE(e)
    if (ally) setAllyE(ally)
    if (e2) setEnemy2E(e2)
    pushLog(`Turno: ${turnMsg.join(' • ')}`)
    setIsHeroTurn(!isHeroTurn)
    setTimeLeft(turnTime)
    if (mode === '2v2') {
      const teamHeroDown = h.hp <= 0 && (!ally || ally.hp <= 0)
      const teamEnemyDown = e.hp <= 0 && (!e2 || e2.hp <= 0)
      if (teamHeroDown || teamEnemyDown) endCombat(teamEnemyDown)
    } else {
      if (h.hp <= 0 || e.hp <= 0) endCombat(e.hp <= 0)
    }
  }

  if (!selectedHero) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">⚔️</div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Nenhum herói selecionado</h2>
        <p className="text-slate-300">Selecione um herói para entrar na Arena de Duelos.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-100">Arena de Duelos</h1>
      <div className="mt-2 text-slate-300">Modo: {mode.toUpperCase()} • Limite por turno: {turnTime}s</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={`px-3 py-2 rounded ${mode==='1v1'?'bg-indigo-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('1v1')}>1v1</button>
        <button className={`px-3 py-2 rounded ${mode==='2v2'?'bg-indigo-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('2v2')}>2v2</button>
        <button className={`px-3 py-2 rounded ${mode==='treino'?'bg-indigo-600 text-white':'bg-gray-200'}`} onClick={()=>setMode('treino')}>Treino</button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-slate-300">Tempo/Turno</label>
          <input type="number" className="w-16 px-2 py-1 rounded border" value={turnTime} onChange={e=>setTurnTime(clamp(parseInt(e.target.value||'15',10),5,60))} />
          <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={startNewDuel}>Iniciar Duelo</button>
          <label className="flex items-center gap-1 text-sm text-slate-300">
            <input type="checkbox" checked={serverMode} onChange={e=>setServerMode(e.target.checked)} /> Resolver no Servidor
          </label>
          {serverMode && selectedHero && (
            <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={async()=>{
              const h = {
                id: selectedHero.id,
                name: selectedHero.name,
                hp: selectedHero.derivedAttributes.currentHp || selectedHero.derivedAttributes.hp,
                maxHp: selectedHero.derivedAttributes.hp,
                armor: selectedHero.derivedAttributes.armorClass,
                forca: selectedHero.attributes.forca,
                destreza: selectedHero.attributes.destreza,
                constituicao: selectedHero.attributes.constituicao,
                level: selectedHero.progression.level
              }
              const opponentHero = manualOpponentId ? useHeroStore.getState().heroes.find(x=>x.id===manualOpponentId) : undefined
              const r = await resolveDuelServer({ hero: h, opponentHero, seed: Date.now() })
              if (r.ok && r.result) {
                setLog(r.result.log || [])
                const victory = !!r.result.victory
                if (victory) {
                  gainXP(selectedHero.id, r.result.xpGained || 0)
                  gainGold(selectedHero.id, r.result.goldGained || 0)
                }
                submitDuelResult({ heroId: selectedHero.id, heroName: selectedHero.name, opponentName: (opponentHero?.name)||'', victory, xp: r.result.xpGained || 0, gold: r.result.goldGained || 0, log: r.result.log || [] }).catch(()=>{})
                notificationBus.emit({ type: 'quest', title: victory ? 'Vitória (Servidor)' : 'Derrota (Servidor)', message: `XP ${r.result.xpGained} • Ouro ${r.result.goldGained}`, duration: 3000 })
                if (matchInfo && matchInfo.id) {
                  const winnerId = victory ? selectedHero.id : (manualOpponentId || matchInfo.b_id)
                  const winnerName = victory ? selectedHero.name : (opponentHero?.name || matchInfo.b_name)
                  await completeMatch({ matchId: matchInfo.id, winnerId, winnerName, xp: r.result.xpGained || 0, gold: r.result.goldGained || 0, durationMs: 0 })
                }
              }
            }}>Simular (Servidor)</button>
          )}
          {selectedHero && (
            <>
              <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={async()=>{
                const r = await queueForDuel(selectedHero.id, selectedHero.name)
                if (r.matched && r.match) {
                  setMatchInfo(r.match)
                  notificationBus.emit({ type: 'quest', title: 'Partida Encontrada', message: `${r.match.a_name} vs ${r.match.b_name}`, duration: 2500 })
                } else {
                  notificationBus.emit({ type: 'quest', title: 'Fila', message: 'Aguardando oponente…', duration: 2000 })
                  if (matchUnsubRef.current) { try { matchUnsubRef.current() } catch {} }
                  matchUnsubRef.current = subscribeToMatchUpdates(selectedHero.id, (m)=>{
                    setMatchInfo(m)
                    try { notificationBus.emit({ type: 'quest', title: 'Partida Encontrada', message: `${m.a_name} vs ${m.b_name}`, duration: 2500 }) } catch {}
                  })
                }
              }}>Entrar na Fila</button>
              <button className="px-3 py-2 rounded bg-gray-800 text-white" onClick={async()=>{
                const r = await pollMatch(selectedHero.id)
                if (r.match) {
                  setMatchInfo(r.match)
                  notificationBus.emit({ type: 'quest', title: 'Partida', message: `${r.match.a_name} vs ${r.match.b_name}`, duration: 2000 })
                } else {
                  notificationBus.emit({ type: 'quest', title: 'Partida', message: 'Nenhuma partida encontrada', duration: 2000 })
                }
              }}>Checar Partida</button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded border border-gray-200 p-4 bg-white text-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Combate</div>
            <div className="text-sm">Tempo restante: {inCombat ? `${timeLeft}s` : '-'}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="font-semibold">{heroE?.name || selectedHero.name}</div>
              <div className="h-3 rounded bg-gray-200 overflow-hidden mt-2">
                <motion.div layout className="h-3 bg-green-500" style={{width: `${heroE? Math.floor((heroE.hp/heroE.maxHp)*100):100}%`}} />
              </div>
              <div className="text-xs text-gray-600 mt-1">HP {heroE?.hp || selectedHero.derivedAttributes.hp} / {heroE?.maxHp || selectedHero.derivedAttributes.hp}</div>
              <div className="h-3 rounded bg-gray-200 overflow-hidden mt-2">
                <motion.div layout className="h-3 bg-blue-500" style={{width: `${heroE? Math.floor(((heroE.mp||0)/(heroE.maxMp||heroE.maxHp))*100):100}%`}} />
              </div>
              <div className="text-xs text-gray-600 mt-1">MP {heroE?.mp || selectedHero.derivedAttributes.mp} / {heroE ? (heroE.maxMp || heroE.maxHp) : selectedHero.derivedAttributes.mp}</div>
              {mode==='2v2' && allyE && (
                <div className="mt-3">
                  <div className="font-semibold">{allyE.name}</div>
                  <div className="h-3 rounded bg-gray-200 overflow-hidden mt-2">
                    <motion.div layout className="h-3 bg-green-400" style={{width: `${Math.floor((allyE.hp/allyE.maxHp)*100)}%`}} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">HP {allyE.hp} / {allyE.maxHp}</div>
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold text-right">{enemyE?.name || '—'}</div>
              <div className="h-3 rounded bg-gray-200 overflow-hidden mt-2">
                <motion.div layout className="h-3 bg-red-500" style={{width: `${enemyE? Math.floor((enemyE.hp/enemyE.maxHp)*100):0}%`}} />
              </div>
              <div className="text-xs text-gray-600 mt-1 text-right">HP {enemyE?.hp || 0} / {enemyE?.maxHp || 0}</div>
              <div className="h-3 rounded bg-gray-200 overflow-hidden mt-2">
                <motion.div layout className="h-3 bg-cyan-500" style={{width: `${enemyE? Math.floor(((enemyE.mp||0)/(enemyE.maxMp||enemyE.maxHp))*100):0}%`}} />
              </div>
              <div className="text-xs text-gray-600 mt-1 text-right">MP {enemyE?.mp || 0} / {enemyE ? (enemyE.maxMp || enemyE.maxHp) : 0}</div>
              {mode==='2v2' && enemy2E && (
                <div className="mt-3">
                  <div className="font-semibold text-right">{enemy2E.name}</div>
                  <div className="h-3 rounded bg-gray-200 overflow-hidden mt-2">
                    <motion.div layout className="h-3 bg-red-400" style={{width: `${Math.floor((enemy2E.hp/enemy2E.maxHp)*100)}%`}} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1 text-right">HP {enemy2E.hp} / {enemy2E.maxHp}</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button disabled={!inCombat} onClick={()=>handleAction('fisico')} className={`px-3 py-2 rounded ${inCombat?'bg-gray-800 text-white':'bg-gray-300 text-gray-600'}`}>Ataque Físico</button>
            <button disabled={!inCombat} onClick={()=>handleAction('magico')} className={`px-3 py-2 rounded ${inCombat?'bg-indigo-600 text-white':'bg-gray-300 text-gray-600'}`}>Magia</button>
            <button disabled={!inCombat} onClick={()=>handleAction('especial')} className={`px-3 py-2 rounded ${inCombat?'bg-amber-600 text-white':'bg-gray-300 text-gray-600'}`}>Especial</button>
          </div>

        <div className="mt-4 h-48 overflow-y-auto rounded bg-gray-100 p-3 text-sm text-gray-800">
          {log.map((l,i)=>(
            <AnimatePresence key={i}>
              <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>{l}</motion.div>
            </AnimatePresence>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-gray-700">
          <div>
            <div className="font-semibold">Status do Herói</div>
            <div className="flex gap-2">
              {statuses.filter(s=>s.target==='hero').map(s=> (
                <span key={s.id} title={s.type}>{s.type==='poison'?'☠️':s.type==='freeze'?'❄️':s.type==='burn'?'🔥':'✨'}</span>
              ))}
              {statuses.filter(s=>s.target==='hero').length===0 && <span>—</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">Status do Inimigo</div>
            <div className="flex gap-2 justify-end">
              {statuses.filter(s=>s.target==='enemy').map(s=> (
                <span key={s.id} title={s.type}>{s.type==='poison'?'☠️':s.type==='freeze'?'❄️':s.type==='burn'?'🔥':'✨'}</span>
              ))}
              {statuses.filter(s=>s.target==='enemy').length===0 && <span>—</span>}
            </div>
          </div>
        </div>
        </div>

        <div className="rounded border border-gray-200 p-4 bg-white text-gray-800">
          <div className="text-lg font-semibold">Ranking Semanal</div>
          <div className="mt-2 space-y-2">
            {leaders.length === 0 && <div className="text-sm text-gray-600">Sem entradas</div>}
            {leaders.slice(0,10).map((e,idx)=> (
              <div key={idx} className="flex justify-between text-sm">
                <div>{idx+1}. {e.heroName}</div>
                <div>{e.wins} vitórias</div>
              </div>
            ))}
          </div>
          {matchInfo && (
            <div className="mt-4 text-sm text-gray-700">
              <div className="font-semibold">Partida</div>
              <div>{matchInfo.a_name} vs {matchInfo.b_name}</div>
              <div>Status: {matchInfo.status || 'pending'}</div>
              {matchInfo.status !== 'started' && (
                <div className="mt-2">
                  <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={async()=>{
                    const r = await startMatch(matchInfo.id)
                    if (r.match) setMatchInfo(r.match)
                  }}>Iniciar Partida</button>
                </div>
              )}
            </div>
          )}
          <div className="mt-4">
            <div className="text-sm text-gray-700 font-semibold mb-1">Desafiar Herói</div>
            <div className="flex items-center gap-2">
              <select value={manualOpponentId} onChange={e=>setManualOpponentId(e.target.value)} className="px-3 py-2 rounded border">
                <option value="">Aleatório</option>
                {(useHeroStore.getState().heroes || []).filter(h=>selectedHero && h.id!==selectedHero.id).map(h=> (
                  <option key={h.id} value={h.id}>{h.name} • Lv {h.progression.level}</option>
                ))}
              </select>
              {manualOpponentId && (
                <span className="text-xs text-gray-600">Oponente selecionado: {useHeroStore.getState().heroes.find(h=>h.id===manualOpponentId)?.class}</span>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-700 font-semibold mb-1">Estatísticas</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <div>
                <div className="font-semibold">{heroE?.name || selectedHero.name}</div>
                <div>FOR {heroE?.forca || selectedHero.attributes.forca} • DES {heroE?.destreza || selectedHero.attributes.destreza}</div>
                <div>CON {heroE?.constituicao || selectedHero.attributes.constituicao} • ARM {heroE?.armor || selectedHero.derivedAttributes.armorClass}</div>
                
              </div>
              <div className="text-right">
                <div className="font-semibold">{enemyE?.name || '—'}</div>
                <div>FOR {enemyE?.forca || 0} • DES {enemyE?.destreza || 0}</div>
                <div>CON {enemyE?.constituicao || 0} • ARM {enemyE?.armor || 0}</div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-700 font-semibold mb-1">Rating</div>
            <div className="flex justify-between text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <span>{selectedHero.name}: {heroRating}</span>
                <span className={`px-2 py-0.5 rounded ${heroRating>=1800?'bg-purple-200 text-purple-800':heroRating>=1600?'bg-cyan-200 text-cyan-800':heroRating>=1400?'bg-indigo-200 text-indigo-800':heroRating>=1200?'bg-amber-200 text-amber-800':heroRating>=1000?'bg-gray-200 text-gray-800':'bg-stone-200 text-stone-800'}`}>{ratingTier(heroRating)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{manualOpponentId ? (useHeroStore.getState().heroes.find(h=>h.id===manualOpponentId)?.name) : (enemyE?.name || '—')}: {opponentRating}</span>
                <span className={`px-2 py-0.5 rounded ${opponentRating>=1800?'bg-purple-200 text-purple-800':opponentRating>=1600?'bg-cyan-200 text-cyan-800':opponentRating>=1400?'bg-indigo-200 text-indigo-800':opponentRating>=1200?'bg-amber-200 text-amber-800':opponentRating>=1000?'bg-gray-200 text-gray-800':'bg-stone-200 text-stone-800'}`}>{ratingTier(opponentRating)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-700 font-semibold mb-1">Histórico</div>
            <div className="space-y-1 text-xs text-gray-700">
              {history.length === 0 && <div>Sem eventos</div>}
              {history.slice(0,10).map((ev, i) => (
                <div key={`${ev.created_at}-${i}`} className="flex justify-between">
                  <div>{new Date(ev.created_at).toLocaleString()}</div>
                  <div>{ev.opponent_name || '—'}</div>
                  <div className={ev.victory ? 'text-green-600' : 'text-red-600'}>{ev.victory ? 'Vitória' : 'Derrota'}</div>
                  <div>XP {ev.xp} • Ouro {ev.gold}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-700 font-semibold mb-1">Partidas</div>
            <div className="flex items-center gap-2 mb-2">
              <select value={matchFilter} onChange={e=>setMatchFilter(e.target.value as any)} className="px-2 py-1 rounded border text-xs">
                <option value="all">Todas</option>
                <option value="pending">Pendentes</option>
                <option value="started">Iniciadas</option>
                <option value="completed">Concluídas</option>
              </select>
            </div>
            <div className="space-y-1 text-xs text-gray-700">
              {matches.filter(m=> matchFilter==='all' ? true : (m.status===matchFilter)).slice(0,10).map((m,i)=> (
                <div key={`${m.id}-${i}`} className="flex justify-between">
                  <div>{new Date(m.created_at).toLocaleString()}</div>
                  <div>{m.a_name} vs {m.b_name}</div>
                  <div>{m.status}</div>
                  <div>{m.winner_name ? `Vencedor: ${m.winner_name}` : '-'}</div>
                </div>
              ))}
              {matches.length===0 && <div>Sem partidas</div>}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-700 font-semibold mb-1">Leaderboard Elo</div>
            <EloLeaders />
          </div>
        </div>
      </div>
  </div>
)
}
function EloLeaders() {
  const [entries, setEntries] = useState<{ hero_id: string; hero_name: string; rating: number }[]>([])
  useEffect(() => {
    let active = true
    getRatingLeaderboard().then(r => { if (active && r.entries) setEntries(r.entries) }).catch(()=>{})
    const id = window.setInterval(() => { getRatingLeaderboard().then(r => { if (r.entries) setEntries(r.entries) }).catch(()=>{}) }, 60000)
    return () => { active = false; window.clearInterval(id) }
  }, [])
  return (
    <div className="space-y-1 text-xs text-gray-700">
      {entries.length === 0 && <div>Sem entradas</div>}
      {entries.slice(0,10).map((e, i) => (
        <div key={`${e.hero_id}-${i}`} className="flex justify-between">
          <div>{i+1}. {e.hero_name || '—'}</div>
          <div>{e.rating}</div>
        </div>
      ))}
    </div>
  )
}
import { ratingTier } from '../utils/duelRating'