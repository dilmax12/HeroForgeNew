import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { listMessages, sendMessage, sendMessageForApproval, moderateMessage, TavernMessage, TavernScope, reportMessage, adminListPendingMessages, adminSetMessageApproval, generateRumorsAI } from '../services/tavernService';
import { getWeeklyDungeonHighlights } from '../services/dungeonService';
import { activityManager } from '../utils/activitySystem';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-300">🍺 Taverna "Pônei Saltitante"</h1>
            <p className="text-sm text-gray-300">Rumores, comunidade e roleplay assíncrono.</p>
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
            className={`px-3 py-2 rounded ${tab === 'mural' ? 'bg-amber-600 text_black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
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
