import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useHeroStore } from '../../store/heroStore';
import { generateAllLeaderboards } from '../../utils/leaderboardSystem';
import { SHOP_ITEMS } from '../../utils/shop';
import { notificationBus } from '../../components/NotificationSystem';
import { getDungeonLeaderboard, getWeeklyDungeonHighlights } from '../../services/dungeonService';
import { activityManager } from '../../utils/activitySystem';
import { EnhancedQuestBoard } from '../../components/EnhancedQuestBoard';
import Training from '../../components/Training';
import Leaderboards from '../../components/Leaderboards';
import { EvolutionPanel } from '../../components/EvolutionPanel';
import ReputationPanel from '../../components/ReputationPanel';
import RankProgressComponent from '../../components/RankProgress';
import { useMonetizationStore } from '../../store/monetizationStore';
import { seasonalThemes } from '../../styles/medievalTheme';
import { useGameSettingsStore } from '../../store/gameSettingsStore';
import { GUILD_HUB_VERSION } from './version';
import { tokens } from '../../styles/designTokens';
import Tabs from '../../components/ui/Tabs';
import NPCPresenceLayer from '../../components/NPCPresenceLayer';
import DuelModal from '../../components/DuelModal';
import SimsDialogueModal from '../../components/SimsDialogueModal';
import TavernInteractions from '../../components/TavernInteractions';
import GuildAdvicePanel from '../../components/GuildAdvicePanel';

const EggIdentificationNPC = React.lazy(() => import('../../components/EggIdentificationNPC'));
// Party HUD removido
// DuelInvitesPanel removido
const RelationshipsPanel = React.lazy(() => import('../../components/RelationshipsPanel'));

