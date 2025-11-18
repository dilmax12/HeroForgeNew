import React, { useMemo, useState, useEffect } from 'react'
import { useHeroStore } from '../store/heroStore'
import { Mount } from '../types/hero'
import { notificationBus } from './NotificationSystem'

const sampleMounts: Mount[] = [
  { id: crypto.randomUUID(), name: 'Cavalo Rústico', type: 'cavalo', rarity: 'comum', stage: 'comum', speedBonus: 1, attributes: { destreza: 1 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Lobo Gigante', type: 'lobo', rarity: 'raro', stage: 'comum', speedBonus: 0, attributes: { forca: 2 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Grifo Jovem', type: 'grifo', rarity: 'raro', stage: 'comum', speedBonus: 1, attributes: { destreza: 1 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Urso Montanhês', type: 'urso', rarity: 'incomum', stage: 'comum', speedBonus: 0, attributes: { forca: 2 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Felino Ágil', type: 'felino', rarity: 'raro', stage: 'comum', speedBonus: 1, attributes: { destreza: 2 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Cervo Celeste', type: 'cervo', rarity: 'incomum', stage: 'comum', speedBonus: 1, attributes: { destreza: 1 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Alce Majestoso', type: 'alce', rarity: 'raro', stage: 'comum', speedBonus: 1, attributes: { constituicao: 2 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Hipogrifo Jovem', type: 'hipogrifo', rarity: 'raro', stage: 'comum', speedBonus: 1, attributes: { destreza: 2 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Rinoceronte de Guerra', type: 'rinoceronte', rarity: 'raro', stage: 'comum', speedBonus: 0, attributes: { forca: 3, constituicao: 1 }, createdAt: new Date().toISOString() },
  { id: crypto.randomUUID(), name: 'Wyvern Veloz', type: 'wyvern', rarity: 'raro', stage: 'comum', speedBonus: 1, attributes: { destreza: 2 }, createdAt: new Date().toISOString() }
]

export const MountsPanel: React.FC = () => {
  const { getSelectedHero, addMountToSelected, setActiveMount, evolveMountForSelected, refineCompanion, buyItem, setFavoriteMount, generateMountForSelected } = useHeroStore()
  const hero = getSelectedHero()
  const [sortKey, setSortKey] = useState<'velocidade'|'raridade'|'estagio'|'nome'|'maestria'>('estagio')
  const [compareAId, setCompareAId] = useState<string | undefined>(undefined)
  const [compareBId, setCompareBId] = useState<string | undefined>(undefined)
  const [selectedType, setSelectedType] = useState<Mount['type'] | 'todos'>('todos')
  const [selectedRarity, setSelectedRarity] = useState<'todos'|'comum'|'incomum'|'raro'|'epico'|'lendario'|'mistico'>('todos')
  const [selectedStage, setSelectedStage] = useState<'todos'|'comum'|'encantada'|'lendaria'>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [detailId, setDetailId] = useState<string | undefined>(undefined)
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { const onKey = (e: KeyboardEvent) => { const favs = hero?.favoriteMountIds || []; if (e.key === '1' && favs[0]) setActiveMount(favs[0]); if (e.key === '2' && favs[1]) setActiveMount(favs[1]); if (e.key === '3' && favs[2]) setActiveMount(favs[2]); }; window.addEventListener('keydown', onKey as any); return () => window.removeEventListener('keydown', onKey as any); }, [hero?.favoriteMountIds])

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
    if (sortKey === 'maestria') copy.sort((a,b) => (Math.max(0,b.mastery||0)) - (Math.max(0,a.mastery||0)))
    else if (sortKey === 'velocidade') copy.sort((a,b) => (b.speedBonus||0) - (a.speedBonus||0))
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
    if (hero?.favoriteMountId && mounts.some(m => m.id === hero.favoriteMountId)) return hero.favoriteMountId
    const stageOrder: Record<string, number> = { comum: 0, encantada: 1, lendaria: 2 }
    const rarityOrder: Record<string, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mistico: 5 }
    const score = (m: Mount) => {
      const attrSum = Object.values(m.attributes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
      return (m.speedBonus || 0) * 3 + attrSum + (stageOrder[m.stage] || 0) * 2 + (rarityOrder[m.rarity] || 0)
    }
    return mounts.slice().sort((a,b) => score(b) - score(a))[0]?.id
  }, [mounts, hero?.favoriteMountId])

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
    draconiano: '🐉',
    urso: '🐻',
    felino: '🐈',
    cervo: '🦌',
    alce: '🫎',
    hipogrifo: '🦅',
    rinoceronte: '🦏',
    wyvern: '🐲'
  }
  const rarityClass: Record<string, string> = {
    comum: 'bg-gray-700 text-gray-200',
    incomum: 'bg-emerald-700 text-emerald-100',
    raro: 'bg-blue-700 text-blue-100',
    epico: 'bg-purple-700 text-purple-100',
    lendario: 'bg-amber-700 text-amber-100',
    mistico: 'bg-pink-700 text-pink-100'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Montarias</h2>
        <div className="flex gap-2">
          <button disabled={!bestMountId} onClick={() => bestMountId && setActiveMount(bestMountId)} className={`px-3 py-2 rounded ${bestMountId?'bg-indigo-600 hover:bg-indigo-700':'bg-gray-700'} text-white text-sm`}>Ativar melhor</button>
          {hero?.favoriteMountId && (
            <button onClick={() => setActiveMount(hero.favoriteMountId)} className="px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm">Ativar favorita ⭐</button>
          )}
          
          
          <button onClick={() => { try { const payload = JSON.stringify((hero.mounts||[]).map(m => ({ name:m.name, type:m.type, rarity:m.rarity, stage:m.stage, speedBonus:m.speedBonus, attributes:m.attributes, refineLevel:m.refineLevel, mastery:m.mastery })), null, 2); navigator.clipboard.writeText(payload); notificationBus.emit({ type:'item', title:'Exportado', message:'Estábulo copiado para a área de transferência', duration:3000 }); } catch { notificationBus.emit({ type:'item', title:'Falha ao exportar', message:'Verifique permissões do navegador', duration:3000 }); } }} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm">Exportar</button>
          <button onClick={() => { const json = window.prompt('Cole o JSON de montarias'); if (!json) return; const ok = (useHeroStore.getState() as any).importMountsForSelected(json); if (!ok) notificationBus.emit({ type:'item', title:'Importação falhou', message:'Formato inválido ou sem capacidade', duration:3000 }); }} className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm">Importar</button>
          
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-gray-300">
          📜 Pergaminhos: <span className="text-amber-300 font-semibold">{inventory['pergaminho-montaria']||0}</span>
          <span className="ml-3">🧬 Essência Bestial: <span className="text-amber-300 font-semibold">{inventory['essencia-bestial']||0}</span></span>
          <span className="ml-3">🔷 Pedra Mágica: <span className="text-amber-300 font-semibold">{inventory['pedra-magica']||0}</span></span>
          <span className="ml-3">🔗 Essência de Vínculo: <span className="text-amber-300 font-semibold">{inventory['essencia-vinculo']||0}</span></span>
          <span className="ml-3">🏛️ Estábulo: <span className="text-amber-300 font-semibold">{mounts.length}/{hero.stableCapacity || 50}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300">Ordenar por</label>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="bg-slate-800 border border-slate-600 text-gray-200 text-xs px-2 py-1 rounded">
            <option value="estagio">Estágio</option>
            <option value="raridade">Raridade</option>
            <option value="velocidade">Velocidade</option>
            <option value="nome">Nome</option>
            <option value="maestria">Maestria</option>
          </select>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nome" className="bg-slate-800 border border-slate-600 text-gray-200 text-xs px-2 py-1 rounded" />
        <label className="ml-2 flex items-center gap-1 text-xs text-gray-300">
          <span>Tipo</span>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value as any)} className="bg-slate-800 border border-slate-600 text-gray-200 text-xs px-2 py-1 rounded">
            <option value="todos">Todos</option>
            {Object.keys(typeIcon).map(t => (<option key={t} value={t}>{t}</option>))}
          </select>
        </label>
        
        <label className="ml-2 flex items-center gap-1 text-xs text-gray-300">
          <span>Raridade</span>
          <select value={selectedRarity} onChange={e => setSelectedRarity(e.target.value as any)} className="bg-slate-800 border border-slate-600 text-gray-200 text-xs px-2 py-1 rounded">
            {['todos','comum','incomum','raro','epico','lendario','mistico'].map(r => (<option key={r} value={r}>{r}</option>))}
          </select>
        </label>
        <label className="ml-2 flex items-center gap-1 text-xs text-gray-300">
          <span>Estágio</span>
          <select value={selectedStage} onChange={e => setSelectedStage(e.target.value as any)} className="bg-slate-800 border border-slate-600 text-gray-200 text-xs px-2 py-1 rounded">
            {['todos','comum','encantada','lendaria'].map(s => (<option key={s} value={s}>{s}</option>))}
          </select>
        </label>
      </div>
      </div>

      {(canEvolveAny || canRefineAny) && (
        <div className="mb-3 rounded-lg p-2 bg-emerald-800/30 border border-emerald-500/30 text-emerald-200 text-xs">
          {canEvolveAny && <span>Evolução disponível: use pergaminhos e ouro para avançar o estágio. </span>}
          {canRefineAny && <span>Refino possível: consome materiais e pode falhar em níveis altos.</span>}
        </div>
      )}

      {(() => {
        const rarities = ['comum','incomum','raro','epico','lendario','mistico'] as const;
        const byRarity = rarities.map(r => ({ r, c: (mounts||[]).filter(m => m.rarity === r).length }));
        const typeCounts = Object.keys(typeIcon).map(t => ({ t, c: (mounts||[]).filter(m => m.type === t).length }));
        const topTypes = typeCounts.sort((a,b)=>b.c-a.c).slice(0,3);
        return (
          <div className="mb-3 rounded-lg p-2 bg-slate-800 border border-slate-700 text-xs text-gray-300">
            <div>Resumo: {byRarity.map(x => `${x.r}:${x.c}`).join(' • ')} • Top tipos: {topTypes.map(x => `${x.t}:${x.c}`).join(' • ')}</div>
          </div>
        )
      })()}

      {(hero.favoriteMountIds && hero.favoriteMountIds.length > 0) && (
        <div className="mb-3 rounded-lg p-2 bg-slate-800 border border-amber-500/30">
          <div className="text-xs text-amber-300 mb-1">Favoritos</div>
          <div className="flex gap-2">
            {hero.favoriteMountIds.slice(0,3).map(fid => {
              const fm = (hero.mounts||[]).find(mm => mm.id === fid)
              if (!fm) return null
              const idx = (hero.favoriteMountIds||[]).slice(0,3).indexOf(fid)
              const label = idx>=0 ? `[${idx+1}]` : ''
              const isActiveFav = hero.activeMountId === fid
              return (
                <button key={fid} onClick={() => setActiveMount(fid)} className={`px-2 py-1 rounded ${isActiveFav?'bg-amber-800':'bg-amber-700 hover:bg-amber-800'} text-white text-[11px]`}>{label} {typeIcon[fm.type]} {fm.name}</button>
              )
            })}
          </div>
        </div>
      )}

      {(() => {
        const today = new Date().toDateString();
        let seed = today.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const rand = () => { const x = Math.sin(seed++) * 10000; return x - Math.floor(x); };
        const types = Object.keys(typeIcon) as (keyof typeof typeIcon)[];
        const rarities: ('comum'|'incomum'|'raro'|'epico'|'lendario'|'mistico')[] = ['comum','incomum','raro','epico','lendario'];
        const priceByRarity: Record<string, number> = { comum: 150, incomum: 220, raro: 400, epico: 900, lendario: 2000, mistico: 4000 };
        const offers = Array.from({ length: 3 }).map(() => {
          const t = types[Math.floor(rand() * types.length)] as any;
          const r = rarities[Math.floor(rand() * rarities.length)] as any;
          return { type: t, rarity: r, price: priceByRarity[r] };
        });
        return (
          <div className="mb-3 rounded-lg p-3 bg-slate-800 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-300 text-xs font-medium">Mercador do Estábulo</span>
              <span className="text-gray-400 text-[11px]">Ofertas do dia</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {offers.map((o, idx) => (
                <div key={idx} className="bg-slate-900 rounded p-2 border border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-gray-200">{typeIcon[o.type]} {String(o.type)} • <span className={`px-2 py-0.5 rounded ${rarityClass[o.rarity]}`}>{o.rarity}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 text-xs">🪙 {o.price}</span>
                    <button onClick={() => (useHeroStore.getState() as any).buyMountOffer(hero.id, o.type, o.rarity, o.price)} className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px]">Comprar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
          if (selectedType !== 'todos' && m.type !== selectedType) return false
          if (selectedRarity !== 'todos' && m.rarity !== selectedRarity) return false
          if (selectedStage !== 'todos' && m.stage !== selectedStage) return false
          if (searchTerm && !m.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
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
              <div className="font-semibold">{typeIcon[m.type]} {m.name} {m.stage==='encantada' && <span className="ml-2 text-xs bg-purple-700 text-white px-2 py-1 rounded">Encantada</span>} {m.stage==='lendaria' && <span className="ml-2 text-xs bg-amber-600 text-white px-2 py-1 rounded">Lendária</span>} {typeof m.refineLevel==='number' && m.refineLevel>0 && <span className="ml-2 text-xs bg-violet-700 text-white px-2 py-1 rounded">Refino +{m.refineLevel}</span>} {typeof m.mastery==='number' && m.mastery>0 && <span className="ml-2 text-xs bg-emerald-700 text-white px-2 py-1 rounded">Maestria {m.mastery}</span>} {(() => { const ms = Math.max(0, m.mastery||0); const label = ms>=30 ? 'Mestre' : ms>=20 ? 'Perito' : ms>=10 ? 'Adepto' : ''; return label ? <span className="ml-2 text-xs bg-emerald-800 text-white px-2 py-1 rounded">{label}</span> : null })()} {hero.favoriteMountId===m.id && <span className="ml-2 text-xs bg-amber-700 text-white px-2 py-1 rounded">⭐ Favorita</span>} {bestMountId===m.id && <span className="ml-2 text-xs bg-indigo-700 text-white px-2 py-1 rounded">Recomendada</span>} <span className={`ml-2 text-[10px] px-2 py-1 rounded ${rarityClass[m.rarity]}`}>{m.rarity}</span></div>
              <div className="text-xs text-amber-300">{m.type} • {m.stage} • {m.rarity}</div>
            </div>
            <div className="text-sm text-gray-200">Velocidade: +{m.speedBonus}</div>
            {m.locked && <div className="text-[11px] text-emerald-300">🔒 Travada</div>}
            {!isActive && (
              <div className="text-[11px] text-amber-300">Iniciativa se ativar: {predictedInitiative}</div>
            )}
            {isActive && (
              <div className="text-xs text-amber-400">Iniciativa atual: {hero.derivedAttributes.initiative}</div>
            )}
            {isActive && (() => { const mb = hero.mountBuff; if (!mb?.speedBonus) return null; const end = mb.expiresAt ? new Date(mb.expiresAt).getTime() : 0; const rem = Math.max(0, end - Date.now()); if (rem <= 0) return null; const mins = Math.floor(rem/60000); const secs = Math.floor((rem%60000)/1000); return (<div className="text-[11px] text-emerald-300">Buff de treino +{mb.speedBonus} • expira em {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</div>); })()}
            {m.attributes && Object.keys(m.attributes).length > 0 && (
              <div className="text-xs text-gray-300">Bônus: {Object.entries(m.attributes).map(([k,v]) => `${k}+${v}`).join(', ')}</div>
            )}
            {(() => {
              const totalReq = (m.stage==='encantada') ? 3 : 2;
              const readyCount = ((inventory['pergaminho-montaria']||0)>0 ? 1 : 0) + (((hero.progression.gold||0) >= (m.stage === 'comum' ? 200 : 700)) ? 1 : 0) + ((m.stage==='encantada' && (inventory['essencia-bestial']||0)>0) ? 1 : 0);
              const pct = Math.round((readyCount / totalReq) * 100);
              return (
                <div className="mt-1 w-full bg-gray-700 rounded h-2">
                  <div className="h-2 bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
              );
            })()}
            {(() => { const mastery = Math.max(0, m.mastery || 0); const prog = mastery % 10; const toNext = 10 - (prog || 10); return (
              <>
                <div className="mt-1 w-full bg-gray-700 rounded h-2">
                  <div className="h-2 bg-emerald-600" style={{ width: `${prog*10}%` }} />
                </div>
                <div className="text-[11px] text-gray-400">Maestria: {prog}/10 • Próximo bônus em {toNext}</div>
              </>
            ) })()}
            {m.history && m.history.length > 0 && (
              <div className="text-[11px] text-gray-400">Histórico: {m.history.slice(0,3).map(h => `${new Date(h.ts).toLocaleTimeString()} ${h.action}${h.details?` ${h.details}`:''}`).join(' • ')}</div>
            )}
            <div className="flex gap-2 mt-2">
              <button disabled={isActive} title={isActive?'Montaria ativa':''} onClick={() => setActiveMount(m.id)} className={`px-3 py-1 rounded ${isActive?'bg-gray-700 text-gray-300':'bg-indigo-600 hover:bg-indigo-700 text-white'} text-sm`}>{isActive?'Ativa':'Ativar'}</button>
              {isActive && (
                <button onClick={() => setActiveMount(undefined)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Desativar</button>
              )}
              <button onClick={() => setFavoriteMount(hero.favoriteMountId===m.id?undefined:m.id)} className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm">{hero.favoriteMountId===m.id?'Remover Favorita':'Favoritar ⭐'}</button>
              <button onClick={() => setCompareAId(m.id)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Comparar A</button>
              <button onClick={() => setCompareBId(m.id)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Comparar B</button>
              <button onClick={() => (useHeroStore.getState() as any).toggleFavoriteMount(m.id)} className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white text-sm">{(hero.favoriteMountIds||[]).includes(m.id)?'Desafixar ⭐':'Fixar ⭐'}</button>
              <button onClick={() => (useHeroStore.getState() as any).toggleLockMount(m.id)} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm">{m.locked?'Destravar 🔓':'Travar 🔒'}</button>
              <button onClick={() => setDetailId(m.id)} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm">Detalhes</button>
              <button disabled={!canEvolve} title={canEvolve?`Consome 📜 x1${needsEssence?' + 🧬 x1':''} e ${m.stage==='comum'?200:700} ouro`:''} onClick={() => { if (canEvolve) { const ok = window.confirm(`Confirmar evolução de ${m.name}? Custos: 📜 x1${needsEssence?' + 🧬 x1':''} e ${m.stage==='comum'?200:700} ouro.`); if (ok) evolveMountForSelected(m.id); } }} className={`px-3 py-1 rounded ${canEvolve?'bg-purple-600 hover:bg-purple-700':'bg-gray-700'} text-white text-sm`}>Evoluir</button>
              {isActive && (
                <button onClick={() => (useHeroStore.getState() as any).trainMountForSelected()} className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-sm">Treinar</button>
              )}
              <button onClick={() => { const newName = window.prompt('Novo nome para a montaria', m.name) || ''; if (newName.trim()) (useHeroStore.getState() as any).renameMountForSelected(m.id, newName.trim()) }} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Renomear</button>
              <button disabled={!canRefineAny || isMaxRefine} title={isMaxRefine?'Refino máximo atingido':(canRefineAny?'Consome 🔷 Pedra Mágica ou 🔗 Essência de Vínculo':'') } onClick={() => { if (canRefineAny && !isMaxRefine) { const ok = window.confirm(`Tentar refinar ${m.name}? Consome 1 material e pode falhar.`); if (ok) refineCompanion(hero.id, 'mount', m.id); } }} className={`px-3 py-1 rounded ${(!canRefineAny || isMaxRefine)?'bg-gray-700':'bg-violet-600 hover:bg-violet-700'} text-white text-sm`}>{isMaxRefine?'Refino Máx.':'Refinar'}</button>
              {!canRefineAny && !isMaxRefine && (
                <>
                  <button
                    onClick={() => {
                      const ok = window.confirm('Comprar 🔷 Pedra Mágica?');
                      if (!ok) return;
                      const success = buyItem(hero.id, 'pedra-magica')
                      if (success) notificationBus.emit({ type: 'item', title: 'Material comprado', message: '🔷 +1 adicionada ao inventário.', duration: 3000, icon: '🔷' })
                      else notificationBus.emit({ type: 'gold', title: 'Compra falhou', message: 'Verifique seu saldo.', duration: 3000 })
                    }} className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white">Comprar 🔷</button>
                  <button
                    onClick={() => {
                      const ok = window.confirm('Comprar 🔗 Essência de Vínculo?');
                      if (!ok) return;
                      const success = buyItem(hero.id, 'essencia-vinculo')
                      if (success) notificationBus.emit({ type: 'item', title: 'Material comprado', message: '🔗 +1 adicionada ao inventário.', duration: 3000, icon: '🌀' })
                      else notificationBus.emit({ type: 'gold', title: 'Compra falhou', message: 'Verifique seu saldo.', duration: 3000 })
                    }} className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white">Comprar 🔗</button>
                </>
              )}
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
      {detailId && (() => {
        const m = mounts.find(mm => mm.id === detailId)
        if (!m) return null
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 w-[90%] max-w-2xl">
              <div className="flex justify-between items-center mb-2">
                <div className="text-white font-semibold">{typeIcon[m.type]} {m.name}</div>
                <button onClick={() => setDetailId(undefined)} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs">Fechar</button>
              </div>
              <div className="text-xs text-gray-300 mb-2">Tipo {m.type} • {m.stage} • {m.rarity}</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-sm text-gray-200">Velocidade: +{m.speedBonus}</div>
                <div className="text-sm text-gray-200">Maestria: {Math.max(0,m.mastery||0)}</div>
                <div className="text-sm text-gray-200">Estado: {m.locked?'🔒 Travada':'🔓 Destravada'}</div>
                {m.attributes && (
                  <div className="col-span-2 text-xs text-gray-300">Bônus: {Object.entries(m.attributes).map(([k,v]) => `${k}+${v}`).join(', ')}</div>
                )}
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">Histórico</div>
                <div className="max-h-40 overflow-auto text-[11px] text-gray-400 bg-slate-800 border border-slate-700 rounded p-2">
                  {(m.history||[]).map((h,i) => (
                    <div key={i}>{new Date(h.ts).toLocaleString()} • {h.action}{h.details?` ${h.details}`:''}</div>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">Notas</div>
                <div className="flex gap-2">
                  <input defaultValue={m.note||''} id="mount-note-input" className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-gray-200" />
                  <button onClick={() => { const el = document.getElementById('mount-note-input') as HTMLInputElement; const val = el?.value || ''; (useHeroStore.getState() as any).setMountNoteForSelected(m.id, val); }} className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-sm">Salvar nota</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFavoriteMount(hero.favoriteMountId===m.id?undefined:m.id)} className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm">{hero.favoriteMountId===m.id?'Remover Favorita':'Favoritar ⭐'}</button>
                <button onClick={() => { const newName = window.prompt('Novo nome para a montaria', m.name) || ''; if (newName.trim()) (useHeroStore.getState() as any).renameMountForSelected(m.id, newName.trim()) }} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Renomear</button>
                <button onClick={() => (useHeroStore.getState() as any).toggleLockMount(m.id)} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm">{m.locked?'Destravar 🔓':'Travar 🔒'}</button>
                <button onClick={() => { const ok = window.confirm(`Liberar ${m.name}?`); if (ok) { (useHeroStore.getState() as any).removeMountForSelected(m.id); setDetailId(undefined); } }} className="px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white text-sm">Liberar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default MountsPanel