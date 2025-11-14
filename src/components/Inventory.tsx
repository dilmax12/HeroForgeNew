import React, { useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { SHOP_ITEMS } from '../utils/shop';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes } from '../styles/medievalTheme';

type ItemType = 'todos' | 'consumable' | 'weapon' | 'armor' | 'accessory' | 'material';
type ItemRarity = 'todas' | 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

const Inventory: React.FC = () => {
  const { getSelectedHero, equipItem, sellItem, useItem, unequipItem, upgradeItem } = useHeroStore();
  const hero = getSelectedHero();
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-gray-200' : 'border-gray-200';

  const [selectedType, setSelectedType] = useState<ItemType>('todos');
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity>('todas');
  const [search, setSearch] = useState('');
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
      <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} mb-6 text-gray-800`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">🎒 Inventário</h1>
            <p className="text-gray-600 mt-2">Gerencie seus itens: equipar, consumir e vender.</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Herói</div>
            <div className="font-semibold">{hero.name}</div>
          </div>
        </div>
        {/* Feedback banner */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 px-4 py-2 rounded text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className={`bg-white p-4 rounded-lg border ${seasonalBorder} text-gray-800`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Tipo</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ItemType)}
              className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="text-sm text-gray-700">Raridade</label>
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value as ItemRarity)}
              className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="flex-1 min-w-0 sm:min-w-[200px] px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => { setSelectedType('todos'); setSelectedRarity('todas'); setSearch(''); }}
            className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Lista de Itens */}
      <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} mt-6 text-gray-800`}>
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(([itemId, qty]) => {
              const item = SHOP_ITEMS.find(i => i.id === itemId);
              if (!item) return null;
              const unitSell = Math.floor(item.price * 0.6);
              const sellQty = qtyByItem[itemId] ?? 1;
              const isEquipped =
                (item.type === 'weapon' && hero.inventory.equippedWeapon === itemId) ||
                (item.type === 'armor' && hero.inventory.equippedArmor === itemId) ||
                (item.type === 'accessory' && hero.inventory.equippedAccessory === itemId);

              return (
                <div key={itemId} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      <div className="text-sm text-gray-600">Qtd: {qty} • Preço venda: {unitSell} ouro/un</div>
                      {isEquipped && (
                        <div className="text-xs text-green-700">
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
                        className={`px-3 py-2 rounded text-white ${qty <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
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
                            className="px-3 py-2 rounded text-white bg-gray-700 hover:bg-gray-800"
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
                      className="w-16 sm:w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label={`Quantidade para vender ${item.name}`}
                    />
                    <div className="text-sm text-gray-700">Total: {unitSell * Math.max(1, Math.min(qty, sellQty))} ouro</div>
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
                      className={`px-4 py-2 rounded text-white ${isEquipped ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
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
          <div className="text-center py-10 text-gray-500">
            <div className="text-3xl sm:text-5xl mb-2">📦</div>
            <p>Nenhum item corresponde aos filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
