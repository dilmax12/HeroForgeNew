import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { listMessages, sendMessage, sendMessageForApproval, moderateMessage, TavernMessage, TavernScope, reportMessage, adminListPendingMessages, adminSetMessageApproval, generateRumorsAI } from '../services/tavernService';
import { getWeeklyDungeonHighlights } from '../services/dungeonService';
import { activityManager, logActivity } from '../utils/activitySystem';
import { recordDiceEvent, getWeeklyDiceLeadersServer, getWeeklyChampions, getTavernSettings, incrementRerollUsage, getRerollUsage } from '../services/tavernService';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';
import { notificationBus } from './NotificationSystem';

type Tab = 'chat' | 'mural' | 'eventos' | 'moderacao';

const sampleRumors = (heroName?: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `Ouvi dizer que um dragão despertou nas minas do 12º andar… (${today})`,
    `Alguém viu o novo aventureiro ${heroName || 'um herói misterioso'}? Derrotou um troll sozinho!`,
    'Dizem que o Festival de Lorien começa amanhã — tragam suas moedas raras!',
    'O mago da Torre de Cristal anda nervoso… algo sobre um artefato perdido.',
  ];
};

const dailyEvents = [
  '🍻 Promoção: hidromel por metade do preço até o pôr do sol!',
  '🎭 Concurso de histórias: melhor conto ganha um título temporário.',
  '🎲 Noite de dados: quem tirar 20 ganha medalha no perfil!',
  '🎶 Bardo itinerante: canções épicas após o cair da noite.',
  '🕯️ Velas da sorte: acenda uma e receba um pequeno bônus de XP.',
];

function pickDailyEvent() {
  const dayIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % dailyEvents.length;
  return dailyEvents[dayIdx];
}

