import React, { useMemo, useEffect, useState } from 'react';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';
import { useHeroStore } from '../store/heroStore';
import { SHOP_ITEMS } from '../utils/shop';
import { useGameSettingsStore } from '../store/gameSettingsStore';
import { metricsManager } from '../utils/metricsSystem';
import { aiService } from '../services/aiService';
import { supabase } from '../lib/supabaseClient';
import SupabaseHeroesSyncPanel from './SupabaseHeroesSyncPanel';
import SupabaseQuestsPanel from './SupabaseQuestsPanel';
import { triggerBackup } from '../services/backupService';

export default function AdminDashboard() {
  const heroes = useHeroStore(s => s.heroes);
  const selectedHeroId = useHeroStore(s => s.selectedHeroId);
  const getSelectedHero = useHeroStore(s => s.getSelectedHero);
  const removeHero = useHeroStore(s => s.removeHero);
  const resetDailyGoals = useHeroStore(s => s.resetDailyGoals);
  const gainXP = useHeroStore(s => s.gainXP);
  const gainGold = useHeroStore(s => s.gainGold);
  const availableQuests = useHeroStore(s => s.availableQuests);
  const addItemToInventory = useHeroStore(s => s.addItemToInventory);
  const sellItem = useHeroStore(s => s.sellItem);
  const refreshQuests = useHeroStore(s => s.refreshQuests);
  const selectedHero = getSelectedHero();
  const seedRandomHatred = useHeroStore(s => (s as any).seedRandomHatred);

  // Settings
  const settings = useGameSettingsStore(s => ({
    regenHpPerMin: s.regenHpPerMin,
    regenMpPerMin: s.regenMpPerMin,
    regenStaminaPerMin: s.regenStaminaPerMin,
    deathRecoveryMinutes: s.deathRecoveryMinutes,
    deathPenaltyEnabled: s.deathPenaltyEnabled,
    restBuffHpMpMultiplier: s.restBuffHpMpMultiplier,
    restBuffStaminaMultiplier: s.restBuffStaminaMultiplier,
    restBuffDurationMinutes: s.restBuffDurationMinutes,
    meditationMpBonusPerMin: s.meditationMpBonusPerMin,
    meditationDurationMinutes: s.meditationDurationMinutes,
    meditationCooldownMinutes: s.meditationCooldownMinutes,
    dungeonRegenMultiplier: s.dungeonRegenMultiplier,
  }));
  const updateSettings = useGameSettingsStore(s => s.updateSettings);
  const npcSettings = useGameSettingsStore(s => ({
    npcInteractionDifficulty: s.npcInteractionDifficulty,
    npcNotificationsMode: s.npcNotificationsMode,
    npcNotifyMaxPerTick: s.npcNotifyMaxPerTick,
    npcRelationKnownThreshold: s.npcRelationKnownThreshold,
    npcRelationFriendThreshold: s.npcRelationFriendThreshold,
    npcRelationBestFriendThreshold: s.npcRelationBestFriendThreshold,
    npcDuelRivalryModerate: s.npcDuelRivalryModerate,
    npcDuelRivalryHigh: s.npcDuelRivalryHigh,
    npcDuelLevelDiffMax: s.npcDuelLevelDiffMax,
    npcInteractionCooldownSeconds: s.npcInteractionCooldownSeconds,
    npcSeedTarget: s.npcSeedTarget,
    npcVisibleCap: s.npcVisibleCap,
    npcRotationSeconds: s.npcRotationSeconds,
  }));

  const stats = useMemo(() => ({
    heroes: heroes.length,
    selected: selectedHero ? selectedHero.name : '—',
    level: selectedHero ? selectedHero.progression.level : 0,
  }), [heroes.length, selectedHero?.name, selectedHero?.progression.level]);

  const { activeSeasonalTheme } = useMonetizationStore();

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
  const [backupStatus, setBackupStatus] = useState<string>('—');
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [playerProgress, setPlayerProgress] = useState<{ missions_completed: number; achievements_unlocked: number; playtime_minutes: number; last_login?: string | null } | null>(null);
  const [playerProfile, setPlayerProfile] = useState<any | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [logFiles, setLogFiles] = useState<any[]>([]);
  const [logPreview, setLogPreview] = useState<string>('—');
  const [logType, setLogType] = useState<string>('');
  const [logOffset, setLogOffset] = useState<number>(0);
  const [exportUserStatus, setExportUserStatus] = useState<string>('—');
  async function importLocalToCloud() {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id || null;
      if (!userId) {
        alert('Faça login para importar seus dados');
        return;
      }
      const heroes = loadLocalHeroes(userId);
      const quests = loadLocalQuests(userId);
      let hCount = 0;
      for (const h of heroes) {
        const saved = await fetch('/api/hero-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, hero: h }) });
        if (saved.ok) hCount++;
      }
      let qCount = 0;
      for (const q of quests) {
        const res = await fetch('/api/missions?action=generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, hero_id: q.heroId, prompt: q.data?.prompt || 'Missão importada', context: q.data || {} }) });
        if (res.ok) qCount++;
      }
      alert(`Importação concluída: ${hCount} herói(s), ${qCount} missão(ões).`);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

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

  async function runBackup() {
    setBackupStatus('Executando...');
    const resp = await triggerBackup();
    if (resp.ok) {
      setBackupStatus(`OK (${resp.file})`);
    } else {
      setBackupStatus(`Erro: ${resp.error}`);
    }
  }

  async function fetchPlayerProgress() {
    setProgressLoading(true);
    setProgressError(null);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id || null;
      if (!userId) {
        setProgressError('Faça login para ver seu progresso.');
        setPlayerProgress(null);
      } else {
        const res = await fetch(`/api/player-progress?action=get&id=${encodeURIComponent(userId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Falha ao carregar progresso');
        setPlayerProgress(json?.progress || null);
        const res2 = await fetch(`/api/users?action=get&id=${encodeURIComponent(userId)}`);
        const json2 = await res2.json();
        if (res2.ok) setPlayerProfile(json2?.profile || null);
      }
    } catch (e: any) {
      setProgressError(e?.message || String(e));
      setPlayerProgress(null);
    } finally {
      setProgressLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const qs = new URLSearchParams();
      if (logType) qs.set('type', logType);
      qs.set('limit', '20');
      qs.set('offset', String(logOffset));
      const { data: sessData } = await supabase.auth.getSession();
      const sessionToken = sessData?.session?.access_token || '';
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      if (adminToken) headers['x-admin-token'] = adminToken;
      const res = await fetch(`/api/logs?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao listar logs');
      setLogFiles(Array.isArray(data?.files) ? data.files : []);
    } catch (e: any) {
      setLogFiles([]);
      console.error('fetchLogs error', e?.message || String(e));
    }
  }

  async function fetchLogContent(name: string) {
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const sessionToken = sessData?.session?.access_token || '';
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      if (adminToken) headers['x-admin-token'] = adminToken;
      const res = await fetch(`/api/logs?action=get&name=${encodeURIComponent(name)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao obter log');
      const content = data?.json ? JSON.stringify(data.json, null, 2) : (data?.content || '—');
      setLogPreview(content);
    } catch (e: any) {
      setLogPreview(e?.message || String(e));
    }
  }

  async function exportUserData() {
    try {
      setExportUserStatus('Exportando...');
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id || null;
      if (!userId) { setExportUserStatus('Sem login'); return; }
      const { data: sessData } = await supabase.auth.getSession();
      const sessionToken = sessData?.session?.access_token || '';
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      if (adminToken) headers['x-admin-token'] = adminToken;
      const res = await fetch(`/api/export-user?id=${encodeURIComponent(userId)}`, { headers });
      const txt = await res.text();
      if (!res.ok) { setExportUserStatus('Erro'); return; }
      const blob = new Blob([txt], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `hfn-user-${userId}-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      setExportUserStatus('OK');
    } catch (e: any) {
      setExportUserStatus(e?.message || 'Erro');
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

  const cycles = useMemo(() => {
    const h = selectedHero;
    const hpMax = h?.derivedAttributes.hp || 0;
    const hpCur = h?.derivedAttributes.currentHp ?? hpMax;
    const mpMax = h?.derivedAttributes.mp || 0;
    const mpCur = h?.derivedAttributes.currentMp ?? mpMax;
    const stMax = (h?.stamina as any)?.max ?? 100;
    const stCur = (h?.stamina as any)?.current ?? ((h?.stamina as any) ?? 0);
    const hpToFull = hpMax > hpCur ? Math.ceil((hpMax - hpCur) / Math.max(1, settings.regenHpPerMin)) : 0;
    const mpToFull = mpMax > mpCur ? Math.ceil((mpMax - mpCur) / Math.max(1, settings.regenMpPerMin)) : 0;
    const stToFullBase = stMax > stCur ? Math.ceil((stMax - stCur) / Math.max(1, settings.regenStaminaPerMin)) : 0;
    const stRecoveryInDungeon15 = Math.max(0, Math.min(stMax, Math.floor(settings.regenStaminaPerMin * 15)));
    return {
      hpToFull,
      mpToFull,
      stToFullBase,
      stRecoveryInDungeon15,
      questCd: { rapida: 10, padrao: 20, epica: 50 },
      huntingCdByRank: { F: 8, E: 12, D: 15, C: 20, B: 25, A: 30, S: 40 },
      dungeonCd: 15
    };
  }, [selectedHero?.id, selectedHero?.derivedAttributes?.hp, selectedHero?.derivedAttributes?.currentHp, selectedHero?.derivedAttributes?.mp, selectedHero?.derivedAttributes?.currentMp, (selectedHero?.stamina as any)?.current, (selectedHero?.stamina as any)?.max, settings.regenHpPerMin, settings.regenMpPerMin, settings.regenStaminaPerMin]);

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

  const [tmpNpc, setTmpNpc] = useState<any>({});
  function applyNpcSettings() { updateSettings(tmpNpc); setTmpNpc({}); }

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

  const [itemSearch, setItemSearch] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const seen = new Set<string>();
    const list = SHOP_ITEMS.filter(i => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      if (!q) return true;
      return i.id.toLowerCase().includes(q) || String(i.name || '').toLowerCase().includes(q);
    });
    return list;
  }, [itemSearch]);

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

      {/* Progresso do Jogador */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🎮 Seu Progresso</h2>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={fetchPlayerProgress} className="px-3 py-2 bg-white text-indigo-700 border border-indigo-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {progressLoading ? 'Carregando...' : 'Atualizar agora'}
          </button>
          {progressError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{progressError}</div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Missões concluídas</div>
            <div className="text-2xl text-gray-900">{playerProgress?.missions_completed ?? '—'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Conquistas</div>
            <div className="text-2xl text-gray-900">{playerProgress?.achievements_unlocked ?? '—'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Tempo de jogo (min)</div>
            <div className="text-2xl text-gray-900">{playerProgress?.playtime_minutes ?? '—'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Último login</div>
            <div className="text-xs text-gray-900">{playerProgress?.last_login ? new Date(playerProgress.last_login).toLocaleString() : '—'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Criado em</div>
            <div className="text-xs text-gray-900">{playerProfile?.created_at ? new Date(playerProfile.created_at).toLocaleString() : '—'}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={exportUserData} className="px-3 py-2 bg-white text-indigo-700 border border-indigo-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">Exportar dados (JSON)</button>
          <div className="text-sm text-gray-700">Export: {exportUserStatus}</div>
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
          <button
            onClick={runBackup}
            className="px-3 py-2 bg-white text-purple-700 border border-purple-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Fazer backup agora
          </button>
          <div className="text-sm text-gray-700">Backup: {backupStatus}</div>
          <button
            onClick={importLocalToCloud}
            className="px-3 py-2 bg-white text-indigo-700 border border-indigo-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Importar dados locais
          </button>
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

      {/* Logs Admin Panel */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🧾 Logs (Admin)</h2>
        <div className="flex items-end gap-2 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Admin Token</label>
            <input value={adminToken} onChange={e => setAdminToken(e.target.value)} className="bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Bearer token" />
          </div>
          {!adminToken && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">Defina ADMIN_API_TOKEN no servidor para listar logs em produção</div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={logType} onChange={e => { setLogType(e.target.value); setLogOffset(0); }} className="bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Todos</option>
              <option value="backup-">Backup</option>
              <option value="evt-">Eventos</option>
            </select>
          </div>
            <button onClick={fetchLogs} className="px-3 py-2 bg-white text-purple-700 border border-purple-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">Listar logs</button>
            <button onClick={() => { setLogOffset(Math.max(0, logOffset - 20)); fetchLogs(); }} className="px-2 py-2 bg-white text-gray-700 border border-gray-300 rounded">Prev</button>
            <button onClick={() => { setLogOffset(logOffset + 20); fetchLogs(); }} className="px-2 py-2 bg-white text-gray-700 border border-gray-300 rounded">Next</button>
          </div>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          {logFiles.length === 0 && (
            <div className="text-xs text-gray-500">—</div>
          )}
          {logFiles.map((f, idx) => (
            <div key={idx} className="bg-white p-3 rounded border border-gray-200 text-xs text-gray-700 flex items-center justify-between gap-2">
              <span>{String(f?.name || '—')} • {String(f?.created_at || '')}</span>
              <button onClick={() => fetchLogContent(String(f?.name || ''))} className="px-2 py-1 bg-white text-gray-800 border border-gray-300 rounded">Ver</button>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="text-sm text-gray-700 mb-1">Prévia</div>
          <pre className="bg-white p-3 rounded border border-gray-200 text-xs text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">{logPreview}</pre>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Dica: configure `ADMIN_API_TOKEN` no ambiente do servidor. Apenas para produção.
        </div>
      </div>

      

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
            <label className="block text-sm text-gray-600 mb-2">Fadiga é gerida por descanso</label>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Multiplicador de descanso (HP/MP)</label>
            <input type="number" step={0.1} className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={Number(settings.restBuffHpMpMultiplier ?? 1.5)} onChange={(e) => updateSettings({ restBuffHpMpMultiplier: Number(e.target.value) })} />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Multiplicador de descanso (HP/MP)</label>
            <input type="number" step={0.1} className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={Number(settings.restBuffStaminaMultiplier ?? 2)} onChange={(e) => updateSettings({ restBuffStaminaMultiplier: Number(e.target.value) })} />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Duração do descanso (min)</label>
            <input type="number" className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={Number(settings.restBuffDurationMinutes ?? 10)} onChange={(e) => updateSettings({ restBuffDurationMinutes: Math.max(0, Number(e.target.value)) })} />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Bônus de Meditação (MP/min)</label>
            <input type="number" className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={Number(settings.meditationMpBonusPerMin ?? 8)} onChange={(e) => updateSettings({ meditationMpBonusPerMin: Math.max(0, Number(e.target.value)) })} />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Duração da Meditação (min)</label>
            <input type="number" className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={Number(settings.meditationDurationMinutes ?? 2)} onChange={(e) => updateSettings({ meditationDurationMinutes: Math.max(0, Number(e.target.value)) })} />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Cooldown da Meditação (min)</label>
            <input type="number" className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={Number(settings.meditationCooldownMinutes ?? 10)} onChange={(e) => updateSettings({ meditationCooldownMinutes: Math.max(0, Number(e.target.value)) })} />
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[96px]">
            <label className="block text-sm text-gray-600 mb-2">Multiplicador de regen em Dungeon</label>
            <input type="number" step={0.1} className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value={Number(settings.dungeonRegenMultiplier ?? 0.5)} onChange={(e) => updateSettings({ dungeonRegenMultiplier: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⏱️ Ciclos de Jogo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Tempo até recuperar</div>
            <ul className="mt-2 text-sm text-gray-900">
              <li>HP: {cycles.hpToFull} min</li>
              <li>MP: {cycles.mpToFull} min</li>
              <li>Fadiga: sem regeneração automática</li>
            </ul>
            <div className="text-xs text-gray-500 mt-2">Dica: gerencie fadiga com descanso adequado</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">Cooldowns alvo</div>
            <ul className="mt-2 text-sm text-gray-900">
              <li>Missão rápida: {cycles.questCd.rapida} min</li>
              <li>Missão padrão: {cycles.questCd.padrao} min</li>
              <li>Missão épica: {cycles.questCd.epica} min</li>
              <li>Caça (por rank): F {cycles.huntingCdByRank.F} • E {cycles.huntingCdByRank.E} • D {cycles.huntingCdByRank.D} • C {cycles.huntingCdByRank.C} • B {cycles.huntingCdByRank.B} • A {cycles.huntingCdByRank.A} • S {cycles.huntingCdByRank.S} min</li>
              <li>Masmorra: {cycles.dungeonCd} min</li>
            </ul>
            <div className="text-xs text-gray-500 mt-2">Ajuste os sliders acima para ver o impacto nos tempos.</div>
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

      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">🎒 Gestão de Itens</h2>
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Buscar</label>
            <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} className="w-full bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="id ou nome do item" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Quantidade</label>
            <input type="number" min={1} value={itemQty} onChange={e => setItemQty(Math.max(1, Number(e.target.value)))} className="w-24 bg-white text-gray-900 rounded px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredItems.map(it => (
            <div key={it.id} className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-1 rounded">{it.id}</span>
                <span className="text-sm text-gray-900">{it.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 bg-white text-green-700 border border-green-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={() => { if (!selectedHero) return; addItemToInventory(selectedHero.id, it.id, itemQty); }}
                  disabled={!selectedHero}
                >Adicionar</button>
                <button
                  className="px-2 py-1 bg-white text-red-700 border border-red-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={() => { if (!selectedHero) return; sellItem(selectedHero.id, it.id, itemQty); }}
                  disabled={!selectedHero}
                >Remover</button>
              </div>
            </div>
          ))}
        </div>
        {!selectedHero && (
          <div className="mt-2 text-xs text-gray-500">Selecione um herói para aplicar alterações de inventário.</div>
        )}
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
            <button className={`mt-2 px-3 py-2 text-white rounded bg-gradient-to-r ${(seasonalThemes as any)[activeSeasonalTheme || '']?.buttonGradient || 'from-amber-600 to-yellow-600'} hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2`} onClick={generateAIReport}>
              {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
              <span>Gerar relatório</span>
            </button>
            <div className="mt-3 text-xs text-gray-500">Dica: Ele narra com voz medieval e sugere ajustes.</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Relatório gerado</div>
            <div className="bg-white text-gray-800 border border-gray-200 rounded p-3 whitespace-pre-wrap text-sm min-h-[96px]">{aiReport || '—'}</div>
            <div className="mt-3 flex gap-2">
              <button className={`px-3 py-2 text-white rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2`} onClick={exportKPIJson}>
                {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
                <span>Exportar .json</span>
              </button>
              <button className={`px-3 py-2 text-white rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2`} onClick={exportKPICsv}>
                {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
                <span>Exportar .csv</span>
              </button>
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

      {/* Painel de Interações de NPC */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">👥 Interações de NPC</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Dificuldade</label>
            <select defaultValue={npcSettings.npcInteractionDifficulty} onChange={(e) => setTmpNpc({ ...tmpNpc, npcInteractionDifficulty: e.target.value })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1">
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Modo de Notificações</label>
            <select defaultValue={npcSettings.npcNotificationsMode} onChange={(e) => setTmpNpc({ ...tmpNpc, npcNotificationsMode: e.target.value })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1">
              <option value="off">Desligado</option>
              <option value="compact">Compacto</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Máx. Notificações por tick</label>
            <input type="number" defaultValue={npcSettings.npcNotifyMaxPerTick} onChange={(e) => setTmpNpc({ ...tmpNpc, npcNotifyMaxPerTick: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Cooldown de Interações (s)</label>
            <input type="number" defaultValue={npcSettings.npcInteractionCooldownSeconds} onChange={(e) => setTmpNpc({ ...tmpNpc, npcInteractionCooldownSeconds: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Seed de NPCs</label>
            <input type="number" defaultValue={npcSettings.npcSeedTarget} onChange={(e) => setTmpNpc({ ...tmpNpc, npcSeedTarget: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Visíveis no painel</label>
            <input type="number" defaultValue={npcSettings.npcVisibleCap} onChange={(e) => setTmpNpc({ ...tmpNpc, npcVisibleCap: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rotação (s)</label>
            <input type="number" defaultValue={npcSettings.npcRotationSeconds} onChange={(e) => setTmpNpc({ ...tmpNpc, npcRotationSeconds: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div>
            <label className="text-sm text-gray-600">Conhecido ≥</label>
            <input type="number" defaultValue={npcSettings.npcRelationKnownThreshold} onChange={(e) => setTmpNpc({ ...tmpNpc, npcRelationKnownThreshold: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Amigo ≥</label>
            <input type="number" defaultValue={npcSettings.npcRelationFriendThreshold} onChange={(e) => setTmpNpc({ ...tmpNpc, npcRelationFriendThreshold: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Melhor Amigo ≥</label>
            <input type="number" defaultValue={npcSettings.npcRelationBestFriendThreshold} onChange={(e) => setTmpNpc({ ...tmpNpc, npcRelationBestFriendThreshold: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div>
            <label className="text-sm text-gray-600">Rivalidade Moderada ≤</label>
            <input type="number" defaultValue={npcSettings.npcDuelRivalryModerate} onChange={(e) => setTmpNpc({ ...tmpNpc, npcDuelRivalryModerate: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rivalidade Alta ≤</label>
            <input type="number" defaultValue={npcSettings.npcDuelRivalryHigh} onChange={(e) => setTmpNpc({ ...tmpNpc, npcDuelRivalryHigh: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Diferença máx. de nível</label>
            <input type="number" defaultValue={npcSettings.npcDuelLevelDiffMax} onChange={(e) => setTmpNpc({ ...tmpNpc, npcDuelLevelDiffMax: Number(e.target.value) })} className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={applyNpcSettings} className="px-3 py-2 bg-white text-indigo-700 border border-indigo-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">Aplicar ajustes</button>
          <button onClick={() => seedRandomHatred(4)} className="px-3 py-2 bg-white text-red-700 border border-red-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500">Semear ódio aleatório</button>
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
