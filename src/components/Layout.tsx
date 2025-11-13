import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import EnhancedHUD from './EnhancedHUD';
import NotificationSystem, { useNotifications, notificationBus } from './NotificationSystem';
import QuickNavigation from './QuickNavigation';
import { medievalTheme, getClassIcon } from '../styles/medievalTheme';
import GoogleLoginButton from './GoogleLoginButton';
import { FlowProgress } from './FlowProgress';
import { FlowControls } from './FlowControls';
import DMNarrator from './DMNarrator';
import { FLOW_STEPS, getStepIndex } from '../utils/flow';
import { worldStateManager } from '../utils/worldState';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { ensurePlayerProfile } from '../services/playersService';
import { listHeroesByUser, saveHero, sanitizeStoredHeroData } from '../services/heroesService';
import { listQuestsByHero, saveQuest } from '../services/questsService';

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

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setSbEmail(data?.user?.email || null);
      setSbUserId(data?.user?.id || null);
    }
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSbEmail(session?.user?.email || null);
      setSbUserId(session?.user?.id || null);
    });
    return () => { mounted = false; sub?.subscription.unsubscribe(); };
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
            const mergedActiveIds = Array.from(new Set([...remoteActiveIds, ...localActiveIds]));
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
        updateHero(h.id, { derivedAttributes: h.derivedAttributes, stamina: h.stamina, stats: h.stats });
      } catch {}
    }, 60_000);
    return () => clearInterval(interval);
  }, [selectedHero?.id]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkClass = (path: string) => {
    return `hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded ${
      isActive(path) ? 'text-amber-400 font-semibold' : ''
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-2xl shadow-amber-500/20">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <Link to="/journey" className="text-xl md:text-2xl font-bold text-amber-400 font-serif focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
              {medievalTheme.icons.ui.guild} Forjador de Heróis
            </Link>
            <div className="flex items-center space-x-2 md:space-x-4">
              <GoogleLoginButton />
              {sbEmail ? (
                <span className="ml-1 text-xs md:text-sm text-gray-200">Supabase: {sbEmail}</span>
              ) : (
                <span className="ml-1 text-xs md:text-sm text-gray-400">Supabase: não logado</span>
              )}
              {syncing && (
                <span className="ml-2 text-xs text-amber-300">Sincronizando...</span>
              )}
            </div>
            
            {/* Herói Selecionado */}
            {selectedHero && (
              <div className="hidden md:flex items-center space-x-3 bg-slate-800 border border-amber-400 px-4 py-2 rounded-lg">
                <span className="text-2xl">{selectedHero.avatar}</span>
                <div>
                  <div className="text-sm font-medium flex items-center space-x-2">
                    <span>{selectedHero.name}</span>
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
              {/* Fluxo principal da jornada */}
              <ul className="flex flex-wrap gap-3 md:space-x-6">
                <li>
                  <Link to="/journey" className={`${navLinkClass('/journey')} text-sm md:text-base`}>
                    🏠 Início
                  </Link>
                </li>
                <li>
                  <Link to={new URLSearchParams(location.search).get('ref') ? `/create?ref=${new URLSearchParams(location.search).get('ref')}` : "/create"} className={`${navLinkClass('/create')} text-sm md:text-base`}>
                    {medievalTheme.icons.ui.profile} Criar Herói
                  </Link>
                </li>
                <li>
                  <Link to="/gallery" className={`${navLinkClass('/gallery')} text-sm md:text-base`}>
                    {medievalTheme.icons.ui.inventory} Ver Galeria
                  </Link>
                </li>
                <li>
                  <Link to="/missions" className={`${navLinkClass('/missions')} text-sm md:text-base`}>
                    🎮 Jogar
                  </Link>
                </li>
                <li>
                  <Link to="/dungeon-infinita" className={`${navLinkClass('/dungeon-infinita')} text-sm md:text-base`}>
                    🗝️ Dungeon Infinita
                  </Link>
                </li>
                <li>
                  <Link to="/cadastro" className={`${navLinkClass('/cadastro')} text-sm md:text-base`}>
                    📝 Cadastro
                  </Link>
                </li>
                <li>
                  <Link to="/evolution" className={`${navLinkClass('/evolution')} text-sm md:text-base`}>
                    🧬 Evolução
                  </Link>
                </li>
                <li>
                  <Link to="/progression" className={`${navLinkClass('/progression')} text-sm md:text-base`}>
                    📈 Progressão
                  </Link>
                </li>
                <li>
                  <Link to="/guild-hub" className={`${navLinkClass('/guild-hub')} text-sm md:text-base`}>
                    🏰 Guilda dos Aventureiros
                  </Link>
                </li>
                <li>
                  <Link to="/tavern" className={`${navLinkClass('/tavern')} text-sm md:text-base`}>
                    🍺 Taverna
                  </Link>
                </li>
                <li>
                  <Link to="/party" className={`${navLinkClass('/party')} text-sm md:text-base`}>
                    👥 Party
                  </Link>
                </li>
                <li>
                  <Link to="/inventory" className={`${navLinkClass('/inventory')} text-sm md:text-base`}>
                    🎒 Inventário
                  </Link>
                </li>
                {import.meta.env.DEV && (
                  <li>
                    <Link to="/admin" className={`${navLinkClass('/admin')} text-sm md:text-base`}>
                      🛠️ Admin
                    </Link>
                  </li>
                )}
              </ul>

              {/* Grupo final: Ranking | Loja | Comunidade (Futuro) - oculto até Evolução */}
              {currentIdx >= FLOW_STEPS.length - 1 && (
                <ul className="flex flex-wrap gap-3 md:space-x-4 text-sm">
                  <li>
                    <Link to="/leaderboards" className={navLinkClass('/leaderboards')}>
                      {medievalTheme.icons.ui.leaderboard} Ranking
                    </Link>
                  </li>
                  <li>
                    <Link to="/shop" className={navLinkClass('/shop')}>
                      🏪 Loja
                    </Link>
                  </li>
                  <li>
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-300 cursor-not-allowed" title="Em breve">
                      👥 Comunidade (Futuro)
                    </span>
                  </li>
                </ul>
              )}
            </div>
          </nav>
          {/* Minibarra de progresso e controles do fluxo - mostrar apenas em Início sem herói criado */}
          {location.pathname === '/journey' && heroes.length === 0 && (
            <div className="mt-2">
              <FlowProgress />
              <FlowControls />
              {/* Narrador Mestre do Jogo */}
              <DMNarrator />
            </div>
          )}
        </div>
      </header>
      
      <main className="container mx-auto py-6 md:py-8 px-3 md:px-4">
        {/* Banner global de convite quando houver código na URL */}
        {new URLSearchParams(location.search).get('ref') && (
          <div className="mb-4 rounded-lg p-3 bg-emerald-800/30 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-emerald-200">Você tem um convite ativo. A criação de um herói com esse convite concede bônus ao convidador.</div>
              <Link
                to={`/create?ref=${new URLSearchParams(location.search).get('ref')}`}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Criar com convite
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
          className={`fixed bottom-[calc(1rem+var(--safe-bottom))] right-4 z-50 px-3 py-2 rounded-full shadow-lg transition-colors text-sm md:text-base whitespace-nowrap max-w-[80vw]
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
    </div>
  );
};

export default Layout;
