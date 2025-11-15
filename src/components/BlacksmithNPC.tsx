import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHeroStore } from '../store/heroStore'
import { getAvailableRecipes, RECIPES } from '../utils/forging'
import { resumeAudioContextIfNeeded, playSuccess, playFailure, playHammer, playPolish, playForgeStart } from '../utils/audioEffects'
import { SHOP_ITEMS, purchaseItem, getDiscountedPrice, canAfford } from '../utils/shop'
import { RANK_CONFIG } from '../types/ranks'
import { notificationBus } from './NotificationSystem'
import { Link } from 'react-router-dom'

type DialogueType = 'dica' | 'historia' | 'comentario'

interface BlacksmithNPCProps {
  className?: string
}

const DIALOGUES: Record<DialogueType, string[]> = {
  dica: [
    'Use essências arcanas para elevar a raridade sem perder o fio da lâmina.',
    'Combine materiais de mesma categoria para criar itens únicos pela fusão.',
    'A forja simples depende do seu rank. Suba o rank e novas receitas surgem.',
    'Refinar a peça equipada pode render bônus poderosos — mas há risco.'
  ],
  historia: [
    'Já forjei a lâmina do Guardião da Guilda. Brilhou como um sol ao romper o amanhecer.',
    'Quando o martelo canta, lembro do meu mestre. Cada batida carrega um pedaço do seu legado.',
    'O aço que não falha é aquele temperado com paciência. Heróis apressados aprendem isso na marra.'
  ],
  comentario: [
    'O ar hoje está bom para têmpera. Sinto nos ossos.',
    'Cuidado com as fagulhas. Elas têm vontade própria.',
    'Nada como o cheiro de ferro aquecido para começar o dia.'
  ]
}

