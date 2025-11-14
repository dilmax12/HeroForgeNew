import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { Egg, Pet } from '../types/hero';
import { INCUBATION_MS, EGG_IDENTIFY_COST } from '../utils/pets';
import { motion, AnimatePresence } from 'framer-motion';
import HatchResultModal from './HatchResultModal';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';

const formatRemaining = (iso?: string) => {
  if (!iso) return '';
  const end = new Date(iso).getTime();
  const diff = Math.max(0, end - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: string }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`px-3 py-2 rounded border ${active ? 'bg-amber-600 text-white border-amber-500' : 'bg-gray-800 border-gray-700 text-gray-200'} hover:bg-amber-700 transition-colors`}>{icon} {label}</button>
);

const EggCard: React.FC<{ egg: Egg; onIdentify: () => void; onIncubate: () => void; onAccelerateEssencia: () => void; onAccelerateBrasas: () => void; onAccelerateGold: (amount: number) => void; onHatch: () => void; inventory: Record<string, number>; gold: number }>
  = ({ egg, onIdentify, onIncubate, onAccelerateEssencia, onAccelerateBrasas, onAccelerateGold, onHatch, inventory, gold }) => {
  const remaining = formatRemaining(egg.incubationEndsAt);
  const costRange = EGG_IDENTIFY_COST[egg.baseRarity];
  const hatchCostByRarity: Record<string, number> = { comum: 5, incomum: 10, raro: 20, epico: 50, lendario: 100, mistico: 200 };
  const hatchCost = hatchCostByRarity[String(egg.identified?.rarity || egg.baseRarity)] || 0;
  return (
    <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="font-semibold">{egg.name}</div>
        <div className="text-xs text-amber-300">Raridade: {egg.baseRarity}</div>
      </div>
      <div className="text-xs text-gray-300">{egg.description}</div>
      <div className="text-sm">
        Status: <span className="font-medium">{egg.status}</span>
        {egg.status === 'identificado' && egg.identified && (
          <span className="ml-2 text-gray-300">• {egg.identified.type} • {egg.identified.petClass} • Chance de habilidade {egg.identified.skillChancePercent}%</span>
        )}
        {egg.status === 'incubando' && egg.incubatingSlot !== undefined && (
          <span className="ml-2 text-gray-300">• Slot {egg.incubatingSlot + 1} • Fim em {remaining}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {egg.status === 'misterioso' && (
          <button onClick={onIdentify} className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">🔮 Identificar ({costRange.min}–{costRange.max} ouro)</button>
        )}
        {egg.status === 'identificado' && (
          (() => {
            const usedSlots = (useHeroStore.getState().getSelectedHero()?.eggs || []).filter(e => e.status === 'incubando' && typeof e.incubatingSlot === 'number').length;
            const full = usedSlots >= 3;
            return (
              <button onClick={onIncubate} disabled={full} className={`px-3 py-1 rounded text-white text-sm ${full ? 'bg-gray-700 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}>🪽 Incubar</button>
            );
          })()
        )}
        {egg.status === 'incubando' && (
          <>
            <button disabled={!inventory['essencia-calor']} onClick={onAccelerateEssencia} className={`px-3 py-1 rounded ${inventory['essencia-calor'] ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700'} text-white text-sm`}>🔥 Essência (-15m)</button>
            <button disabled={!inventory['brasas-magicas']} onClick={onAccelerateBrasas} className={`px-3 py-1 rounded ${inventory['brasas-magicas'] ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700'} text-white text-sm`}>♨️ Brasas (-1h)</button>
            <button onClick={() => onAccelerateGold(50)} className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-sm">💰 Acelerar com Ouro</button>
          </>
        )}
        {(egg.status === 'pronto_para_chocar' || egg.status === 'incubando') && (
          <button onClick={onHatch} disabled={(() => {
            const hero = useHeroStore.getState().getSelectedHero();
            if (!hero) return false;
            if (!hero.hatchCooldownEndsAt) return false;
            const cd = Date.now() < new Date(hero.hatchCooldownEndsAt).getTime();
            const goldInsufficient = (hero.progression.gold || 0) < hatchCost;
            return cd || goldInsufficient;
          })()} className={`px-3 py-1 rounded text-white text-sm ${(() => {
            const hero = useHeroStore.getState().getSelectedHero();
            const cd = hero?.hatchCooldownEndsAt && Date.now() < new Date(hero.hatchCooldownEndsAt).getTime();
            const goldInsufficient = hero ? (hero.progression.gold || 0) < hatchCost : false;
            return (cd || goldInsufficient) ? 'bg-gray-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700';
          })()}`}>🐣 Chocar</button>
        )}
        {(egg.status === 'pronto_para_chocar' || egg.status === 'incubando') && (
          (() => {
            const hero = useHeroStore.getState().getSelectedHero();
            const cdMs = hero?.hatchCooldownEndsAt ? Math.max(0, new Date(hero.hatchCooldownEndsAt).getTime() - Date.now()) : 0;
            const cdText = cdMs > 0 ? `${Math.ceil(cdMs / 1000)}s` : '';
            const gold = hero?.progression.gold || 0;
            const pct = cdMs > 0 ? Math.max(0, Math.min(100, Math.round(cdMs / 300))) : 0;
            return (
              <div className="text-xs text-gray-300">
                <div className="flex items-center gap-2"><span className="text-amber-300">Custo: {hatchCost} ouro</span>{cdText && <span>CD: {cdText}</span>}{gold < hatchCost && <span className="text-red-300">Ouro insuficiente</span>}</div>
                {cdMs > 0 && (
                  <div className="w-40 bg-gray-700 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })()
        )}
        {(egg.status === 'pronto_para_chocar' || egg.status === 'incubando') && (
          (() => {
            const hatchCostByRarity: Record<string, number> = { comum: 5, incomum: 10, raro: 20, epico: 50, lendario: 100, mistico: 200 };
            const rarity = String(egg.identified?.rarity || egg.baseRarity);
            const cost = hatchCostByRarity[rarity] || 0;
            const hero = useHeroStore.getState().getSelectedHero();
            const cdMs = hero?.hatchCooldownEndsAt ? Math.max(0, new Date(hero.hatchCooldownEndsAt).getTime() - Date.now()) : 0;
            const cdText = cdMs > 0 ? `${Math.ceil(cdMs / 1000)}s` : '';
            return <div className="text-xs text-gray-300 flex items-center gap-2"><span className="text-amber-300">Custo: {cost} ouro</span>{cdText && <span>CD: {cdText}</span>}</div>;
          })()
        )}
      </div>
    </div>
  );
};

  const PetCard: React.FC<{ pet: Pet; onTrain: () => void; onSoulStone: () => void; onFeedBasic: () => void; onFeedDeluxe: () => void; onSetActive: () => void; onRename: (name: string) => void; onRefine: () => void; inventory: Record<string, number>; isActive: boolean }>
  = ({ pet, onTrain, onSoulStone, onFeedBasic, onFeedDeluxe, onSetActive, onRename, onRefine, inventory, isActive }) => (
    <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="font-semibold">{pet.name} {isActive && <span className="ml-2 text-xs bg-emerald-700 text-white px-2 py-1 rounded">Ativo</span>} {pet.mutation?.visualBadge && <span className="ml-1">{pet.mutation.visualBadge}</span>}</div>
        <div className="text-xs text-amber-300">{pet.type} • {pet.petClass} • {pet.rarity}</div>
      </div>
      <div className="text-sm">Nível {pet.level} • Estágio: {pet.stage.replace('_', ' ')}</div>
      {pet.exclusiveSkill && <div className="text-xs text-emerald-300">Skill Exclusiva: {pet.exclusiveSkill}</div>}
      <div className="mt-1">
        <div className="flex justify-between items-center">
          <span className="text-amber-300 text-[10px]">Energia</span>
          <span className="text-gray-300 text-[10px]">{Math.max(0, Math.min(100, pet.energy || 0))}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, pet.energy || 0))}%` }} />
        </div>
        {pet.exclusiveSkill && (
          <div className="mt-1 text-xs">
            {(() => {
              const costMap: Record<string, number> = { 'Instinto Feral': 8, 'Pulso Arcano': 10, 'Aura Sagrada': 9, 'Sussurro Sombrio': 12 };
              const cost = costMap[pet.exclusiveSkill] || 8;
              const ready = (pet.energy || 0) >= cost;
              return <span className={`px-2 py-0.5 rounded ${ready ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'}`}>{ready ? 'Skill pronta' : 'Skill indisponível'}</span>;
            })()}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={onTrain} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">🎖 Treinar (+100 XP)</button>
        <button disabled={!inventory['pedra-alma']} onClick={onSoulStone} className={`px-3 py-1 rounded ${inventory['pedra-alma'] ? 'bg-violet-600 hover:bg-violet-700' : 'bg-gray-700'} text-white text-sm`}>🪨 Pedra de Alma (+300 XP)</button>
        <button disabled={!inventory['racao-basica']} onClick={onFeedBasic} className={`px-3 py-1 rounded ${inventory['racao-basica'] ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700'} text-white text-sm`}>🍖 Ração (+50 XP)</button>
        <button disabled={!inventory['racao-deluxe']} onClick={onFeedDeluxe} className={`px-3 py-1 rounded ${inventory['racao-deluxe'] ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-700'} text-white text-sm`}>🍗 Ração Deluxe (+150 XP)</button>
        <button onClick={onSetActive} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm">⭐ Tornar Ativo</button>
        <button disabled={!inventory['essencia-vinculo']} onClick={onRefine} className={`px-3 py-1 rounded ${inventory['essencia-vinculo'] ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700'} text-white text-sm`}>🔗 Refinar Vínculo (+1%)</button>
        <button disabled={!inventory['tonico-companheiro']} onClick={() => {
          if (inventory['tonico-companheiro']) {
            if (consumeInventoryItem(useHeroStore.getState().getSelectedHero()!.id, 'tonico-companheiro', 1)) {
              const hero = useHeroStore.getState().getSelectedHero()!;
              useHeroStore.getState().updateHero(hero.id, { pets: (hero.pets || []).map(p => p.id === pet.id ? { ...p, energy: Math.min(100, (p.energy || 0) + 50) } : p) });
            }
          }
        }} className={`px-3 py-1 rounded ${inventory['tonico-companheiro'] ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700'} text-white text-sm`}>⚡ Tônico de Energia (+50)</button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input type="text" placeholder="Renomear" className="px-2 py-1 rounded bg-slate-700 text-white text-sm" onKeyDown={(e) => { if (e.key === 'Enter') onRename((e.target as HTMLInputElement).value); }} />
        <span className="text-xs text-gray-300">Pressione Enter para salvar</span>
      </div>
    </div>
);

export const PetsPanel: React.FC = () => {
  const { getSelectedHero, generateEggForSelected, identifyEggForSelected, startIncubationForSelected, accelerateIncubationForSelected, hatchEggForSelected, consumeInventoryItem, addPetXPForSelected, setActivePet, updateHero, refinePetForSelected } = useHeroStore();
  const hero = getSelectedHero();
  const [tab, setTab] = useState<'ovos'|'camara'|'meus'|'historico'>('ovos');
  const [hatchingEggId, setHatchingEggId] = useState<string | null>(null);
  const [hatchResultPetId, setHatchResultPetId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'todos'|'raro'|'epico'|'lendario'|'mistico'>('todos');
  const [confirmEggId, setConfirmEggId] = useState<string | null>(null);
  const [confirmAccelerateGold, setConfirmAccelerateGold] = useState<number>(0);

  useEffect(() => {
    const iv = setInterval(() => { useHeroStore.getState().updateIncubationTick?.(); }, 1000);
    return () => clearInterval(iv);
  }, []);

  if (!hero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🐾</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para acessar Mascotes.</p>
      </div>
    );
  }

  const eggs = hero.eggs || [];
  const pets = hero.pets || [];
  const inventory = hero.inventory.items || {};
  const rarityOrder = ['mistico','lendario','epico','raro','incomum','comum'];
  const statusOrder = ['pronto_para_chocar','incubando','identificado','misterioso'];
  const eggsSorted = [...eggs].sort((a,b) => {
    const sa = statusOrder.indexOf(a.status);
    const sb = statusOrder.indexOf(b.status);
    if (sa !== sb) return sa - sb;
    const ra = rarityOrder.indexOf(String(a.identified?.rarity || a.baseRarity));
    const rb = rarityOrder.indexOf(String(b.identified?.rarity || b.baseRarity));
    return ra - rb;
  });
  const rarityCounts = (() => {
    const acc: Record<string, number> = { comum:0, incomum:0, raro:0, epico:0, lendario:0, mistico:0 };
    eggs.forEach(e => { const r = String(e.identified?.rarity || e.baseRarity); acc[r] = (acc[r]||0)+1; });
    return acc;
  })();
  const filteredHistory = (() => {
    const hist = hero.hatchHistory || [];
    if (historyFilter === 'todos') return hist;
    const order = ['comum','incomum','raro','epico','lendario','mistico'];
    const minIdx = order.indexOf(historyFilter);
    return hist.filter(h => {
      const pet = pets.find(p => p.id === h.petId);
      if (!pet) return false;
      return order.indexOf(pet.rarity) >= minIdx;
    });
  })();

  const incubatingSlots: (Egg | undefined)[] = [undefined, undefined, undefined];
  eggs.filter(e => e.status === 'incubando').forEach(e => { if (typeof e.incubatingSlot === 'number') incubatingSlots[e.incubatingSlot!] = e; });

  const handleGenerateEgg = () => generateEggForSelected();
  const handleIdentify = (eggId: string) => identifyEggForSelected(eggId);
  const handleIncubate = (eggId: string, slot?: number) => startIncubationForSelected(eggId, slot);
  const handleAccelerateEssencia = (eggId: string) => {
    if (consumeInventoryItem(hero.id, 'essencia-calor', 1)) accelerateIncubationForSelected(eggId, 'essencia');
  };
  const handleAccelerateBrasas = (eggId: string) => {
    if (consumeInventoryItem(hero.id, 'brasas-magicas', 1)) accelerateIncubationForSelected(eggId, 'brasas');
  };
  const handleAccelerateGold = (eggId: string, amount: number) => accelerateIncubationForSelected(eggId, 'ouro', amount);
  const handleHatch = async (eggId: string) => {
    setConfirmEggId(eggId);
  };

  const confirmHatchProceed = () => {
    const eggId = confirmEggId!;
    const hero = useHeroStore.getState().getSelectedHero();
    if (hero && confirmAccelerateGold > 0) {
      useHeroStore.getState().accelerateHatchCooldownForSelected(confirmAccelerateGold);
    }
    setConfirmEggId(null);
    setConfirmAccelerateGold(0);
    setHatchingEggId(eggId);
    setTimeout(() => {
      hatchEggForSelected(eggId);
      const h2 = useHeroStore.getState().getSelectedHero();
      if (h2) {
        useHeroStore.getState().updateHero(h2.id, { eggs: (h2.eggs || []).filter(e => e.id !== eggId) });
        const last = (h2.hatchHistory || []).slice(-1)[0];
        if (last?.petId) setHatchResultPetId(last.petId);
      }
      setHatchingEggId(null);
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4 flex gap-2">
        <TabButton active={tab==='ovos'} onClick={() => setTab('ovos')} label="Inventário de Ovos" icon="🥚" />
        <TabButton active={tab==='camara'} onClick={() => setTab('camara')} label="Câmara de Eclosão" icon="🪽" />
        <TabButton active={tab==='meus'} onClick={() => setTab('meus')} label="Meus Mascotes" icon="🐾" />
        <TabButton active={tab==='historico'} onClick={() => setTab('historico')} label="Histórico de Eclosões" icon="📜" />
      </div>

      {tab === 'ovos' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Ovos</h2>
              <div className="text-xs text-gray-300">Capacidade: {eggs.length}/30</div>
              {(() => {
                const cdMs = hero.hatchCooldownEndsAt ? Math.max(0, new Date(hero.hatchCooldownEndsAt).getTime() - Date.now()) : 0;
                if (cdMs > 0) {
                  const pct = Math.max(0, Math.min(100, Math.round(cdMs / 300) ));
                  return (
                    <div className="mt-1">
                      <div className="text-xs text-gray-300">Cooldown de Chocagem: {Math.ceil(cdMs / 1000)}s</div>
                      <div className="w-40 bg-gray-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <button onClick={handleGenerateEgg} disabled={eggs.length >= 30} className={`px-3 py-2 rounded text-white text-sm ${eggs.length >= 30 ? 'bg-gray-700 cursor-not-allowed' : `bg-gradient-to-r ${getSeasonalButtonGradient(useMonetizationStore.getState().activeSeasonalTheme as any)} hover:brightness-110 flex items-center gap-2`}`}>
              {eggs.length < 30 ? (((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.accents?.[0]) || '') : ''}
              <span>➕ Gerar Ovo Aleatório</span>
            </button>
          </div>
          <div className="flex justify-end mb-2">
            {(() => {
              const readyList = eggsSorted.filter(e => e.status === 'pronto_para_chocar');
              if (readyList.length === 0) return null;
              const target = readyList[0];
              const hatchCostByRarity: Record<string, number> = { comum: 5, incomum: 10, raro: 20, epico: 50, lendario: 100, mistico: 200 };
              const cost = hatchCostByRarity[String(target.identified?.rarity || target.baseRarity)] || 0;
              const cdMs = hero.hatchCooldownEndsAt ? Math.max(0, new Date(hero.hatchCooldownEndsAt).getTime() - Date.now()) : 0;
              const gold = hero.progression.gold || 0;
              const disabled = cdMs > 0 || gold < cost;
              const rarity = String(target.identified?.rarity || target.baseRarity);
              const high = ['epico','lendario','mistico'].includes(rarity);
              const baseClass = disabled ? 'bg-gray-700 cursor-not-allowed' : high ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:brightness-110' : 'bg-amber-600 hover:bg-amber-700';
              const label = high ? '🐣⭐ Chocar Próximo' : '🐣 Chocar Próximo';
              return (
                <button onClick={() => setConfirmEggId(target.id)} disabled={disabled} className={`px-3 py-2 rounded text-white text-sm ${baseClass}`}>{label}</button>
              );
            })()}
          </div>
          <div className="text-xs text-gray-300 flex flex-wrap gap-2">
            {Object.entries(rarityCounts).map(([r,c]) => (
              <span key={r} className="px-2 py-1 rounded bg-slate-800 border border-slate-700">{r}: {c}</span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eggs.length === 0 && <div className="text-gray-400">Nenhum ovo ainda. Explore missões e dungeons para encontrar ovos!</div>}
            {eggsSorted.map(egg => (
              <EggCard
                key={egg.id}
                egg={egg}
                inventory={inventory}
                gold={hero.progression.gold}
                onIdentify={() => handleIdentify(egg.id)}
                onIncubate={() => handleIncubate(egg.id)}
                onAccelerateEssencia={() => handleAccelerateEssencia(egg.id)}
                onAccelerateBrasas={() => handleAccelerateBrasas(egg.id)}
                onAccelerateGold={(amt) => handleAccelerateGold(egg.id, amt)}
                onHatch={() => handleHatch(egg.id)}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'camara' && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Câmara de Eclosão</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0,1,2].map(slot => (
              <div key={slot} className="p-4 rounded-lg bg-slate-900 border border-slate-700">
                <div className="font-semibold mb-2">Slot {slot+1}</div>
                {incubatingSlots[slot] ? (
                  <EggCard
                    egg={incubatingSlots[slot]!}
                    inventory={inventory}
                    gold={hero.progression.gold}
                    onIdentify={() => {}}
                    onIncubate={() => {}}
                    onAccelerateEssencia={() => handleAccelerateEssencia(incubatingSlots[slot]!.id)}
                    onAccelerateBrasas={() => handleAccelerateBrasas(incubatingSlots[slot]!.id)}
                    onAccelerateGold={(amt) => handleAccelerateGold(incubatingSlots[slot]!.id, amt)}
                    onHatch={() => handleHatch(incubatingSlots[slot]!.id)}
                  />
                ) : (
                  <div className="text-gray-400 text-sm">Vazio. Selecione um ovo identificado para incubar.</div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <h3 className="text-sm text-gray-300">Elegíveis para incubação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {eggs.filter(e => e.status === 'identificado').map(e => (
                <div key={e.id} className="p-3 rounded bg-slate-800 border border-slate-700 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-gray-400">{e.identified?.type} • {e.identified?.petClass} • {e.identified?.rarity}</div>
                  </div>
                  <button onClick={() => handleIncubate(e.id)} className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm">Incubar</button>
                </div>
              ))}
              {eggs.filter(e => e.status === 'identificado').length === 0 && (
                <div className="text-gray-400">Nenhum ovo identificado no momento.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'meus' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">Meus Mascotes</h2>
            <div className="text-xs text-gray-300">Capacidade: {pets.length}/50</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pets.length === 0 && <div className="text-gray-400">Nenhum mascote ainda. Incube e choque ovos para obter companheiros!</div>}
            {pets.map(pet => (
              <PetCard
                key={pet.id}
                pet={pet}
                inventory={inventory}
                onTrain={() => addPetXPForSelected(pet.id, 100)}
                onSoulStone={() => {
                  if (consumeInventoryItem(hero.id, 'pedra-alma', 1)) addPetXPForSelected(pet.id, 300);
                }}
                onFeedBasic={() => {
                  if (consumeInventoryItem(hero.id, 'racao-basica', 1)) {
                    addPetXPForSelected(pet.id, 50);
                    updateHero(hero.id, { pets: (hero.pets || []).map(p => p.id === pet.id ? { ...p, energy: Math.min(100, (p.energy || 0) + 10) } : p) });
                  }
                }}
                onFeedDeluxe={() => {
                  if (consumeInventoryItem(hero.id, 'racao-deluxe', 1)) {
                    addPetXPForSelected(pet.id, 150);
                    updateHero(hero.id, { pets: (hero.pets || []).map(p => p.id === pet.id ? { ...p, energy: Math.min(100, (p.energy || 0) + 30) } : p) });
                  }
                }}
                onSetActive={() => setActivePet(pet.id)}
                onRename={(name) => updateHero(hero.id, { pets: (hero.pets || []).map(p => p.id === pet.id ? { ...p, name } : p) })}
                isActive={hero.activePetId === pet.id}
                onRefine={() => refinePetForSelected(pet.id)}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Histórico de Eclosões</h2>
          <div className="flex gap-2 items-center text-xs">
            <span className="text-gray-300">Filtrar:</span>
            {['todos','raro','epico','lendario','mistico'].map(f => (
              <button key={f} onClick={() => setHistoryFilter(f as any)} className={`px-2 py-1 rounded ${historyFilter===f ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-200'}`}>{f}</button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredHistory.length === 0 && <div className="text-gray-400">Nenhuma eclosão registrada para este filtro.</div>}
            {filteredHistory.map(h => (
              <div key={h.timestamp} className="p-3 rounded bg-slate-800 border border-slate-700 text-sm text-gray-200">
                🐣 Eclodiu em {new Date(h.timestamp).toLocaleString()} • Mascote {(hero.pets||[]).find(p=>p.id===h.petId)?.name || h.petId.slice(0,8)} • Raridade {(hero.pets||[]).find(p=>p.id===h.petId)?.rarity}
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {hatchingEggId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            {(() => {
              const egg = (hero.eggs || []).find(e => e.id === hatchingEggId);
              const type = egg?.identified?.type;
              const gradient = type === 'feral' ? 'from-emerald-700 to-emerald-900'
                : type === 'arcano' ? 'from-indigo-700 to-indigo-900'
                : type === 'sagrado' ? 'from-amber-600 to-amber-900'
                : type === 'sombrio' ? 'from-slate-800 to-black' : 'from-slate-800 to-slate-900';
              return (
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className={`p-6 rounded-xl bg-gradient-to-br ${gradient} border border-amber-500 text-center text-white`}>
                  <div className="text-6xl mb-2">🥚</div>
                  <div className="text-lg font-semibold mb-2">O ovo está se movendo!</div>
                  <div className="text-sm opacity-90">Rachaduras… luz… uma criatura {egg?.identified?.type || 'misteriosa'} emerge…</div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {confirmEggId && (() => {
        const egg = eggs.find(e => e.id === confirmEggId)!;
        const hatchCostByRarity: Record<string, number> = { comum: 5, incomum: 10, raro: 20, epico: 50, lendario: 100, mistico: 200 };
        const hatchCost = hatchCostByRarity[String(egg.identified?.rarity || egg.baseRarity)] || 0;
        const cdMs = hero.hatchCooldownEndsAt ? Math.max(0, new Date(hero.hatchCooldownEndsAt).getTime() - Date.now()) : 0;
        const gold = hero.progression.gold || 0;
        const insufficient = gold < hatchCost;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="w-full max-w-md rounded-xl border border-amber-500 bg-slate-900 p-5 text-white">
              <div className="text-lg font-semibold mb-2">Confirmar Chocagem</div>
              <div className="text-sm text-gray-200">Custo: {hatchCost} ouro</div>
              {cdMs > 0 && (
                <div className="text-sm text-gray-300 mt-1">Cooldown ativo: {Math.ceil(cdMs/1000)}s</div>
              )}
              <div className="mt-3 text-xs text-gray-300">
                <div>Ovo: {egg.name}</div>
                <div>Raridade: {String(egg.identified?.rarity || egg.baseRarity)}</div>
                {egg.identified && (
                  <div className="mt-1">
                    <div>Tipo: {egg.identified.type} • Classe: {egg.identified.petClass}</div>
                    {Array.isArray(egg.identified.candidates) && egg.identified.candidates.length > 0 && (
                      <div className="mt-1">Possíveis mascotes: {egg.identified.candidates.join(', ')}</div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <label className="text-xs text-gray-300">Acelerar cooldown com ouro (10 ouro = 1 min)</label>
                <input type="number" min={0} value={confirmAccelerateGold} onChange={(e) => setConfirmAccelerateGold(Math.max(0, Number(e.target.value)))} className="mt-1 w-full px-2 py-1 rounded bg-slate-800 border border-slate-700" />
              </div>
              {insufficient && <div className="mt-2 text-xs text-red-300">Ouro insuficiente para chocar.</div>}
              <div className="mt-4 flex gap-2">
                <button disabled={insufficient} onClick={confirmHatchProceed} className={`px-3 py-2 rounded ${insufficient ? 'bg-gray-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirmar</button>
                <button onClick={() => { setConfirmAccelerateGold(0); setConfirmEggId(null); }} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600">Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}
      {hatchResultPetId && (
        <HatchResultModal petId={hatchResultPetId} onClose={() => setHatchResultPetId(null)} />
      )}
    </div>
  );
};

export default PetsPanel;
