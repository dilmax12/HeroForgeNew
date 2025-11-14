import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { generateAllLeaderboards } from '../utils/leaderboardSystem';
import { SHOP_ITEMS } from '../utils/shop';
import { notificationBus } from './NotificationSystem';
import { getDungeonLeaderboard, getWeeklyDungeonHighlights } from '../services/dungeonService';
import { activityManager } from '../utils/activitySystem';
import PartySystem from './PartySystem';
import { EnhancedQuestBoard } from './EnhancedQuestBoard';
import Training from './Training';
import Leaderboards from './Leaderboards';
import { EvolutionPanel } from './EvolutionPanel';
import ReputationPanel from './ReputationPanel';
import RankProgressComponent from './RankProgress';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes } from '../styles/medievalTheme';

const EggIdentificationNPC = React.lazy(() => import('./EggIdentificationNPC'));

const AdventurersGuildHub: React.FC = () => {
  const { guilds, ensureDefaultGuildExists, refreshQuests, availableQuests, heroes, getSelectedHero, sellItem, getHeroRankProgress, activateGuildEvent, clearGuildEvent, approvePartyAlliance, rejectPartyAlliance } = useHeroStore();
  const selectedHero = getSelectedHero();
  const rankProgress = selectedHero ? getHeroRankProgress(selectedHero.id) : null;
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-gray-200' : 'border-gray-200';
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState<'todos' | 'consumable' | 'weapon' | 'armor' | 'accessory' | 'material'>('todos');
  const [selectedRarity, setSelectedRarity] = useState<'todas' | 'comum' | 'raro' | 'epico' | 'lendario'>('todas');
  const [activeSection, setActiveSection] = useState<'salao' | 'recrutamento' | 'treinamento' | 'sala-herois' | 'conselho' | 'cofre' | 'zoologo'>('salao');

  useEffect(() => {
    ensureDefaultGuildExists();
  }, [ensureDefaultGuildExists]);

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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header e Navegação */}
      <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} mb-4 text-gray-800`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🏰 Foja dos Herois</h1>
            <p className="text-gray-600 mt-2">Hub central: missões, recrutamento, ranks, treino e tesouro.</p>
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
        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { id: 'salao', label: 'Salão Principal', icon: '🏛️' },
            { id: 'recrutamento', label: 'Recrutamento / Party', icon: '👥' },
            { id: 'treinamento', label: 'Sala de Treinamento', icon: '🏋️' },
            { id: 'sala-herois', label: 'Salão dos Heróis', icon: '🏆' },
            { id: 'conselho', label: 'Conselho da Guilda', icon: '🎖️' },
            { id: 'cofre', label: 'Cofre da Guilda', icon: '💎' },
            { id: 'zoologo', label: 'Mestre Zoólogo Arkemis', icon: '🔮' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id as typeof activeSection)}
              className={`px-3 py-2 rounded border text-sm ${activeSection === t.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'}`}
            >
              <span className="mr-2">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo por seção */}
      {activeSection === 'salao' && (
        <div className="space-y-6">
          {/* Missões de Caça */}
          <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} text-gray-800`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🎯 Missões de Caça</h2>
              <a href="/hunting" className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Abrir</a>
            </div>
            <div className="text-sm text-gray-600">Missões geradas pela IA com fases, risco x recompensa e progressão de rank.</div>
          </div>

          {/* Ranking rápido */}
          <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} text-gray-800`}>
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

          {selectedHero && (
            <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} text-gray-800`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">🐾 Companheiros</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{selectedHero.stats?.companionQuestsCompleted || 0}</div>
                  <div className="text-sm text-gray-600">Missões de Companheiros</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">{selectedHero.inventory.items['essencia-bestial'] || 0}</div>
                  <div className="text-sm text-gray-600">Essência Bestial</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{selectedHero.inventory.items['pergaminho-montaria'] || 0}</div>
                  <div className="text-sm text-gray-600">Pergaminhos de Montaria</div>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Progresso de Companheiros</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600"><span>Amigo dos Animais</span><span>{Math.min(5, selectedHero.stats?.companionQuestsCompleted || 0)}/5</span></div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-emerald-500 rounded" style={{ width: `${Math.min(100, ((selectedHero.stats?.companionQuestsCompleted || 0)/5)*100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-600"><span>Domador de Feras</span><span>{Math.min(3, selectedHero.stats?.beastEssenceCollected || 0)}/3</span></div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-amber-500 rounded" style={{ width: `${Math.min(100, ((selectedHero.stats?.beastEssenceCollected || 0)/3)*100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-600"><span>Cavaleiro Mítico</span><span>{Math.min(2, selectedHero.stats?.mountScrollsFound || 0)}/2</span></div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-purple-500 rounded" style={{ width: `${Math.min(100, ((selectedHero.stats?.mountScrollsFound || 0)/2)*100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Conquistas Recentes</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedHero.progression.achievements || []).slice(Math.max(0, (selectedHero.progression.achievements || []).length - 6)).map((a, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-sm bg-gray-100 text-gray-800 border border-gray-200">
                      <span className="mr-1">{a.icon || '🏆'}</span>{a.title}
                    </span>
                  ))}
                  {(selectedHero.progression.achievements || []).length === 0 && (
                    <span className="text-sm text-gray-600">Nenhuma conquista registrada</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dungeon Infinita */}
          <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} text-gray-800`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🗝️ Dungeon Infinita</h2>
              <div className="flex gap-2">
                <a href="/dungeon-infinita" className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Jogar</a>
                <a href="/messenger" className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">Cartas</a>
              </div>
            </div>
            {dungeonOffline && (
              <div className="text-sm text-gray-500 mb-2">Modo offline: conecte o Supabase para ver o ranking.</div>
            )}
            {dungeonError && (
              <div className="text-sm text-red-600 mb-2">{dungeonError}</div>
            )}
            {dungeonTop.length > 0 ? (
              <ul className="space-y-2">
                {dungeonTop.map((e, idx) => (
                  <li key={`${e.hero_name}-${e.finished_at}-${idx}`} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{idx + 1}.</span>
                      <span className="font-semibold text-gray-800">{e.hero_name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Andar {e.max_floor_reached} • {e.total_xp} XP • {e.total_gold} ouro
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-2">🗝️</div>
                <p>Nenhuma tentativa registrada ainda.</p>
              </div>
            )}
          </div>

          {/* Salão da Fama */}
          <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} text-gray-800`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🏰 Salão da Fama (Semana)</h2>
              <a href="/leaderboards" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">Ver Rankings</a>
            </div>
            <ul className="space-y-2">
              <li className="bg-gray-50 p-3 rounded flex items-center justify-between">
                <div className="font-semibold text-gray-800">Evento da Semana</div>
                <div className="text-sm text-gray-600">
                  {hof.weeklyEvent ? (
                    <span>
                      {hof.weeklyEvent.guildName}: “{hof.weeklyEvent.eventName}” — +{hof.weeklyEvent.xpBuffPercent || 0}% XP, -{hof.weeklyEvent.trainingDiscountPercent || 0}% treino
                    </span>
                  ) : 'Nenhum evento registrado'}
                </div>
              </li>
              <li className="bg-gray-50 p-3 rounded flex items-center justify-between">
                <div className="font-semibold text-gray-800">Melhor missão cumprida</div>
                <div className="text-sm text-gray-600">{hof.bestQuest ? `${hof.bestQuest.heroName} — “${hof.bestQuest.questName}”` : 'Ainda sem destaques'}</div>
              </li>
              <li className="bg-gray-50 p-3 rounded flex items-center justify-between">
                <div className="font-semibold text-gray-800">Maior loot em uma run</div>
                <div className="text-sm text-gray-600">{hof.biggestLoot ? `${hof.biggestLoot.heroName} — ${hof.biggestLoot.total_gold} ouro` : 'Nenhum saque registrado'}</div>
              </li>
              <li className="bg-gray-50 p-3 rounded">
                <div className="font-semibold text-gray-800 mb-1">Heróis promovidos de patente</div>
                {hof.promotions && hof.promotions.length > 0 ? (
                  <ul className="space-y-1">
                    {hof.promotions.map((p, idx) => (
                      <li key={`${p.heroName}-${idx}`} className="text-sm text-gray-700">{p.heroName} — novo Rank {p.newRank}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-600">Sem promoções registradas na semana.</div>
                )}
              </li>
            </ul>
          </div>

          {/* Mercado de Espólios */}
          <div className={`bg-white p-6 rounded-lg border ${seasonalBorder} text-gray-800`}>
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
      )}

      {/* Quadro de Missões removido por enquanto */}

      {activeSection === 'recrutamento' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">👥 Recrutamento e Party Finder</h2>
          {selectedHero ? (
            <>
              {defaultGuild && (defaultGuild.pendingAlliances || []).filter(r => r.status === 'pending').length > 0 && (
                <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800">
                  Existem {(defaultGuild.pendingAlliances || []).filter(r => r.status === 'pending').length} solicitações de aliança pendentes no Conselho.
                </div>
              )}
              <PartySystem hero={selectedHero} />
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-2">🦸</div>
              <p>Selecione um herói para criar ou entrar em parties.</p>
              <a href="/" className="mt-4 inline-block px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">Selecionar Herói</a>
            </div>
          )}
        </div>
      )}

      {activeSection === 'treinamento' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🏋️ Sala de Treinamento</h2>
          <Training />
        </div>
      )}

      {activeSection === 'sala-herois' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🏆 Salão dos Heróis</h2>
          <Leaderboards />
        </div>
      )}

      {activeSection === 'conselho' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎖️ Conselho da Guilda</h2>
          {selectedHero ? (
            <div className="space-y-6">
              {/* Progresso de Rank resumido */}
              <div className="bg-gray-50 rounded p-4">
                {rankProgress?.progress ? (
                  <RankProgressComponent hero={selectedHero} progress={rankProgress.progress} />
                ) : null}
              </div>
              {/* Evolução completa e histórico */}
              <EvolutionPanel heroId={selectedHero.id} className="mt-2" />
              {/* Reputação e modificadores */}
              <div className="bg-gray-50 rounded p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Prestígio e Reputação</h3>
                <ReputationPanel hero={selectedHero} />
              </div>

              {/* Políticas ativas e Controles do Conselho */}
              {defaultGuild && (
                <div className="bg-gray-50 rounded p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Políticas e Eventos da Guilda</h3>
                  {defaultGuild.policies?.activeEventName ? (
                    <div className="mb-3 text-sm text-gray-700">
                      Evento ativo: <span className="font-semibold">{defaultGuild.policies.activeEventName}</span>
                      {defaultGuild.policies.eventExpiresAt && (
                        <span> • expira em {new Date(defaultGuild.policies.eventExpiresAt).toLocaleString()}</span>
                      )}
                      <div className="mt-1 text-gray-600">
                        Buff XP: {defaultGuild.policies.xpBuffPercent || 0}% • Desconto Treino: {defaultGuild.policies.trainingDiscountPercent || 0}%
                      </div>
                      {defaultGuild.policies.lastEventActivatedAt && (
                        <div className="mt-1 text-xs text-gray-500">Última ativação: {new Date(defaultGuild.policies.lastEventActivatedAt).toLocaleString()}</div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3 text-sm text-gray-600">Nenhum evento ativo.</div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 border rounded">
                      <div className="font-medium mb-2">Criar evento: +20% XP por 3 dias</div>
                      <button
                        disabled={!isCouncilMember || !isRankS || !defaultGuild}
                        onClick={() => defaultGuild && activateGuildEvent(defaultGuild.id, selectedHero!.id, { xpBuffPercent: 20, trainingDiscountPercent: 0, eventName: 'Bênção dos Mestres', durationHours: 72, costGold: 200 })}
                        className={`px-3 py-2 rounded text-white ${isCouncilMember && isRankS ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
                      >
                        Ativar Buff de XP
                      </button>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium mb-2">Reduzir custo de treino em 15% por 24h</div>
                      <button
                        disabled={!isCouncilMember || !isRankS || !defaultGuild}
                        onClick={() => defaultGuild && activateGuildEvent(defaultGuild.id, selectedHero!.id, { xpBuffPercent: 0, trainingDiscountPercent: 15, eventName: 'Semana dos Heróis', durationHours: 24, costGold: 150 })}
                        className={`px-3 py-2 rounded text-white ${isCouncilMember && isRankS ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                      >
                        Ativar Desconto de Treino
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      disabled={!isCouncilMember || !defaultGuild}
                      onClick={() => defaultGuild && clearGuildEvent(defaultGuild.id, selectedHero!.id)}
                      className={`px-3 py-2 rounded text-white ${isCouncilMember ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                      Encerrar Evento e Limpar Buffs
                    </button>
                  </div>
                  {!isCouncilMember && (
                    <div className="mt-2 text-xs text-gray-500">Apenas membros do Conselho (Rank S) e o líder podem ativar eventos.</div>
                  )}
                  {/* Painel de Alianças */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Alianças de Party pendentes</h3>
                    {(defaultGuild.pendingAlliances || []).filter(r => r.status === 'pending').length > 0 ? (
                      <ul className="space-y-2">
                        {(defaultGuild.pendingAlliances || []).filter(r => r.status === 'pending').map(req => (
                          <li key={req.id} className="p-3 border rounded flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">{req.partyName}</div>
                              <div className="text-xs text-gray-600">Solicitado em {new Date(req.requestedAt).toLocaleString()}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                                disabled={!isCouncilMember}
                                onClick={() => approvePartyAlliance(defaultGuild.id, selectedHero!.id, req.id)}
                              >
                                Aprovar
                              </button>
                              <button
                                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                                disabled={!isCouncilMember}
                                onClick={() => rejectPartyAlliance(defaultGuild.id, selectedHero!.id, req.id)}
                              >
                                Rejeitar
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-600">Nenhuma solicitação de aliança pendente.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-2">🦸</div>
              <p>Selecione um herói para ver o conselho e promoções.</p>
              <a href="/" className="mt-4 inline-block px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300">Selecionar Herói</a>
            </div>
          )}
        </div>
      )}

      {activeSection === 'cofre' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">💎 Cofre da Guilda</h2>
          {defaultGuild ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{defaultGuild.bankGold}</div>
                  <div className="text-sm text-gray-600">Ouro no Cofre</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">{defaultGuild.guildXP}</div>
                  <div className="text-sm text-gray-600">XP da Guilda</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{guildLevel}</div>
                  <div className="text-sm text-gray-600">Nível da Guilda</div>
                </div>
              </div>
              {/* Status de Buffs Globais */}
              <div className="bg-gray-50 rounded p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Buffs Globais</h3>
                <div className="text-sm text-gray-700">
                  XP: {defaultGuild.policies?.xpBuffPercent || 0}% • Treino: {defaultGuild.policies?.trainingDiscountPercent || 0}%
                  {defaultGuild.policies?.activeEventName && (
                    <div className="mt-1 text-gray-600">Evento: {defaultGuild.policies.activeEventName} • expira {defaultGuild.policies.eventExpiresAt ? new Date(defaultGuild.policies.eventExpiresAt).toLocaleString() : '—'}</div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Depósitos e saques estão disponíveis no painel de <a href="/guild" className="text-blue-600 hover:underline">Gestão da Guilda</a>.
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-2">🏦</div>
              <p>Nenhuma guilda encontrada. Crie ou entre em uma guilda.</p>
              <a href="/guild" className="mt-4 inline-block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Abrir Gestão da Guilda</a>
            </div>
          )}
        </div>
      )}

      {activeSection === 'zoologo' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🔮 Mestre Zoólogo Arkemis</h2>
          <div className="text-sm text-gray-600 mb-4">Identificação oficial de ovos misteriosos, com custos variáveis por raridade.</div>
          <div className="bg-gray-50 rounded p-4">
            {selectedHero ? (
              <div className="space-y-4">
                <React.Suspense fallback={<div className="text-sm text-gray-600">Carregando...</div>}>
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

export default AdventurersGuildHub;