const GuildHub: React.FC = () => {
  const { guilds, ensureDefaultGuildExists, refreshQuests, availableQuests, heroes, getSelectedHero, sellItem, getHeroRankProgress, activateGuildEvent, clearGuildEvent, approvePartyAlliance, rejectPartyAlliance, ensureNPCAdventurersSeedExists, startNPCSimulation, stopNPCSimulation } = useHeroStore();
  const npcSeedTarget = useGameSettingsStore(s => s.npcSeedTarget || 30);
  const selectedHero = getSelectedHero();
  const rankProgress = selectedHero ? getHeroRankProgress(selectedHero.id) : null;
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-gray-200' : 'border-gray-200';
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState<'todos' | 'consumable' | 'weapon' | 'armor' | 'accessory' | 'material'>('todos');
  const [selectedRarity, setSelectedRarity] = useState<'todas' | 'comum' | 'raro' | 'epico' | 'lendario'>('todas');
  const [activeCategory, setActiveCategory] = useState<'missoes' | 'social' | 'gestao'>('missoes');
  const [activeSection, setActiveSection] = useState<'salao' | 'treinamento' | 'sala-herois' | 'zoologo' | 'relacoes' | 'conselhos'>('salao');
  const categories = [
    { id: 'missoes', label: 'Missões', sections: [
      { id: 'salao', label: 'Salão Principal', icon: '🏛️' },
      { id: 'sala-herois', label: 'Salão dos Heróis', icon: '🏆' }
    ]},
    { id: 'social', label: 'Social', sections: [
      { id: 'relacoes', label: 'Relações', icon: '🤝' },
      { id: 'zoologo', label: 'Mestre Zoólogo Arkemis', icon: '🔮' }
    ]},
    { id: 'gestao', label: 'Gestão', sections: [
      { id: 'conselhos', label: 'Conselhos do Mestre da Guilda', icon: '🧙' }
    ]}
  ] as const;
  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];
  const allSections = categories.flatMap(c => c.sections);
  const getLabel = (id: string) => (allSections.find(s => s.id === id)?.label || '');
  useEffect(() => {
    if (!currentCategory.sections.find(s => s.id === activeSection)) {
      setActiveSection(currentCategory.sections[0].id as any);
    }
  }, [activeCategory]);

  useEffect(() => {
    ensureDefaultGuildExists();
    ensureNPCAdventurersSeedExists(npcSeedTarget);
    startNPCSimulation();
    try { useHeroStore.getState().triggerAutoInteraction('guild'); } catch {}
    const autoIv = setInterval(() => {
      try { useHeroStore.getState().triggerAutoInteraction('guild'); } catch {}
    }, Math.max(60000, (useGameSettingsStore.getState().npcRotationSeconds || 60) * 1000));
    return () => { clearInterval(autoIv); stopNPCSimulation(); };
  }, [ensureDefaultGuildExists, npcSeedTarget]);

  const defaultGuild = guilds.find(g => g.name === 'Foja dos Herois');
  const guildLevel = defaultGuild ? (defaultGuild.level ?? Math.max(1, Math.floor(defaultGuild.guildXP / 250) + 1)) : 1;
  const isCouncilMember = selectedHero && defaultGuild ? ((defaultGuild.councilMembers || []).includes(selectedHero.id) || (defaultGuild.roles?.[selectedHero.id] === 'lider')) : false;
  const isRankS = selectedHero?.rankData?.currentRank === 'S';

  const leaderboards = useMemo(() => generateAllLeaderboards(heroes), [heroes]);
  const levelBoard = leaderboards.find(lb => lb.id === 'level');
  const top5 = levelBoard ? levelBoard.entries.slice(0, 5) : [];

  const [dungeonTop, setDungeonTop] = useState<Array<{ hero_name: string; max_floor_reached: number; total_xp: number; total_gold: number; finished_at: string }>>([]);
  const [dungeonError, setDungeonError] = useState<string | null>(null);
  const [dungeonOffline, setDungeonOffline] = useState(false);
  const [hof, setHof] = useState<{ bestQuest?: { heroName: string; questName: string }; biggestLoot?: { heroName: string; totalGold: number }; promotions?: Array<{ heroName: string; newRank: string }>; weeklyEvent?: { guildName: string; eventName: string; xpBuffPercent?: number; trainingDiscountPercent?: number; expiresAt?: string } }>({});

  useEffect(() => {
    (async () => {
      const res = await getDungeonLeaderboard(10);
      if (res.offline) setDungeonOffline(true);
      if (res.error) setDungeonError(res.error);
      if (res.data) setDungeonTop(res.data);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const feed = activityManager.getActivityFeed({
        dateRange: { start: weekAgo, end: now },
        showOnlyPublic: true
      });
      const epicOrBest = feed.activities
        .filter(a => a.type === 'epic-quest-completed' || a.type === 'quest-completed')
        .sort((a, b) => (Number(b.data?.questReward?.xp || 0) + Number(b.data?.questReward?.gold || 0)) - (Number(a.data?.questReward?.xp || 0) + Number(a.data?.questReward?.gold || 0)))[0];
      const promotions = feed.activities
        .filter(a => a.type === 'rank-promotion')
        .slice(0, 5)
        .map(a => ({ heroName: a.data.heroName, newRank: String(a.data.newRank || '') }));

      const weeklyEventActivity = feed.activities
        .filter(a => a.type === 'guild-event-activated')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      const { data: weekly, offline } = await getWeeklyDungeonHighlights();

      setHof({
        bestQuest: epicOrBest ? { heroName: epicOrBest.data.heroName, questName: String(epicOrBest.data.questName || 'Missão extraordinária') } : undefined,
        biggestLoot: weekly?.biggestLoot ? { heroName: weekly.biggestLoot.hero_name, totalGold: weekly.biggestLoot.total_gold } : undefined,
        promotions,
        weeklyEvent: weeklyEventActivity ? {
          guildName: String(weeklyEventActivity.data.guildName || 'Guilda'),
          eventName: String(weeklyEventActivity.data.eventName || 'Evento da Guilda'),
          xpBuffPercent: weeklyEventActivity.data.xpBuffPercent,
          trainingDiscountPercent: weeklyEventActivity.data.trainingDiscountPercent,
          expiresAt: typeof weeklyEventActivity.data.eventExpiresAt === 'string' ? weeklyEventActivity.data.eventExpiresAt : undefined
        } : undefined
      });
    })();
  }, []);

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
      (item.type === 'accessory' && (selectedHero.inventory.equippedAccessories || []).includes(itemId))
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
      (item.type === 'accessory' && (selectedHero.inventory.equippedAccessories || []).includes(itemId));
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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header e Navegação */}
      <div className={`${tokens.surface} p-6 rounded-lg border ${seasonalBorder} mb-4 ${tokens.surfaceText} overflow-hidden`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">🏰 Foja dos Herois</h1>
            <p className="text-gray-300 mt-2">Hub central: missões, recrutamento, ranks, treino e tesouro.</p>
          </div>
          <div className="text-4xl">🛡️</div>
        </div>
        {/* Métricas de guilda removidas */}
        <div className="mt-3 text-xs text-gray-400">Guild Hub v{GUILD_HUB_VERSION}</div>
        <Tabs items={categories.map(c => ({ id: c.id, label: c.label }))} activeId={activeCategory} onChange={(id) => setActiveCategory(id as any)} size="sm" className="mt-6" />
        <Tabs items={currentCategory.sections.map(s => ({ id: s.id, label: s.label, icon: s.icon }))} activeId={activeSection} onChange={(id) => setActiveSection(id as any)} className="mt-2" />
        <div className={`mt-2 text-xs ${tokens.breadcrumbText}`}>Guild Hub › {currentCategory.label} › {getLabel(activeSection)}</div>
      </div>

      {/* Conteúdo por seção */}
      {activeSection === 'salao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NPCPresenceLayer />
          </div>
          <SimsDialogueModal />
          <div className={`${tokens.cardBase} border ${seasonalBorder}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">📜 Quadro de Missões</h2>
              <a href="/quests" className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">Abrir</a>
            </div>
            <div className="text-sm text-gray-300">Missões unificadas de caça e escolta com interface clara e progressão integrada da guilda.</div>
          </div>

          {/* Ranking rápido */}
          <div className={`${tokens.cardBase} border ${seasonalBorder}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">🏆 Ranking Rápido</h2>
              <a href="/leaderboards" className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">Ver Completo</a>
            </div>
            {top5.length > 0 ? (
              <ul className="space-y-2">
                {top5.map((e, idx) => (
                  <li key={e.heroId} className="flex items-center justify-between bg-gray-900 border border-gray-700 p-3 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{idx + 1}.</span>
                      <span className="font-semibold">{e.heroName}</span>
                      {heroes.find(h => h.id === e.heroId)?.origin === 'npc' && (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">NPC</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-300">Nível {e.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-5xl mb-2">🏆</div>
                <p>Nenhum herói no ranking ainda.</p>
              </div>
            )}
          </div>

          

          {/* Dungeon Infinita */}
          <div className={`bg-gray-800 p-6 rounded-lg border ${seasonalBorder} text-gray-100`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">🗝️ Dungeon Infinita</h2>
              <div className="flex gap-2">
                <a href="/dungeon-infinita" className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Jogar</a>
              </div>
            </div>
            {dungeonOffline && (
              <div className="text-sm text-gray-400 mb-2">Modo offline: conecte o Supabase para ver o ranking.</div>
            )}
            {dungeonError && (
              <div className="text-sm text-red-600 mb-2">{dungeonError}</div>
            )}
            {dungeonTop.length > 0 ? (
              <ul className="space-y-2">
                {dungeonTop.map((e, idx) => (
                  <li key={`${e.hero_name}-${e.finished_at}-${idx}`} className="flex items-center justify-between bg-gray-900 border border-gray-700 p-3 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{idx + 1}.</span>
                      <span className="font-semibold">{e.hero_name}</span>
                    </div>
                    <div className="text-sm text-gray-300">
                      Andar {e.max_floor_reached} • {e.total_xp} XP • {e.total_gold} ouro
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-5xl mb-2">🗝️</div>
                <p>Nenhuma tentativa registrada ainda.</p>
              </div>
            )}
          </div>
          {/* Party removida */}

          

          {/* Mercado de Espólios */}
          <div className={`bg-gray-800 p-6 rounded-lg border ${seasonalBorder} text-gray-100`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">💰 Mercado de Espólios</h2>
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
                  <label className="text-sm text-gray-300">Tipo</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="px-2 py-1 border rounded text-sm bg-gray-900 text-gray-200 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  <label className="text-sm text-gray-300">Raridade</label>
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value as any)}
                    className="px-2 py-1 border rounded text-sm bg-gray-900 text-gray-200 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="px-3 py-1 rounded bg-gray-900 text-gray-200 hover:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-700"
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
                      (item.type === 'accessory' && (selectedHero.inventory.equippedAccessories || []).includes(itemId));
                    return (
                      <div key={itemId} className="flex items-center justify-between bg-gray-900 border border-gray-700 p-3 rounded">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{item.icon}</div>
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-sm text-gray-300">Qtd: {qty} • Preço venda: {unitSell} ouro/un</div>
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
                            className="w-20 px-2 py-1 border rounded bg-gray-900 text-gray-200 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            aria-label={`Quantidade para vender ${item.name}`}
                          />
                          <div className="text-sm text-gray-300">Total: {unitSell * Math.max(1, Math.min(qty, sellQty))} ouro</div>
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
                <div className="text-center py-8 text-gray-400">
                  <div className="text-5xl mb-2">📦</div>
                  <p>Nenhum espólio para vender no momento.</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-5xl mb-2">🦸</div>
                <p>Selecione um herói para acessar o mercado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quadro de Missões removido por enquanto */}

      

      {activeSection === 'treinamento' && (
        <div className={`${tokens.cardBase} border border-gray-200`}>
          <h2 className="text-2xl font-bold mb-4">🏋️ Sala de Treinamento</h2>
          <Training />
        </div>
      )}

      {activeSection === 'sala-herois' && (
        <div className={`${tokens.cardBase} border border-gray-200`}>
          <h2 className="text-2xl font-bold mb-4">🏆 Salão dos Heróis</h2>
          <Leaderboards />
        </div>
      )}

      {/* Seção de Conselho removida */}

      {/* Seção de Convites de Duelo removida */}

      {activeSection === 'relacoes' && (
        <div className={`${tokens.cardBase} border ${seasonalBorder}`}>
          <Suspense fallback={<div className="text-xs text-gray-400">Carregando Relações…</div>}>
            <RelationshipsPanel />
          </Suspense>
        </div>
      )}

      {activeSection === 'conselhos' && (
        <div className={`${tokens.cardBase} border ${seasonalBorder}`}>
          <Suspense fallback={<div className="text-xs text-gray-400">Gerando Conselhos…</div>}>
            <GuildAdvicePanel />
          </Suspense>
        </div>
      )}

      {/* Seção removida: Cofre da Guilda */}

      {activeSection === 'zoologo' && (
        <div className={`${tokens.cardBase} border border-gray-200`}>
          <h2 className="text-2xl font-bold mb-4">🔮 Mestre Zoólogo Arkemis</h2>
          <div className="text-sm text-gray-300 mb-4">Identificação oficial de ovos misteriosos, com custos variáveis por raridade.</div>
          <div className="bg-gray-900 border border-gray-700 rounded p-4">
            {selectedHero ? (
              <div className="space-y-4">
                <React.Suspense fallback={<div className="text-sm text-gray-300">Carregando...</div>}>
                  <EggIdentificationNPC />
                </React.Suspense>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-2">🦸</div>
                <p>Selecione um herói para consultar o Mestre Zoólogo.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildHub;
