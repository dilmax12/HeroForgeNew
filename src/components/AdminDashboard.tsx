import React, { useMemo, useEffect, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { useGameSettingsStore } from '../store/gameSettingsStore';
import { metricsManager } from '../utils/metricsSystem';
import { aiService } from '../services/aiService';
import { supabase } from '../lib/supabaseClient';
import SupabaseAuthPanel from './SupabaseAuthPanel';
import SupabaseHeroesSyncPanel from './SupabaseHeroesSyncPanel';
import SupabaseQuestsPanel from './SupabaseQuestsPanel';

export default function AdminDashboard() {
  const heroes = useHeroStore(s => s.heroes);
  const selectedHeroId = useHeroStore(s => s.selectedHeroId);
  const getSelectedHero = useHeroStore(s => s.getSelectedHero);
  const removeHero = useHeroStore(s => s.removeHero);
  const resetDailyGoals = useHeroStore(s => s.resetDailyGoals);
  const gainXP = useHeroStore(s => s.gainXP);
  const gainGold = useHeroStore(s => s.gainGold);
  const availableQuests = useHeroStore(s => s.availableQuests);
  const refreshQuests = useHeroStore(s => s.refreshQuests);
  const selectedHero = getSelectedHero();

  // Settings
  const settings = useGameSettingsStore(s => ({
    regenHpPerMin: s.regenHpPerMin,
    regenMpPerMin: s.regenMpPerMin,
    regenStaminaPerMin: s.regenStaminaPerMin,
    deathRecoveryMinutes: s.deathRecoveryMinutes,
    deathPenaltyEnabled: s.deathPenaltyEnabled,
  }));
  const updateSettings = useGameSettingsStore(s => s.updateSettings);

  const stats = useMemo(() => ({
    heroes: heroes.length,
    selected: selectedHero ? selectedHero.name : '—',
    level: selectedHero ? selectedHero.progression.level : 0,
  }), [heroes.length, selectedHero?.name, selectedHero?.progression.level]);

  // Métricas
  const [engagement, setEngagement] = useState(() => metricsManager.getEngagementMetrics());
  const [gameplay, setGameplay] = useState(() => metricsManager.getGameplayAnalytics());
  const [aiUsage, setAiUsage] = useState(() => aiService.getUsageStats());
  const [events, setEvents] = useState(() => metricsManager.getEvents());
  const [sessions, setSessions] = useState(() => metricsManager.getSessions());
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'all'>('today');
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toLocaleString());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  useEffect(() => {
    const refresh = () => {
      setEngagement(metricsManager.getEngagementMetrics());
      setGameplay(metricsManager.getGameplayAnalytics());
      setAiUsage(aiService.getUsageStats());
      setEvents(metricsManager.getEvents());
      setSessions(metricsManager.getSessions());
      setLastRefresh(new Date().toLocaleString());
    };
    refresh();
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // === Supabase: teste de conexão rápida ===
  const [sbLoading, setSbLoading] = useState<boolean>(false);
  const [sbStatus, setSbStatus] = useState<string>('—');
  const [sbError, setSbError] = useState<string | null>(null);
  const [sbPlayers, setSbPlayers] = useState<any[]>([]);

  async function testSupabase() {
    setSbLoading(true);
    setSbError(null);
    setSbStatus('Conectando...');
    try {
      const { data, error } = await supabase.from('players').select('*').limit(5);
      if (error) throw error;
      setSbPlayers(Array.isArray(data) ? data : []);
      setSbStatus(`OK (${(Array.isArray(data) ? data.length : 0)} players)`);
    } catch (err: any) {
      setSbError(err?.message || String(err));
      setSbStatus('Erro');
    } finally {
      setSbLoading(false);
    }
  }

  function exportSelected() {
    if (!selectedHero) return;
    const blob = new Blob([JSON.stringify(selectedHero, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hero-${selectedHero.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearStorage() {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {}
  }

  function removeSelected() {
    if (!selectedHero) return;
    removeHero(selectedHero.id);
  }

  const classStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const levelSum: Record<string, number> = {};
    const attrSum: Record<string, { forca: number; destreza: number; constituicao: number; inteligencia: number; sabedoria: number; carisma: number }> = {};
    heroes.forEach(h => {
      const key = h.class;
      counts[key] = (counts[key] || 0) + 1;
      levelSum[key] = (levelSum[key] || 0) + (h.progression?.level || h.level || 1);
      const a = h.attributes;
      attrSum[key] = attrSum[key] || { forca: 0, destreza: 0, constituicao: 0, inteligencia: 0, sabedoria: 0, carisma: 0 };
      attrSum[key].forca += a.forca;
      attrSum[key].destreza += a.destreza;
      attrSum[key].constituicao += a.constituicao;
      attrSum[key].inteligencia += a.inteligencia;
      attrSum[key].sabedoria += a.sabedoria;
      attrSum[key].carisma += a.carisma;
    });
    const entries = Object.keys(counts).map(cls => ({
      cls,
      count: counts[cls],
      avgLevel: counts[cls] ? Math.round((levelSum[cls] || 0) / counts[cls]) : 0,
      avgAttrs: counts[cls]
        ? Object.fromEntries(Object.entries(attrSum[cls]).map(([k, v]) => [k, Math.round(v / counts[cls])]))
        : { forca: 0, destreza: 0, constituicao: 0, inteligencia: 0, sabedoria: 0, carisma: 0 }
    }));
    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [heroes]);

  const missionStats = useMemo(() => {
    const totalCompleted = heroes.reduce((sum, h) => sum + (h.stats?.questsCompleted || 0), 0);
    const avgCompletedPerHero = heroes.length ? Math.round(totalCompleted / heroes.length) : 0;
    const avgActivePerHero = heroes.length ? Math.round(heroes.reduce((s, h) => s + (h.activeQuests?.length || 0), 0) / heroes.length) : 0;
    const guildQuestsAvailable = (availableQuests || []).filter(q => q.isGuildQuest).length;
    return { totalCompleted, avgCompletedPerHero, avgActivePerHero, guildQuestsAvailable };
  }, [heroes, availableQuests]);

  const economyStats = useMemo(() => {
    const totalGold = heroes.reduce((sum, h) => sum + (h.progression?.gold || 0), 0);
    const avgGold = heroes.length ? Math.round(totalGold / heroes.length) : 0;
    const itemCounts: Record<string, number> = {};
    heroes.forEach(h => {
      const items = h.inventory?.items || {};
      Object.entries(items).forEach(([id, qty]) => {
        itemCounts[id] = (itemCounts[id] || 0) + (qty || 0);
      });
    });
    const topItems = Object.entries(itemCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);
    return { totalGold, avgGold, topItems };
  }, [heroes]);

  const [adjustments, setAdjustments] = useState({ xp: 100, gold: 100 });
  function applyAdjustments() {
    if (!selectedHero) return;
    if (adjustments.xp) gainXP(selectedHero.id, adjustments.xp);
    if (adjustments.gold) gainGold(selectedHero.id, adjustments.gold);
  }

  function forceQuestRefresh() {
    const lvl = selectedHero?.progression?.level || 1;
    refreshQuests(lvl);
  }

  // === Exportações (CSV/JSON) ===
  function exportKPIJson() {
    const kpi = metricsManager.getKPIDashboard();
    const blob = new Blob([JSON.stringify(kpi, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-dashboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportKPICsv() {
    const kpi = metricsManager.getKPIDashboard();
    const rows: Array<string[]> = [];
    rows.push(['section', 'key', 'value']);
    const pushObj = (section: string, obj: any) => {
      Object.entries(obj || {}).forEach(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          Object.entries(v).forEach(([k2, v2]) => rows.push([section, `${k}.${k2}`, String(v2)]));
        } else if (Array.isArray(v)) {
          rows.push([section, k, JSON.stringify(v)]);
        } else {
          rows.push([section, k, String(v)]);
        }
      });
    };
    pushObj('overview', kpi.overview);
    pushObj('engagement', kpi.engagement);
    pushObj('gameplay', kpi.gameplay);
    pushObj('performance', kpi.performance);
    pushObj('trends', kpi.trends);
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}` + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-dashboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Exportação unificada no estilo do Playtest
  function exportUnifiedMetrics() {
    const kpi = metricsManager.getKPIDashboard();
    const data = {
      timestamp: new Date().toISOString(),
      timeframe: selectedTimeframe,
      kpi,
      engagement,
      gameplay,
      aiUsage,
      sessions,
      heroes: heroes.map(h => ({
        id: h.id,
        name: h.name,
        class: h.class,
        level: h.progression?.level || h.level || 1,
        questsCompleted: h.stats?.questsCompleted || 0,
        totalCombats: h.stats?.totalCombats || 0,
        gold: h.progression?.gold || 0,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hero-forge-unified-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // === Alertas (exemplo: Masmorra da Névoa) ===
  const [dungeonName, setDungeonName] = useState('Masmorra da Névoa');
  const dungeonFailRate = useMemo(() => {
    const relevantStarts = events.filter(e => e.eventType === 'quest-started' && e.data?.dungeonName === dungeonName);
    const relevantFails = events.filter(e => e.eventType === 'quest-failed' && e.data?.dungeonName === dungeonName);
    const total = relevantStarts.length || (relevantFails.length + events.filter(e => e.eventType === 'quest-completed' && e.data?.dungeonName === dungeonName).length);
    if (total === 0) return 0;
    return relevantFails.length / total;
  }, [events, dungeonName]);

  // === Sandbox de Simulação ===
  const [simCount, setSimCount] = useState(50);
  function runSandbox() {
    const heroId = selectedHero?.id || `sandbox-${Math.random().toString(36).slice(2, 7)}`;
    for (let i = 0; i < simCount; i++) {
      metricsManager.trackEvent('page-visited', heroId, { page: '/masmorra' });
      metricsManager.trackEvent('quest-started', heroId, { questName: 'Masmorra da Névoa', dungeonName });
      const failed = Math.random() < 0.65; // intencional para testar alerta
      if (failed) {
        metricsManager.trackEvent('quest-failed', heroId, { questName: 'Masmorra da Névoa', dungeonName, difficulty: 'alto', failure_rate: 0.65 });
      } else {
        metricsManager.trackEvent('quest-completed', heroId, { questName: 'Masmorra da Névoa', dungeonName });
        metricsManager.trackEvent('xp-gained', heroId, { amount: Math.floor(Math.random() * 120) + 30 });
        metricsManager.trackEvent('gold-gained', heroId, { amount: Math.floor(Math.random() * 60) });
      }
    }
    setEngagement(metricsManager.getEngagementMetrics());
    setGameplay(metricsManager.getGameplayAnalytics());
    setEvents(metricsManager.getEvents());
  }

  // === Relatório IA “Forjador” ===
  const [aiPrompt, setAiPrompt] = useState('Gere um relatório semanal com tom de ferreiro medieval.');
  const [aiReport, setAiReport] = useState('');
  const [aiLog, setAiLog] = useState<Array<{ timestamp: string; prompt: string; report: string }>>(() => {
    try {
      const saved = localStorage.getItem('admin-ai-reports-log');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  async function generateAIReport() {
    const kpi = metricsManager.getKPIDashboard();
    const context = `Resumo:
DAU: ${kpi.engagement.dailyActiveUsers}, WAU: ${kpi.engagement.weeklyActiveUsers}, MAU: ${kpi.engagement.monthlyActiveUsers}
Retenção7: ${(kpi.engagement.retentionRate.day7 * 100).toFixed(1)}%, Retenção30: ${(kpi.engagement.retentionRate.day30 * 100).toFixed(1)}%
Missões: ${kpi.gameplay.totalQuestsCompleted}, XP: ${kpi.gameplay.totalXpGained}, Ouro: ${kpi.gameplay.totalGoldEarned}
Classe Popular: ${kpi.gameplay.mostPopularClass}
Falha na ${dungeonName}: ${(dungeonFailRate * 100).toFixed(1)}%`;

    const systemMsg = 'Você é o Forjador, narrador medieval que analisa métricas de um reino de heróis. Escreva com voz temática, clara e útil para administração do jogo. Seja conciso e coloque recomendações práticas.';
    try {
      const resp = await aiService.generateText({ prompt: aiPrompt, context, systemMessage: systemMsg, maxTokens: 600, temperature: 0.7 });
      const text = resp?.text || '';
      setAiReport(text);
      const entry = { timestamp: new Date().toISOString(), prompt: `${systemMsg}\n${aiPrompt}\n${context}`, report: text };
      const next = [entry, ...aiLog].slice(0, 20);
      setAiLog(next);
      localStorage.setItem('admin-ai-reports-log', JSON.stringify(next));
    } catch (e: any) {
      const fallback = `Os Arqueiros prosperam, mas os Magos sofrem nas sombras. Retenção em ${(kpi.engagement.retentionRate.day7 * 100).toFixed(1)}%. Falhas altas em ${dungeonName} (${(dungeonFailRate * 100).toFixed(1)}%). Ajuste dificuldade e ofertas de poções.`;
      setAiReport(fallback);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header do Painel Admin */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Painel Admin</h1>
            <p className="text-lg opacity-90">Métricas e análises do Hero Forge</p>
            <p className="text-xs opacity-90 mt-1">Última atualização: {lastRefresh}</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="bg-white text-gray-800 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="today">Hoje</option>
              <option value="week">Última Semana</option>
              <option value="all">Todos os Tempos</option>
            </select>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded font-medium border transition-colors ${autoRefresh ? 'bg-white text-indigo-600 border-indigo-300 hover:bg-gray-100' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            >
              {autoRefresh ? '🔄 Auto' : '⏹️ Manual'}
            </button>
            <button
              onClick={exportUnifiedMetrics}
              className="bg-white text-indigo-600 px-4 py-2 rounded border border-indigo-300 hover:bg-gray-100 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              📥 Exportar Dados
            </button>
          </div>
        </div>
      </div>

      {/* Cards principais no estilo Playtest */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 min-h-[120px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Heróis</p>
              <p className="text-3xl font-bold text-blue-600">{stats.heroes}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 min-h-[120px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Selecionado</p>
              <p className="text-xl font-semibold text-gray-900 truncate">{stats.selected}</p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 min-h-[120px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nível</p>
              <p className="text-3xl font-bold text-green-600">{stats.level}</p>
            </div>
            <div className="text-4xl">⬆️</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 min-h-[120px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">DAU / Retenção7</p>
              <p className="text-lg font-semibold text-gray-900">
                {engagement?.dailyActiveUsers || 0} / {(engagement?.retentionRate?.day7 || 0) * 100}%
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* KPIs adicionais e tendências (estilo Playtest) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">WAU / MAU</p>
          <p className="text-lg font-semibold text-gray-900">{engagement?.weeklyActiveUsers || 0} / {engagement?.monthlyActiveUsers || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Missões concluídas</p>
          <p className="text-2xl font-bold text-purple-600">{gameplay?.totalQuestsCompleted || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Ouro total ganho</p>
          <p className="text-2xl font-bold text-yellow-600">{gameplay?.totalGoldEarned || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">XP total ganho</p>
          <p className="text-2xl font-bold text-green-600">{gameplay?.totalXpGained || 0}</p>
        </div>
      </div>

      {/* Painel clássico removido para evitar duplicidade com cards Playtest */}

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">⚔️ Ações rápidas</h2>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-2 bg-white text-amber-800 border border-amber-300 hover:bg-gray-100 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={exportSelected} disabled={!selectedHero}>Exportar herói selecionado</button>
          <button className="px-3 py-2 bg-white text-red-800 border border-red-300 hover:bg-gray-100 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={removeSelected} disabled={!selectedHero}>Remover herói selecionado</button>
          <button className="px-3 py-2 bg-white text-blue-800 border border-blue-300 hover:bg-gray-100 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={resetDailyGoals}>Resetar metas diárias</button>
          <button className="px-3 py-2 bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={clearStorage}>Limpar armazenamento</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">📜 Ambiente</h2>
        <div className="text-sm text-gray-700">Modo: {import.meta.env.DEV ? 'desenvolvimento' : 'produção'}</div>
        <div className="text-sm text-gray-700">Vite: ativo</div>
        <div className="text-sm text-gray-700">Chaves conhecidas: {Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')).join(', ') || '—'}</div>
      </div>

      {/* Supabase Test Panel */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🗄️ Supabase</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={testSupabase}
            className="px-3 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sbLoading ? 'Conectando...' : 'Testar conexão (tabela players)'}
          </button>
          <div className="text-sm text-gray-700">Status: {sbStatus}</div>
        </div>
        {sbError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">
            Erro: {sbError}
          </div>
        )}
        <div className="text-sm text-gray-700">Resultado (até 5 registros):</div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {sbPlayers.length === 0 && (
            <div className="text-xs text-gray-500">Nenhum registro retornado. Crie dados na tabela `players` ou revise RLS.</div>
          )}
          {sbPlayers.map((p, idx) => (
            <div key={idx} className="bg-white p-3 rounded border border-gray-200">
              <div className="text-xs text-gray-500">id: {String(p.id ?? '—')}</div>
              <div className="text-sm text-gray-900">username: {String(p.username ?? '—')}</div>
              <div className="text-xs text-gray-500">created_at: {String(p.created_at ?? '—')}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Dica: configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `.env.local`.
          Se RLS bloquear, ajuste políticas para leitura pública de `players` em desenvolvimento.
        </div>
      </div>

      {/* Supabase Auth Panel */}
      <SupabaseAuthPanel />

      {/* Supabase Heroes Sync Panel */}
      <SupabaseHeroesSyncPanel />

      {/* Supabase Quests Panel */}
      <SupabaseQuestsPanel />

      {/* Configurações de Jogo (estilo Playtest) */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Configurações de Jogo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Regeneração de HP (pontos por minuto)</label>
            <input
              type="number"
              min={0}
              className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={settings.regenHpPerMin}
              onChange={(e) => updateSettings({ regenHpPerMin: Math.max(0, Number(e.target.value)) })}
            />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Regeneração de Mana (pontos por minuto)</label>
            <input
              type="number"
              min={0}
              className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={settings.regenMpPerMin}
              onChange={(e) => updateSettings({ regenMpPerMin: Math.max(0, Number(e.target.value)) })}
            />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Regeneração de Stamina (pontos por minuto)</label>
            <input
              type="number"
              min={0}
              className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={settings.regenStaminaPerMin}
              onChange={(e) => updateSettings({ regenStaminaPerMin: Math.max(0, Number(e.target.value)) })}
            />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Penalidade de morte habilitada</label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.deathPenaltyEnabled}
                onChange={(e) => updateSettings({ deathPenaltyEnabled: e.target.checked })}
              />
              <span className="text-gray-600 text-sm">Bloqueia ações durante recuperação</span>
            </div>
            <label className="block text-sm text-gray-600 mt-3 mb-2">Tempo de recuperação após morte (minutos)</label>
            <input
              type="number"
              min={0}
              className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={settings.deathRecoveryMinutes}
              onChange={(e) => updateSettings({ deathRecoveryMinutes: Math.max(0, Number(e.target.value)) })}
            />
            <div className="text-xs text-gray-500 mt-2">Nota: O tempo será aplicado em fluxos de masmorra compatíveis.</div>
          </div>
        </div>
      </div>

      {/* Visão Geral de Gameplay (estilo Playtest) */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Métricas e Retenção</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <div className="text-sm text-gray-600">Usuários Diários (DAU)</div>
            <div className="text-2xl text-gray-900">{engagement.dailyActiveUsers}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <div className="text-sm text-gray-600">Usuários Semanais (WAU)</div>
            <div className="text-2xl text-gray-900">{engagement.weeklyActiveUsers}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <div className="text-sm text-gray-600">Usuários Mensais (MAU)</div>
            <div className="text-2xl text-gray-900">{engagement.monthlyActiveUsers}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <div className="text-sm text-gray-600">Retenção (7 dias)</div>
            <div className="text-2xl text-indigo-600">{(engagement.retentionRate.day7 * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <div className="text-sm text-gray-600">Retenção (30 dias)</div>
            <div className="text-2xl text-indigo-600">{(engagement.retentionRate.day30 * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Ações por sessão</div>
            <div className="text-2xl text-gray-900">{engagement.averageActionsPerSession.toFixed(1)}</div>
          </div>
        </div>
        {/* Removido: totals duplicados (já visíveis nos KPIs acima) */}
      </div>

      {/* Classes e Estatísticas de Heróis */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🧭 Classes e Estatísticas de Heróis</h2>
        {classStats.length === 0 ? (
          <div className="text-sm text-gray-500">Nenhum herói registrado ainda.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classStats.map(entry => (
              <div key={entry.cls} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between">
                  <div className="text-gray-900 font-semibold capitalize">{entry.cls}</div>
                  <div className="text-gray-600 text-sm">{entry.count} heróis</div>
                </div>
                <div className="mt-2 text-sm text-gray-600">Nível médio: <span className="text-gray-900 font-medium">{entry.avgLevel}</span></div>
                <div className="mt-3 text-xs text-gray-600">Atributos médios</div>
                <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-gray-700">
                  {Object.entries(entry.avgAttrs).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="capitalize">{k}</span>
                      <span className="text-gray-900">{v as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missões e Masmorras */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🏰 Missões e Masmorras</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Total concluídas</div>
            <div className="text-2xl text-gray-900">{missionStats.totalCompleted}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Média por herói</div>
            <div className="text-2xl text-gray-900">{missionStats.avgCompletedPerHero}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Ativas por herói</div>
            <div className="text-2xl text-gray-900">{missionStats.avgActivePerHero}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Quests de guilda disponíveis</div>
            <div className="text-2xl text-gray-900">{missionStats.guildQuestsAvailable}</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">Dica: use o botão abaixo para forçar atualização do Quadro de Missões com base no nível do herói selecionado.</div>
        <button className="mt-2 px-3 py-2 bg-white text-indigo-600 border border-indigo-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={forceQuestRefresh} disabled={!selectedHero}>Atualizar Quadro de Missões</button>
      </div>

      {/* Economia e Loja */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🪙 Economia e Loja</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Ouro total no sistema</div>
            <div className="text-2xl text-gray-900">{economyStats.totalGold}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Ouro médio por herói</div>
            <div className="text-2xl text-gray-900">{economyStats.avgGold}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Itens mais comuns no inventário</div>
            <ul className="mt-2 text-sm text-gray-700">
              {economyStats.topItems.length === 0 && <li className="text-gray-500">—</li>}
              {economyStats.topItems.map(([id, qty]) => (
                <li key={id}>{id}: <span className="text-gray-900 font-medium">{qty as number}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* IA e Narrativas */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🧠 IA e Narrativas</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Requisições totais</div>
            <div className="text-2xl text-gray-900">{aiUsage.totalRequests}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Tempo médio de resposta</div>
            <div className="text-2xl text-gray-900">{Math.round(aiUsage.averageResponseTime)}ms</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Taxa de erro</div>
            <div className="text-2xl text-gray-900">{(aiUsage.errorRate || 0).toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Por tipo</div>
            <ul className="mt-2 text-sm text-gray-700">
              {Object.keys(aiUsage.requestsByType || {}).length === 0 && <li className="text-gray-500">—</li>}
              {Object.entries(aiUsage.requestsByType || {}).map(([type, count]) => (
                <li key={type}>{type}: <span className="text-gray-900 font-medium">{count as number}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Relatório IA “Forjador” e Exportação */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🛠️ Relatórios e Exportação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Prompt do Forjador</div>
            <textarea className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
            <button className="mt-2 px-3 py-2 bg-white text-amber-700 border border-amber-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={generateAIReport}>Gerar relatório</button>
            <div className="mt-3 text-xs text-gray-500">Dica: Ele narra com voz medieval e sugere ajustes.</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Relatório gerado</div>
            <div className="bg-white text-gray-800 border border-gray-200 rounded p-3 whitespace-pre-wrap text-sm min-h-[96px]">{aiReport || '—'}</div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={exportKPIJson}>Exportar .json</button>
              <button className="px-3 py-2 bg-white text-green-700 border border-green-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={exportKPICsv}>Exportar .csv</button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">🧾 Log de IA (últimos 20)</div>
          {aiLog.length === 0 ? (
            <div className="text-xs text-gray-500">Nenhum relatório gerado ainda.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {aiLog.map((l, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500">{new Date(l.timestamp).toLocaleString()}</div>
                  <div className="text-xs text-amber-700 mt-1">Prompt & contexto</div>
                  <div className="text-xs text-gray-700 whitespace-pre-wrap">{l.prompt}</div>
                  <div className="text-xs text-amber-700 mt-2">Relatório</div>
                  <div className="text-xs text-gray-800 whitespace-pre-wrap">{l.report}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alertas Automáticos */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🔔 Alertas Automáticos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <label className="block text-sm text-gray-600 mb-2">Masmorra</label>
            <input className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={dungeonName} onChange={e => setDungeonName(e.target.value)} />
            <div className="mt-3 text-sm text-gray-600">Taxa de falha</div>
            <div className="text-2xl text-gray-900">{(dungeonFailRate * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className={`text-sm ${dungeonFailRate > 0.6 ? 'text-red-700' : 'text-gray-600'}`}>Regra: falha &gt; 60%</div>
            <div className={`mt-2 p-3 rounded text-sm border ${dungeonFailRate > 0.6 ? 'border-red-300 text-red-800 bg-white' : 'border-gray-200 text-gray-700 bg-white'}`}>
              {dungeonFailRate > 0.6 ? 'Alerta: Ajustar dificuldade ou oferecer poções/boosts.' : 'OK: Dentro do limite.'}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Webhook (Discord/Telegram)</div>
            <input className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="https://discordapp.com/api/webhooks/..." />
            <button className="mt-2 px-3 py-2 bg-white text-purple-700 border border-purple-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">Enviar teste</button>
            <div className="text-xs text-gray-500 mt-2">Exemplo de integração básica via webhook.</div>
          </div>
        </div>
      </div>

      {/* Modo Sandbox */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🧱 Modo Sandbox</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <label className="block text-sm text-gray-600 mb-2">Eventos simulados</label>
            <input type="number" className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={simCount} onChange={e => setSimCount(Math.max(1, Number(e.target.value)))} />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Dungeon alvo</div>
            <div className="text-gray-900">{dungeonName}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <button className="w-full px-3 py-2 bg-white text-blue-700 border border-blue-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={runSandbox}>Simular jogadores/IA</button>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">Gera eventos de sucesso/fracasso para stressar métricas e alertas.</div>
      </div>

      {/* Ferramentas de Administração */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🔧 Ferramentas de Administração</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <label className="block text-sm text-gray-600 mb-2">Ajustar XP (aplicar ao herói selecionado)</label>
            <input
              type="number"
              className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={adjustments.xp}
              onChange={(e) => setAdjustments(prev => ({ ...prev, xp: Number(e.target.value) }))}
              disabled={!selectedHero}
            />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <label className="block text-sm text-gray-600 mb-2">Ajustar Ouro (aplicar ao herói selecionado)</label>
            <input
              type="number"
              className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={adjustments.gold}
              onChange={(e) => setAdjustments(prev => ({ ...prev, gold: Number(e.target.value) }))}
              disabled={!selectedHero}
            />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-end">
            <button className="w-full px-3 py-2 bg-white text-amber-700 border border-amber-300 rounded hover:bg-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={applyAdjustments} disabled={!selectedHero}>Aplicar ajustes</button>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">Nota: use estes controles para testes e balanceamento rápido sem afetar outros heróis.</div>
      </div>
    </div>
  );
}
