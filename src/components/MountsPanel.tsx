import React, { useMemo, useState } from 'react'
import { useHeroStore } from '../store/heroStore'
import { Mount } from '../types/hero'
import { notificationBus } from './NotificationSystem'

const sampleMounts: Mount[] = [
  { id: crypto.randomUUID(), name: 'Cavalo Rústico', type: 'cavalo', rarity: 'comum', stage: 'comum', speedBonus: 1, attributes: {}, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Lobo Gigante', type: 'lobo', rarity: 'raro', stage: 'comum', speedBonus: 0, attributes: { forca: 2 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Grifo Jovem', type: 'grifo', rarity: 'raro', stage: 'comum', speedBonus: 1, attributes: { destreza: 1 }, createdAt: new Date().toISOString() }
]

export const MountsPanel: React.FC = () => {
  const { getSelectedHero, addMountToSelected, setActiveMount, evolveMountForSelected, refineCompanion, buyItem } = useHeroStore()
  const hero = getSelectedHero()
  const [sortKey, setSortKey] = useState<'velocidade'|'raridade'|'estagio'|'nome'>('estagio')
  const [showEvolvableOnly, setShowEvolvableOnly] = useState(false)
  const [showRefinableOnly, setShowRefinableOnly] = useState(false)
  const [showRecommended, setShowRecommended] = useState(false)
  const [compareAId, setCompareAId] = useState<string | undefined>(undefined)
  const [compareBId, setCompareBId] = useState<string | undefined>(undefined)

  if (!hero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🏇</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para acessar Montarias.</p>
      </div>
    )
  }

  const mounts = hero.mounts || []
  const activeId = hero.activeMountId
  const inventory = hero.inventory.items || {}

  const canRefineAny = (inventory['pedra-magica'] || 0) > 0 || (inventory['essencia-vinculo'] || 0) > 0
  const canEvolveAny = (inventory['pergaminho-montaria'] || 0) > 0 && (hero.progression.gold || 0) >= 200

  const sortedMounts = useMemo(() => {
    const copy = [...mounts]
    if (showRecommended) {
      const stageOrder: Record<string, number> = { comum: 0, encantada: 1, lendaria: 2 }
      const rarityOrder: Record<string, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mistico: 5 }
      const score = (m: Mount) => {
        const attrSum = Object.values(m.attributes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
        return (m.speedBonus || 0) * 3 + attrSum + (stageOrder[m.stage] || 0) * 2 + (rarityOrder[m.rarity] || 0)
      }
      return copy.sort((a,b) => score(b) - score(a))
    }
    if (sortKey === 'velocidade') copy.sort((a,b) => (b.speedBonus||0) - (a.speedBonus||0))
    else if (sortKey === 'raridade') {
      const order: Record<string, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mistico: 5 }
      copy.sort((a,b) => (order[b.rarity]-order[a.rarity]) || a.name.localeCompare(b.name))
    }
    else if (sortKey === 'estagio') {
      const order: Record<string, number> = { comum: 0, encantada: 1, lendaria: 2 }
      copy.sort((a,b) => (order[b.stage]-order[a.stage]) || a.name.localeCompare(b.name))
    }
    else copy.sort((a,b) => a.name.localeCompare(b.name))
    return copy
  }, [mounts, sortKey])

  const bestMountId = useMemo(() => {
    if (!mounts.length) return undefined
    const stageOrder: Record<string, number> = { comum: 0, encantada: 1, lendaria: 2 }
    const rarityOrder: Record<string, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mistico: 5 }
    const score = (m: Mount) => {
      const attrSum = Object.values(m.attributes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
      return (m.speedBonus || 0) * 3 + attrSum + (stageOrder[m.stage] || 0) * 2 + (rarityOrder[m.rarity] || 0)
    }
    return mounts.slice().sort((a,b) => score(b) - score(a))[0]?.id
  }, [mounts])

  const activeSpeed = useMemo(() => {
    const am = (hero.mounts || []).find(m => m.id === activeId)
    return Math.max(0, am?.speedBonus || 0)
  }, [hero.mounts, activeId])

  const typeIcon: Record<Mount['type'], string> = {
    cavalo: '🏇',
    lobo: '🐺',
    grifo: '🦅',
    javali: '🐗',
    lagarto: '🦎',
    draconiano: '🐉'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Montarias</h2>
        <div className="flex gap-2">
          {sampleMounts.map(m => (
            <button key={m.id} onClick={() => addMountToSelected({ ...m, id: crypto.randomUUID() })} className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm">Adicionar {m.name}</button>
          ))}
          <button disabled={!bestMountId} onClick={() => bestMountId && setActiveMount(bestMountId)} className={`px-3 py-2 rounded ${bestMountId?'bg-indigo-600 hover:bg-indigo-700':'bg-gray-700'} text-white text-sm`}>Ativar melhor</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-300">
          📜 Pergaminhos: <span className="text-amber-300 font-semibold">{inventory['pergaminho-montaria']||0}</span>
          <span className="ml-3">🧬 Essência Bestial: <span className="text-amber-300 font-semibold">{inventory['essencia-bestial']||0}</span></span>
          <span className="ml-3">🔷 Pedra Mágica: <span className="text-amber-300 font-semibold">{inventory['pedra-magica']||0}</span></span>
          <span className="ml-3">🔗 Essência de Vínculo: <span className="text-amber-300 font-semibold">{inventory['essencia-vinculo']||0}</span></span>
        </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300">Ordenar por</label>
        <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="bg-slate-800 border border-slate-600 text-gray-200 text-xs px-2 py-1 rounded">
          <option value="estagio">Estágio</option>
          <option value="raridade">Raridade</option>
          <option value="velocidade">Velocidade</option>
          <option value="nome">Nome</option>
        </select>
        <label className="ml-2 flex items-center gap-1 text-xs text-gray-300">
          <input type="checkbox" checked={showRecommended} onChange={e => setShowRecommended(e.target.checked)} /> Mostrar recomendadas
        </label>
        <label className="ml-2 flex items-center gap-1 text-xs text-gray-300">
          <input type="checkbox" checked={showEvolvableOnly} onChange={e => setShowEvolvableOnly(e.target.checked)} /> Evoluível
        </label>
        <label className="ml-2 flex items-center gap-1 text-xs text-gray-300">
          <input type="checkbox" checked={showRefinableOnly} onChange={e => setShowRefinableOnly(e.target.checked)} /> Refinável
        </label>
      </div>
      </div>

      {(canEvolveAny || canRefineAny) && (
        <div className="mb-3 rounded-lg p-2 bg-emerald-800/30 border border-emerald-500/30 text-emerald-200 text-xs">
          {canEvolveAny && <span>Evolução disponível: use pergaminhos e ouro para avançar o estágio. </span>}
          {canRefineAny && <span>Refino possível: consome materiais e pode falhar em níveis altos.</span>}
        </div>
      )}

      {compareAId && compareBId && (
        <div className="mb-3 rounded-lg p-3 bg-slate-800 border border-amber-500/40 text-amber-200 text-xs">
          {(() => {
            const a = mounts.find(m => m.id === compareAId)
            const b = mounts.find(m => m.id === compareBId)
            if (!a || !b) return null
            const aInit = Math.max(0, (hero.derivedAttributes.initiative || 0) - activeSpeed + (a.speedBonus || 0))
            const bInit = Math.max(0, (hero.derivedAttributes.initiative || 0) - activeSpeed + (b.speedBonus || 0))
            const attrSum = (m: Mount) => Object.values(m.attributes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
            return (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-semibold text-white text-sm">{typeIcon[a.type]} {a.name}</div>
                  <div className="text-amber-300">Velocidade +{a.speedBonus} • Iniciativa {aInit}</div>
                  <div className="text-gray-300">Bônus {attrSum(a)}</div>
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{typeIcon[b.type]} {b.name}</div>
                  <div className="text-amber-300">Velocidade +{b.speedBonus} • Iniciativa {bInit}</div>
                  <div className="text-gray-300">Bônus {attrSum(b)}</div>
                </div>
              </div>
            )
          })()}
          <div className="mt-2 flex gap-2">
            <button onClick={() => setCompareAId(undefined)} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-[11px]">Limpar A</button>
            <button onClick={() => setCompareBId(undefined)} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-[11px]">Limpar B</button>
            <button onClick={() => { setCompareAId(undefined); setCompareBId(undefined) }} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-[11px]">Limpar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mounts.length === 0 && <div className="text-gray-400">Nenhuma montaria ainda. Conquiste pergaminhos e essências em missões para desbloquear.</div>}
        {sortedMounts.filter(m => {
          const needsEssence = m.stage === 'encantada'
          const hasScroll = (inventory['pergaminho-montaria'] || 0) > 0
          const hasEssence = (inventory['essencia-bestial'] || 0) > 0
          const enoughGold = (hero.progression.gold || 0) >= (m.stage === 'comum' ? 200 : 700)
          const evolvable = hasScroll && enoughGold && (!needsEssence || hasEssence)
          const refinable = ((inventory['pedra-magica'] || 0) > 0 || (inventory['essencia-vinculo'] || 0) > 0) && ((m.refineLevel || 0) < 10)
          if (showEvolvableOnly && !evolvable) return false
          if (showRefinableOnly && !refinable) return false
          return true
        }).map(m => {
          const needsEssence = m.stage === 'encantada';
          const hasScroll = (inventory['pergaminho-montaria'] || 0) > 0;
          const hasEssence = (inventory['essencia-bestial'] || 0) > 0;
          const enoughGold = (hero.progression.gold || 0) >= (m.stage === 'comum' ? 200 : 700);
          const canEvolve = hasScroll && enoughGold && (!needsEssence || hasEssence);
          const isActive = activeId===m.id
          const isMaxRefine = (m.refineLevel || 0) >= 10
          const nextRefine = (m.refineLevel || 0) + 1
          const refineChance = nextRefine <= 3 ? 100 : nextRefine <= 6 ? 75 : 45
          const predictedInitiative = Math.max(0, (hero.derivedAttributes.initiative || 0) - activeSpeed + (m.speedBonus || 0))
          return (
          <div key={m.id} className={`p-4 rounded-lg ${isActive?'border-amber-500':'border-slate-700'} bg-slate-800 border flex flex-col gap-2`}>
            <div className="flex justify-between items-center">
              <div className="font-semibold">{typeIcon[m.type]} {m.name} {m.stage==='encantada' && <span className="ml-2 text-xs bg-purple-700 text-white px-2 py-1 rounded">Encantada</span>} {m.stage==='lendaria' && <span className="ml-2 text-xs bg-amber-600 text-white px-2 py-1 rounded">Lendária</span>} {typeof m.refineLevel==='number' && m.refineLevel>0 && <span className="ml-2 text-xs bg-violet-700 text-white px-2 py-1 rounded">Refino +{m.refineLevel}</span>}</div>
              <div className="text-xs text-amber-300">{m.type} • {m.stage} • {m.rarity}</div>
            </div>
            <div className="text-sm text-gray-200">Velocidade: +{m.speedBonus}</div>
            {!isActive && (
              <div className="text-[11px] text-amber-300">Iniciativa se ativar: {predictedInitiative}</div>
            )}
            {isActive && (
              <div className="text-xs text-amber-400">Iniciativa atual: {hero.derivedAttributes.initiative}</div>
            )}
            {m.attributes && Object.keys(m.attributes).length > 0 && (
              <div className="text-xs text-gray-300">Bônus: {Object.entries(m.attributes).map(([k,v]) => `${k}+${v}`).join(', ')}</div>
            )}
            <div className="flex gap-2 mt-2">
              <button disabled={isActive} title={isActive?'Montaria ativa':''} onClick={() => setActiveMount(m.id)} className={`px-3 py-1 rounded ${isActive?'bg-gray-700 text-gray-300':'bg-indigo-600 hover:bg-indigo-700 text-white'} text-sm`}>{isActive?'Ativa':'Ativar'}</button>
              {isActive && (
                <button onClick={() => setActiveMount(undefined)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Desativar</button>
              )}
              <button onClick={() => setCompareAId(m.id)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Comparar A</button>
              <button onClick={() => setCompareBId(m.id)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Comparar B</button>
              <button disabled={!canEvolve} title={canEvolve?`Consome 📜 x1${needsEssence?' + 🧬 x1':''} e ${m.stage==='comum'?200:700} ouro`:''} onClick={() => { if (canEvolve) { const ok = window.confirm(`Confirmar evolução de ${m.name}? Custos: 📜 x1${needsEssence?' + 🧬 x1':''} e ${m.stage==='comum'?200:700} ouro.`); if (ok) evolveMountForSelected(m.id); } }} className={`px-3 py-1 rounded ${canEvolve?'bg-purple-600 hover:bg-purple-700':'bg-gray-700'} text-white text-sm`}>Evoluir</button>
              {!canEvolve && (
                <button onClick={() => {
                  const ok = suggestCompanionQuestForSelected();
                  if (ok) notificationBus.emit({ type: 'quest', title: 'Missão sugerida', message: 'Uma missão de companheiros foi adicionada ao quadro', icon: '🐾', duration: 2500 });
                }} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Sugerir Missão</button>
              )}
              <button disabled={!canRefineAny || isMaxRefine} title={isMaxRefine?'Refino máximo atingido':(canRefineAny?'Consome 🔷 Pedra Mágica ou 🔗 Essência de Vínculo':'') } onClick={() => { if (canRefineAny && !isMaxRefine) { const ok = window.confirm(`Tentar refinar ${m.name}? Consome 1 material e pode falhar.`); if (ok) refineCompanion(hero.id, 'mount', m.id); } }} className={`px-3 py-1 rounded ${(!canRefineAny || isMaxRefine)?'bg-gray-700':'bg-violet-600 hover:bg-violet-700'} text-white text-sm`}>{isMaxRefine?'Refino Máx.':'Refinar'}</button>
              {!isMaxRefine && <span className="text-[11px] text-gray-400 self-center">Chance ~{refineChance}%</span>}
            </div>
            {!canEvolve && (
              <div className="text-xs text-gray-400 flex items-center gap-2">Requisitos: 📜 x1 {needsEssence && ' • 🧬 x1'} • Ouro {(m.stage==='comum')?200:700}
                <button
                  disabled={(inventory['pergaminho-montaria']||0)>0}
                  onClick={() => {
                    const ok = window.confirm('Comprar 📜 Pergaminho de Montaria?');
                    if (!ok) return;
                    const success = buyItem(hero.id, 'pergaminho-montaria')
                    if (success) notificationBus.emit({ type: 'item', title: 'Pergaminho comprado', message: '📜 +1 adicionado ao inventário.', duration: 3000, icon: '📜' })
                    else notificationBus.emit({ type: 'gold', title: 'Compra falhou', message: 'Verifique seu saldo.', duration: 3000 })
                  }} className={`px-2 py-1 rounded ${((inventory['pergaminho-montaria']||0)>0)?'bg-gray-700':'bg-emerald-700 hover:bg-emerald-800'} text-white`}>Comprar 📜</button>
                {needsEssence && (
                  <button
                    disabled={(inventory['essencia-bestial']||0)>0}
                    onClick={() => {
                      const ok = window.confirm('Comprar 🧬 Essência Bestial?');
                      if (!ok) return;
                      const success = buyItem(hero.id, 'essencia-bestial')
                      if (success) notificationBus.emit({ type: 'item', title: 'Essência comprada', message: '🧬 +1 adicionada ao inventário.', duration: 3000, icon: '🧬' })
                      else notificationBus.emit({ type: 'gold', title: 'Compra falhou', message: 'Verifique seu saldo.', duration: 3000 })
                    }} className={`px-2 py-1 rounded ${((inventory['essencia-bestial']||0)>0)?'bg-gray-700':'bg-emerald-700 hover:bg-emerald-800'} text-white`}>Comprar 🧬</button>
                )}
              </div>
            )}
          </div>
        )})}
      </div>
    </div>
  )
}

export default MountsPanel