const Tavern: React.FC = () => {
  const { getSelectedHero, restAtTavern } = useHeroStore();
  const selectedHero = getSelectedHero();
  const { activeSeasonalTheme } = useMonetizationStore();

  const [tab, setTab] = useState<Tab>('chat');
  const [scope, setScope] = useState<TavernScope>('global');
  const [messages, setMessages] = useState<TavernMessage[]>([]);
  const [mural, setMural] = useState<string[]>([]);
  const [generatedRumors, setGeneratedRumors] = useState<string[]>([]);
  const [rumorsLoading, setRumorsLoading] = useState<boolean>(false);
  const [rumorsError, setRumorsError] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportSending, setReportSending] = useState<boolean>(false);
  // Descanso
  const [restMessage, setRestMessage] = useState<string | null>(null);
  // Dados: Noite de Dados Especial
  const [diceRolling, setDiceRolling] = useState<boolean>(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [criticalGlow, setCriticalGlow] = useState<boolean>(false);
  const [diceMessage, setDiceMessage] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(0);
  const [critOnly, setCritOnly] = useState<boolean>(false);
  const [betsOnly, setBetsOnly] = useState<boolean>(false);
  const [serverDiceEntries, setServerDiceEntries] = useState<any[] | null>(null);
  const [weeklyChampions, setWeeklyChampions] = useState<any[] | null>(null);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rerollCap, setRerollCap] = useState<number>(5);
  const getRerollTokens = () => {
    const hero = useHeroStore.getState().getSelectedHero();
    return hero ? Number(((hero.stats as any)?.tavernRerollTokens) || 0) : 0;
  };
  const getRerollDaily = () => {
    const hero = useHeroStore.getState().getSelectedHero();
    if (!hero) return { count: 0, cap: rerollCap };
    const s: any = hero.stats || {};
    const d = s.tavernRerollDate ? new Date(s.tavernRerollDate) : null;
    const today = new Date();
    const sameDay = d && d.toDateString() === today.toDateString();
    const count = sameDay ? Number(s.tavernRerollCount || 0) : 0;
    return { count, cap: rerollCap };
  };
  // Estados de moderação
  const [adminToken, setAdminToken] = useState<string>('');
  const [pending, setPending] = useState<TavernMessage[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const offlineRumors = useMemo(() => sampleRumors(selectedHero?.name), [selectedHero?.name]);
  const todayEvent = useMemo(() => pickDailyEvent(), []);

  useEffect(() => {
    // Inicializa rumores gerados com o fallback offline
    if (!generatedRumors.length) {
      setGeneratedRumors(offlineRumors);
    }
  }, [offlineRumors]);

  const refreshServerData = async () => {
    setServerLoading(true);
    setServerError(null);
    try {
      const res = await getWeeklyDiceLeadersServer();
      if (res.entries && res.entries.length) setServerDiceEntries(res.entries as any[]);
      if (res.error) setServerError(res.error);
    } catch (e: any) { setServerError(e?.message || 'Erro ao obter ranking'); }
    try {
      const res2 = await getWeeklyChampions();
      if (res2.champions) setWeeklyChampions(res2.champions as any[]);
      if (res2.error) setServerError(res2.error);
    } catch (e: any) { setServerError(e?.message || 'Erro ao obter campeões'); }
    setServerLoading(false);
  };
  useEffect(() => { refreshServerData(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const sres = await getTavernSettings();
        const capStr = sres.settings?.['reroll_daily_cap'];
        const v = Number(capStr);
        if (!isNaN(v) && v > 0) setRerollCap(v);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const res = await listMessages(scope, 50);
      if (cancelled) return;
      setLoading(false);
      setError(res.error);
      setMessages(res.data);
    };
    load();
    return () => { cancelled = true; };
  }, [scope]);

  const handleSend = async () => {
    if (!selectedHero) {
      setError('Selecione um herói para participar do chat.');
      return;
    }
    const mod = moderateMessage(input);
    if (!mod.ok) {
      setError(mod.reason || 'Mensagem não permitida.');
      setInput(mod.sanitized);
      return;
    }
    setError(undefined);
    const res = supabaseConfigured
      ? await sendMessageForApproval(selectedHero.name, mod.sanitized, scope)
      : await sendMessage(selectedHero.name, mod.sanitized, scope);
    if (!res.ok || !res.message) {
      setError(res.error || 'Falha ao enviar.');
      return;
    }
    setInput('');
    // Se for offline, apenas adiciona localmente
    setMessages(prev => [res.message!, ...prev]);
  };

  const promoteToMural = (content: string) => {
    setMural(prev => [content, ...prev]);
  };

  const handleGenerateRumors = async () => {
    setRumorsError(undefined);
    setRumorsLoading(true);
    // Contexto adicional: destaques semanais da dungeon e atividades recentes
    let extraContext = selectedHero ? `Herói em destaque: ${selectedHero.name}\n` : '';
    try {
      const { data, offline } = await getWeeklyDungeonHighlights();
      if (data?.bestRun) {
        extraContext += `Melhor run da semana: ${data.bestRun.hero_name} chegou ao ${data.bestRun.max_floor_reached}º andar.\n`;
      }
      if (data?.biggestLoot) {
        extraContext += `Maior saque: ${data.biggestLoot.hero_name} acumulou ${data.biggestLoot.total_gold} ouro em uma run.\n`;
      }
      if (offline) {
        // Em modo offline, usar atividades locais como contexto
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const feed = activityManager.getActivityFeed({
          dateRange: { start: weekAgo, end: now },
          showOnlyPublic: true
        });
        const epic = feed.activities.find((a: any) => a.type === 'epic-quest-completed');
        if (epic?.data?.questName) {
          extraContext += `Missão épica concluída: ${epic.data.heroName} venceu “${epic.data.questName}”.\n`;
        }
      }
    } catch {}
    const { rumors, error } = await generateRumorsAI(scope, extraContext.trim());
    setRumorsLoading(false);
    if (error) {
      setRumorsError(error);
      return;
    }
    setGeneratedRumors(rumors.length ? rumors : offlineRumors);
  };

  const startReport = (id: string) => {
    setReportingId(id);
    setReportReason('');
  };

  const cancelReport = () => {
    setReportingId(null);
    setReportReason('');
  };

  const submitReport = async () => {
    if (!reportingId || !reportReason.trim()) return;
    setReportSending(true);
    try {
      let userId: string | undefined = undefined;
      if (supabaseConfigured) {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id;
      }
      const res = await reportMessage(reportingId, reportReason.trim(), false /* autoHide */, userId);
      if (!res.ok) {
        setError(res.error || 'Falha ao denunciar mensagem.');
      } else {
        setError(undefined);
        cancelReport();
      }
    } finally {
      setReportSending(false);
    }
  };

  const loadPending = async () => {
    if (!adminToken.trim()) {
      setError('Forneça um token admin para moderar.');
      return;
    }
    setLoadingPending(true);
    const res = await adminListPendingMessages(adminToken.trim());
    setLoadingPending(false);
    if (res.error) {
      setError(res.error);
      setPending([]);
    } else {
      setError(undefined);
      setPending(res.pending || []);
    }
  };

  const setApproval = async (id: string, approved: boolean) => {
    if (!adminToken.trim()) {
      setError('Token admin ausente.');
      return;
    }
    setUpdatingId(id);
    try {
      const res = await adminSetMessageApproval(id, approved, adminToken.trim());
      if (res.ok) {
        setPending(prev => prev.filter(m => m.id !== id));
      } else {
        setError(res.error || 'Falha ao atualizar aprovação.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-white/20' : 'border-white/20';
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className={`bg-white/10 border ${seasonalBorder} rounded-lg p-6`}>
        <div className="flex items-center justify-between bg-gradient-to-r from-royal-900/20 via-amber-800/10 to-transparent px-3 py-2 rounded">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-300">🍺 Taverna "Pônei Saltitante"</h1>
            <p className="text-sm text-gray-300">Rumores, comunidade e roleplay assíncrono.</p>
            {selectedHero && (() => {
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const feed = activityManager.getActivityFeed({ dateRange: { start: weekAgo, end: now }, showOnlyPublic: true });
              const acts = feed.activities.filter(a => a.type === 'tavern-dice' || a.type === 'tavern-rest');
              const score: Record<string, number> = {};
              acts.forEach(a => {
                const name = a.data.heroName;
                if (!name) return;
                const isDice = a.type === 'tavern-dice';
                const isRest = a.type === 'tavern-rest';
                const crit = isDice ? Number(!!(a.data as any).critical) : 0;
                score[name] = (score[name] || 0) + (isDice ? (crit * 10 + 2) : (isRest ? 1 : 0));
              });
              const entries = Object.entries(score).sort((a,b) => b[1] - a[1]);
              const topName = entries[0]?.[0];
              if (topName && topName === selectedHero.name) {
                return <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300">👑 Campeão da Semana</span>;
              }
              return null;
            })()}
          </div>
          <div className="text-3xl">🧙‍♂️</div>
        </div>

        {!supabaseConfigured && (
          <div className="mt-3 bg-amber-900/30 border border-amber-500/40 text-amber-200 text-xs md:text-sm px-3 py-2 rounded">
            Modo offline: chat funciona localmente e o mural exibe rumores simulados.
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTab('chat')}
            className={`px-3 py-2 rounded ${tab === 'chat' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setTab('mural')}
            className={`px-3 py-2 rounded ${tab === 'mural' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            📜 Mural de Rumores
          </button>
          <button
            onClick={() => setTab('eventos')}
            className={`px-3 py-2 rounded ${tab === 'eventos' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            🎉 Eventos da Taverna
          </button>
          {supabaseConfigured && (
            <button
              onClick={() => setTab('moderacao')}
              className={`px-3 py-2 rounded ${tab === 'moderacao' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
            >
              🛡️ Moderação
            </button>
          )}
        </div>

        {tab === 'chat' && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">Escopo:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setScope('global')}
                  className={`px-3 py-1 rounded text-sm ${scope === 'global' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                >
                  Global
                </button>
                <button
                  onClick={() => setScope('local')}
                  className={`px-3 py-1 rounded text-sm ${scope === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
                >
                  Local (simulado)
                </button>
              </div>
            </div>

            <div className="mt-4 bg-gray-900/40 border border-white/10 rounded p-4 max-h-[380px] overflow-y-auto">
              {loading && <div className="text-gray-400 text-sm">Carregando mensagens…</div>}
              {!loading && messages.length === 0 && (
                <div className="text-gray-400 text-sm">Nenhuma mensagem ainda. Diga algo para começar!</div>
              )}
              <ul className="space-y-3">
                {messages.map(msg => (
                  <li key={msg.id} className="bg-gray-800/60 border border-white/10 rounded p-3">
                    <div className="text-xs text-gray-400">
                      <span className="font-semibold text-amber-300">{msg.author}</span> • {new Date(msg.created_at).toLocaleString()} • {msg.scope}
                    </div>
                    <div className="text-gray-200 mt-1">{msg.content}</div>
                    <div className="mt-2">
                      <button
                        onClick={() => promoteToMural(msg.content)}
                        className="text-xs px-2 py-1 rounded bg-amber-700 text-black hover:bg-amber-600"
                      >
                        Fixar no mural
                      </button>
                      <button
                        onClick={() => startReport(msg.id)}
                        className="ml-2 text-xs px-2 py-1 rounded bg-red-700 text-white hover:bg-red-600"
                      >
                        Denunciar
                      </button>
                    </div>
                    {reportingId === msg.id && (
                      <div className="mt-3 bg-gray-900/50 border border-red-600/40 rounded p-2">
                        <div className="text-xs text-gray-300 mb-1">Descreva o motivo da denúncia:</div>
                        <textarea
                          value={reportReason}
                          onChange={e => setReportReason(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 rounded bg-gray-800 text-gray-200 border border-white/10 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={submitReport}
                            disabled={reportSending || !reportReason.trim()}
                            className={`text-xs px-3 py-1 rounded ${reportSending ? 'bg-gray-600' : 'bg-red-600 hover:bg-red-500'} text-white`}
                          >
                            {reportSending ? 'Enviando…' : 'Enviar denúncia'}
                          </button>
                          <button
                            onClick={cancelReport}
                            className="text-xs px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="mt-3 text-xs text-red-300">{error}</div>
            )}

            {/* Log de Eventos Recentes da Taverna */}
            {(() => {
              const recent = activityManager.getRecentActivities(15).filter(a => a.type === 'tavern-rest' || a.type === 'tavern-dice');
              return (
                <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
                  <h3 className="text-lg font-semibold text-amber-300">📜 Eventos Recentes da Taverna</h3>
                  {recent.length === 0 ? (
                    <div className="text-xs text-gray-400 mt-2">Nenhum evento recente registrado.</div>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {recent.map(ev => (
                        <li key={ev.id} className="bg-gray-800/60 border border-white/10 rounded p-3 text-gray-200 flex items-center justify-between">
                          <span className="text-sm">
                            <span className="mr-2">{ev.icon}</span>
                            {ev.message}
                          </span>
                          <span className="text-xs text-gray-400">{ev.timestamp.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

            <div className="mt-4 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Diga algo para a taverna…"
                className="flex-1 px-3 py-2 rounded bg-gray-800 text-gray-200 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-700"
              >
                Enviar
              </button>
            </div>
          </div>
        )}

        {tab === 'mural' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">Rumores da Taverna</h2>
            <div className="mb-3 flex gap-2 items-center">
              <button
                onClick={handleGenerateRumors}
                disabled={rumorsLoading}
                className={`px-3 py-2 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}
              >
                {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
                <span>{rumorsLoading ? 'Gerando…' : 'Gerar Rumores IA'}</span>
              </button>
              {rumorsError && <span className="text-xs text-red-300">{rumorsError}</span>}
            </div>
            <ul className="space-y-2">
              {(mural.length > 0 ? mural : (generatedRumors.length > 0 ? generatedRumors : offlineRumors)).map((r, idx) => (
                <li key={idx} className="bg-gray-800/60 border border-white/10 rounded p-3 text-gray-200">
                  {r}
                </li>
              ))}
            </ul>
            {mural.length === 0 && (
              <div className="text-xs text-gray-400 mt-2">Use a IA para sugerir rumores, ou adicione mensagens do chat ao mural para construir a história viva da taverna.</div>
            )}
          </div>
        )}

        {tab === 'eventos' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">Eventos de Hoje</h2>
            <div className="bg-gray-800/60 border border-white/10 rounded p-3 text-gray-200">
              {todayEvent}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Uma fofoca diferente surge a cada dia. Participe para ganhar prestígio!
            </div>

            {/* Noite de Dados Especial */}
            <div className="mt-6 bg-gradient-to-br from-royal-900/30 via-amber-800/10 to-transparent border border-amber-500/30 rounded p-4">
              <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">🎲 Noite de Dados Especial</h3>
              <p className="text-sm text-gray-300 mt-1">Role um d20. Se tirar 20 (crítico): medalha por 7 dias, título "Mestre dos Dados" e +100 XP.</p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    if (diceRolling) return;
                    setDiceRolling(true);
                    setCriticalGlow(false);
                    setDiceMessage(null);
                    await new Promise(r => setTimeout(r, 600));
                    const roll = Math.floor(Math.random() * 20) + 1;
                    setLastRoll(roll);
                    const isCrit = roll === 20;
                    if (selectedHero) {
                      try {
                        logActivity.tavernDice({
                          heroId: selectedHero.id,
                          heroName: selectedHero.name,
                          heroClass: selectedHero.class,
                          heroLevel: selectedHero.progression.level,
                          roll,
                          critical: isCrit,
                          betAmount: betAmount > 0 ? betAmount : undefined
                        } as any);
                      } catch {}
                      try { await recordDiceEvent({ heroId: selectedHero.id, heroName: selectedHero.name, roll, critical: isCrit, betAmount: betAmount > 0 ? betAmount : undefined }); } catch {}
                      try {
                        const heroNow = useHeroStore.getState().getSelectedHero();
                        if (heroNow) {
                          const s = { ...(heroNow.stats || {}) } as any;
                          s.tavernDiceRolls = (s.tavernDiceRolls || 0) + 1;
                          s.tavernCrits = (s.tavernCrits || 0) + (isCrit ? 1 : 0);
                          s.tavernBestRoll = Math.max(roll, s.tavernBestRoll || 0);
                          useHeroStore.getState().updateHero(heroNow.id, { stats: s });
                        }
                      } catch {}
                    }
                    if (isCrit && selectedHero) {
                      setCriticalGlow(true);
                      setDiceMessage('CRÍTICO! Você ganhou medalha, título e +100 XP');
                      try { notificationBus.emit({ type: 'achievement', title: 'Crítico na Taverna!', message: '+100 XP • Mestre dos Dados', icon: '🎲', duration: 3500 }); } catch {}
                      try { useHeroStore.getState().gainXP(selectedHero.id, 100); } catch {}
                      try {
                        const title = { id: 'mestre-dos-dados', name: 'Mestre dos Dados', description: 'Obteve um crítico (20) na Noite de Dados', rarity: 'especial', category: 'special', badge: '🎲', unlockedAt: new Date() } as any;
                        useHeroStore.getState().addTitleToSelectedHero(title, false);
                      } catch {}
                      try {
                        const hero = useHeroStore.getState().getSelectedHero();
                        if (hero) {
                          const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                          const stats = { ...(hero.stats || {}) } as any;
                          stats.profileMedal = { icon: '🏅', name: 'Mestre dos Dados', expiresAt: expires };
                          useHeroStore.getState().updateHero(hero.id, { stats });
                        }
                      } catch {}
                    } else {
                      setDiceMessage('Nada mal — continue tentando pelo crítico!');
                    }
                    setDiceRolling(false);
                  }}
                  className={`px-4 py-2 rounded ${diceRolling ? 'bg-gray-700 text-gray-300' : `bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white`}`}
                >
                  {diceRolling ? 'Rolando…' : 'Rolar d20'}
                </button>
                <div className="relative min-w-[100px] h-[36px] flex items-center justify-center">
                  {criticalGlow && <div className="dice-crit-ring" />}
                  {criticalGlow && <div className="dice-crit-sparkle" />}
                  <div className={`text-center text-2xl font-bold ${criticalGlow ? 'text-amber-300 dice-crit-number' : 'text-gray-200'}`}>
                    {lastRoll !== null ? lastRoll : '—'}
                  </div>
                </div>
                {diceMessage && <span className="text-xs text-amber-300">{diceMessage}</span>}
                <div className="ml-auto text-xs text-gray-300 flex items-center gap-2">
                  <span>Fichas: <span className="text-amber-300 font-semibold">{getRerollTokens()}</span></span>
                  {(() => { const hero = useHeroStore.getState().getSelectedHero(); const s = hero ? (getRerollDaily()) : { count: 0, cap: rerollCap }; return <span>Hoje: <span className="text-amber-300 font-semibold">{s.count}/{s.cap}</span></span>; })()}
                  <button
                    onClick={async () => {
                      const hero = useHeroStore.getState().getSelectedHero();
                      if (!hero || lastRoll === null) return;
                      const tokens = getRerollTokens();
                      if (tokens <= 0 || diceRolling) return;
                      try {
                        const inc = await incrementRerollUsage(hero.id);
                        if (!inc.ok && inc.reason === 'cap') { setDiceMessage('Limite diário de rerrolagens atingido'); return; }
                        if (inc.cap && inc.count !== undefined) setRerollCap(Number(inc.cap));
                      } catch {}
                      setDiceRolling(true);
                      setCriticalGlow(false);
                      await new Promise(r => setTimeout(r, 400));
                      const roll = Math.floor(Math.random() * 20) + 1;
                      setLastRoll(roll);
                      const isCrit = roll === 20;
                      try {
                        const s = { ...(hero.stats || {}) } as any;
                        s.tavernRerollTokens = Math.max(0, (s.tavernRerollTokens || 0) - 1);
                        s.tavernRerollDate = new Date().toISOString();
                        s.tavernRerollCount = (s.tavernRerollCount || 0) + 1;
                        s.tavernDiceRolls = (s.tavernDiceRolls || 0) + 1;
                        s.tavernCrits = (s.tavernCrits || 0) + (isCrit ? 1 : 0);
                        s.tavernBestRoll = Math.max(roll, s.tavernBestRoll || 0);
                        useHeroStore.getState().updateHero(hero.id, { stats: s });
                      } catch {}
                      try { logActivity.tavernDice({ heroId: hero.id, heroName: hero.name, heroClass: hero.class, heroLevel: hero.progression.level, roll, critical: isCrit } as any); } catch {}
                      try { await recordDiceEvent({ heroId: hero.id, heroName: hero.name, roll, critical: isCrit }); } catch {}
                      if (isCrit) {
                        try { notificationBus.emit({ type: 'achievement', title: 'Crítico (rerrolado)!', message: '+100 XP • Mestre dos Dados', icon: '🎲', duration: 3500 }); } catch {}
                        try { useHeroStore.getState().gainXP(hero.id, 100); } catch {}
                      }
                      setDiceRolling(false);
                    }}
                    className={`px-3 py-1 rounded ${getRerollTokens() > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 text-gray-400'}`}
                    disabled={getRerollTokens() <= 0 || diceRolling || lastRoll === null}
                  >Rerrolar</button>
                </div>
              </div>
            </div>

            {/* Leaderboard Semanal de Rolagens */}
            {(() => {
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const feed = activityManager.getActivityFeed({ dateRange: { start: weekAgo, end: now }, showOnlyPublic: true });
              const entries = (() => {
                if (serverDiceEntries && serverDiceEntries.length) {
                  let list = serverDiceEntries.map((e: any) => ({ name: e.heroName, best: e.best, crits: e.crits, count: e.count }));
                  if (critOnly) list = list.map(e => e).filter(e => e.crits > 0);
                  if (betsOnly) list = list; // servidor não retorna bets; filtro local não aplicável
                  return list.slice(0, 10);
                }
                const diceActivitiesRaw = feed.activities.filter(a => a.type === 'tavern-dice');
                let diceActivities = critOnly ? diceActivitiesRaw.filter(a => !!(a.data as any).critical) : diceActivitiesRaw;
                if (betsOnly) diceActivities = diceActivities.filter(a => typeof (a.data as any).betAmount === 'number' && (a.data as any).betAmount > 0);
                const map: Record<string, { name: string; best: number; crits: number; count: number }> = {};
                diceActivities.forEach(a => {
                  const name = a.data.heroName;
                  const r = (a.data as any).roll ?? 0;
                  const crit = !!(a.data as any).critical;
                  const cur = map[name] || { name, best: 0, crits: 0, count: 0 };
                  cur.best = Math.max(cur.best, r);
                  cur.crits += crit ? 1 : 0;
                  cur.count += 1;
                  map[name] = cur;
                });
                return Object.values(map).sort((a,b) => {
                  if (b.best !== a.best) return b.best - a.best;
                  if (b.crits !== a.crits) return b.crits - a.crits;
                  return b.count - a.count;
                }).slice(0,10);
              })();
              return (
                <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
                  <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">🏆 Painel de Líderes — Melhores Rolagens (7 dias)</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={refreshServerData} className="px-2 py-1 rounded bg-amber-600 text-black hover:bg-amber-700 text-xs">Atualizar</button>
                  </div>
                  {serverLoading && (<div className="mt-2 text-xs text-gray-300">Carregando…</div>)}
                  {serverError && (<div className="mt-2 text-xs text-red-300">{serverError}</div>)}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-300">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={critOnly} onChange={e => setCritOnly(e.target.checked)} />
                      Mostrar apenas críticos
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={betsOnly} onChange={e => setBetsOnly(e.target.checked)} />
                      Mostrar somente apostas
                    </label>
                  </div>
                  {entries.length === 0 ? (
                    <div className="text-xs text-gray-400 mt-2">Nenhum dado registrado na última semana.</div>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {entries.map((e, idx) => (
                        <li key={e.name} className="flex items-center justify-between bg-gray-800/60 border border-white/10 rounded px-3 py-2">
                          <span className="text-gray-200 text-sm">
                            <span className="mr-2 text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}</span>
                            {e.name}
                          </span>
                          <span className="text-amber-300 text-sm">Melhor: {e.best} • Críticos: {e.crits} • Rolagens: {e.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

            {(() => {
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const feed = activityManager.getActivityFeed({ dateRange: { start: weekAgo, end: now }, showOnlyPublic: true });
              const tavernActs = feed.activities.filter(a => a.type === 'tavern-dice' || a.type === 'tavern-rest');
              const scoreMap: Record<string, { name: string; score: number; rolls: number; crits: number; rests: number }> = {};
              tavernActs.forEach(a => {
                const name = a.data.heroName;
                const isDice = a.type === 'tavern-dice';
                const isRest = a.type === 'tavern-rest';
                const crit = isDice ? (Number(!!(a.data as any).critical)) : 0;
                const cur = scoreMap[name] || { name, score: 0, rolls: 0, crits: 0, rests: 0 };
                if (isDice) {
                  cur.rolls += 1;
                  cur.crits += crit;
                  cur.score += crit * 10 + 2;
                }
                if (isRest) {
                  cur.rests += 1;
                  cur.score += 1;
                }
                scoreMap[name] = cur;
              });
              const entries = Object.values(scoreMap).sort((a,b) => b.score - a.score).slice(0,10);
              return (
                <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
                  <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">🏅 Ranking Semanal da Taverna</h3>
                  {entries.length === 0 ? (
                    <div className="text-xs text-gray-400 mt-2">Nenhuma atividade registrada na última semana.</div>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {entries.map((e, idx) => (
                        <li key={e.name} className="flex items-center justify-between bg-gray-800/60 border border-white/10 rounded px-3 py-2">
                          <span className="text-gray-200 text-sm">
                            <span className="mr-2 text-xl">{idx === 0 ? '👑' : idx < 3 ? '🥇' : '⭐'}</span>
                            {e.name}
                          </span>
                          <span className="text-amber-300 text-sm">Score: {e.score} • Rolagens: {e.rolls} • Críticos: {e.crits} • Descansos: {e.rests}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

            {weeklyChampions && weeklyChampions.length > 0 && (
              <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
                <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">🏛️ Hall da Taverna — Campeões Semanais</h3>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={refreshServerData} className="px-2 py-1 rounded bg-amber-600 text-black hover:bg-amber-700 text-xs">Atualizar</button>
                </div>
                {serverLoading && (<div className="mt-2 text-xs text-gray-300">Carregando…</div>)}
                {serverError && (<div className="mt-2 text-xs text-red-300">{serverError}</div>)}
                <ul className="mt-3 space-y-2">
                  {weeklyChampions.slice(0, 6).map((c: any) => (
                    <li key={`${c.week_start}-${c.hero_name}`} className="flex items-center justify-between bg-gray-800/60 border border-white/10 rounded px-3 py-2">
                      <span className="text-gray-200 text-sm">{new Date(c.week_start).toLocaleDateString()} • {c.hero_name}</span>
                      <span className="text-amber-300 text-sm">Score: {c.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Apostas Amigáveis */}
                {selectedHero && (
                  <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
                    <h3 className="text-lg font-semibold text-amber-300">🤝 Apostas Amigáveis</h3>
                    <p className="text-sm text-gray-300 mt-1">Desafie outro herói para um duelo de dados (d20). Apenas diversão, sem transferência de ouro.</p>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {(() => {
                        const heroes = useHeroStore.getState().heroes.filter(h => h.id !== selectedHero!.id);
                        return (
                          <>
                            <label className="text-sm text-gray-200">Oponente:</label>
                            <select value={opponentId} onChange={e => setOpponentId(e.target.value)} className="px-3 py-2 rounded bg-gray-800 text-gray-200 border border-white/10">
                              <option value="">Selecione…</option>
                              {heroes.map(h => (
                                <option key={h.id} value={h.id}>{h.name} • Nível {h.progression.level}</option>
                              ))}
                            </select>
                            <label className="text-sm text-gray-200">Aposta:</label>
                            <input type="number" min={0} value={betAmount} onChange={e => setBetAmount(Math.max(0, parseInt(e.target.value || '0', 10)))} className="w-24 px-3 py-2 rounded bg-gray-800 text-gray-200 border border-white/10" />
                            <button
                              onClick={async () => {
                                const opp = (useHeroStore.getState().heroes || []).find(h => h.id === opponentId);
                                if (!opp) return;
                                const rollA = Math.floor(Math.random() * 20) + 1;
                                const rollB = Math.floor(Math.random() * 20) + 1;
                                const winner = rollA === rollB ? null : (rollA > rollB ? selectedHero : opp);
                                try {
                                  logActivity.tavernDice({ heroId: selectedHero.id, heroName: selectedHero.name, heroClass: selectedHero.class, heroLevel: selectedHero.progression.level, roll: rollA, opponentName: opp.name, betAmount: betAmount > 0 ? betAmount : undefined } as any);
                                  logActivity.tavernDice({ heroId: opp.id, heroName: opp.name, heroClass: opp.class, heroLevel: opp.progression.level, roll: rollB, opponentName: selectedHero.name, betAmount: betAmount > 0 ? betAmount : undefined } as any);
                                } catch {}
                                try {
                                  await recordDiceEvent({ heroId: selectedHero.id, heroName: selectedHero.name, roll: rollA, betAmount: betAmount > 0 ? betAmount : undefined, opponentName: opp.name });
                                  await recordDiceEvent({ heroId: opp.id, heroName: opp.name, roll: rollB, betAmount: betAmount > 0 ? betAmount : undefined, opponentName: selectedHero.name });
                                } catch {}
                                try {
                                  const heroA = useHeroStore.getState().getSelectedHero();
                                  if (heroA) {
                                    const sa = { ...(heroA.stats || {}) } as any;
                                    sa.tavernDiceRolls = (sa.tavernDiceRolls || 0) + 1;
                                    sa.tavernBestRoll = Math.max(rollA, sa.tavernBestRoll || 0);
                                    useHeroStore.getState().updateHero(heroA.id, { stats: sa });
                                  }
                                  const heroB = (useHeroStore.getState().heroes || []).find(h => h.id === opp.id);
                                  if (heroB) {
                                    const sb = { ...(heroB.stats || {}) } as any;
                                    sb.tavernDiceRolls = (sb.tavernDiceRolls || 0) + 1;
                                    sb.tavernBestRoll = Math.max(rollB, sb.tavernBestRoll || 0);
                                    useHeroStore.getState().updateHero(heroB.id, { stats: sb });
                                  }
                                } catch {}
                                const stake = betAmount > 0 ? ` • aposta: ${betAmount} 🪙` : '';
                                const msg = winner
                                  ? `${winner.name} venceu (${winner.id === selectedHero.id ? rollA : rollB} vs ${winner.id === selectedHero.id ? rollB : rollA})${stake}`
                                  : `Empate (${rollA} vs ${rollB})${stake}`;
                                setDiceMessage(msg);
                                try {
                                  notificationBus.emit({ type: 'achievement', title: 'Duelo de Dados', message: msg, icon: '🎲', duration: 3000 });
                                } catch {}
                              }}
                              className={`px-3 py-2 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white`}
                            >
                              Duelo de Dados
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

          {/* Descanso pago na Taverna */}
            <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
              <h3 className="text-lg font-semibold text-amber-300">🛏️ Descanso na Taverna</h3>
              <p className="text-sm text-gray-300 mt-1">Recupere sua Fadiga com uma boa noite de sono.</p>
              <div className="mt-3 text-sm text-gray-200">
                {selectedHero ? (
                  <span>
                    Saldo: Ouro {selectedHero.progression.gold} • Fadiga {selectedHero.progression.fatigue}
                  </span>
                ) : (
                  <span>Selecione um herói para descansar.</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {(() => {
                  const options = [
                    { label: 'Soneca', type: 'soneca', cost: 15, recovery: 15 },
                    { label: 'Noite padrão', type: 'noite', cost: 30, recovery: 30 },
                    { label: 'Suíte de luxo', type: 'luxo', cost: 60, recovery: 60 }
                  ];
                  const fatigue = selectedHero?.progression.fatigue ?? 0;
                  const gold = selectedHero?.progression.gold ?? 0;
                  const baseHelper = !selectedHero
                    ? 'Selecione um herói'
                    : fatigue <= 0
                      ? 'Fadiga já está em 0'
                      : undefined;
                  return (
                    <>
                      {options.map(opt => {
                        const canRest = !!selectedHero && gold >= opt.cost && fatigue > 0;
                        return (
                          <button
                            key={opt.type}
                            onClick={() => {
                              if (!selectedHero) return;
                              const ok = restAtTavern(selectedHero.id, opt.cost, opt.recovery, opt.type);
                              setRestMessage(
                                ok
                                  ? `Você descansou (${opt.label}) e recuperou até ${opt.recovery} de Fadiga.`
                                  : 'Não foi possível descansar (verifique ouro e fadiga).'
                              );
                            }}
                            disabled={!canRest}
                            className={`px-3 py-2 rounded text-sm ${canRest ? 'bg-amber-600 hover:bg-amber-700 text-black' : 'bg-gray-700 text-gray-300'}`}
                            title={`Recupera ${opt.recovery} Fadiga por ${opt.cost} ouro`}
                          >
                            {opt.label} ({opt.cost} ouro)
                          </button>
                        );
                      })}
                      <span className="text-xs text-gray-300 min-w-[180px]">
                        {baseHelper ?? (gold < options[1].cost ? 'Ouro insuficiente' : 'Escolha o conforto do descanso')}
                      </span>
                    </>
                  );
                })()}
              </div>
              {restMessage && (
                <div className="mt-3 text-xs text-green-300">{restMessage}</div>
              )}
            </div>
          </div>
        )}

        {tab === 'moderacao' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">Painel de Moderação</h2>
            {!supabaseConfigured && (
              <div className="mt-3 bg-red-900/30 border border-red-500/40 text-red-200 text-xs md:text-sm px-3 py-2 rounded">
                Supabase desabilitado: a moderação requer banco de dados configurado.
              </div>
            )}
            {supabaseConfigured && (
              <div className="bg-gray-900/40 border border-white/10 rounded p-3">
                <div className="text-sm text-gray-300">Forneça seu token de administração:</div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={adminToken}
                    onChange={e => setAdminToken(e.target.value)}
                    placeholder="ADMIN_API_TOKEN"
                    className="flex-1 px-3 py-2 rounded bg-gray-800 text-gray-200 border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={loadPending}
                    disabled={loadingPending}
                    className="px-4 py-2 rounded bg-amber-600 text-black hover:bg-amber-700"
                  >
                    {loadingPending ? 'Carregando…' : 'Listar pendentes'}
                  </button>
                </div>
                {pending.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {pending.map(msg => (
                      <li key={msg.id} className="bg-gray-800/60 border border-white/10 rounded p-3">
                        <div className="text-xs text-gray-400">
                          <span className="font-semibold text-amber-300">{msg.author}</span> • {new Date(msg.created_at).toLocaleString()} • {msg.scope}
                        </div>
                        <div className="text-gray-200 mt-1">{msg.content}</div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setApproval(msg.id, true)}
                            disabled={!!updatingId}
                            className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500"
                          >
                            {updatingId === msg.id ? 'Atualizando…' : 'Aprovar'}
                          </button>
                          <button
                            onClick={() => setApproval(msg.id, false)}
                            disabled={!!updatingId}
                            className="text-xs px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                          >
                            {updatingId === msg.id ? 'Atualizando…' : 'Ocultar'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 text-xs text-gray-400">{loadingPending ? 'Buscando…' : 'Nenhuma mensagem pendente encontrada.'}</div>
                )}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-2">
              Dica: o token admin deve corresponder ao esperado pelo endpoint `/api/tavern-approve`.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tavern;
