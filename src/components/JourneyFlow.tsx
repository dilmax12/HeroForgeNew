import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { medievalTheme, seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';
import NarrativeChapters from './NarrativeChapters';
import { recommendEvents } from '../services/socialEventsService';
import { getProfile } from '../services/userService';
import { getOrRunDailyResult } from '../services/idleBattleService';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { onboardingManager, ONBOARDING_FLOWS } from '../utils/onboardingSystem';

const StepCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  ctaLabel: string;
  to: string;
  highlight?: boolean;
  examples?: string[];
  stepIndex?: number;
  testId?: string;
}> = ({ title, description, icon, ctaLabel, to, highlight, examples, stepIndex, testId }) => {
  const navigate = useNavigate();
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-white/20' : 'border-white/20';
  return (
    <div
      className={`rounded-xl p-6 border transition-all duration-300 ${
        highlight ? 'border-amber-400 bg-amber-900/10' : `${seasonalBorder} bg-white/10`
      } hover:bg-white/15 hover:border-amber-400`}
    >
      <div className="flex items-start space-x-4">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="text-xl font-bold text-amber-300">{title}</div>
            {typeof stepIndex === 'number' && (
              <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs border border-white/10">Etapa {stepIndex}</span>
            )}
          </div>
          <div className="text-gray-300 text-sm mb-4">{description}</div>
          {Array.isArray(examples) && examples.length > 0 && (
            <ul className="text-xs text-gray-200 mb-4 list-disc ml-4">
              {examples.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {(() => {
            const g = getSeasonalButtonGradient(activeSeasonalTheme as any);
            const accents: string[] = ((seasonalThemes as any)[activeSeasonalTheme || '']?.accents) || [];
            return (
              <button
                onClick={() => navigate(to)}
                className={`px-4 py-2 rounded-lg bg-gradient-to-r ${g} text-white font-semibold transition-all duration-200 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex items-center gap-2`}
                aria-label={ctaLabel}
                data-testid={testId}
              >
                {accents[0] || ''}
                <span>{ctaLabel}</span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ percent: number; label?: string }> = ({ percent, label }) => {
  return (
    <div>
      {label && <div className="text-xs text-gray-400 mb-1">{label}</div>}
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.max(0, Math.min(100, percent))} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-3 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
};

const JourneyFlow: React.FC = () => {
  const { getSelectedHero, heroes } = useHeroStore();
  const hero = getSelectedHero();
  const [daily, setDaily] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [playerProgress, setPlayerProgress] = useState<{ missions_completed: number; achievements_unlocked: number; playtime_minutes: number; last_login?: string | null } | null>(null);
  const [onbPct, setOnbPct] = useState<number>(0);
  const [onbCounts, setOnbCounts] = useState<{completed:number;total:number}>({completed:0,total:0});
  const [onbStep, setOnbStep] = useState<ReturnType<typeof onboardingManager.getCurrentStep>>(null);
  const [prefShowHints, setPrefShowHints] = useState<boolean>(() => { try { return localStorage.getItem('hfn_show_hints') === '1'; } catch { return false; } });
  const [prefSkipTutorials, setPrefSkipTutorials] = useState<boolean>(() => { try { return localStorage.getItem('hfn_skip_tutorials') === '1'; } catch { return false; } });
  const [fbChoice, setFbChoice] = useState<'up'|'down'|null>(null);
  const [fbText, setFbText] = useState('');
  const [recommendedEvents, setRecommendedEvents] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [trackerExpandedFlowId, setTrackerExpandedFlowId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const referralCode = params.get('ref') || undefined;
  const inviterBy = params.get('by') || undefined;
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-white/20' : 'border-white/20';

  // Redirecionar primeira visita para a introdução cinematográfica
  useEffect(() => {
    try {
      const seen = localStorage.getItem('introSeen');
      if (!seen && !prefSkipTutorials) {
        navigate('/intro');
      }
    } catch {}
  }, [prefSkipTutorials]);

  const xpPercent = useMemo(() => {
    if (!hero) return 0;
    const currentXp = hero.progression?.xp ?? 0;
    const level = hero.progression?.level ?? 1;
    const nextLevelXp = level * 100 + (level - 1) * 50;
    const prevLevelXp = (level - 1) * 100 + (level - 2 >= 0 ? (level - 2) * 50 : 0);
    const inLevelXp = Math.max(0, currentXp - prevLevelXp);
    const levelSpan = Math.max(1, nextLevelXp - prevLevelXp);
    return Math.round((inLevelXp / levelSpan) * 100);
  }, [hero]);

  useEffect(() => {
    if (hero) {
      const result = getOrRunDailyResult(hero);
      setDaily(result);
      // Envio automático de resultados para ranking — modo offline: não chama API se não houver base
      (async () => {
        const apiBase = (import.meta as any)?.env?.VITE_API_BASE;
        if (!apiBase) {
          setLeaderboard([]);
          return;
        }
        try {
          setSubmitting(true);
          await fetch(`${apiBase}/daily/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hero })
          });
          const resp = await fetch(`${apiBase}/daily/leaderboard`);
          const data = await resp.json();
          setLeaderboard(Array.isArray(data?.entries) ? data.entries : []);
        } catch (err) {
          // silencioso em dev sem API
        } finally {
          setSubmitting(false);
        }
      })();
    }
  }, [hero]);

  async function submitDaily() {
    if (!hero) return;
    try {
      setSubmitting(true);
      await fetch('/api/daily/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero })
      });
      const resp = await fetch('/api/daily/leaderboard');
      const data = await resp.json();
      setLeaderboard(Array.isArray(data?.entries) ? data.entries : []);
    } catch (err) {
      console.warn('Falha ao enviar resultado diário:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchPlayerProgress() {
    setProgressLoading(true);
    setProgressError(null);
    try {
      if (!supabaseConfigured) {
        setProgressError('Nuvem desativada neste ambiente.');
        setPlayerProgress(null);
        return;
      }
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
      }
    } catch (e: any) {
      setProgressError(e?.message || String(e));
      setPlayerProgress(null);
    } finally {
      setProgressLoading(false);
    }
  }

  useEffect(() => {
    let timer: any = null;
    if (progressLoading) return;
    fetchPlayerProgress();
    timer = setInterval(() => { fetchPlayerProgress(); }, 5 * 60 * 1000);
    const onVis = () => {
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = null; }
      } else {
        if (!timer) timer = setInterval(() => { fetchPlayerProgress(); }, 5 * 60 * 1000);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!hero) { setRecommendedEvents([]); return; }
        setRecLoading(true);
        const p = await getProfile(hero.id);
        const csv = Array.isArray(p?.interests) && p.interests.length ? p.interests.join(',') : undefined;
        const list = await recommendEvents(hero.id, csv);
        setRecommendedEvents(Array.isArray(list) ? list.slice(0, 3) : []);
      } catch { setRecommendedEvents([]); } finally { setRecLoading(false); }
    })();
  }, [hero?.id]);

  useEffect(() => {
    try {
      onboardingManager.loadState();
      const p = onboardingManager.getProgress();
      setOnbPct(p.percentage);
      setOnbCounts({completed:p.completed,total:p.total});
      setOnbStep(onboardingManager.getCurrentStep());
      const onStep = (d: any) => { setOnbStep(d?.step || null); const np = onboardingManager.getProgress(); setOnbPct(np.percentage); setOnbCounts({completed:np.completed,total:np.total}); };
      onboardingManager.on('step-changed', onStep);
      onboardingManager.on('step-completed', onStep);
      onboardingManager.on('flow-completed', () => { const np = onboardingManager.getProgress(); setOnbPct(np.percentage); setOnbCounts({completed:np.completed,total:np.total}); setOnbStep(null); });
      return () => {
        onboardingManager.off('step-changed', onStep);
        onboardingManager.off('step-completed', onStep);
      };
    } catch {}
  }, []);

  function goToCurrentStep() {
    const s = onboardingManager.getCurrentStep();
    if (s?.action?.type === 'navigate' && s.action.target) navigate(s.action.target);
  }
  function startTutorial() {
    onboardingManager.startFlow('first-steps');
    goToCurrentStep();
  }
  function nextTutorialStep() {
    const moved = onboardingManager.nextStep();
    if (!moved) return;
    goToCurrentStep();
  }
  function prevTutorialStep() {
    const moved = onboardingManager.previousStep();
    if (!moved) return;
    goToCurrentStep();
  }
  function skipCurrentStep() {
    const ok = onboardingManager.skipStep();
    if (!ok) return;
    goToCurrentStep();
  }
  function submitFeedback() {
    try {
      const payload = { choice: fbChoice, text: fbText, ts: Date.now() };
      localStorage.setItem('journey-feedback', JSON.stringify(payload));
    } catch {}
  }
  const flowStats = useMemo(() => {
    return ONBOARDING_FLOWS.map(flow => {
      const total = flow.steps.length;
      const completed = flow.steps.filter(s => onboardingManager.isStepCompleted(s.id)).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const completedFlow = onboardingManager.isFlowCompleted(flow.id);
      return { flow, total, completed, percentage, completedFlow };
    });
  }, [onbCounts.completed, onbStep]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-4xl font-bold text-amber-400 font-serif tracking-wide">
            {medievalTheme.icons.ui.guild} Jornada do Herói
          </h1>
          {(() => {
            const cfg = (seasonalThemes as any)[activeSeasonalTheme || ''];
            const accents: string[] = cfg?.accents || [];
            return accents.length ? (
              <div className="text-2xl opacity-80">{accents[0]}{accents[1]}{accents[2]}</div>
            ) : null;
          })()}
        </div>
        <p className="text-gray-300 italic">Comece, personalize e avance com clareza.</p>
      </div>

      <div className={`rounded-xl p-4 mb-8 bg-white/10 border ${seasonalBorder}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-400">Progresso da Jornada</div>
          <div className="text-xs text-gray-300">{onbCounts.completed}/{onbCounts.total}</div>
        </div>
        <ProgressBar percent={onbPct} />
        <div className="mt-3 flex flex-wrap gap-2">
          {onbStep ? (
            <>
              <button onClick={prevTutorialStep} className="px-3 py-1 rounded bg-gray-800 text-white text-xs">Voltar</button>
              <button onClick={goToCurrentStep} className={`px-3 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white text-xs`}>Continuar</button>
              <button onClick={nextTutorialStep} className="px-3 py-1 rounded bg-gray-800 text-white text-xs">Avançar</button>
            </>
          ) : (
            <button onClick={startTutorial} className={`px-3 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white text-xs`}>Iniciar Tutorial</button>
          )}
        </div>
        {onbStep && (
          <div className="mt-4 rounded-lg border border-white/20 bg-white/5 p-3" aria-live="polite">
            <div className="text-white font-semibold text-sm">{onbStep.title}</div>
            <div className="text-[13px] text-gray-300">{onbStep.description}</div>
            {onbStep.content && <div className="mt-2 text-xs text-gray-300">{onbStep.content}</div>}
            <div className="mt-2 flex items-center gap-2">
              {onbStep.action?.type === 'navigate' && onbStep.action.target && (
                <button onClick={goToCurrentStep} className={`px-2 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white text-xs`}>Ir agora</button>
              )}
              {onbStep.skippable && (
                <button onClick={skipCurrentStep} className="px-2 py-1 rounded bg-gray-700 text-white text-xs">Pular</button>
              )}
              <button onClick={nextTutorialStep} className="px-2 py-1 rounded bg-gray-800 text-white text-xs">Concluir e avançar</button>
            </div>
          </div>
        )}
      </div>

      <div className={`rounded-xl p-4 mb-8 bg-white/10 border ${seasonalBorder}`}>
        <div className="text-sm text-gray-400 mb-3">Rastreador de Onboarding</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {flowStats.map(({ flow, total, completed, percentage, completedFlow }) => (
            <div key={flow.id} className="rounded-lg p-3 border border-white/20 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold text-sm">{flow.name}</div>
                <span className={`text-xs ${completedFlow ? 'text-emerald-300' : 'text-gray-300'}`}>{completed}/{total}</span>
              </div>
              <div className="mt-2">
                <ProgressBar percent={percentage} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => { onboardingManager.startFlow(flow.id); goToCurrentStep(); }} className="px-2 py-1 rounded bg-gray-800 text-white text-xs">{completed > 0 ? 'Retomar' : 'Iniciar'}</button>
                <button onClick={() => setTrackerExpandedFlowId(trackerExpandedFlowId === flow.id ? null : flow.id)} className="px-2 py-1 rounded bg-gray-700 text-white text-xs" aria-expanded={trackerExpandedFlowId === flow.id}>Etapas</button>
              </div>
              {trackerExpandedFlowId === flow.id && (
                <div className="mt-2 space-y-1">
                  {flow.steps.map(step => (
                    <div key={step.id} className="flex items-center justify-between text-xs text-gray-200">
                      <span className={`flex items-center gap-2`}>{onboardingManager.isStepCompleted(step.id) ? '✅' : '⬜'} {step.title}</span>
                      {step.action?.type === 'navigate' && step.action.target ? (
                        <button onClick={() => navigate(step.action!.target!)} className="px-2 py-1 rounded bg-gray-700 text-white">Ir</button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`rounded-xl p-4 bg-white/10 border ${seasonalBorder}`}>
          <div className="text-sm text-gray-400">Heróis</div>
          <div className="text-2xl font-bold">{heroes.length}</div>
        </div>
        <div className={`rounded-xl p-4 bg-white/10 border ${seasonalBorder}`}>
          <div className="text-sm text-gray-400">Nível</div>
          <div className="text-2xl font-bold">{hero?.progression?.level ?? 1}</div>
        </div>
        <div className={`rounded-xl p-4 bg-white/10 border ${seasonalBorder}`}>
          <ProgressBar percent={xpPercent} label="Progresso para o próximo nível" />
        </div>
      </div>

      <div className="mb-8">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Criar Herói', to: referralCode ? `/create?ref=${referralCode}${inviterBy?`&by=${inviterBy}`:''}` : '/create' },
            { label: 'Galeria', to: '/gallery' },
            { label: 'Missões IA', to: '/quests' },
            { label: 'Evolução', to: '/evolution' }
          ].map((s, i) => (
            <li key={i}>
              <button onClick={() => navigate(s.to)} className={`w-full px-3 py-2 rounded bg-gray-800 text-white text-xs border border-white/10 hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}>{i+1}. {s.label}</button>
            </li>
          ))}
        </ol>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-8`}>
        <div className={`rounded-xl p-4 bg-white/10 border ${seasonalBorder}`}>
        <div className="flex items-center gap-2 mb-2" aria-live="polite">
          <div className="text-sm text-gray-400">Seu Progresso</div>
          <button onClick={fetchPlayerProgress} disabled={progressLoading} className={`px-2 py-1 rounded text-xs border ${progressLoading ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-300'}`}>{progressLoading ? (<span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span><span>Atualizando</span></span>) : 'Atualizar'}</button>
        </div>
        {progressError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{progressError}</div>}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white/5 border border-white/10 rounded p-2">
              <div className="text-xs text-gray-400" title="Total de missões concluídas em toda a conta">Missões</div>
              <div className="text-lg text-white">{playerProgress?.missions_completed ?? '—'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded p-2">
              <div className="text-xs text-gray-400" title="Total de conquistas desbloqueadas">Conquistas</div>
              <div className="text-lg text-white">{playerProgress?.achievements_unlocked ?? '—'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded p-2">
              <div className="text-xs text-gray-400" title="Minutos acumulados de tempo de jogo">Tempo (min)</div>
              <div className="text-lg text-white">{playerProgress?.playtime_minutes ?? '—'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded p-2">
              <div className="text-xs text-gray-400" title="Data/hora do último login registrado">Último login</div>
              <div className="text-xs text-white">{playerProgress?.last_login ? new Date(playerProgress.last_login).toLocaleString() : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Capítulos sugeridos pela IA */}
      <NarrativeChapters />

      <div className={`mt-8 rounded-xl p-6 bg-white/10 border ${seasonalBorder}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-amber-300">🎪 Eventos Recomendados</div>
          <div className="text-sm text-gray-300">{recLoading ? 'Carregando…' : ''}</div>
        </div>
        {recommendedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedEvents.map((ev: any) => (
              <div key={ev.id} className="rounded-lg p-4 bg-white/5 border border-white/10">
                <div className="text-white font-semibold">{ev.name}</div>
                <div className="text-xs text-gray-300">{new Date(ev.dateTime).toLocaleString()}</div>
                {ev.locationText && <div className="text-xs text-gray-300">{ev.locationText}</div>}
                <div className="mt-2 text-xs text-gray-400">{(ev.tags||[]).join(', ')}</div>
                <div className="mt-3">
                  <Link to={`/event/${ev.id}`} className="px-3 py-2 rounded bg-amber-600 text-black text-xs">Abrir</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Sem recomendações no momento.</div>
        )}
      </div>

      {/* Resultados Diários (Modo Ocioso) */}
      <div className={`mt-8 rounded-xl p-6 bg-white/10 border ${seasonalBorder}`} data-testid="idle-daily-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-amber-300">{medievalTheme.icons.ui.calendar} Resultados Diários</div>
          <div className="text-sm text-gray-300">Envio automático ativo</div>
        </div>
        {daily && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">Execuções</div>
              <div className="text-2xl font-bold">{daily.runs?.length ?? 0}</div>
            </div>
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">XP Hoje</div>
              <div className="text-2xl font-bold">{daily.xpTotal ?? 0}</div>
            </div>
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">Ouro Hoje</div>
              <div className="text-2xl font-bold">{daily.goldTotal ?? 0}</div>
            </div>
            <div className="rounded-lg p-4 bg-white/5 border border-white/10">
              <div className="text-sm text-gray-400">Vitórias</div>
              <div className="text-2xl font-bold">{daily.victories ?? 0}</div>
            </div>
          </div>
        )}
        {Array.isArray(leaderboard) && leaderboard.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-300 mb-2">Top de hoje</div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry: any, idx: number) => (
                <div key={`${entry.heroId}_${idx}`} className={`flex items-center justify-between p-3 rounded-lg border ${hero && entry.heroId === (hero.id || hero.name) ? 'border-amber-400 bg-amber-900/10' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">#{idx + 1}</span>
                    <span className="font-semibold text-white">{entry.heroName}</span>
                    <span className="text-gray-400 text-sm">({entry.class})</span>
                  </div>
                  <div className="text-sm text-gray-200">
                    <span className="mr-3">XP: {entry.xpToday}</span>
                    <span className="mr-3">Ouro: {entry.goldToday}</span>
                    <span>Vitórias: {entry.victoriesToday}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Passos Essenciais */}
      <div className="space-y-4">
        <StepCard
          title="Criar Herói (com IA)"
          description="Crie rapidamente um herói com nome, frase, imagem e história."
          icon="🛠️"
          ctaLabel="Forjar Herói"
          to={referralCode ? `/create?ref=${referralCode}${inviterBy?`&by=${inviterBy}`:''}` : "/create"}
          highlight={!hero}
          examples={["Ex: Artemis, Arqueiro", "Ex: História gerada pela IA"]}
          stepIndex={1}
          testId="create-hero-button"
        />
        <StepCard
          title="Ver Galeria"
          description="Visualize, edite avatares e personalize títulos e visuais."
          icon="🖼️"
          ctaLabel="Abrir Galeria"
          to="/gallery"
          examples={["Ex: Editar avatar", "Ex: Favoritar um título"]}
          stepIndex={2}
        />
        <StepCard
          title="Missões IA"
          description="Aceite desafios dinâmicos e faça escolhas que afetam recompensas."
          icon="🗡️"
          ctaLabel="Ir para Missões"
          to="/quests"
          examples={["Ex: Escolher caminho de exploração", "Ex: Ganhar XP e ouro"]}
          stepIndex={3}
        />
        <StepCard
          title="Evoluir Herói"
          description="Acompanhe níveis, ranks e conquistas com recompensas visuais."
          icon="🏆"
          ctaLabel="Ver Evolução"
          to="/evolution"
          examples={["Ex: Subir para nível 2", "Ex: Desbloquear um título"]}
          stepIndex={4}
        />
      </div>

      {/* Banner de Convite */}
      {referralCode && (
        <div className="mt-6 rounded-xl p-4 bg-emerald-900/20 border border-emerald-500/40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-emerald-300">🎁 Convite recebido</div>
              <div className="text-sm text-gray-200">Crie seu herói com este convite para ajudar quem te convidou a ganhar bônus.</div>
            </div>
            <Link
              to={`/create?ref=${referralCode}`}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Criar com convite
            </Link>
          </div>
        </div>
      )}

      {/* Secção Final */}
      <div className="mt-10 rounded-xl p-6 bg-white/5 border border-white/10">
        <div className="text-gray-300 text-sm mb-3">No final da jornada:</div>
        <div className="flex flex-wrap gap-3">
          <Link to="/leaderboards" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">
            {medievalTheme.icons.ui.leaderboard} Ranking
          </Link>
          <Link to="/shop" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">
            🏪 Loja
          </Link>
          <span className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 text-sm">
            <Link to="/social-events" className="text-white hover:text-amber-300">🏰 Comunidade</Link>
          </span>
          <Link to="/premium" className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">
            🎨 Personalização
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-xl p-6 bg-white/10 border border-white/20">
        <div className="text-lg font-semibold text-white mb-2">Preferências</div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefShowHints} onChange={e => { setPrefShowHints(e.target.checked); try { localStorage.setItem('hfn_show_hints', e.target.checked ? '1' : '0'); } catch {} }} aria-checked={prefShowHints} />
            Mostrar dicas de UI
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefSkipTutorials} onChange={e => { setPrefSkipTutorials(e.target.checked); try { localStorage.setItem('hfn_skip_tutorials', e.target.checked ? '1' : '0'); } catch {} }} aria-checked={prefSkipTutorials} />
            Pular tutoriais
          </label>
          <button onClick={() => { try { localStorage.setItem('introSeen', '1'); } catch {} }} className="px-3 py-1 rounded bg-gray-800 text-white">Pular introdução</button>
        </div>
      </div>

      <div className={`mt-6 rounded-xl p-6 bg-white/10 border ${seasonalBorder}`}>
        <div className="text-lg font-semibold text-white mb-2">Feedback</div>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setFbChoice('up')} className={`px-3 py-2 rounded ${fbChoice==='up' ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-white'}`} aria-pressed={fbChoice==='up'} aria-label="Gostei">👍 Gostei</button>
          <button onClick={() => setFbChoice('down')} className={`px-3 py-2 rounded ${fbChoice==='down' ? 'bg-red-700 text-white' : 'bg-gray-800 text-white'}`} aria-pressed={fbChoice==='down'} aria-label="Não gostei">👎 Não gostei</button>
        </div>
        <div className="flex items-center gap-2">
          <input value={fbText} onChange={e => setFbText(e.target.value)} placeholder="Comente sua experiência" className="flex-1 px-3 py-2 rounded bg-gray-800 text-white border border-white/10 text-sm" aria-label="Comentário" />
          <button onClick={submitFeedback} className={`px-3 py-2 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white text-sm`}>Enviar</button>
        </div>
      </div>
    </div>
  );
};

export default JourneyFlow;
