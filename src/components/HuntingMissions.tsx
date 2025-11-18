import React, { useEffect, useMemo, useState } from 'react'
import { useHeroStore } from '../store/heroStore'
import { worldStateManager } from '../utils/worldState'
import { generateHuntingMission, HuntingMission, Biome } from '../utils/huntingGenerator'
import { RANK_ORDER } from '../types/ranks'
import { computeRewardMultiplier } from '../utils/dungeonConfig'
import { rankSystem } from '../utils/rankSystem'
import { generateChestLoot } from '../utils/chestLoot'
import { SHOP_ITEMS } from '../utils/shop'
import { useHeroStore as useStoreRef } from '../store/heroStore'

type PhaseResult = { phase: number; success: boolean; xp: number; gold: number; narrative: string; itemsAwarded?: { id: string; name?: string }[] }

export default function HuntingMissions() {
  const hero = useHeroStore(s => s.getSelectedHero())
  const gainXP = useHeroStore(s => s.gainXP)
  const gainGold = useHeroStore(s => s.gainGold)
  const addItemToInventory = useHeroStore(s => s.addItemToInventory)
  const updateHero = useHeroStore(s => s.updateHero)
  const updateDailyGoalProgress = useHeroStore(s => s.updateDailyGoalProgress)
  const generateEggForSelected = useStoreRef(s => s.generateEggForSelected)

  const [biome, setBiome] = useState<Biome>('Colinas de Boravon')
  const [categorySel, setCategorySel] = useState<'controle'|'coleta'|'escolta'|'especial'|null>(null)
  const [mission, setMission] = useState<HuntingMission | null>(null)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [log, setLog] = useState<PhaseResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [npcIntegrity, setNpcIntegrity] = useState<number | null>(null)
  const [anyLoot, setAnyLoot] = useState(false)
  const getHeroRankProgress = useHeroStore(s => s.getHeroRankProgress)
  const rankProgress = useMemo(() => (hero ? getHeroRankProgress(hero.id) : null), [hero?.id, hero?.progression?.xp, hero?.stats?.questsCompleted])
  const [autoRun, setAutoRun] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const cdMs = useMemo(() => {
    const ends = hero?.hunting?.cooldownEndsAt ? new Date(hero.hunting.cooldownEndsAt).getTime() : 0
    return ends ? Math.max(0, ends - Date.now()) : 0
  }, [hero?.hunting?.cooldownEndsAt])
  const cdActive = cdMs > 0
  const getHuntingCooldownMinutes = () => {
    const r = (hero?.rankData?.currentRank || 'F') as 'F'|'E'|'D'|'C'|'B'|'A'|'S'
    const map: Record<'F'|'E'|'D'|'C'|'B'|'A'|'S', number> = { F: 8, E: 12, D: 15, C: 20, B: 25, A: 30, S: 40 }
    return map[r] || 15
  }

  const phasesTotal = useMemo(() => mission?.phases || 0, [mission?.phases])
  const rank = hero?.rankData?.currentRank

  useEffect(() => {
    if (!hero) return
    const prefCat = (hero.rankData?.currentRank === 'F') ? (categorySel ?? undefined) : undefined
    setMission(generateHuntingMission(hero, biome, prefCat as any))
  }, [hero?.id, biome, categorySel])

  const canEnter = useMemo(() => {
    if (!hero || !mission) return false
    const r = hero.rankData?.currentRank
    const idxHero = RANK_ORDER.indexOf((r || 'F') as any)
    const idxReq = RANK_ORDER.indexOf(mission.rankRequired)
    return idxHero >= idxReq
  }, [hero?.rankData?.currentRank, mission?.rankRequired])

  useEffect(() => {
    if (!mission || !hero) return
    const idxHero = RANK_ORDER.indexOf((hero.rankData?.currentRank || 'F') as any)
    const idxReq = RANK_ORDER.indexOf(mission.rankRequired)
    if (idxHero < idxReq) setError('Rank insuficiente para esta missão de caça.')
    else setError(null)
  }, [mission?.id, hero?.rankData?.currentRank])

  const start = () => {
    if (!hero || !mission) return
    if (!canEnter) { setError('Rank insuficiente para esta missão de caça.'); return }
    if (cdActive) { setError('Cooldown ativo para Missões de Caça. Aguarde o tempo de recarga.'); return }
    const needed = worldStateManager.computeEffectiveStaminaCost(hero, staminaCostPerPhase)
    const currentStamina = (hero.stamina as any)?.current ?? (hero.stamina as any) ?? 0
    if (currentStamina < needed) { setError('Stamina insuficiente para iniciar a caçada.'); return }
    setRunning(true)
    setFinished(false)
    setPhaseIndex(0)
    setLog([])
    setError(null)
    setStreak(0)
    setNpcIntegrity(mission.category === 'escolta' ? 100 : null)
    setAnyLoot(false)
  }

  const staminaCostPerPhase = mission?.rankRequired === 'F' ? 2 : Math.max(2, mission?.staminaPerPhase || 3)
  const estimatedSuccess = useMemo(() => {
    if (!hero || !mission) return null
    const attr = hero.attributes
    const base = mission.difficulty === 'epica' ? 0.45 : mission.difficulty === 'dificil' ? 0.6 : mission.difficulty === 'medio' ? 0.7 : 0.8
    const classBonus = mission.category === 'controle' ? (attr.destreza || 0) * 0.01
      : mission.category === 'coleta' ? (attr.inteligencia || 0) * 0.01
      : mission.category === 'escolta' ? (attr.constituicao || 0) * 0.008
      : (attr.forca || 0) * 0.008
    const chance = Math.max(0.2, Math.min(0.95, base + classBonus))
    return Math.round(chance * 100)
  }, [hero?.id, mission?.id])

  const estimatedTotals = useMemo(() => {
    if (!mission) return null
    const p = (estimatedSuccess ?? 80) / 100
    const xpPer = Math.round(p * mission.baseRewards.xp + (1 - p) * Math.round(mission.baseRewards.xp * 0.5))
    const goldPer = Math.round(p * mission.baseRewards.gold + (1 - p) * Math.round(mission.baseRewards.gold * 0.3))
    return { xp: xpPer * mission.phases, gold: goldPer * mission.phases }
  }, [mission?.id, estimatedSuccess])

  const estimatedTotalStamina = useMemo(() => {
    if (!mission) return 0
    const extra = Math.max(0, mission.phases - 2)
    const baseTotal = staminaCostPerPhase * mission.phases + extra
    return worldStateManager.computeEffectiveStaminaCost(hero as any, baseTotal)
  }, [mission?.phases, staminaCostPerPhase])

  const resolvePhase = () => {
    if (!hero || !mission || finished) return
    const extraPhaseCost = mission.rankRequired === 'F' ? 0 : (phaseIndex >= 2 ? 1 : 0)
    const totalCost = staminaCostPerPhase + extraPhaseCost
    const needed = worldStateManager.computeEffectiveStaminaCost(hero, totalCost)
    const currentStamina = (hero.stamina as any)?.current ?? (hero.stamina as any) ?? 0
    if (currentStamina < needed) { setError('Stamina insuficiente para prosseguir.'); setRunning(false); return }
    worldStateManager.consumeStamina(hero, totalCost)
    updateHero(hero.id, { stamina: hero.stamina })
    const base = mission.difficulty === 'epica' ? 0.45 : mission.difficulty === 'dificil' ? 0.6 : mission.difficulty === 'medio' ? 0.7 : 0.8
    const riskStep = 0.06
    // Bônus por classe/atributo
    const attr = hero.attributes
    const classBonus = mission.category === 'controle' ? (attr.destreza || 0) * 0.01
      : mission.category === 'coleta' ? (attr.inteligencia || 0) * 0.01
      : mission.category === 'escolta' ? (attr.constituicao || 0) * 0.008
      : (attr.forca || 0) * 0.008
    const floor = ((hero.rankData?.currentRank || 'F') === 'F') ? 0.3 : 0.2
    const successChance = Math.max(floor, Math.min(0.95, (base - phaseIndex * riskStep) + classBonus))
    const roll = Math.random()
    const success = roll < successChance
    const mult = computeRewardMultiplier(streak)
    const xpBase = mission.baseRewards.xp
    const goldBase = mission.baseRewards.gold
    const boss = mission.category === 'especial' && phaseIndex + 1 === mission.phases
    const bossMult = boss ? 1.5 : 1
    const xp = Math.round((success ? xpBase : Math.round(xpBase * 0.5)) * mult * bossMult)
    let gold = Math.round((success ? goldBase : Math.round(goldBase * 0.3)) * mult * bossMult)
    const mountRed = worldStateManager.getMountStaminaReduction(hero as any)
    if (mountRed > 0) {
      const rewardBoost = 1 + Math.min(0.3, mountRed * 0.5)
      gold = Math.round(gold * rewardBoost)
    }
    gainXP(hero.id, xp)
    gainGold(hero.id, gold)
    const lootTier = boss ? 'epico' : phaseIndex >= 2 ? 'raro' : phaseIndex >= 1 ? 'incomum' as any : 'comum'
    const itemsEquip = Math.random() < (success ? 0.5 : 0.25) ? generateChestLoot((lootTier as any)) : []
    itemsEquip.forEach(it => addItemToInventory(hero.id, it.id, 1))

    // Loot especializado por categoria
    const categoryPools: Record<string, string[]> = {
      controle: ['pele-lobo-sombrio','colmilho-vampirico','osso-antigo'],
      coleta: ['erva-sangue','essencia-lunar','cristal-runico'],
      escolta: ['pergaminho-protecao','pergaminho-velocidade'],
      especial: boss ? ['lamina-alpha','armadura-pedra-rachada'] : []
    }
    const ids = categoryPools[mission.category] || []
    const extraIds: string[] = []
    if (ids.length) {
      // Chance e quantidade conforme sucesso/risco
      const dropChance = boss ? 1 : success ? 0.7 : 0.4
      const hour = new Date().getHours()
      const isNight = hour < 6 || hour >= 18
      const isDay = hour >= 8 && hour < 17
      const eligible = ids.filter(id => {
        if (id === 'essencia-lunar') return isNight
        if (id === 'erva-sangue') return isDay
        if (id === 'cristal-runico') return mission.biome === 'Caverna Antiga' || mission.biome === 'Ruínas Antigas'
        return true
      })
      if (eligible.length && Math.random() < dropChance) {
        const pickId = eligible[Math.floor(Math.random() * eligible.length)]
        addItemToInventory(hero.id, pickId, 1)
        extraIds.push(pickId)
      }
    }
    // Regras simples de período
    if (mission.timeHint === 'noite') {
      const hour = new Date().getHours()
      if (hour < 6 || hour >= 18) {
        if (Math.random() < (success ? 0.6 : 0.3)) {
          addItemToInventory(hero.id, 'essencia-lunar', 1)
          extraIds.push('essencia-lunar')
        }
      }
    }
    const mapName = (id: string) => SHOP_ITEMS.find(i => i.id === id)?.name || id
    // Emboscadas por bioma
    const ENEMIES_BY_BIOME: Record<string, string[]> = {
      'Colinas de Boravon': ['Lobo Sombrio','Bandido'],
      'Rio Marfim': ['Slime Ácido','Serpente do Rio'],
      'Floresta Nebulosa': ['Morcego Vampiro','Bruxa da Névoa'],
      'Ruínas Antigas': ['Golem Rachado','Esqueleto'],
      'Floresta Umbral': ['Bruxa da Névoa','Lobo Sombrio'],
      'Caverna Antiga': ['Troll de Pedra','Slime Ácido']
    }
    const baseAmbush = mission.category === 'escolta' ? 0.25 : 0.15
    const rankIsF = (hero.rankData?.currentRank || 'F') === 'F'
    const ambush = Math.random() < ((baseAmbush - (rankIsF ? 0.05 : 0)) + (mission.difficulty === 'dificil' ? 0.05 : mission.difficulty === 'epica' ? 0.1 : 0))
    let ambushText = ''
    if (ambush) {
      const enemies = ENEMIES_BY_BIOME[mission.biome] || ['Inimigos']
      const foe = enemies[Math.floor(Math.random() * enemies.length)]
      const ambushDamageBase = Math.round((hero.derivedAttributes.hp || 20) * 0.1)
      const ambushDamage = Math.round(ambushDamageBase * (((hero.rankData?.currentRank || 'F') === 'F') ? 0.5 : 1))
      const curHp2 = hero.derivedAttributes.currentHp ?? (hero.derivedAttributes.hp || 0)
      const newHp2 = Math.max(0, curHp2 - ambushDamage)
      updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: newHp2 } })
      ambushText = ` • Emboscada: ${foe} causa dano durante a fase.`
      if (npcIntegrity !== null) {
        const loss = (((hero.rankData?.currentRank || 'F') === 'F') && mission.category === 'escolta') ? 7 : 10
        setNpcIntegrity(Math.max(0, npcIntegrity - loss))
      }
      const maxHp2 = hero.derivedAttributes.hp || 1
      if ((newHp2 / maxHp2) < 0.2) { setAutoRun(false); setError('HP baixo, auto desativado.') }
    }
    // Penalidades por falha (dano/fadiga e integridade do NPC)
    if (!success) {
      const maxHp = hero.derivedAttributes.hp || 1
      const curHp = hero.derivedAttributes.currentHp ?? maxHp
      const damageBase = Math.round(maxHp * (boss ? 0.2 : 0.1))
      const damage = Math.round(damageBase * (((hero.rankData?.currentRank || 'F') === 'F') ? 0.5 : 1))
      const newHp = Math.max(0, curHp - damage)
      const newFatigue = Math.min(100, (hero.progression.fatigue || 0) + (boss ? 10 : 6))
      updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: newHp }, progression: { ...hero.progression, fatigue: newFatigue } })
      if (npcIntegrity !== null) {
        const baseLoss = boss ? 30 : 15
        const loss = (((hero.rankData?.currentRank || 'F') === 'F') && mission.category === 'escolta') ? (boss ? 20 : 10) : baseLoss
        const next = Math.max(0, npcIntegrity - loss)
        setNpcIntegrity(next)
      }
      const maxHp2 = hero.derivedAttributes.hp || 1
      if ((newHp / maxHp2) < 0.2) { setAutoRun(false); setError('HP baixo, auto desativado.') }
    }
    let narrativeExtra = ''
    const hour2 = new Date().getHours()
    const night2 = hour2 < 6 || hour2 >= 18
    const rank = (hero.rankData?.currentRank || 'F') as 'F'|'E'|'D'|'C'|'B'|'A'|'S'
    const rankBonusMap: Record<'F'|'E'|'D'|'C'|'B'|'A'|'S', number> = { F: 0, E: 0.01, D: 0.02, C: 0.03, B: 0.04, A: 0.05, S: 0.06 }
    const rb = rankBonusMap[rank] || 0
    const eggBase = mission.biome === 'Floresta Nebulosa' || mission.biome === 'Floresta Umbral' ? (night2 ? 0.15 + rb : 0.07 + rb) : mission.biome === 'Caverna Antiga' ? (boss ? 0.2 + rb : 0.06 + rb) : 0.05 + rb
    if (Math.random() < eggBase) {
      generateEggForSelected()
      narrativeExtra = ' 🥚 Ovo misterioso encontrado.'
    }
    if (boss && (mission.biome === 'Caverna Antiga' || mission.biome === 'Ruínas Antigas')) {
      if (Math.random() < 0.25) {
        addItemToInventory(hero.id, 'essencia-bestial', 1)
        extraIds.push('essencia-bestial')
      }
    }
    if (success && npcIntegrity !== null && ((hero.rankData?.currentRank || 'F') === 'F') && mission.category === 'escolta') setNpcIntegrity(Math.min(100, (npcIntegrity || 0) + 5))
    const result: PhaseResult = { phase: phaseIndex + 1, success, xp, gold, narrative: (success ? `Progresso na fase ${phaseIndex + 1}.` : `Revés na fase ${phaseIndex + 1}.`) + ambushText + narrativeExtra, itemsAwarded: [...itemsEquip.map(i => ({ id: i.id, name: i.name })), ...extraIds.map(id => ({ id, name: mapName(id) }))] }
    const newLog = [...log, result]
    setLog(newLog)
    if ((itemsEquip.length > 0) || (extraIds.length > 0)) setAnyLoot(true)
    setStreak(s => s + (success ? 1 : 0))
    setPhaseIndex(i => i + 1)
    if ((npcIntegrity !== null && npcIntegrity <= 0) || (phaseIndex + 1 >= phasesTotal)) {
      setFinished(true)
      setRunning(false)
      const store = useHeroStore.getState()
      const current = store.heroes.find(h => h.id === hero.id)
      if (current) {
        const newStats = { ...current.stats, questsCompleted: (current.stats.questsCompleted || 0) + 1, lastActiveAt: new Date().toISOString() }
        store.updateHero(hero.id, { stats: newStats })
        const ensuredRank = current.rankData ?? rankSystem.initializeRankData(current)
        const newRankData = rankSystem.updateRankData({ ...current, stats: newStats }, ensuredRank)
        store.updateHero(hero.id, { rankData: newRankData })
        updateDailyGoalProgress(hero.id, 'quest-completed', 1)
        const cdMin = getHuntingCooldownMinutes()
        const ends = new Date(Date.now() + cdMin * 60 * 1000).toISOString()
        store.updateHero(hero.id, { hunting: { ...(current.hunting || {}), cooldownEndsAt: ends, lastCompletedAt: new Date().toISOString() } })
      }
      if (mission.rankRequired === 'F' && !anyLoot) {
        const consolation = mission.category === 'coleta' ? 'erva-sangue' : 'osso-antigo'
        addItemToInventory(hero.id, consolation, 1)
        setLog(l => [...l, { phase: phasesTotal, success: true, xp: 0, gold: 0, narrative: 'Recompensa de novato concedida.', itemsAwarded: [{ id: consolation }] }])
      }
    }
  }

  const retreat = () => {
    if (!hero || !mission) return
    const store = useHeroStore.getState()
    const current = store.heroes.find(h => h.id === hero.id)
    if (!current) return
    const newStats = { ...current.stats, questsCompleted: (current.stats.questsCompleted || 0) + 1, lastActiveAt: new Date().toISOString() }
    store.updateHero(hero.id, { stats: newStats })
    const ensuredRank = current.rankData ?? rankSystem.initializeRankData(current)
    const newRankData = rankSystem.updateRankData({ ...current, stats: newStats }, ensuredRank)
    store.updateHero(hero.id, { rankData: newRankData })
    updateDailyGoalProgress(hero.id, 'quest-completed', 1)
    const cdMin = getHuntingCooldownMinutes()
    const ends = new Date(Date.now() + cdMin * 60 * 1000).toISOString()
    store.updateHero(hero.id, { hunting: { ...(current.hunting || {}), cooldownEndsAt: ends, lastCompletedAt: new Date().toISOString() } })
    setFinished(true)
    setRunning(false)
  }

  const restart = () => {
    if (!hero) return
    setMission(generateHuntingMission(hero, biome))
    setFinished(false)
    setRunning(false)
    setPhaseIndex(0)
    setLog([])
    setError(null)
    setStreak(0)
    setNpcIntegrity(null)
  }

  const reroll = () => {
    if (!hero || !mission) return
    let next = generateHuntingMission(hero, biome)
    let guard = 0
    while (guard < 10 && next.category === mission.category && next.biome === mission.biome) {
      next = generateHuntingMission(hero, biome)
      guard++
    }
    setMission(next)
    setError(null)
  }

  useEffect(() => {
    if (running && autoRun && !finished) {
      const t = setTimeout(() => { resolvePhase() }, 500)
      return () => clearTimeout(t)
    }
  }, [running, autoRun, finished, phaseIndex])

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white">Missões de Caça</h2>
      {hero && (
        <div className="text-gray-300">Rank: {hero.rankData?.currentRank || '—'}</div>
      )}
      <div className="mt-3">
        <select value={biome} onChange={(e) => setBiome(e.target.value as Biome)} className="px-3 py-2 rounded bg-gray-800 text-white">
          {(['Colinas de Boravon','Rio Marfim','Floresta Nebulosa','Ruínas Antigas','Floresta Umbral','Caverna Antiga'] as Biome[]).map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        {hero?.rankData?.currentRank === 'F' && (
          <select value={categorySel || ''} onChange={(e) => setCategorySel((e.target.value || null) as any)} className="ml-2 px-3 py-2 rounded bg-gray-800 text-white">
            <option value=''>Aleatória</option>
            {(['controle','coleta','escolta'] as const).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>
      {mission && (
        <div className="mt-4 p-4 border rounded bg-gray-800 border-gray-700">
          <div className="text-white font-semibold">{mission.title} — {mission.biome}</div>
          <div className="text-gray-300 text-sm">Objetivo: {mission.objective}</div>
          {showDetails && (
            <div className="mt-2">
              <div className="text-gray-300 text-sm">Fases: {mission.phases} • Dificuldade: {mission.difficulty} • Recompensa base: +{mission.baseRewards.xp} XP, +{mission.baseRewards.gold} ouro</div>
              {mission.rankRequired === 'F' && (mission.category === 'escolta' || mission.category === 'controle') && (
                <div className="text-emerald-300 text-xs">Bônus Novato ativo para {mission.category}.</div>
              )}
              <div className="text-gray-400 text-xs">Custo estimado de stamina: {staminaCostPerPhase} × {mission.phases} + {Math.max(0, mission.phases - 2)} = {staminaCostPerPhase * mission.phases + Math.max(0, mission.phases - 2)}</div>
              {(() => {
                const red = worldStateManager.getMountStaminaReduction(hero as any);
                if (!red) return null;
                const pct = Math.round(red * 100);
                const baseTotal = staminaCostPerPhase * mission.phases + Math.max(0, mission.phases - 2)
                const effTotal = worldStateManager.computeEffectiveStaminaCost(hero as any, baseTotal)
                return <div className="text-emerald-300 text-xs">Montaria ativa reduz custo em {pct}% • Efetivo: {effTotal}</div>
              })()}
              {estimatedSuccess !== null && (
                <div className="text-gray-400 text-xs">Chance inicial estimada de sucesso (fase 1): {estimatedSuccess}%</div>
              )}
              {rankProgress && rankProgress.progress && (
                <div className="text-gray-400 text-xs mt-1">Progresso para {rankProgress.progress.nextRank || rankProgress.progress.currentRank}: XP {rankProgress.progress.currentXP}/{rankProgress.progress.requiredXP} • Missões {rankProgress.progress.currentMissions}/{rankProgress.progress.requiredMissions}</div>
              )}
              {estimatedTotals && (
                <div className="text-gray-300 text-sm mt-1">Estimativa bruta de recompensa: ~ +{estimatedTotals.xp} XP, +{estimatedTotals.gold} ouro</div>
              )}
              {(() => {
                const red = worldStateManager.getMountStaminaReduction(hero as any)
                if (!red) return null
                const boostPct = Math.round(Math.min(0.3, red * 0.5) * 100)
                return <div className="text-emerald-300 text-xs">Bônus de ouro por montaria: +{boostPct}%</div>
              })()}
              <div className="text-gray-400 text-xs">Dica: atributo que ajuda nesta missão: {mission.category === 'controle' ? 'Destreza' : mission.category === 'coleta' ? 'Inteligência' : mission.category === 'escolta' ? 'Constituição' : 'Força'}</div>
              <div className="text-gray-300 text-sm">Requer Rank: {mission.rankRequired}</div>
              {mission.classHint && <div className="text-gray-400 text-xs">{mission.classHint}</div>}
              {mission.timeHint && <div className="text-gray-400 text-xs">Melhor período: {mission.timeHint}</div>}
              <div className="text-gray-400 text-xs">Possível loot: {(mission.category === 'controle' ? ['pele-lobo-sombrio','colmilho-vampirico','osso-antigo'] : mission.category === 'coleta' ? ['erva-sangue','essencia-lunar','cristal-runico'] : mission.category === 'escolta' ? ['pergaminho-protecao','pergaminho-velocidade'] : []).map((id, idx) => (
                <span key={`pv_${id}_${idx}`} className="inline-block ml-1 px-2 py-0.5 rounded bg-gray-700 text-white text-xs">{SHOP_ITEMS.find(i => i.id === id)?.name || id}</span>
              ))}</div>
            </div>
          )}
          {!running && !finished && (
            <div className="mt-3">
              <button onClick={start} disabled={!hero || !canEnter || cdActive} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Iniciar Caçada</button>
              <button onClick={reroll} disabled={!hero || running || cdActive} className="ml-2 px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50">Nova Missão</button>
              <button onClick={() => setShowDetails(v => !v)} className="ml-2 px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600">{showDetails ? 'Ocultar Detalhes' : 'Detalhes da Missão'}</button>
              {!canEnter && <div className="mt-2 text-sm text-red-300">Rank insuficiente para esta missão.</div>}
              {hero && (((hero.stamina as any)?.current ?? (hero.stamina as any) ?? 0) < worldStateManager.computeEffectiveStaminaCost(hero as any, staminaCostPerPhase)) && <div className="mt-2 text-sm text-amber-300">Stamina insuficiente para iniciar. Restaure energia antes de prosseguir.</div>}
              {hero && estimatedTotalStamina > (((hero.stamina as any)?.current ?? (hero.stamina as any) ?? 0)) && <div className="mt-2 text-sm text-amber-300">Atenção: stamina atual pode não ser suficiente para todas as fases.</div>}
              {canEnter && mission.rankRequired === 'F' && <div className="mt-2 text-sm text-emerald-300">Missão inicial liberada para Novatos (Rank F).</div>}
              {cdActive && <div className="mt-2 text-sm text-amber-300">Cooldown ativo: aguarde {Math.ceil(cdMs/60000)} min.</div>}
              {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
            </div>
          )}
          {running && (
            <div className="mt-3">
              <div className="text-gray-200">Fase {phaseIndex + 1} de {phasesTotal}</div>
              {npcIntegrity !== null && <div className="text-gray-400 text-xs">Integridade do NPC: {npcIntegrity}%</div>}
              {(() => {
                const extraPhaseCost = mission?.rankRequired === 'F' ? 0 : (phaseIndex >= 2 ? 1 : 0)
                const baseNext = staminaCostPerPhase + extraPhaseCost
                const effNext = worldStateManager.computeEffectiveStaminaCost(hero as any, baseNext)
                const redPct = Math.round(worldStateManager.getMountStaminaReduction(hero as any) * 100)
                return <div className="text-emerald-300 text-xs">Custo desta fase: base {baseNext} • efetivo {effNext}{redPct?` • redução ${redPct}%`:''}</div>
              })()}
              <div className="mt-2 flex gap-2">
                <button onClick={resolvePhase} className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Prosseguir</button>
                <button onClick={retreat} className="px-3 py-2 rounded bg-amber-600 text-black hover:bg-amber-500">Recuar e guardar loot</button>
                <button onClick={() => setAutoRun(v => !v)} className={`px-3 py-2 rounded ${autoRun ? 'bg-teal-600' : 'bg-teal-700'} text-white hover:bg-teal-500`}>{autoRun ? 'Auto: ON' : 'Auto: OFF'}</button>
              </div>
              <div className="mt-2 text-sm text-gray-400">Multiplicador atual: x{computeRewardMultiplier(streak).toFixed(2)}</div>
            </div>
          )}
          {log.length > 0 && (
            <div className="mt-4">
              <div className="text-white font-semibold">Registro</div>
              <ul className="mt-2 text-sm text-gray-300 list-disc pl-5">
                {log.map(r => (
                  <li key={r.phase}>Fase {r.phase}: {r.narrative} • +{r.xp} XP, +{r.gold} ouro{r.itemsAwarded && r.itemsAwarded.length ? ` • Loot` : ''}</li>
                ))}
              </ul>
              {/* Loot acumulado */}
              {log.some(r => r.itemsAwarded && r.itemsAwarded.length > 0) && (
                <div className="mt-3">
                  <div className="text-white font-semibold">Loot acumulado</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {log.flatMap(r => r.itemsAwarded || []).map((it, idx) => (
                      <span key={`${it.id}_${idx}`} className="px-2 py-1 rounded bg-gray-700 text-white text-xs">{it.name || it.id}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {finished && (
            <div className="mt-3">
              <div className="text-sm text-gray-200">Caçada finalizada.</div>
              <div className="mt-2 text-sm text-gray-300">Total: +{log.reduce((a,b)=>a+b.xp,0)} XP, +{log.reduce((a,b)=>a+b.gold,0)} ouro</div>
              {log.some(r => r.itemsAwarded && r.itemsAwarded.length) && (
                <div className="mt-2">
                  <div className="text-white font-semibold text-sm">Itens recebidos</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {log.flatMap(r => r.itemsAwarded || []).map((it, idx) => (
                      <span key={`fin_${it.id}_${idx}`} className="px-2 py-1 rounded bg-gray-700 text-white text-xs">{it.name || it.id}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-2">
                <button onClick={() => setFinished(false)} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Completar Missão</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