export const BlacksmithNPC: React.FC<BlacksmithNPCProps> = ({ className = '' }) => {
  const { getSelectedHero, craftItem, refineEquippedItem, fuseItems, enchantEquippedItem, updateHero } = useHeroStore()
  const hero = getSelectedHero()
  const [currentWork, setCurrentWork] = useState<'martelar' | 'polir' | 'inspecionar'>('martelar')
  const [isNear, setIsNear] = useState(false)
  const [activeDialogue, setActiveDialogue] = useState<{ type: DialogueType; text: string } | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const npcRef = useRef<HTMLDivElement>(null)
  const [npcPos, setNpcPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [audioReady, setAudioReady] = useState(false)
  const [lastAction, setLastAction] = useState<{ type: string; at: number } | null>(null)
  const [forgingId, setForgingId] = useState<string | null>(null)
  const [forgingProgress, setForgingProgress] = useState<number>(0)
  const [forgingStage, setForgingStage] = useState<number>(0)
  const forgingTimerRef = useRef<any>(null)
  const [detailsOpenId, setDetailsOpenId] = useState<string | null>(null)
  const [forgingQueue, setForgingQueue] = useState<string[]>([])
  const [forgeView, setForgeView] = useState<'eligible'|'rank'>('eligible')
  const [recipeQuery, setRecipeQuery] = useState('')

  const startForging = (rid: string, rname: string) => {
    if (forgingId) return
    if (audioReady) {
      resumeAudioContextIfNeeded()
      try { playForgeStart() } catch {}
    }
    setForgingId(rid)
    setForgingProgress(0)
    setForgingStage(0)
    const startedAt = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const pct = Math.min(100, Math.floor((elapsed / 2400) * 100))
      setForgingProgress(pct)
      if (pct >= 25 && forgingStage < 1) setForgingStage(1)
      if (pct >= 50 && forgingStage < 2) setForgingStage(2)
      if (pct >= 75 && forgingStage < 3) setForgingStage(3)
      if (pct >= 100) {
        clearInterval(tick)
        forgingTimerRef.current = null
        const ok = craftItem(hero!.id, rid)
        if (ok) {
          if (audioReady) playSuccess()
          setActiveDialogue({ type: 'comentario', text: 'Boa têmpera. A peça parece equilibrada.' })
          setLastAction({ type: 'forjar:ok', at: Date.now() })
          try { notificationBus.emit({ type: 'success', title: 'Forja concluída', message: `${rname} forjado com sucesso!`, timeoutMs: 3000 }) } catch {}
        } else {
          if (audioReady) playFailure()
          setActiveDialogue({ type: 'comentario', text: 'Faltam insumos ou rank. Verifique seu inventário e posição.' })
          setLastAction({ type: 'forjar:falha', at: Date.now() })
          try { notificationBus.emit({ type: 'error', title: 'Forja falhou', message: 'Verifique materiais e rank.', timeoutMs: 3000 }) } catch {}
        }
        setForgingId(null)
        setForgingProgress(0)
        setForgingStage(0)
        setTimeout(() => {
          setForgingQueue(q => {
            const next = q[0]
            const rest = q.slice(1)
            if (next) {
              const rnext = RECIPES.find(rr => rr.id === next)
              if (rnext) startForging(rnext.id, rnext.name)
            }
            return rest
          })
        }, 200)
      }
    }, 80)
    forgingTimerRef.current = tick
  }

  const quickBuyMaterial = (itemId: string) => {
    if (!hero) return
    const result = purchaseItem(hero, itemId)
    if (result.success && result.item) {
      const currency = result.currency || 'gold'
      const newProgression = { ...hero.progression } as any
      if (result.newBalance !== undefined) {
        if (currency === 'gold') newProgression.gold = result.newBalance
        else if (currency === 'glory') newProgression.glory = result.newBalance
        else if (currency === 'arcaneEssence') newProgression.arcaneEssence = result.newBalance
      } else if (result.newGold !== undefined) {
        newProgression.gold = result.newGold
      }
      updateHero(hero.id, {
        progression: newProgression,
        inventory: {
          ...hero.inventory,
          items: {
            ...hero.inventory.items,
            [itemId]: (hero.inventory.items[itemId] || 0) + 1
          }
        }
      })
      try { notificationBus.emit({ type: 'success', title: 'Material adquirido', message: result.message, timeoutMs: 3000 }) } catch {}
    } else {
      try { notificationBus.emit({ type: 'error', title: 'Falha na compra', message: result.message, timeoutMs: 3000 }) } catch {}
    }
  }

  const quickBuyAllForRecipe = (recipeId: string) => {
    const state = useHeroStore.getState()
    const h = state.getSelectedHero()
    if (!h) return
    const recipe = RECIPES.find(r => r.id === recipeId)
    if (!recipe) return
    let successCount = 0
    for (const m of recipe.inputs) {
      const have = h.inventory.items[m.id] || 0
      const need = Math.max(0, m.qty - have)
      for (let i = 0; i < need; i++) {
        const res = purchaseItem(useHeroStore.getState().getSelectedHero()!, m.id)
        if (res.success && res.item) {
          const heroNow = useHeroStore.getState().getSelectedHero()!
          const currency = res.currency || 'gold'
          const prog = { ...heroNow.progression } as any
          if (res.newBalance !== undefined) {
            if (currency === 'gold') prog.gold = res.newBalance
            else if (currency === 'glory') prog.glory = res.newBalance
            else if (currency === 'arcaneEssence') prog.arcaneEssence = res.newBalance
          } else if (res.newGold !== undefined) {
            prog.gold = res.newGold
          }
          updateHero(heroNow.id, {
            progression: prog,
            inventory: {
              ...heroNow.inventory,
              items: {
                ...heroNow.inventory.items,
                [m.id]: (heroNow.inventory.items[m.id] || 0) + 1
              }
            }
          })
          successCount++
        } else {
          break
        }
      }
    }
    if (successCount > 0) {
      try { notificationBus.emit({ type: 'success', title: 'Materiais adquiridos', message: `Comprados ${successCount} insumos para a receita.`, timeoutMs: 3000 }) } catch {}
    } else {
      try { notificationBus.emit({ type: 'error', title: 'Compra indisponível', message: 'Saldo insuficiente ou item não disponível.', timeoutMs: 3000 }) } catch {}
    }
  }
  const idleCommentTimer = useRef<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      const actions: typeof currentWork[] = ['martelar', 'polir', 'inspecionar']
      setCurrentWork(actions[Math.floor(Math.random() * actions.length)])
    }, 4000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!hero) return
    try {
      const v = localStorage.getItem(`forgeView:${hero.id}`)
      const q = localStorage.getItem(`forgeQuery:${hero.id}`)
      if (v === 'eligible' || v === 'rank') setForgeView(v as any)
      if (q) setRecipeQuery(q)
    } catch {}
  }, [hero?.id])

  useEffect(() => {
    if (!hero) return
    try {
      localStorage.setItem(`forgeView:${hero.id}`, forgeView)
      localStorage.setItem(`forgeQuery:${hero.id}`, recipeQuery)
    } catch {}
  }, [forgeView, recipeQuery, hero?.id])

  useEffect(() => {
    const id = setInterval(() => {
      const nx = Math.max(-8, Math.min(12, (Math.random() - 0.5) * 24))
      const ny = Math.max(-6, Math.min(6, (Math.random() - 0.5) * 12))
      setNpcPos({ x: nx, y: ny })
    }, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const npcEl = npcRef.current
      if (!npcEl) return
      const rect = npcEl.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      setIsNear(dist < 140)
    }
    el.addEventListener('mousemove', onMove)
    const onKey = (ke: KeyboardEvent) => {
      if (ke.key.toLowerCase() === 't') {
        speak('comentario')
      } else if (ke.key.toLowerCase() === 'f') {
        setShowPanel(v => !v)
      } else if (ke.key === 'Enter') {
        try {
          if (!showPanel || !hero || forgingId) return
          const list = (forgeView === 'eligible' ? recipes : rankEligibleRecipes).filter(r => r.name.toLowerCase().includes(recipeQuery.toLowerCase()))
          const withMats = list.find(r => r.inputs.every(inp => (hero.inventory.items[inp.id] || 0) >= inp.qty))
          const pick = withMats || list[0]
          if (pick) startForging(pick.id, pick.name)
        } catch {}
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { el.removeEventListener('mousemove', onMove); window.removeEventListener('keydown', onKey) }
  }, [])

  useEffect(() => {
    if (idleCommentTimer.current) window.clearInterval(idleCommentTimer.current)
    idleCommentTimer.current = window.setInterval(() => {
      if (!showPanel && !activeDialogue) {
        const pool = DIALOGUES['comentario']
        const text = pool[Math.floor(Math.random() * pool.length)]
        setActiveDialogue({ type: 'comentario', text })
      }
    }, 20000)
    return () => {
      if (idleCommentTimer.current) window.clearInterval(idleCommentTimer.current)
      idleCommentTimer.current = null
    }
  }, [showPanel, activeDialogue])

  const recipes = useMemo(() => (hero ? getAvailableRecipes(hero) : []), [hero])
  const rankEligibleRecipes = useMemo(() => {
    if (!hero) return []
    const rankOrder = ['F','E','D','C','B','A','S'] as const
    const heroRank = (hero.rankData?.currentRank || 'F') as typeof rankOrder[number]
    const heroRankIdx = rankOrder.indexOf(heroRank)
    return RECIPES.filter(r => {
      const reqIdx = rankOrder.indexOf((r.rankRequired || 'F') as any)
      return heroRankIdx >= reqIdx
    })
  }, [hero])

  const smartTips = useMemo(() => {
    if (!hero) return [] as Array<{ id: string; name: string; missing: Array<{ id: string; qty: number }>; rankOk: boolean }>
    const rankOrder = ['F','E','D','C','B','A','S'] as const
    const heroRank = (hero.rankData?.currentRank || 'F') as typeof rankOrder[number]
    const heroRankIdx = rankOrder.indexOf(heroRank)
    const inv = hero.inventory.items
    const rarityScore = (rar?: string) => ({ comum: 1, incomum: 2, raro: 3, epico: 4, lendario: 5 } as any)[(rar || 'comum').toLowerCase()] || 1
    const candidates = RECIPES.map(r => {
      const reqIdx = rankOrder.indexOf((r.rankRequired || 'F') as any)
      const rankOk = heroRankIdx >= reqIdx
      const missing = r.inputs.map(inp => ({ id: inp.id, qty: Math.max(0, inp.qty - (inv[inp.id] || 0)) })).filter(m => m.qty > 0)
      const maxRarity = Math.max(...missing.map(m => rarityScore(SHOP_ITEMS.find(i => i.id === m.id)?.rarity))) || 1
      return { id: r.id, name: r.name, missing, rankOk, maxRarity }
    })
    const filtered = candidates.filter(c => c.rankOk && c.missing.length > 0)
    return filtered
      .sort((a, b) => {
        const ta = a.missing.reduce((s, m) => s + m.qty, 0)
        const tb = b.missing.reduce((s, m) => s + m.qty, 0)
        if (ta !== tb) return ta - tb
        return b.maxRarity - a.maxRarity
      })
      .slice(0, 3)
  }, [hero])

  const rarityClasses = (rar?: string) => {
    const r = (rar || '').toLowerCase()
    if (r === 'lendario') return 'bg-amber-900/40 text-amber-200 border-amber-600/40'
    if (r === 'epico') return 'bg-purple-900/40 text-purple-200 border-purple-600/40'
    if (r === 'raro') return 'bg-blue-900/40 text-blue-200 border-blue-600/40'
    if (r === 'incomum') return 'bg-green-900/40 text-green-200 border-green-600/40'
    return 'bg-slate-800/40 text-slate-200 border-white/10'
  }

  const speak = (type: DialogueType) => {
    const pool = DIALOGUES[type]
    const text = pool[Math.floor(Math.random() * pool.length)]
    let dynamic = ''
    if (type === 'dica') {
      if (hero) {
        const rank = hero.rankData?.currentRank || 'F'
        const count = recipes.length
        dynamic = count > 0 ? ` Você tem ${count} receita(s) aptas ao seu rank ${rank}.` : ` Suba de rank ou junte materiais para liberar novas receitas.`
      }
    }
    setActiveDialogue({ type, text: `${text}${dynamic}` })
    setShowPanel(true)
    try {
      resumeAudioContextIfNeeded()
      setAudioReady(true)
      const synth = window.speechSynthesis
      if (synth) {
        const utter = new SpeechSynthesisUtterance(text)
        utter.lang = 'pt-BR'
        utter.rate = 1
        synth.cancel()
        synth.speak(utter)
      }
    } catch {}
  }

  return (
    <div ref={containerRef} className={`relative w-full min-h-[420px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden ${className}`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-700/30 via-transparent to-transparent" />
      <div className="absolute left-6 right-6 top-6 bottom-24 rounded-2xl bg-slate-800/40 border border-amber-700/20" />

      <motion.div ref={npcRef} className="absolute left-10 bottom-16 w-44 h-44 rounded-xl bg-slate-700/60 border border-white/10 flex items-center justify-center"
        animate={{ x: npcPos.x + (currentWork === 'inspecionar' ? 6 : currentWork === 'polir' ? -4 : 0), y: npcPos.y + (currentWork === 'polir' ? -3 : 0) }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
        {forgingId && forgingStage === 1 && (
          <motion.div className="absolute inset-0" animate={{ x: [-1, 1, -1, 0] }} transition={{ duration: 0.3, repeat: Infinity }} />
        )}
        <div className="text-center">
          <div className="text-6xl">🧑‍🏭</div>
          <div className="mt-1 text-xs text-amber-300">Forjador</div>
          {hero && (
            <div className="mt-1 text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800/60 border border-white/10">
              <span>{RANK_CONFIG[(hero.rankData?.currentRank || 'F') as any]?.icon}</span>
              <span>{RANK_CONFIG[(hero.rankData?.currentRank || 'F') as any]?.name}</span>
              <span>({hero.rankData?.currentRank || 'F'})</span>
            </div>
          )}
          <AnimatePresence>
            {isNear && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-2 text-xs px-2 py-1 rounded bg-amber-800/40 text-amber-200 border border-amber-600/40">
                Saudações, herói.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {currentWork === 'martelar' && (
          <motion.div className="absolute inset-0 rounded-xl" animate={{ boxShadow: ['0 0 0px rgba(251,191,36,0.0)', '0 0 12px rgba(251,191,36,0.35)', '0 0 0px rgba(251,191,36,0.0)'] }} transition={{ duration: 1.2, repeat: Infinity }} />
        )}
        <motion.div className="absolute right-2 top-2 text-3xl" animate={{ rotate: currentWork === 'martelar' ? [0, -20, 0, -20, 0] : 0 }} transition={{ duration: currentWork === 'martelar' ? 0.8 : 0.4, repeat: currentWork === 'martelar' ? Infinity : 0 }}>
          {currentWork === 'martelar' ? '🔨' : currentWork === 'polir' ? '🧽' : '🔎'}
        </motion.div>
      </motion.div>

      <div className="absolute left-56 bottom-24 right-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => speak('dica')} className="px-3 py-2 rounded bg-amber-600 text-white text-xs hover:bg-amber-700">Pedir dica</button>
          <button onClick={() => speak('historia')} className="px-3 py-2 rounded bg-amber-600 text-white text-xs hover:bg-amber-700">Ouvir história</button>
          <button onClick={() => speak('comentario')} className="px-3 py-2 rounded bg-amber-600 text-white text-xs hover:bg-amber-700">Comentar ambiente</button>
          <button onClick={() => setShowPanel(v => !v)} className="px-3 py-2 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">Abrir painel</button>
          {!audioReady && (
            <button onClick={() => { resumeAudioContextIfNeeded(); setAudioReady(true) }} className={`px-3 py-2 rounded text-xs bg-slate-700 text-white hover:bg-slate-600`}>Ativar áudio</button>
          )}
          {audioReady && (
            <button onClick={() => { try { window.speechSynthesis?.cancel() } catch {}; setAudioReady(false) }} className={`px-3 py-2 rounded text-xs bg-red-700 text-white hover:bg-red-800`}>Silenciar áudio</button>
          )}
        </div>

        <AnimatePresence>
          {activeDialogue && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-3 p-3 rounded-lg bg-slate-800/60 border border-white/10">
              <div className="text-xs text-amber-300 uppercase">{activeDialogue.type}</div>
              <div className="text-sm text-white mt-1">{activeDialogue.text}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPanel && hero && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10">
                <div className="text-sm font-semibold text-white mb-2">Forja Simples</div>
                <div className="mb-2 flex items-center gap-2">
                  <input value={recipeQuery} onChange={e => setRecipeQuery(e.target.value)} placeholder="Buscar receita" className="px-2 py-1 rounded bg-slate-700 text-white text-xs w-full" />
                  <button onClick={() => setForgeView('eligible')} className={`px-2 py-1 rounded text-xs ${forgeView === 'eligible' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>Elegíveis</button>
                  <button onClick={() => setForgeView('rank')} className={`px-2 py-1 rounded text-xs ${forgeView === 'rank' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>Aptas ao Rank</button>
                </div>
                {recipes.length === 0 && <div className="text-xs text-gray-400">Sem receitas disponíveis.</div>}
                {recipes.length > 0 && (
                  <div className="space-y-2">
                    {(forgeView === 'eligible' ? recipes : rankEligibleRecipes).filter(r => r.name.toLowerCase().includes(recipeQuery.toLowerCase())).map(r => (
                      <div key={r.id} className="p-2 rounded bg-slate-700/60 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm">{r.name}</div>
                          <div className="text-xs text-gray-300">Rank: {r.rankRequired || 'F'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={!!forgingId}
                            onClick={() => startForging(r.id, r.name)}
                            className={`px-2 py-1 rounded text-xs ${forgingId ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                          >
                            {forgingId ? 'Forjando…' : 'Forjar'}
                          </button>
                          <button
                            onClick={() => setForgingQueue(q => q.length < 3 ? [...q, r.id] : q)}
                            className="px-2 py-1 rounded bg-slate-700 text-white text-xs hover:bg-slate-600"
                          >
                            Adicionar à fila
                          </button>
                          {forgingId === r.id && (
                            <button onClick={() => { if (forgingTimerRef.current) { clearInterval(forgingTimerRef.current); forgingTimerRef.current = null } setForgingId(null); setForgingProgress(0); setForgingStage(0) }} className="px-2 py-1 rounded bg-gray-700 text-white text-xs hover:bg-gray-600">Cancelar</button>
                          )}
                          {forgingId === r.id && (
                            <div className="relative w-24 h-2 rounded bg-slate-700 overflow-hidden">
                              <div className={`h-2 ${forgingStage === 0 ? 'bg-amber-500' : forgingStage === 1 ? 'bg-red-500' : forgingStage === 2 ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${forgingProgress}%` }} />
                              <div className="absolute top-[-6px] text-[10px]" style={{ left: `calc(${forgingProgress}% - 6px)` }}>✨</div>
                              <div className="absolute right-1 top-[-14px] text-[10px] text-gray-200">~{Math.max(0, Math.ceil((2400 * (1 - forgingProgress/100)) / 1000))}s</div>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {[
                              { l: 'Aquecer', i: '🔥' },
                              { l: 'Martelar', i: '🔨' },
                              { l: 'Têmpera', i: '💧' },
                              { l: 'Polir', i: '🧽' }
                            ].map((st, idx) => (
                              <span key={st.l} className={`px-2 py-0.5 rounded text-[10px] border ${forgingId === r.id && forgingStage >= idx ? 'bg-emerald-700 text-white border-emerald-500' : 'bg-slate-700 text-gray-300 border-white/10'}`}>{st.i} {st.l}</span>
                            ))}
                          </div>
                          <button onClick={() => setDetailsOpenId(detailsOpenId === r.id ? null : r.id)} className="px-2 py-1 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">{detailsOpenId === r.id ? 'Ocultar detalhes' : 'Detalhes'}</button>
                        </div>
                        {forgingQueue.length > 0 && (
                          <div className="mt-2 text-[10px] text-gray-300">
                            Fila: {forgingQueue.map((id, idx) => {
                              const rr = RECIPES.find(x => x.id === id)
                              const name = rr?.name || id
                              const canUp = idx > 0
                              const canDown = idx < forgingQueue.length - 1
                              const estSec = Math.ceil(2400 / 1000) * (idx + 1)
                              return (
                                <span key={`${id}-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 text-white mr-1">
                                  <span>{name}</span>
                                  <span className="opacity-70">~{estSec}s</span>
                                  <button disabled={!canUp} onClick={() => setForgingQueue(q => { const nq = [...q]; const t = nq[idx]; nq[idx] = nq[idx-1]; nq[idx-1] = t; return nq })} className={`px-1 rounded ${canUp ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-800 opacity-50'}`}>↑</button>
                                  <button disabled={!canDown} onClick={() => setForgingQueue(q => { const nq = [...q]; const t = nq[idx]; nq[idx] = nq[idx+1]; nq[idx+1] = t; return nq })} className={`px-1 rounded ${canDown ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-800 opacity-50'}`}>↓</button>
                                  <button onClick={() => setForgingQueue(q => q.filter((x, i) => i !== idx))} className="px-1 rounded bg-red-700 hover:bg-red-800">✕</button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {detailsOpenId === r.id && (
                          <div className="mt-2 p-2 rounded bg-slate-800/60 border border-white/10">
                            <div className="text-xs text-gray-300 mb-1">Consumo</div>
                            <div className="flex flex-wrap gap-1 items-center">
                              {r.inputs.map(inp => {
                                const item = SHOP_ITEMS.find(i => i.id === inp.id)
                                const label = item ? item.name : inp.id
                                const icon = item?.icon || '📦'
                                const have = hero.inventory.items[inp.id] || 0
                                return (
                                  <span key={`${r.id}-${inp.id}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${have >= inp.qty ? 'bg-slate-700 text-white border-white/20' : 'bg-red-900/40 text-red-200 border-red-600/40'}`}>
                                    <span>{icon}</span>
                                    <span>{inp.qty}x {label}</span>
                                    <span className="opacity-70">(Você tem {have})</span>
                                  </span>
                                )
                              })}
                            </div>
                            <div className="text-xs text-gray-300 mt-2 mb-1">Resultado</div>
                            {(() => {
                              const outItem = SHOP_ITEMS.find(i => i.id === r.output.id)
                              const label = outItem ? outItem.name : r.output.id
                              const icon = outItem?.icon || '⚒️'
                              const rar = outItem?.rarity
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${rarityClasses(rar)}`}>
                                  <span>{icon}</span>
                                  <span>{r.output.qty}x {label}</span>
                                </span>
                              )
                            })()}
                            {(() => {
                              const outItem = SHOP_ITEMS.find(i => i.id === r.output.id)
                              const bonus = outItem?.bonus
                              if (!bonus) return null
                              return (
                                <div className="mt-2 text-[11px] text-gray-200">
                                  {Object.entries(bonus).map(([k,v]) => (
                                    <span key={k} className="inline-block mr-2">+{v} {k}</span>
                                  ))}
                                </div>
                              )
                            })()}
                            {(() => {
                              const deficits = r.inputs.map(inp => {
                                const have = hero.inventory.items[inp.id] || 0
                                const need = Math.max(0, inp.qty - have)
                                const item = SHOP_ITEMS.find(i => i.id === inp.id)
                                const priceEach = item ? getDiscountedPrice(item, hero) : 0
                                const currency = item?.currency || 'gold'
                                return { id: inp.id, need, priceEach, currency, available: !!item }
                              }).filter(d => d.need > 0)
                              if (deficits.length === 0) return null
                              const totals: Record<'gold'|'glory'|'arcaneEssence', number> = { gold: 0, glory: 0, arcaneEssence: 0 }
                              deficits.forEach(d => {
                                if (!d.available) return
                                const cur = (d.currency as 'gold'|'glory'|'arcaneEssence')
                                totals[cur] += d.priceEach * d.need
                              })
                              const haveGold = hero.progression.gold || 0
                              const haveGlory = hero.progression.glory || 0
                              const haveEss = hero.progression.arcaneEssence || 0
                              const enough = (totals.gold <= haveGold) && (totals.glory <= haveGlory) && (totals.arcaneEssence <= haveEss)
                              return (
                                <div className="mt-3 p-2 rounded bg-slate-900/60 border border-white/10">
                                  <div className="text-xs text-white mb-1">Compra rápida (faltantes)</div>
                                  <div className="text-[11px] text-gray-200 space-x-2">
                                    <span>Ouro: {Math.ceil(totals.gold)}</span>
                                    <span>Glória: {Math.ceil(totals.glory)}</span>
                                    <span>Essência: {Math.ceil(totals.arcaneEssence)}</span>
                                  </div>
                                  <div className="text-[11px] text-gray-400 mt-1">Saldo • Ouro: {haveGold} • Glória: {haveGlory} • Essência: {haveEss}</div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <button
                                      onClick={() => quickBuyAllForRecipe(r.id)}
                                      disabled={!enough}
                                      className={`px-2 py-1 rounded text-xs ${enough ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-slate-700 text-gray-300 cursor-not-allowed'}`}
                                    >
                                      Confirmar compra
                                    </button>
                                    {!enough && (
                                      <span className="text-[11px] text-red-300">Saldo insuficiente para todos os insumos.</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-300">
                  Tempo total estimado da fila: {Math.ceil(((forgingQueue.length * 2400) + (forgingId ? (2400 * (1 - forgingProgress/100)) : 0)) / 1000)}s
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10">
              <div className="text-sm font-semibold text-white mb-2">Aprimoramentos</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => {
                    const ok = refineEquippedItem(hero.id, 'weapon')
                    if (audioReady) { resumeAudioContextIfNeeded(); ok ? playSuccess() : playFailure() }
                    setLastAction({ type: ok ? 'refinar:ok' : 'refinar:falha', at: Date.now() })
                    try { notificationBus.emit({ type: ok ? 'success' : 'error', title: ok ? 'Refino realizado' : 'Refino falhou', message: ok ? 'Arma refinada.' : 'Requisitos não atendidos.', timeoutMs: 3000 }) } catch {}
                  }} className="px-2 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700">Refinar Arma</button>
                <button onClick={() => {
                    const ok = refineEquippedItem(hero.id, 'armor')
                    if (audioReady) { resumeAudioContextIfNeeded(); ok ? playSuccess() : playFailure() }
                    setLastAction({ type: ok ? 'refinar:ok' : 'refinar:falha', at: Date.now() })
                    try { notificationBus.emit({ type: ok ? 'success' : 'error', title: ok ? 'Refino realizado' : 'Refino falhou', message: ok ? 'Armadura refinada.' : 'Requisitos não atendidos.', timeoutMs: 3000 }) } catch {}
                  }} className="px-2 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700">Refinar Armadura</button>
                <button onClick={() => {
                    const ok = refineEquippedItem(hero.id, 'accessory')
                    if (audioReady) { resumeAudioContextIfNeeded(); ok ? playSuccess() : playFailure() }
                    setLastAction({ type: ok ? 'refinar:ok' : 'refinar:falha', at: Date.now() })
                    try { notificationBus.emit({ type: ok ? 'success' : 'error', title: ok ? 'Refino realizado' : 'Refino falhou', message: ok ? 'Acessório refinado.' : 'Requisitos não atendidos.', timeoutMs: 3000 }) } catch {}
                  }} className="px-2 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700">Refinar Acessório</button>
                <button onClick={() => {
                    const ok = enchantEquippedItem(hero.id, 'weapon', 'lifesteal')
                    if (audioReady) { resumeAudioContextIfNeeded(); ok ? playSuccess() : playFailure() }
                    setLastAction({ type: ok ? 'encantar:ok' : 'encantar:falha', at: Date.now() })
                    try { notificationBus.emit({ type: ok ? 'success' : 'error', title: ok ? 'Encantamento aplicado' : 'Encantamento falhou', message: ok ? 'Lifesteal ativo na arma.' : 'Essência insuficiente ou item não equipado.', timeoutMs: 3000 }) } catch {}
                  }} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700">Encantar Arma</button>
              </div>
                <div className="mt-2 text-xs text-gray-400">Refinos e encantos consomem ouro/essência e podem falhar.</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10 md:col-span-2">
                <div className="text-sm font-semibold text-white mb-2">Fusão Procedural</div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="ID do Item A" className="px-2 py-1 rounded bg-slate-700 text-white text-xs" id="fuse-a" />
                  <input placeholder="ID do Item B" className="px-2 py-1 rounded bg-slate-700 text-white text-xs" id="fuse-b" />
                </div>
                <div className="mt-2">
                  <button onClick={() => {
                    const a = (document.getElementById('fuse-a') as HTMLInputElement)?.value
                    const b = (document.getElementById('fuse-b') as HTMLInputElement)?.value
                    if (a && b) {
                      const ok = fuseItems(hero.id, a, b)
                      if (audioReady) { resumeAudioContextIfNeeded(); ok ? playSuccess() : playFailure() }
                      setLastAction({ type: ok ? 'fusao:ok' : 'fusao:falha', at: Date.now() })
                      try { notificationBus.emit({ type: ok ? 'success' : 'error', title: ok ? 'Fusão concluída' : 'Fusão falhou', message: ok ? 'Novo item único gerado.' : 'Verifique tipos e quantidades.', timeoutMs: 3000 }) } catch {}
                    }
                  }} className="px-3 py-1 rounded bg-amber-600 text-white text-xs hover:bg-amber-700">Fundir</button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10 md:col-span-2">
                <div className="text-sm font-semibold text-white mb-2">Dicas Inteligentes</div>
                {smartTips.length === 0 && <div className="text-xs text-gray-400">Sem dicas no momento. Você já possui materiais para as receitas aptas ou precisa subir de rank.</div>}
                {smartTips.length > 0 && (
                  <div className="space-y-2">
            {smartTips.map(t => (
              <div key={t.id} className="p-2 rounded bg-slate-700/60 border border-white/10">
                <div className="text-white text-sm mb-1">{t.name}</div>
                        <div className="flex flex-wrap gap-1 items-center">
                          {t.missing.map(m => {
                            const item = SHOP_ITEMS.find(i => i.id === m.id)
                            const label = item ? item.name : m.id
                            const rar = item?.rarity
                            const icon = item?.icon || '🧱'
                            const price = item ? getDiscountedPrice(item, hero!) : 0
                            const currency = (item?.currency || 'gold')
                            const currencyLabel = currency === 'gold' ? 'ouro' : currency === 'glory' ? 'glória' : 'essência'
                            const affordable = item ? canAfford(hero!, item) : false
                            return (
                              <span key={`${t.id}-${m.id}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${rarityClasses(rar)} ${m.qty === 1 ? 'animate-pulse' : ''}`} title={m.qty === 1 ? 'Falta 1 para completar' : ''}>
                                <span>{icon}</span>
                                <span>{m.qty}x {label}</span>
                                <button onClick={() => quickBuyMaterial(m.id)} disabled={!affordable} className={`ml-1 px-2 py-0.5 rounded ${affordable ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : 'bg-slate-700 text-gray-300 cursor-not-allowed'}`}>Comprar ({price} {currencyLabel})</button>
                              </span>
                            )
                          })}
                        </div>
                        <div className="mt-2">
                          <button onClick={() => quickBuyAllForRecipe(t.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700">Comprar faltantes</button>
                          <Link to="/shop" className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-white text-xs hover:bg-slate-600">Ir à Loja</Link>
                        </div>
              </div>
            ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute left-0 right-0 bottom-0 p-3 bg-slate-900/60 border-t border-white/10">
        <div className="text-xs text-gray-300">Movimente o cursor para se aproximar do Forjador e interaja.</div>
      </div>

      <motion.div className="absolute left-8 bottom-8 text-2xl" animate={{ scale: [1, 1.1, 0.95, 1], opacity: [0.7, 1, 0.8, 0.7] }} transition={{ duration: 1.6, repeat: Infinity }}>
        🔥
      </motion.div>
      <motion.div className="absolute left-24 bottom-20 text-xl" animate={{ opacity: [0, 1, 0], y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
        ✨
      </motion.div>

      {audioReady && (
        <HammerAudio work={currentWork} />
      )}

      <ActionFollowUp action={lastAction} enabled={audioReady} hero={hero || null} />
      <GlowBurst action={lastAction} hero={hero || null} />
    </div>
  )
}

export default BlacksmithNPC

const HammerAudio: React.FC<{ work: 'martelar' | 'polir' | 'inspecionar' }> = ({ work }) => {
  useEffect(() => {
    let id: any
    if (work === 'martelar') {
      id = setInterval(() => { try { playHammer() } catch {} }, 3000)
    } else if (work === 'polir') {
      id = setInterval(() => { try { playPolish() } catch {} }, 3800)
    } else {
      return
    }
    return () => clearInterval(id)
  }, [work])
  return null
}

const ActionFollowUp: React.FC<{ action: { type: string; at: number } | null; enabled: boolean; hero: any }> = ({ action, enabled, hero }) => {
  useEffect(() => {
    if (!action) return
    const id = setTimeout(() => {
      const type = action.type
      const titleName = hero?.titles?.find((t: any) => t.id === hero?.activeTitle)?.name
      const baseOk = 'Bom trabalho. A peça responde bem sob pressão.'
      const baseFail = 'Nem sempre o fogo obedece. Vamos ajustar o próximo passo.'
      let extra = titleName ? ` ${titleName} tem mãos firmes para a forja.` : ''
      try {
        const key = `forgeHistory:${hero?.id}`
        const prev = JSON.parse(localStorage.getItem(key) || '[]')
        const last = prev.slice(-3)
        const okCount = last.filter((x: any) => x.ok).length
        const failCount = last.filter((x: any) => !x.ok).length
        if (okCount >= 3) extra += ' Sequência ótima, continue assim.'
        else if (failCount >= 2) extra += ' Vamos revisar materiais e rank para melhorar.'
      } catch {}
      const msg = (type.endsWith(':ok') ? baseOk : baseFail) + extra
      try {
        const evt = new CustomEvent('npc-followup', { detail: { msg } })
        window.dispatchEvent(evt)
      } catch {}
    }, 8000)
    return () => clearTimeout(id)
  }, [action?.type, action?.at])

  useEffect(() => {
    const onEvt = (e: any) => {
      const msg = e?.detail?.msg
      if (typeof msg === 'string' && enabled) {
        try {
          const synth = window.speechSynthesis
          if (synth) {
            const utter = new SpeechSynthesisUtterance(msg)
            utter.lang = 'pt-BR'
            utter.rate = 1
            synth.cancel()
            synth.speak(utter)
          }
        } catch {}
      }
    }
    window.addEventListener('npc-followup', onEvt)
    return () => window.removeEventListener('npc-followup', onEvt)
  }, [enabled])
  return null
}

const GlowBurst: React.FC<{ action: { type: string; at: number } | null; hero: any }> = ({ action, hero }) => {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!action) return
    if (!String(action.type).endsWith(':ok')) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), 1200)
    return () => clearTimeout(id)
  }, [action?.type, action?.at])
  if (!visible) return null
  const color = RANK_CONFIG[(hero?.rankData?.currentRank || 'F') as any]?.color || '#22c55e'
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-40 bottom-28 w-28 h-28 rounded-full" style={{ boxShadow: `0 0 18px ${color}` }} />
  )
}