import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { medievalTheme, seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';
import NarrativeChapters from './NarrativeChapters';
import { getAltharionLore } from '../utils/story';
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
  const shortLore = useMemo(() => getAltharionLore('short'), []);
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
    <div data-testid="journey-progress">
      {label && <div className="text-xs text-slate-400 mb-1">{label}</div>}
      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.max(0, Math.min(100, percent))} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-3 bg-gradient-to-r ${medievalTheme.gradients.buttons.success} rounded-full transition-all duration-500`}
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
  const progressAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);
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

  async function fetchPlayerProgress(signal?: AbortSignal) {
    if (signal?.aborted) return;
    if (isMountedRef.current) {
      setProgressLoading(true);
      setProgressError(null);
    }
    try {
      if (!supabaseConfigured) {
        if (!signal?.aborted && isMountedRef.current) {
          setProgressError('Nuvem desativada neste ambiente.');
          setPlayerProgress(null);
        }
        return;
      }
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id || null;
      if (!userId) {
        if (!signal?.aborted && isMountedRef.current) {
          setProgressError('Faça login para ver seu progresso.');
          setPlayerProgress(null);
        }
      } else {
        const res = await fetch(`/api/player-progress?action=get&id=${encodeURIComponent(userId)}`, { signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Falha ao carregar progresso');
        if (!signal?.aborted && isMountedRef.current) {
          setPlayerProgress(json?.progress || null);
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      if (!signal?.aborted && isMountedRef.current) {
        setProgressError(e?.message || String(e));
        setPlayerProgress(null);
      }
    } finally {
      if (!signal?.aborted && isMountedRef.current) {
        setProgressLoading(false);
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    let timer: any = null;
    const run = () => {
      if (progressAbortRef.current) {
        try { progressAbortRef.current.abort(); } catch {}
      }
      progressAbortRef.current = new AbortController();
      fetchPlayerProgress(progressAbortRef.current.signal);
    };
    if (!progressLoading) {
      run();
      timer = setInterval(run, 5 * 60 * 1000);
    }
    const onVis = () => {
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = null; }
      } else {
        if (!timer) timer = setInterval(run, 5 * 60 * 1000);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      if (progressAbortRef.current) {
        try { progressAbortRef.current.abort(); } catch {}
      }
      isMountedRef.current = false;
    };
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

  const shortLore = useMemo(() => getAltharionLore('short'), []);

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

      <div className={`rounded-xl p-6 mb-8 bg-amber-900/10 border border-amber-500/30`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-amber-300 font-semibold">Forjador de Heróis — Introdução</div>
          <div className="flex items-center gap-2">
            <Link to="/intro?version=game_intro" className="px-3 py-1 rounded bg-amber-600 text-black text-xs">Ver Narração</Link>
            <Link to="/intro?version=cinematic" className="px-3 py-1 rounded bg-indigo-600 text-white text-xs">Ver Trailer</Link>
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-200">
          {shortLore.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
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

      

      

      {/* Capítulos sugeridos pela IA */}
      <NarrativeChapters />

      

      

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
          testId="open-gallery-button"
        />
        <StepCard
          title="Missões IA"
          description="Aceite desafios dinâmicos e faça escolhas que afetam recompensas."
          icon="🗡️"
          ctaLabel="Ir para Missões"
          to="/quests"
          examples={["Ex: Escolher caminho de exploração", "Ex: Ganhar XP e ouro"]}
          stepIndex={3}
          testId="open-quests-button"
        />
        <StepCard
          title="Evoluir Herói"
          description="Acompanhe níveis, ranks e conquistas com recompensas visuais."
          icon="🏆"
          ctaLabel="Ver Evolução"
          to="/evolution"
          examples={["Ex: Subir para nível 2", "Ex: Desbloquear um título"]}
          stepIndex={4}
          testId="open-evolution-button"
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
