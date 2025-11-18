import React, { useMemo, useState, useCallback } from 'react';
import { useHeroStore } from '../store/heroStore';
import { SHOP_ITEMS } from '../utils/shop';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, medievalTheme } from '../styles/medievalTheme';
import { Jewel } from '../types/jewel';

type ItemType = 'todos' | 'consumable' | 'weapon' | 'armor' | 'accessory' | 'material';
type ItemRarity = 'todas' | 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

const Inventory: React.FC = () => {
  const { getSelectedHero, equipItem, sellItem, useItem, unequipItem, upgradeItem, socketJewel, removeJewel, fuseJewels } = useHeroStore();
  const hero = getSelectedHero();
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-slate-600' : 'border-slate-600';

  const [selectedType, setSelectedType] = useState<ItemType>('todos');
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity>('todas');
  const [search, setSearch] = useState('');
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const weaponCapacity = 2;
  const armorCapacity = 4;
  const accessoryCapacity = 9;

  const equippedWeapons = hero?.inventory.equippedWeapons || [];
  const equippedArmorSlots = hero?.inventory.equippedArmorSlots || [];
  const equippedAccessories = hero?.inventory.equippedAccessories || [];

  const rarityClass = useCallback((rarity?: string) => {
    switch (rarity) {
      case 'lendario': return 'border-amber-400 bg-amber-900/10';
      case 'epico': return 'border-violet-400 bg-violet-900/10';
      case 'raro': return 'border-blue-400 bg-blue-900/10';
      case 'incomum': return 'border-emerald-400 bg-emerald-900/10';
      default: return 'border-slate-600 bg-slate-800';
    }
  }, []);

  const getMaxSlotsForItem = (itemId?: string) => {
    if (!itemId) return 0;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return 0;
    if (item.type === 'weapon') return 2;
    if (item.type === 'armor') return 3;
    if (item.type === 'accessory') return 1;
    return 0;
  };

  const getJewelLabel = (jewelKey: string) => {
    const [_, tipo, nivelStr] = jewelKey.split(':');
    const j = new Jewel(crypto.randomUUID(), tipo as any, Number(nivelStr));
    const b = j.getBonus();
    const parts: string[] = [];
    if (b.forca) parts.push(`+${b.forca} Força`);
    if (b.inteligencia) parts.push(`+${b.inteligencia} Inteligência`);
    if (b.destreza) parts.push(`+${b.destreza} Destreza`);
    if (b.constituicao) parts.push(`+${b.constituicao} Constituição`);
    if (b.armorClass) parts.push(`+${b.armorClass} Defesa`);
    return `${tipo.toUpperCase()} Nv.${j.nivel} • ${parts.join(' / ')}`;
  };

  const buildTooltip = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return '';
    const parts: string[] = [item.name];
    if (item.bonus) {
      const b = item.bonus as any;
      const map: Record<string,string> = { forca: 'Força', destreza: 'Destreza', constituicao: 'Constituição', inteligencia: 'Inteligência' };
      for (const k of Object.keys(b)) {
        const labelKey = k === 'sabedoria' ? 'inteligencia' : (k === 'carisma' ? 'destreza' : k);
        parts.push(`+${b[k]} ${map[labelKey] || labelKey}`);
      }
    }
    if (item.effects) {
      const e = item.effects as any;
      if (e.hp) parts.push(`+${e.hp} HP`);
      if (e.mp) parts.push(`+${e.mp} MP`);
      if (e.special) parts.push(`${e.special}`);
    }
    return parts.join(' • ');
  };

  const onDragStart = (ev: React.DragEvent, itemId: string) => {
    ev.dataTransfer.setData('text/plain', itemId);
  };
  const onJewelDragStart = (ev: React.DragEvent, jewelKey: string) => {
    ev.dataTransfer.setData('application/jewel', jewelKey);
  };
  const makeDropHandler = (slot: 'mainHand'|'offHand'|'helm'|'chest'|'belt'|'gloves'|'boots'|'cape'|'ringLeft'|'ringRight'|'necklace'|'earringLeft'|'earringRight') => (ev: React.DragEvent) => {
    ev.preventDefault();
    const itemId = ev.dataTransfer.getData('text/plain');
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!hero || !item) return;
    if (slot === 'mainHand' && item.type !== 'weapon') return;
    if (slot === 'offHand' && item.type !== 'weapon') return;
    if (slot === 'helm' && !(item.type === 'armor' && item.slot === 'helm')) return;
    if (slot === 'chest' && !(item.type === 'armor' && (!item.slot || item.slot === 'chest'))) return;
    if (slot === 'belt' && !(item.type === 'armor' && item.slot === 'belt')) return;
    if (slot === 'gloves' && !(item.type === 'armor' && item.slot === 'gloves')) return;
    if (slot === 'boots' && !(item.type === 'armor' && item.slot === 'boots')) return;
    if (slot === 'cape' && !(item.type === 'armor' && item.slot === 'cape')) return;
    if (slot === 'necklace' && !(item.type === 'accessory' && item.slot === 'necklace')) return;
    if ((slot === 'ringLeft' || slot === 'ringRight') && !(item.type === 'accessory' && (item.slot === 'ring' || !item.slot))) return;
    if ((slot === 'earringLeft' || slot === 'earringRight') && !(item.type === 'accessory' && item.slot === 'earring')) return;
    const ok = equipItem(hero.id, itemId);
    if (ok) setFeedback({ message: `Equipado: ${item.name}`, type: 'success' }); else setFeedback({ message: `Não foi possível equipar ${item.name}.`, type: 'error' });
    setTimeout(() => setFeedback(null), 1500);
  };
  const onDragOver = (ev: React.DragEvent) => ev.preventDefault();

  const inventoryEntries = useMemo(() => {
    if (!hero) return [] as Array<[string, number]>;
    return Object.entries(hero.inventory.items).filter(([, qty]) => qty > 0);
  }, [hero]);

  const filtered = useMemo(() => {
    return inventoryEntries.filter(([itemId]) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return false;
      if (selectedType !== 'todos' && item.type !== selectedType) return false;
      if (selectedRarity !== 'todas' && item.rarity !== selectedRarity) return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [inventoryEntries, selectedType, selectedRarity, search]);

  const handleQtyChange = (itemId: string, value: number, max: number) => {
    const v = Math.max(1, Math.min(max, Number.isFinite(value) ? value : 1));
    setQtyByItem(s => ({ ...s, [itemId]: v }));
  };

  if (!hero) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-3">🎒</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Inventário</h1>
          <p className="text-gray-600">Selecione ou crie um herói para acessar o inventário.</p>
          <div className="mt-4">
            <a href="/create" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Criar Herói</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className={`${medievalTheme.layout.containers.panel} ${seasonalBorder} p-6 mb-6 text-slate-200`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">🎒 Inventário</h1>
            <p className="text-slate-400 mt-2">Gerencie seus itens: equipar, consumir e vender.</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Herói</div>
            <div className="font-semibold text-slate-100">{hero.name}</div>
          </div>
        </div>
        {/* Feedback banner */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 px-4 py-2 rounded text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-900/20 text-emerald-300 border border-emerald-700'
                : 'bg-red-900/20 text-red-300 border border-red-700'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Equipamentos (slots específicos) */}
      <div className={`${medievalTheme.layout.containers.panel} ${seasonalBorder} p-6 mt-6 text-slate-200`}>
        <h2 className="text-xl font-bold mb-4">⚙️ Equipamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-semibold mb-2">Armas</div>
            <div className="grid grid-cols-2 gap-2">
              {(['mainHand','offHand'] as const).map((slot) => {
                const id = slot === 'mainHand' ? hero.inventory.equippedMainHand : hero.inventory.equippedOffHand;
                const item = id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
                return (
                  <div key={slot} onDrop={makeDropHandler(slot)} onDragOver={onDragOver}
                       className={`h-20 rounded border flex items-center justify-center text-sm ${id ? rarityClass(item?.rarity) : 'border-dashed border-slate-600 bg-slate-800'}`}
                       title={id ? buildTooltip(id) : (slot === 'mainHand' ? 'Arraste arma (mão principal)' : 'Arraste arma (mão secundária)')}>
                    {id ? (
                      <button onClick={() => { const ok = unequipItem(hero.id, id!); if (ok) setFeedback({ message: 'Desequipado.', type: 'success' }); }} className="px-2 py-1 bg-slate-700 text-white rounded">
                        {item?.icon} {item?.name}
                      </button>
                    ) : (
                      <span className="text-slate-400">{slot === 'mainHand' ? 'Mão Principal' : 'Mão Secundária'}</span>
                    )}
                    {id && (
                      <div className="mt-1 w-full px-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: getMaxSlotsForItem(id) }).map((_, idx) => {
                            const eq = hero.inventory.equippedJewelsByItemId?.[id] || [];
                            const jewelKey = eq[idx];
                            return (
                              <div key={idx}
                                   onDrop={(ev) => { ev.preventDefault(); const key = ev.dataTransfer.getData('application/jewel'); if (key) { const ok = socketJewel(hero.id, id!, key); setFeedback(ok ? { message: 'Joia engastada.', type: 'success' } : { message: 'Não foi possível engastar.', type: 'error' }); setTimeout(() => setFeedback(null), 1500); } }}
                                   onDragOver={onDragOver}
                                   className={`h-6 w-6 rounded-full border ${jewelKey ? 'border-violet-600 bg-violet-900/20' : 'border-slate-600 bg-slate-900'} flex items-center justify-center text-[10px]`}
                                   title={jewelKey ? getJewelLabel(jewelKey) : 'Solte joia aqui'}>
                                {jewelKey ? (
                                  <button onClick={() => { const ok = removeJewel(hero.id, id!, idx); setFeedback(ok ? { message: 'Joia removida.', type: 'success' } : { message: 'Falha ao remover.', type: 'error' }); setTimeout(() => setFeedback(null), 1200); }} className="text-slate-200">
                                    ×
                                  </button>
                                ) : (
                                  <span className="text-slate-500">•</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="font-semibold mb-2">Armadura</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['helm', hero.inventory.equippedHelm, 'Helmo'],
                ['chest', hero.inventory.equippedChest, 'Armadura'],
                ['belt', hero.inventory.equippedBelt, 'Cintura'],
                ['gloves', hero.inventory.equippedGloves, 'Luvas'],
                ['boots', hero.inventory.equippedBoots, 'Botas'],
                ['cape', hero.inventory.equippedCape, 'Asa/Capa']
              ] as const).map(([slot, id, label]) => {
                const item = id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
                return (
                  <div key={slot} onDrop={makeDropHandler(slot as any)} onDragOver={onDragOver}
                       className={`h-20 rounded border flex items-center justify-center text-sm ${id ? rarityClass(item?.rarity) : 'border-dashed border-slate-600 bg-slate-800'}`}
                       title={id ? buildTooltip(id!) : `Arraste ${label} aqui`}>
                    {id ? (
                      <button onClick={() => { const ok = unequipItem(hero.id, id!); if (ok) setFeedback({ message: 'Desequipado.', type: 'success' }); }} className="px-2 py-1 bg-slate-700 text-white rounded">
                        {item?.icon} {item?.name}
                      </button>
                    ) : (
                      <span className="text-slate-400">{label}</span>
                    )}
                    {id && (
                      <div className="mt-1 w-full px-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: getMaxSlotsForItem(id) }).map((_, idx) => {
                            const eq = hero.inventory.equippedJewelsByItemId?.[id] || [];
                            const jewelKey = eq[idx];
                            return (
                              <div key={idx}
                                   onDrop={(ev) => { ev.preventDefault(); const key = ev.dataTransfer.getData('application/jewel'); if (key) { const ok = socketJewel(hero.id, id!, key); setFeedback(ok ? { message: 'Joia engastada.', type: 'success' } : { message: 'Não foi possível engastar.', type: 'error' }); setTimeout(() => setFeedback(null), 1500); } }}
                                   onDragOver={onDragOver}
                                   className={`h-6 w-6 rounded-full border ${jewelKey ? 'border-violet-600 bg-violet-900/20' : 'border-slate-600 bg-slate-900'} flex items-center justify-center text-[10px]`}
                                   title={jewelKey ? getJewelLabel(jewelKey) : 'Solte joia aqui'}>
                                {jewelKey ? (
                                  <button onClick={() => { const ok = removeJewel(hero.id, id!, idx); setFeedback(ok ? { message: 'Joia removida.', type: 'success' } : { message: 'Falha ao remover.', type: 'error' }); setTimeout(() => setFeedback(null), 1200); }} className="text-slate-200">
                                    ×
                                  </button>
                                ) : (
                                  <span className="text-slate-500">•</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="font-semibold mb-2">Acessórios</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['ringLeft', hero.inventory.equippedRingLeft, 'Anel (esq.)'],
                ['ringRight', hero.inventory.equippedRingRight, 'Anel (dir.)'],
                ['necklace', hero.inventory.equippedNecklace, 'Colar'],
                ['earringLeft', hero.inventory.equippedEarringLeft, 'Brinco (esq.)'],
                ['earringRight', hero.inventory.equippedEarringRight, 'Brinco (dir.)']
              ] as const).map(([slot, id, label]) => {
                const item = id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
                return (
                  <div key={slot} onDrop={makeDropHandler(slot as any)} onDragOver={onDragOver}
                       className={`h-20 rounded border flex items-center justify-center text-xs ${id ? rarityClass(item?.rarity) : 'border-dashed border-slate-600 bg-slate-800'}`}
                       title={id ? buildTooltip(id!) : `Arraste ${label} aqui`}>
                    {id ? (
                      <button onClick={() => { const ok = unequipItem(hero.id, id!); if (ok) setFeedback({ message: 'Desequipado.', type: 'success' }); }} className="px-2 py-1 bg-slate-700 text-white rounded">
                        {item?.icon} {item?.name}
                      </button>
                    ) : (
                      <span className="text-slate-400">{label}</span>
                    )}
                    {id && (
                      <div className="mt-1 w-full px-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: getMaxSlotsForItem(id) }).map((_, idx) => {
                            const eq = hero.inventory.equippedJewelsByItemId?.[id] || [];
                            const jewelKey = eq[idx];
                            return (
                              <div key={idx}
                                   onDrop={(ev) => { ev.preventDefault(); const key = ev.dataTransfer.getData('application/jewel'); if (key) { const ok = socketJewel(hero.id, id!, key); setFeedback(ok ? { message: 'Joia engastada.', type: 'success' } : { message: 'Não foi possível engastar.', type: 'error' }); setTimeout(() => setFeedback(null), 1500); } }}
                                   onDragOver={onDragOver}
                                   className={`h-6 w-6 rounded-full border ${jewelKey ? 'border-violet-600 bg-violet-900/20' : 'border-slate-600 bg-slate-900'} flex items-center justify-center text-[10px]`}
                                   title={jewelKey ? getJewelLabel(jewelKey) : 'Solte joia aqui'}>
                                {jewelKey ? (
                                  <button onClick={() => { const ok = removeJewel(hero.id, id!, idx); setFeedback(ok ? { message: 'Joia removida.', type: 'success' } : { message: 'Falha ao remover.', type: 'error' }); setTimeout(() => setFeedback(null), 1200); }} className="text-slate-200">
                                    ×
                                  </button>
                                ) : (
                                  <span className="text-slate-500">•</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="h-16 rounded border border-slate-600 bg-slate-800 flex items-center justify-center text-xs" title="Mascote ativo">
                <span className="text-slate-300">Mascote: {(hero as any).pets?.find((p: any) => p.id === (hero as any).activePetId)?.name || '-'}</span>
              </div>
              <div className="h-16 rounded border border-slate-600 bg-slate-800 flex items-center justify-center text-xs" title="Montaria ativa">
                <span className="text-slate-300">Montaria: {(hero as any).mounts?.find((m: any) => m.id === (hero as any).activeMountId)?.name || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-3">Arraste itens da lista e solte nos slots compatíveis.</div>
      </div>

      {/* Filtros */}
      <div className={`${medievalTheme.layout.containers.panel} ${seasonalBorder} p-4 text-slate-200`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Tipo</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ItemType)}
              className="px-2 py-1 border rounded text-sm bg-slate-900 border-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos</option>
              <option value="consumable">Consumível</option>
              <option value="weapon">Arma</option>
              <option value="armor">Armadura</option>
              <option value="accessory">Acessório</option>
              <option value="material">Material</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Raridade</label>
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value as ItemRarity)}
              className="px-2 py-1 border rounded text-sm bg-slate-900 border-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todas">Todas</option>
              <option value="comum">Comum</option>
              <option value="incomum">Incomum</option>
              <option value="raro">Raro</option>
              <option value="epico">Épico</option>
              <option value="lendario">Lendário</option>
            </select>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome"
            className="flex-1 min-w-0 sm:min-w-[200px] px-3 py-1 border rounded text-sm bg-slate-900 border-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => { setSelectedType('todos'); setSelectedRarity('todas'); setSearch(''); }}
            className="px-3 py-1 rounded bg-slate-700 text-slate-100 hover:bg-slate-600 text-sm"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Lista de Itens */}
      <div className={`${medievalTheme.layout.containers.panel} ${seasonalBorder} p-6 mt-6 text-slate-200`}>
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(([itemId, qty]) => {
              const item = SHOP_ITEMS.find(i => i.id === itemId);
              if (!item) return null;
              const unitSell = Math.floor(item.price * 0.6);
              const sellQty = qtyByItem[itemId] ?? 1;
              const isEquipped =
                (item.type === 'weapon' && [hero.inventory.equippedMainHand, hero.inventory.equippedOffHand].includes(itemId)) ||
                (item.type === 'armor' && [hero.inventory.equippedHelm, hero.inventory.equippedChest, hero.inventory.equippedBelt, hero.inventory.equippedGloves, hero.inventory.equippedBoots, hero.inventory.equippedCape].includes(itemId)) ||
                (item.type === 'accessory' && [hero.inventory.equippedRingLeft, hero.inventory.equippedRingRight, hero.inventory.equippedNecklace, hero.inventory.equippedEarringLeft, hero.inventory.equippedEarringRight].includes(itemId));

              return (
                <div key={itemId} className="flex items-center justify-between bg-slate-800 border border-slate-700 p-3 rounded" draggable onDragStart={(e) => onDragStart(e, itemId)} title={buildTooltip(itemId)}>
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <div className="font-semibold text-slate-100">{item.name}</div>
                      <div className="text-sm text-slate-400">Qtd: {qty} • Preço venda: {unitSell} ouro/un</div>
                      {isEquipped && (
                        <div className="text-xs text-emerald-300">
                          Equipado{` `}
                          {(() => {
                            const lvl = hero.inventory.upgrades?.[itemId] ?? 0;
                            return lvl > 0 ? `• Aprimorado +${lvl}` : '';
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Equipar / Usar */}
                    {item.type === 'consumable' ? (
                        <button
                          onClick={() => {
                            const ok = useItem(hero.id, itemId);
                            if (ok) {
                              setFeedback({ message: `Consumido: ${item.name}. Efeito aplicado.`, type: 'success' });
                            } else {
                              setFeedback({ message: `Não foi possível consumir ${item.name}.`, type: 'error' });
                            }
                            setTimeout(() => setFeedback(null), 1800);
                          }}
                          disabled={qty <= 0}
                          className={`px-3 py-2 rounded text-white ${qty <= 0 ? 'bg-slate-500 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700'}`}
                        >
                          Usar
                        </button>
                      ) : (
                      isEquipped ? (
                        <>
                          <button
                            onClick={() => {
                              const ok = unequipItem(hero.id, itemId);
                              if (ok) {
                                setFeedback({ message: `Desequipado: ${item.name}. Atributos atualizados.`, type: 'success' });
                              } else {
                                setFeedback({ message: `Não foi possível desequipar ${item.name}.`, type: 'error' });
                              }
                              setTimeout(() => setFeedback(null), 1800);
                            }}
                            className="px-3 py-2 rounded text-white bg-slate-700 hover:bg-slate-800"
                          >
                            Desequipar
                          </button>
                          {(item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') && (
                            <button
                              onClick={() => {
                                const ok = upgradeItem(hero.id, itemId);
                                const newLvl = (hero.inventory.upgrades?.[itemId] ?? 0) + (ok ? 1 : 0);
                                if (ok) {
                                  setFeedback({ message: `Aprimorado: ${item.name} para +${newLvl}.`, type: 'success' });
                                } else {
                                  setFeedback({ message: `Não foi possível aprimorar ${item.name}. Ouro insuficiente?`, type: 'error' });
                                }
                                setTimeout(() => setFeedback(null), 2000);
                              }}
                              className="px-3 py-2 rounded text-white bg-amber-600 hover:bg-amber-700"
                            >
                              Aprimorar
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const ok = equipItem(hero.id, itemId);
                            if (ok) {
                              setFeedback({ message: `Equipado: ${item.name}. Atributos atualizados.`, type: 'success' });
                            } else {
                              setFeedback({ message: `Não foi possível equipar ${item.name}.`, type: 'error' });
                            }
                            setTimeout(() => setFeedback(null), 1800);
                          }}
                          className="px-3 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Equipar
                        </button>
                      )
                    )}

                    {/* Quantidade e Venda */}
                    <input
                      type="number"
                      min={1}
                      max={qty}
                      value={sellQty}
                      onChange={(e) => handleQtyChange(itemId, Number(e.target.value), qty)}
                      className="w-16 sm:w-20 px-2 py-1 border rounded bg-slate-900 border-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label={`Quantidade para vender ${item.name}`}
                    />
                    <div className="text-sm text-slate-300">Total: {unitSell * Math.max(1, Math.min(qty, sellQty))} ouro</div>
                    <button
                      onClick={() => {
                        const amount = Math.max(1, Math.min(qty, sellQty));
                        const ok = sellItem(hero.id, itemId, amount);
                        const totalGold = unitSell * Math.max(1, Math.min(qty, sellQty));
                        if (ok) {
                          setFeedback({ message: `Vendido: ${amount}x ${item.name} por ${totalGold} ouro.`, type: 'success' });
                        } else {
                          setFeedback({ message: `Não foi possível vender ${item.name}.`, type: 'error' });
                        }
                        setTimeout(() => setFeedback(null), 1800);
                      }}
                      disabled={isEquipped}
                      className={`px-4 py-2 rounded text-white ${isEquipped ? 'bg-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      title={isEquipped ? 'Item equipado — desequipe para vender' : 'Vender quantidade selecionada'}
                    >
                      Vender
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <div className="text-3xl sm:text-5xl mb-2">📦</div>
            <p>Nenhum item corresponde aos filtros.</p>
          </div>
        )}
      </div>

      {/* Joias */}
      <div className={`${medievalTheme.layout.containers.panel} ${seasonalBorder} p-6 mt-6 text-slate-200`}>
        <h2 className="text-xl font-bold mb-3">💎 Joias</h2>
        {Object.entries(hero.inventory.jewels || {}).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(hero.inventory.jewels || {}).map(([key, qty]) => (
              <div key={key} className="flex items-center justify-between bg-slate-800 border border-slate-700 p-2 rounded" draggable onDragStart={(e) => onJewelDragStart(e, key)} title={getJewelLabel(key)}>
                <div className="text-sm">
                  <div className="font-semibold text-slate-100">{getJewelLabel(key)}</div>
                  <div className="text-slate-400">Qtd: {qty}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { const ok = fuseJewels(hero.id, key); setFeedback(ok ? { message: 'Fusão realizada.', type: 'success' } : { message: 'Falha na fusão.', type: 'error' }); setTimeout(() => setFeedback(null), 1600); }} className="px-3 py-1 rounded bg-violet-600 text-white hover:bg-violet-700" disabled={(qty || 0) < 2}>Fundir</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400">Nenhuma joia. Obtenha joias e arraste sobre os sockets dos itens equipados.</div>
        )}
        <div className="text-xs text-slate-400 mt-2">Arraste uma joia para um equipamento equipado para engastar. Funda 2 joias iguais para subir de nível.</div>
      </div>
    </div>
  );
};

export default Inventory;
