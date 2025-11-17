import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import EnhancedHUD from './EnhancedHUD';
import NotificationSystem, { useNotifications, notificationBus } from './NotificationSystem';
import QuickNavigation from './QuickNavigation';
import { medievalTheme, getClassIcon, seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';
import GoogleLoginButton from './GoogleLoginButton';
import { useMonetizationStore } from '../store/monetizationStore';
import { FlowProgress } from './FlowProgress';
import { FlowControls } from './FlowControls';
import DMNarrator from './DMNarrator';
import AdBanner from './AdBanner';
import InterstitialAd from './InterstitialAd';
import SeasonalDecor from './SeasonalDecor';
import { FLOW_STEPS, getStepIndex } from '../utils/flow';
import { trackMetric } from '../utils/metricsSystem';
import { worldStateManager } from '../utils/worldState';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { ensurePlayerProfile } from '../services/playersService';
import { getMonetizationConfig } from '../services/monetizationService';
import { listHeroesByUser, saveHero, sanitizeStoredHeroData } from '../services/heroesService';
import { listQuestsByHero, saveQuest } from '../services/questsService';
import { listNotifications } from '../services/userService';
import { listEventsPaged } from '../services/socialEventsService';
import { isNearFull } from '../utils/eventsHelpers';

const Layout = () => {
  const location = useLocation();
  const [hudVisible, setHudVisible] = useState(true);
  const { getSelectedHero, heroes, updateHero, importHero, getHeroQuests, availableQuests } = useHeroStore();
  const selectedHero = getSelectedHero();
  const { notifications, removeNotification, addNotification } = useNotifications();
  const currentIdx = getStepIndex(location.pathname);
  const [sbEmail, setSbEmail] = useState<string | null>(null);
  const [sbUserId, setSbUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedFor, setLastSyncedFor] = useState<string | null>(null);
  const { setConfig, activeThemeId } = useMonetizationStore();
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [playerProgress, setPlayerProgress] = useState<{ missions_completed: number; achievements_unlocked: number; playtime_minutes: number; last_login?: string | null } | null>(null);
  const [notifCount, setNotifCount] = useState<number>(0);
  const [organizerNearCount, setOrganizerNearCount] = useState<number>(0);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installAvailable, setInstallAvailable] = useState<boolean>(false);
  const [iosTipOpen, setIosTipOpen] = useState<boolean>(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [partyInvitesCount, setPartyInvitesCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setSbEmail(data?.user?.email || null);
      setSbUserId(data?.user?.id || null);
      try {
        const id = data?.user?.id;
        if (id) {
          await fetch(`/api/users?action=touch-login&id=${encodeURIComponent(id)}`);
        }
      } catch {}
    }
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSbEmail(session?.user?.email || null);
      setSbUserId(session?.user?.id || null);
    });
    return () => { mounted = false; sub?.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = () => {
      try {
        addNotification({ id: `upd-${Date.now()}`, type: 'info', title: 'App atualizado', message: 'Uma nova versão foi instalada.', timeoutMs: 5000 });
        trackMetric.featureUsed('system', 'app-updated');
      } catch {}
    };
    navigator.serviceWorker.addEventListener('controllerchange', handler);
    return () => { navigator.serviceWorker.removeEventListener('controllerchange', handler); };
  }, [addNotification]);

  useEffect(() => {
    let timer: any = null;
    const load = async () => {
      try {
        const me = getSelectedHero();
        const id = me?.id || '';
        if (!id) { setNotifCount(0); return; }
        const items = await listNotifications(id);
        setNotifCount(Array.isArray(items) ? items.length : 0);
      } catch {}
    };
    load();
    timer = setInterval(load, 60000);
    return () => { if (timer) clearInterval(timer); };
  }, [heroes.length, selectedHero?.id]);

  useEffect(() => {
    let timer: any = null;
    const loadOrganizer = async () => {
      try {
        const me = getSelectedHero();
        const id = me?.id || '';
        if (!id) { setOrganizerNearCount(0); return; }
        const paged = await listEventsPaged(id, { ownerId: id, limit: 50, offset: 0 });
        const near = paged.items.filter((e: any) => isNearFull(e.capacity, e.attendees)).length;
        setOrganizerNearCount(near);
      } catch {}
    };
    loadOrganizer();
    timer = setInterval(loadOrganizer, 60000);
    return () => { if (timer) clearInterval(timer); };
  }, [selectedHero?.id]);

  useEffect(() => {
    const calc = () => {
      try {
        const me = getSelectedHero();
        const id = me?.id || '';
        if (!id) { setPartyInvitesCount(0); return; }
        const parties = (useHeroStore.getState() as any).parties as any[] || [];
        const count = parties.filter(p => Array.isArray(p?.invites) && p.invites.includes(id)).length;
        setPartyInvitesCount(count);
      } catch { setPartyInvitesCount(0); }
    };
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [selectedHero?.id]);

  // Carregar configuração de monetização (AdSense/Stripe) no boot
  useEffect(() => {
    (async () => {
      try {
        const cfg = await getMonetizationConfig();
        setConfig({
          adSenseClientId: cfg.adsenseClientId,
          adSlotBannerTop: cfg.adSlotBannerTop,
          adSlotInterstitial: cfg.adSlotInterstitial
        });
      } catch {}
    })();
  }, []);

  // Auto-aplicar tema sazonal por data
  useEffect(() => {
    try {
      const s = useMonetizationStore.getState();
      if (s.seasonalAutoEnabled && !s.activeSeasonalTheme) {
        s.autoApplySeasonal();
      }
    } catch {}
  }, []);

  // Auto-sync de heróis: visitante joga offline, ao logar sincroniza tudo com o Supabase
  useEffect(() => {
    async function runSync(userId: string) {
      try {
        setSyncing(true);
        // Garante perfil
        await ensurePlayerProfile(userId, sbEmail || null);
        // Carrega remotos
        const remote = await listHeroesByUser(userId);
        // Importa remotos no jogo (merge)
        remote.forEach(h => {
          try {
            const sanitized = sanitizeStoredHeroData(h.data);
            importHero(sanitized, false);
          } catch {}
        });
        // Envia locais para Supabase
        for (const localHero of heroes) {
          await saveHero(userId, localHero);
        }

        // --- Sincronização automática de missões (remoto vence em conflitos) ---
        const injectedRemoteQuestObjs: any[] = [];
        for (const hero of heroes) {
          try {
            const remoteQuests = await listQuestsByHero(userId, hero.id);
            const remoteActiveIds = remoteQuests
              .filter((q) => (q.status || '').toLowerCase() === 'active' && q?.data?.id)
              .map((q) => String(q.data.id));

            // Coletar objetos de missões remotas ativas para injeção no availableQuests
            remoteQuests
              .filter((q) => (q.status || '').toLowerCase() === 'active' && q?.data?.id)
              .forEach((q) => {
                const obj = { ...q.data, sticky: true };
                injectedRemoteQuestObjs.push(obj);
              });

            const localActiveQuests = getHeroQuests(hero.id);
            const localActiveIds = localActiveQuests.map((q) => q.id);

            // Remoto vence em conflitos: manter IDs remotos e adicionar locais inexistentes
            const safeRemote = Array.isArray(remoteActiveIds) ? remoteActiveIds : [];
            const safeLocal = Array.isArray(localActiveIds) ? localActiveIds : [];
            const mergedActiveIds = Array.from(new Set([...safeRemote, ...safeLocal]));
            if (mergedActiveIds.join(',') !== (hero.activeQuests || []).join(',')) {
              updateHero(hero.id, { activeQuests: mergedActiveIds });
            }

            // Subir missões locais que não existem remotamente
            const localOnlyIds = localActiveIds.filter((id) => !remoteActiveIds.includes(id));
            if (localOnlyIds.length > 0) {
              const byId = new Map(localActiveQuests.map((q) => [q.id, q]));
              for (const id of localOnlyIds) {
                const questObj = byId.get(id);
                if (questObj) {
                  await saveQuest(userId, hero.id, questObj, 'active');
                }
              }
            }
          } catch {}
        }

        // Injetar missões remotas ativas no availableQuests (para renderização do board)
        try {
          const currentAvail = useHeroStore.getState().availableQuests || [];
          const byId = new Map<string, any>();
          // manter atuais
          for (const q of currentAvail) byId.set(String(q.id), q);
          // injetar remotas (sticky para persistir)
          for (const rq of injectedRemoteQuestObjs) {
            const id = String(rq.id);
            if (!byId.has(id)) byId.set(id, rq);
          }
          const mergedAvail = Array.from(byId.values());
          useHeroStore.setState({ availableQuests: mergedAvail });
        } catch {}

        setLastSyncedFor(userId);
        addNotification({
          id: `sync-${Date.now()}`,
          type: 'info',
          title: 'Sincronização concluída',
          message: 'Heróis e missões ativos foram sincronizados com sua conta Supabase.',
          timeoutMs: 4000
        });
      } catch (err: any) {
        addNotification({
          id: `sync-error-${Date.now()}`,
          type: 'error',
          title: 'Falha ao sincronizar',
          message: err?.message || 'Verifique sua conexão e tente novamente.',
          timeoutMs: 5000
        });
      } finally {
        setSyncing(false);
      }
    }
    if (sbUserId && !syncing && lastSyncedFor !== sbUserId) {
      runSync(sbUserId);
    }
  }, [sbUserId]);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setInstallAvailable(true);
      try { trackMetric.featureUsedData('system', 'pwa-install-available', { device: navigator.userAgent }); } catch {}
    };
    const onInstalled = () => {
      try { trackMetric.featureUsedData('system', 'pwa-installed', { device: navigator.userAgent }); } catch {}
      setInstallAvailable(false);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    if (sbUserId) {
      fetchPlayerProgressHeader();
    }
  }, [sbUserId]);

  async function fetchPlayerProgressHeader() {
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
      }
    } catch (e: any) {
      setProgressError(e?.message || String(e));
      setPlayerProgress(null);
    } finally {
      setProgressLoading(false);
    }
  }

  useEffect(() => {
    if (!supabaseConfigured) return;
    let timer: any = null;
    if (sbUserId) {
      timer = setInterval(() => { fetchPlayerProgressHeader(); }, 5 * 60 * 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [sbUserId]);

  // Assinar barramento global de notificações para exibir toasts
  useEffect(() => {
    const unsubscribe = notificationBus.subscribe((n) => {
      addNotification(n);
    });
    return unsubscribe;
  }, [addNotification]);

  // Tick global de regeneração: mantém HP, Mana e Stamina atualizando mesmo com HUD oculto
  useEffect(() => {
    if (!selectedHero) return;
    const interval = setInterval(() => {
      try {
        const h = {
          ...selectedHero,
          derivedAttributes: { ...selectedHero.derivedAttributes },
          stamina: { ...(selectedHero.stamina as any) },
          stats: { ...selectedHero.stats }
        } as any;
        try { (worldStateManager as any).updateVitals?.(h); } catch {}
        try { worldStateManager.updateStamina(h); } catch {}
        try {
          if (h.activePetId && Array.isArray(h.pets)) {
            const idx = h.pets.findIndex((p: any) => p.id === h.activePetId);
            if (idx >= 0) {
              const p = { ...h.pets[idx] };
              const nextEnergy = Math.min(100, Math.max(0, (p.energy || 0) + 5));
              if (nextEnergy !== (p.energy || 0)) {
                p.energy = nextEnergy;
                const nextPets = [...h.pets];
                nextPets[idx] = p;
                updateHero(h.id, { pets: nextPets });
              }
            }
          }
        } catch {}
        const prev = (useHeroStore.getState().heroes || []).find(x => x.id === h.id);
        const mergedStats = { ...(prev?.stats || {}), lastActiveAt: h.stats.lastActiveAt } as any;
        updateHero(h.id, { derivedAttributes: h.derivedAttributes, stamina: h.stamina, stats: mergedStats });
      } catch {}
    }, 60_000);
    return () => clearInterval(interval);
  }, [selectedHero?.id]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkClass = (path: string) => {
    const active = isActive(path);
    const g = getSeasonalButtonGradient(useMonetizationStore.getState().activeSeasonalTheme as any);
    return active
      ? `px-2 py-1 rounded bg-gradient-to-r ${g} text-white font-semibold hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`
      : `hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded`;
  };

  const groupButtonClass = (active: boolean) => {
    const g = getSeasonalButtonGradient(useMonetizationStore.getState().activeSeasonalTheme as any);
    return active
      ? `px-2 py-1 rounded bg-gradient-to-r ${g} text-white font-semibold hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`
      : `px-2 py-1 rounded hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`;
  };

  const isAnyActive = (paths: string[]) => paths.some(p => isActive(p));

  const themeBg = activeThemeId === 'futurista'
    ? 'bg-gradient-to-br from-gray-900 via-cyan-900 to-black'
    : activeThemeId === 'noir'
      ? 'bg-gradient-to-br from-black via-slate-900 to-black'
      : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
  return (
    <div className={`min-h-screen ${themeBg} text-white`}>
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-2xl shadow-amber-500/20">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <Link to="/journey" className="text-xl md:text-2xl font-bold text-amber-400 font-serif focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
              {medievalTheme.icons.ui.guild} Forjador de Heróis
            </Link>
            <div className="flex items-center space-x-2 md:space-x-4">
              <GoogleLoginButton />
              {installAvailable && (
                <button
                  onClick={async () => {
                    try { trackMetric.featureUsedData('system', 'pwa-install-click', { device: navigator.userAgent }); } catch {}
                    if (!installPrompt) return;
                    const r = await installPrompt.prompt();
                    const outcome = r?.outcome || 'dismissed';
                    try { trackMetric.featureUsedData('system', outcome === 'accepted' ? 'pwa-install-accepted' : 'pwa-install-dismissed', { device: navigator.userAgent }); } catch {}
                    setInstallAvailable(false);
                    setInstallPrompt(null);
                  }}
                  className={`px-2 py-1 rounded text-xs bg-gradient-to-r ${getSeasonalButtonGradient(useMonetizationStore.getState().activeSeasonalTheme as any)} text-white hover:brightness-110`}
                  title="Instalar o app"
                >
                  ⬇️ Instalar
                </button>
              )}
              {!installAvailable && (() => {
                const ua = navigator.userAgent || ''
                const isIOS = /iPhone|iPad|iPod/i.test(ua)
                const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator as any).standalone
                if (isIOS && !isStandalone) {
                  return (
                    <div className="relative ml-2">
                      <button
                        onClick={() => { setIosTipOpen(v => !v); try { trackMetric.featureUsedData('system', 'pwa-ios-tip-toggle', { open: !iosTipOpen }); } catch {} }}
                        className={`px-2 py-1 rounded text-xs bg-gradient-to-r ${getSeasonalButtonGradient(useMonetizationStore.getState().activeSeasonalTheme as any)} text-white hover:brightness-110`}
                        title="Como instalar no iOS"
                      >
                        📱 Instalar no iOS
                      </button>
                      {iosTipOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded p-3 text-xs text-gray-200">
                          <div className="font-semibold mb-1">Adicionar à Tela de Início</div>
                          <div className="space-y-1">
                            <div>1) Toque em Compartilhar</div>
                            <div>2) Selecione “Adicionar à Tela de Início”</div>
                            <div>3) Confirme “Adicionar”</div>
                          </div>
                          <button onClick={() => { setIosTipOpen(false); try { trackMetric.featureUsed('system', 'pwa-ios-tip-close'); } catch {} }} className="mt-2 px-2 py-1 bg-gray-700 rounded">Fechar</button>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}
              <div className="hidden md:flex items-center gap-2 ml-2">
                <Link to="/journey" className={navLinkClass('/journey')}>Jornada</Link>
                <Link to="/shop" className={navLinkClass('/shop')}>Loja</Link>
                <Link to="/premium" className={navLinkClass('/premium')}>Premium</Link>
                <Link to="/social-events" className={navLinkClass('/social-events')}>Eventos</Link>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-2 bg-slate-800 border border-slate-600 px-2 py-1 rounded">
                {useMonetizationStore.getState().seasonPassActive?.active && (
                  <span className="text-xs text-amber-300">✨ Premium</span>
                )}
                {useMonetizationStore.getState().adsRemoved && (
                  <span className="text-xs text-emerald-300">🚫 Ads</span>
                )}
                {useMonetizationStore.getState().activeThemeId && (
                  <span className="text-xs text-indigo-300">Tema: {useMonetizationStore.getState().activeThemeId}</span>
                )}
                {useMonetizationStore.getState().activeFrameId && (
                  <span className="text-xs text-cyan-300">Frame: {useMonetizationStore.getState().activeFrameId}</span>
                )}
                <span className="text-xs text-gray-200">{sbEmail ? `🔓 ${sbEmail}` : '🔒 Não logado'}</span>
                {syncing && (<span className="text-xs text-amber-300">⏳ Sync</span>)}
                {supabaseConfigured && (
                  <>
                    <button onClick={fetchPlayerProgressHeader} disabled={progressLoading} className={`px-2 py-1 rounded text-xs border ${progressLoading ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-300'}`}>{progressLoading ? (<span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span><span>Progresso</span></span>) : 'Progresso'}</button>
                    {playerProgress?.last_login && (() => {
                      const d = new Date(playerProgress.last_login);
                      const diffMs = Date.now() - d.getTime();
                      const mins = Math.floor(diffMs / 60000);
                      const hours = Math.floor(mins / 60);
                      const days = Math.floor(hours / 24);
                      const rel = days > 0 ? `${days}d` : hours > 0 ? `${hours}h` : `${mins}m`;
                      return (<span className="text-xs text-gray-300">Últ. login: {rel}</span>);
                    })()}
                    {progressError && <span className="text-xs text-red-400">{progressError}</span>}
                    {playerProgress && (
                      <div className="flex items-center gap-2 text-xs text-gray-200">
                        <span>📋 {playerProgress.missions_completed}</span>
                        <span>🏆 {playerProgress.achievements_unlocked}</span>
                        <span>⏱️ {playerProgress.playtime_minutes}m</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {(() => {
                const s = useMonetizationStore.getState();
                const themes = s.ownedThemes || [];
                const frames = s.ownedFrames || [];
                return (
                  <>
                    {themes.length > 0 && (
                      <button
                        onClick={() => {
                          const cur = s.activeThemeId || themes[0];
                          const idx = Math.max(0, themes.indexOf(cur));
                          const next = themes[(idx + 1) % themes.length];
                          useMonetizationStore.getState().setActiveTheme(next);
                          try { trackMetric.featureUsed(selectedHero?.id || 'system', 'theme-switch'); } catch {}
                          try { addNotification({ id: `theme-${Date.now()}`, type: 'info', title: 'Tema aplicado', message: `Tema ${next} ativo`, timeoutMs: 3000 }); } catch {}
                        }}
                        className="ml-1 px-2 py-1 rounded text-xs bg-indigo-700 text-white"
                        title="Trocar tema"
                      >Tema ↻</button>
                    )}
                    {frames.length > 0 && (
                      <button
                        onClick={() => {
                          const cur = s.activeFrameId || frames[0];
                          const idx = Math.max(0, frames.indexOf(cur));
                          const next = frames[(idx + 1) % frames.length];
                          useMonetizationStore.getState().setActiveFrame(next);
                          try { trackMetric.featureUsed(selectedHero?.id || 'system', 'frame-switch'); } catch {}
                          try { addNotification({ id: `frame-${Date.now()}`, type: 'info', title: 'Frame aplicado', message: `Frame ${next} ativo`, timeoutMs: 3000 }); } catch {}
                        }}
                        className="ml-1 px-2 py-1 rounded text-xs bg-cyan-700 text-white"
                        title="Trocar frame"
                      >Frame ↻</button>
                    )}
                  </>
                )
              })()}
              
            </div>
            
            {/* Herói Selecionado */}
            {selectedHero && (
              <div className="hidden md:flex items-center space-x-3 bg-slate-800 border border-amber-400 px-4 py-2 rounded-lg">
                <span className="text-2xl">{selectedHero.avatar}</span>
                <div>
                  <div className="text-sm font-medium flex items-center space-x-2">
                    <span>{selectedHero.name}</span>
                    {(() => {
                      const medal = (selectedHero.stats as any)?.profileMedal;
                      const valid = medal?.expiresAt ? Date.now() < new Date(medal.expiresAt).getTime() : false;
                      return valid ? (
                        <span className="text-amber-400 text-xs flex items-center gap-1">
                          {medal.icon} {medal.name}
                        </span>
                      ) : null;
                    })()}
                    {selectedHero.activeTitle && selectedHero.titles.find(t => t.id === selectedHero.activeTitle) && (
                      <span className="text-amber-400 text-xs">
                        {selectedHero.titles.find(t => t.id === selectedHero.activeTitle)?.badge} 
                        {selectedHero.titles.find(t => t.id === selectedHero.activeTitle)?.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-600">
                    {getClassIcon(selectedHero.class)} {selectedHero.class} • Nível {selectedHero.progression.level}
                  </div>
                </div>
              </div>
            )}
            </div>
          
          {/* Banner de status do Supabase */}
          {!supabaseConfigured && (
            <div className="mt-3 bg-amber-900/30 border border-amber-500/40 text-amber-200 text-xs md:text-sm px-3 py-2 rounded">
              Modo offline: configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para sincronizar.
            </div>
          )}

          <nav className="mt-3 md:mt-4">
            <div className="flex w-full justify-between items-center">
              <div className="flex gap-3 md:gap-6 flex-wrap items-center">
                <div className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === 'aventura' ? null : 'aventura')}
                    className={`${groupButtonClass(isAnyActive(['/journey','/create','/gallery','/dungeon-infinita','/tavern']))} text-sm md:text-base`}
                  >
                    🧭 Aventura
                  </button>
                  {openGroup === 'aventura' && (
                    <div className="absolute z-40 mt-2 w-56 bg-slate-800 border border-slate-600 rounded shadow-lg p-2">
                      <ul className="space-y-1 text-sm">
                        <li><Link to="/journey" className={navLinkClass('/journey')}>🏠 Início</Link></li>
                        <li><Link to={(() => { const p = new URLSearchParams(location.search); const ref = p.get('ref'); const by = p.get('by'); return ref ? `/create?ref=${ref}${by?`&by=${by}`:''}` : "/create"; })()} className={navLinkClass('/create')}>{medievalTheme.icons.ui.profile} Criar Herói</Link></li>
                        <li><Link to="/gallery" className={navLinkClass('/gallery')}>{medievalTheme.icons.ui.inventory} Ver Galeria</Link></li>
                        <li><Link to="/dungeon-infinita" className={navLinkClass('/dungeon-infinita')}>🗝️ Dungeon Infinita</Link></li>
                        {/* Arena de Duelos removida */}
                        <li><Link to="/tavern" className={navLinkClass('/tavern')}>🍺 Taverna</Link></li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === 'gestao' ? null : 'gestao')}
                    className={`${groupButtonClass(isAnyActive(['/inventory','/stable','/hero-forge']))} text-sm md:text-base`}
                  >
                    🧰 Gestão
                  </button>
                  {openGroup === 'gestao' && (
                    <div className="absolute z-40 mt-2 w-56 bg-slate-800 border border-slate-600 rounded shadow-lg p-2">
                      <ul className="space-y-1 text-sm">
                        <li><Link to="/inventory" className={navLinkClass('/inventory')}>🎒 Inventário</Link></li>
                        <li><Link to="/stable" className={navLinkClass('/stable')}>🐴 Estábulo</Link></li>
                        <li><Link to="/hero-forge" className={navLinkClass('/hero-forge')}>⚒️ Forja</Link></li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === 'comunidade' ? null : 'comunidade')}
                    className={`${groupButtonClass(isAnyActive(['/guild-hub','/social-events','/friends','/notifications']))} text-sm md:text-base`}
                  >
                    👥 Comunidade
                  </button>
                  {openGroup === 'comunidade' && (
                    <div className="absolute z-40 mt-2 w-56 bg-slate-800 border border-slate-600 rounded shadow-lg p-2">
                      <ul className="space-y-1 text-sm">
                        <li><Link to="/guild-hub" className={navLinkClass('/guild-hub')}>🏰 Guilda dos Aventureiros</Link></li>
                        <li><Link to="/social-events" className={navLinkClass('/social-events')}>🎉 Eventos</Link></li>
                        <li><Link to="/friends" className={navLinkClass('/friends')}>🤝 Amigos</Link></li>
                        <li><Link to="/party-invites" className={navLinkClass('/party-invites')}>📨 Convites {partyInvitesCount > 0 && (<span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white">{partyInvitesCount}</span>)}</Link></li>
                        <li><Link to="/notifications" className={navLinkClass('/notifications')}>🔔 Notificações {notifCount > 0 && (<span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white">{notifCount}</span>)}</Link></li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === 'conta' ? null : 'conta')}
                    className={`${groupButtonClass(isAnyActive(['/metrics']))} text-sm md:text-base`}
                  >
                    👤 Conta
                  </button>
                  {openGroup === 'conta' && (
                    <div className="absolute z-40 mt-2 w-56 bg-slate-800 border border-slate-600 rounded shadow-lg p-2">
                      <ul className="space-y-1 text-sm">
                        <li><Link to="/metrics" className={navLinkClass('/metrics')}>📊 Métricas</Link></li>
                        {import.meta.env.DEV && (<li><Link to="/admin" className={navLinkClass('/admin')}>🛠️ Admin</Link></li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {currentIdx >= FLOW_STEPS.length - 1 && (
                <div className="relative">
                  <button
                    onClick={() => setOpenGroup(openGroup === 'extras' ? null : 'extras')}
                    className={`${groupButtonClass(isAnyActive(['/leaderboards','/shop','/premium','/organizer','/events-history']))} text-sm md:text-base`}
                  >
                    ⭐ Extras
                  </button>
                  {openGroup === 'extras' && (
                    <div className="absolute right-0 z-40 mt-2 w-64 bg-slate-800 border border-slate-600 rounded shadow-lg p-2">
                      <ul className="space-y-1 text-sm">
                        <li><Link to="/leaderboards" className={navLinkClass('/leaderboards')}>{medievalTheme.icons.ui.leaderboard} Ranking</Link></li>
                        <li><Link to="/shop" className={navLinkClass('/shop')}>🏪 Loja</Link></li>
                        <li><Link to="/premium" className={navLinkClass('/premium')}>✨ Premium</Link></li>
                        <li><Link to={organizerNearCount > 0 ? "/organizer?nearFull=1" : "/organizer"} title="Eventos quase lotados no seu painel" className={navLinkClass('/organizer')}>🛠️ Organizador {organizerNearCount > 0 && (<span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded bg-red-600 text-white">{organizerNearCount}</span>)}</Link></li>
                        <li><Link to="/events-history" className={navLinkClass('/events-history')}>🗂️ Histórico</Link></li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
          <SeasonalDecor />
          {/* Minibarra de progresso e controles do fluxo removidos quando não há herói criado */}
        </div>
      </header>
      
      <main className="container mx-auto py-6 md:py-8 px-3 md:px-4">
        {/* Banner Ad Top */}
        <div className="mb-4">
          <AdBanner style={{ display: 'block', minHeight: 60 }} />
        </div>
        {/* Banner global de convite quando houver código na URL */}
        {new URLSearchParams(location.search).get('ref') && (
          <div className="mb-4 rounded-lg p-3 bg-emerald-800/30 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-emerald-200">Você tem um convite ativo. A criação de um herói com esse convite concede bônus ao convidador.</div>
              <Link
                to={(() => { const p = new URLSearchParams(location.search); const ref = p.get('ref'); const by = p.get('by'); return `/create?ref=${ref}${by?`&by=${by}`:''}`; })()}
                className={`px-3 py-1 rounded bg-gradient-to-r ${((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.buttonGradient) || 'from-emerald-600 to-emerald-700'} text-white text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 hover:brightness-110 flex items-center gap-2`}
              >
                {((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.accents?.[0]) || ''}
                <span>Criar com convite</span>
              </Link>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      
      {/* Enhanced HUD - show/hide with toggle */}
      {selectedHero && hudVisible && <EnhancedHUD hero={selectedHero} />}

      {/* HUD Toggle Button */}
      {selectedHero && (
        <button
          aria-label={hudVisible ? 'Ocultar HUD' : 'Mostrar HUD'}
          title={hudVisible ? 'Ocultar HUD' : 'Mostrar HUD'}
          onClick={() => setHudVisible(v => !v)}
          className={`fixed bottom-[calc(1rem+var(--safe-bottom))] right-4 z-50 px-3 py-2 rounded-full shadow-lg transition-colors text-xs sm:text-sm md:text-base max-w-[80vw]
            ${hudVisible ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-amber-600 text-white hover:bg-amber-700'} focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
        >
          {hudVisible ? 'Ocultar Painel' : 'Mostrar Painel'}
        </button>
      )}
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      {/* Quick Navigation */}
      <QuickNavigation />
      
      <footer className="bg-gray-800 py-6 mt-10 md:mt-12">
        <div className="container mx-auto px-3 md:px-4 text-center text-gray-400 text-sm md:text-base">
          <p>&copy; {new Date().getFullYear()} Forjador de Heróis - Criado com React, TypeScript e Zustand</p>
        </div>
      </footer>
      {/* Interstitial Ad mount */}
      <InterstitialAd />
    </div>
  );
};

export default Layout;
