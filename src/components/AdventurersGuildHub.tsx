import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { generateAllLeaderboards } from '../utils/leaderboardSystem';
import { SHOP_ITEMS } from '../utils/shop';
import { notificationBus } from './NotificationSystem';

const AdventurersGuildHub: React.FC = () => {
  const { guilds, ensureDefaultGuildExists, refreshQuests, availableQuests, heroes, getSelectedHero, sellItem } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState<'todos' | 'consumable' | 'weapon' | 'armor' | 'accessory' | 'material'>('todos');
  const [selectedRarity, setSelectedRarity] = useState<'todas' | 'comum' | 'raro' | 'epico' | 'lendario'>('todas');

  useEffect(() => {
    ensureDefaultGuildExists();
  }, [ensureDefaultGuildExists]);

  const defaultGuild = guilds.find(g => g.name === 'Foja dos Herois');
  const guildLevel = defaultGuild ? (defaultGuild.level ?? Math.max(1, Math.floor(defaultGuild.guildXP / 250) + 1)) : 1;

  const leaderboards = useMemo(() => generateAllLeaderboards(heroes), [heroes]);
  const levelBoard = leaderboards.find(lb => lb.id === 'level');
  const top5 = levelBoard ? levelBoard.entries.slice(0, 5) : [];

  const handleRefreshMissions = () => {
    refreshQuests();
  };

  const inventoryEntries = selectedHero
    ? Object.entries(selectedHero.inventory.items).filter(([, qty]) => qty > 0)
    : [];

  const filteredInventoryEntries = inventoryEntries.filter(([itemId]) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;
    if (selectedType !== 'todos' && item.type !== selectedType) return false;
    if (selectedRarity !== 'todas' && item.rarity !== selectedRarity) return false;
    return true;
  });

  const handleQtyChange = (itemId: string, value: number, max: number) => {
    const safe = Math.max(1, Math.min(max, Math.floor(value || 1)));
    setQtyByItem(prev => ({ ...prev, [itemId]: safe }));
  };

  const handleSell = (itemId: string) => {
    if (!selectedHero) return;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    const currentQty = selectedHero.inventory.items[itemId] || 0;
    const qty = Math.max(1, Math.min(currentQty, qtyByItem[itemId] || 1));
    const isEquipped = item && (
      (item.type === 'weapon' && selectedHero.inventory.equippedWeapon === itemId) ||
      (item.type === 'armor' && selectedHero.inventory.equippedArmor === itemId) ||
      (item.type === 'accessory' && selectedHero.inventory.equippedAccessory === itemId)
    );
    if (!item) {
      notificationBus.emit({
        title: 'Item desconhecido',
        message: 'Não foi possível identificar o item para venda.',
        type: 'error',
        icon: '⚠️'
      });
      return;
    }
    if (isEquipped) {
      notificationBus.emit({
        title: 'Item equipado',
        message: 'Desequipe o item antes de vendê-lo (use o painel de Equipamentos).',
        type: 'error',
        icon: '⚠️'
      });
      return;
    }
    if (currentQty <= 0) {
      notificationBus.emit({
        title: 'Sem estoque',
        message: 'Você não possui este item no inventário.',
        type: 'error',
        icon: '⚠️'
      });
      return;
    }
    const sellPrice = Math.floor(item.price * 0.6 * qty);
    const ok = sellItem(selectedHero.id, itemId, qty);
    if (ok) {
      notificationBus.emit({
        title: 'Venda concluída',
        message: `${qty}x ${item.name} vendido por ${sellPrice} ouro!`,
        type: 'success',
        icon: '💰'
      });
      // Resetar quantidade para 1 após venda
      setQtyByItem(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      notificationBus.emit({
        title: 'Falha na venda',
        message: `Não foi possível vender ${item.name}. Verifique a quantidade.`,
        type: 'error',
        icon: '⚠️'
      });
    }
  };

  const handleSellAllConsumables = () => {
    if (!selectedHero) return;
    const consumableEntries = inventoryEntries.filter(([itemId, qty]) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      return !!item && item.type === 'consumable' && qty > 0;
    });
    if (consumableEntries.length === 0) {
      notificationBus.emit({
        title: 'Nada para vender',
        message: 'Nenhum consumível disponível no inventário.',
        type: 'error',
        icon: '⚠️'
      });
      return;
    }
    let totalGold = 0;
    let totalItems = 0;
    consumableEntries.forEach(([itemId, qty]) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId)!;
      const unitSell = Math.floor(item.price * 0.6);
      totalGold += unitSell * qty;
      totalItems += qty;
      sellItem(selectedHero.id, itemId, qty);
    });
    notificationBus.emit({
      title: 'Venda em massa concluída',
      message: `${totalItems} consumíveis vendidos por ${totalGold} ouro!`,
      type: 'success',
      icon: '💰'
    });
  };

  const handleSellAll = (itemId: string) => {
    if (!selectedHero) return;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    const currentQty = selectedHero.inventory.items[itemId] || 0;
    if (!item) {
      notificationBus.emit({
        title: 'Item desconhecido',
        message: 'Não foi possível identificar o item para venda.',
        type: 'error',
        icon: '⚠️'
      });
      return;
    }
    const isEquipped =
      (item.type === 'weapon' && selectedHero.inventory.equippedWeapon === itemId) ||
      (item.type === 'armor' && selectedHero.inventory.equippedArmor === itemId) ||
      (item.type === 'accessory' && selectedHero.inventory.equippedAccessory === itemId);
    if (isEquipped) {
      notificationBus.emit({
        title: 'Item equipado',
        message: 'Desequipe o item antes de vendê-lo (use o painel de Equipamentos).',
        type: 'error',
        icon: '⚠️'
      });
      return;
    }
    if (currentQty <= 0) {
      notificationBus.emit({
        title: 'Sem estoque',
        message: 'Você não possui este item no inventário.',
        type: 'error',
        icon: '⚠️'
      });
      return;
    }
    const sellPrice = Math.floor(item.price * 0.6 * currentQty);
    const ok = sellItem(selectedHero.id, itemId, currentQty);
    if (ok) {
      notificationBus.emit({
        title: 'Venda concluída',
        message: `${currentQty}x ${item.name} vendido por ${sellPrice} ouro!`,
        type: 'success',
        icon: '💰'
      });
      setQtyByItem(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      notificationBus.emit({
        title: 'Falha na venda',
        message: `Não foi possível vender ${item.name}.`,
        type: 'error',
        icon: '⚠️'
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6 text-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🏰 Foja dos Herois</h1>
            <p className="text-gray-600 mt-2">Centro oficial de missões e evolução de ranking. Forme sua party e aceite missões aqui.</p>
          </div>
          <div className="text-4xl">🛡️</div>
        </div>
        {defaultGuild && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{guildLevel}</div>
              <div className="text-sm text-gray-600">Nível da Guilda</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{defaultGuild.guildXP}</div>
              <div className="text-sm text-gray-600">XP Acumulado</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{defaultGuild.bankGold}</div>
              <div className="text-sm text-gray-600">Tesouro</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">📜 Quadro de Missões</h2>
          <button onClick={handleRefreshMissions} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Atualizar Missões</button>
        </div>
        {availableQuests.length > 0 ? (
          <ul className="space-y-3">
            {availableQuests.slice(0, 6).map(q => (
              <li key={q.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <div className="font-semibold text-gray-800">{q.title}</div>
                  <div className="text-sm text-gray-600">Requer Nível {q.levelRequirement}</div>
                </div>
                <span className="text-xl">⚔️</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-5xl mb-2">📜</div>
            <p>Nenhuma missão listada no momento. Clique em atualizar.</p>
          </div>
        )}
        <div className="mt-6 text-sm text-gray-600">
          Dica: Use a página <span className="font-semibold">Party</span> para formar grupos e depois venha aqui aceitar missões.
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6 text-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">🏆 Ranking Rápido</h2>
          <a href="/leaderboards" className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">Ver Completo</a>
        </div>
        {top5.length > 0 ? (
          <ul className="space-y-2">
            {top5.map((e, idx) => (
              <li key={e.heroId} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{idx + 1}.</span>
                  <span className="font-semibold text-gray-800">{e.heroName}</span>
                </div>
                <span className="text-sm text-gray-600">Nível {e.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-5xl mb-2">🏆</div>
            <p>Nenhum herói no ranking ainda.</p>
          </div>
        )}
      </div>

      {/* Mercado de Espólios */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6 text-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">💰 Mercado de Espólios</h2>
          <div className="flex items-center gap-2">
            {selectedHero && (
              <button
                onClick={handleSellAllConsumables}
                className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Vender todos os consumíveis do inventário"
              >
                Vender todos consumíveis
              </button>
            )}
            {!selectedHero && (
              <a href="/" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">Selecionar Herói</a>
            )}
          </div>
        </div>

        {/* Filtros */}
        {selectedHero && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Tipo</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                onChange={(e) => setSelectedRarity(e.target.value as any)}
                className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="todas">Todas</option>
                <option value="comum">Comum</option>
                <option value="raro">Raro</option>
                <option value="epico">Épico</option>
                <option value="lendario">Lendário</option>
              </select>
            </div>
            <button
              onClick={() => { setSelectedType('todos'); setSelectedRarity('todas'); }}
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {selectedHero ? (
          filteredInventoryEntries.length > 0 ? (
            <div className="space-y-3">
              {filteredInventoryEntries.map(([itemId, qty]) => {
                const item = SHOP_ITEMS.find(i => i.id === itemId);
                if (!item) return null;
                const unitSell = Math.floor(item.price * 0.6);
                const sellQty = qtyByItem[itemId] ?? 1;
                const isEquipped =
                  (item.type === 'weapon' && selectedHero.inventory.equippedWeapon === itemId) ||
                  (item.type === 'armor' && selectedHero.inventory.equippedArmor === itemId) ||
                  (item.type === 'accessory' && selectedHero.inventory.equippedAccessory === itemId);
                return (
                  <div key={itemId} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{item.icon}</div>
                      <div>
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="text-sm text-gray-600">Qtd: {qty} • Preço venda: {unitSell} ouro/un</div>
                        {isEquipped && (
                          <div className="text-xs text-red-600">Equipado — desequipe para vender.</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min={1}
                        max={qty}
                        value={sellQty}
                        onChange={(e) => handleQtyChange(itemId, Number(e.target.value), qty)}
                        className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        aria-label={`Quantidade para vender ${item.name}`}
                      />
                      <div className="text-sm text-gray-700">Total: {unitSell * Math.max(1, Math.min(qty, sellQty))} ouro</div>
                      <button
                        onClick={() => handleSell(itemId)}
                        disabled={isEquipped}
                        className={`px-4 py-2 rounded text-white ${isEquipped ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      >
                        Vender
                      </button>
                      <button
                        onClick={() => handleSellAll(itemId)}
                        disabled={isEquipped || qty <= 0}
                        className={`px-4 py-2 rounded text-white ${isEquipped || qty <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        title={isEquipped ? 'Item equipado — desequipe para vender' : 'Vender toda a quantidade disponível'}
                      >
                        Vender Tudo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-2">📦</div>
              <p>Nenhum espólio para vender no momento.</p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-5xl mb-2">🦸</div>
            <p>Selecione um herói para acessar o mercado.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdventurersGuildHub;
