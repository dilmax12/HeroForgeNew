import { Routes, Route, Link, Navigate } from 'react-router-dom'
import React, { Suspense } from 'react'
import Layout from './components/Layout'
import HeroList from './components/HeroList'
import HeroForm from './components/HeroForm'
const HeroDetailLazy = React.lazy(() => import('./components/HeroDetail'))
// import TestComponent from './components/TestComponent'
import HeroProgression from './components/HeroProgression'
import GuildSystem from './components/GuildSystem'
import PartySystem from './components/PartySystem'
import AdventurersGuildHub from './components/AdventurersGuildHub'
import QuestBoard from './components/QuestBoard'
import TitlesManager from './components/TitlesManager'
import Leaderboards from './components/Leaderboards'
import DailyGoals from './components/DailyGoals'
// Onboarding desativado temporariamente
// import OnboardingManager from './components/OnboardingManager'
// import OnboardingDetector from './components/OnboardingDetector'
import EventsPanel from './components/EventsPanel'
import ActivityFeed from './components/ActivityFeed'
import { EvolutionPanel } from './components/EvolutionPanel'
import { RankCelebrationManager } from './components/RankCelebration'
const AIAvatarGeneratorLazy = React.lazy(() => import('./components/AIAvatarGenerator'))
const DynamicMissionsPanelLazy = React.lazy(() => import('./components/DynamicMissionsPanel'))
const AIRecommendationsPanelLazy = React.lazy(() => import('./components/AIRecommendationsPanel'))
import Shop from './components/Shop'
import Training from './components/Training'
import { WorldStateDemo } from './components/WorldStateDemo'
const MissionsHubLazy = React.lazy(() => import('./components/MissionsHub'))
import Dungeon20 from './components/Dungeon20'
import HuntingMissions from './components/HuntingMissions'
import Inventory from './components/Inventory'
import PetsPanel from './components/PetsPanel'
import ErrorBoundary from './components/ErrorBoundary'
import MountsPanel from './components/MountsPanel'
import { useEffect } from 'react'
import { startPlaytimeHeartbeat, stopPlaytimeHeartbeat } from './services/progressService'
import { useHeroStore } from './store/heroStore'
import { formatTitleDisplay } from './utils/titles'
import { HeroJournal } from './components/HeroJournal'
import QuickMission from './components/QuickMission'
import JourneyFlow from './components/JourneyFlow'
// (removido import duplicado de MissionsHub)
const AdminDashboardLazy = React.lazy(() => import('./components/AdminDashboard'))
import IntroCinematic from './components/IntroCinematic'
import PlayerRegistration from './components/PlayerRegistration'
import Tavern from './components/Tavern'
import Messenger from './components/Messenger'
import HeroForge from './components/HeroForge'
import PremiumCenter from './components/PremiumCenterSimple'
import DuelArena from './components/DuelArena'
import SocialEventsPage from './components/SocialEventsPage'
import EventDetailPage from './components/EventDetailPage'
import OrganizerDashboard from './components/OrganizerDashboard'
import UserProfilePage from './components/UserProfilePage'
import FriendsPage from './components/FriendsPage'
import SocialNotificationsPage from './components/SocialNotificationsPage'
import UserEventsHistoryPage from './components/UserEventsHistoryPage'
import MetricsDashboard from './components/MetricsDashboard'
import StableHub from './components/StableHub'

// Componente wrapper para HeroProgression que precisa do herói selecionado
function HeroProgressionWrapper() {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🦸</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para ver sua progressão.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  return <HeroProgression hero={selectedHero} />;
}

// Componente wrapper para GuildSystem que precisa do herói selecionado
function GuildSystemWrapper() {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para acessar o sistema de party.</p>
        <Link to="/" className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  return <GuildSystem hero={selectedHero} />;
}

// Componente wrapper para PartySystem que precisa do herói selecionado
function PartySystemWrapper() {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para acessar o sistema de party.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  return <PartySystem hero={selectedHero} />;
}

// Componente wrapper para DailyGoals que precisa do herói selecionado
function DailyGoalsWrapper() {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para ver suas metas diárias.</p>
        <Link to="/" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  return <DailyGoals heroId={selectedHero.id} />;
}

// Componente wrapper para EvolutionPanel que precisa do herói selecionado
function EvolutionPanelWrapper() {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para ver sua evolução de ranks.</p>
        <Link to="/" className="bg-amber-600 text-white px-6 py-2 rounded hover:bg-amber-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  return <EvolutionPanel heroId={selectedHero.id} className="max-w-6xl mx-auto" />;
}

// Componente wrapper para AIAvatarGenerator que precisa do herói selecionado
function AIAvatarGeneratorWrapper() {
  const { getSelectedHero, updateHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🎭</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para gerar avatares com IA.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  const handleAvatarGenerated = (url: string) => {
    const ok = typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || /^data:image\/(png|jpeg);base64,/.test(url));
    const safe = ok ? url : 'https://placehold.co/512x512?text=Avatar';
    updateHero(selectedHero.id, { image: safe });
  };

  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <AIAvatarGeneratorLazy 
        hero={selectedHero} 
        className="max-w-4xl mx-auto" 
        onAvatarGenerated={handleAvatarGenerated}
      />
    </Suspense>
  );
}

// Componente wrapper para DynamicMissionsPanel que precisa do herói selecionado
function DynamicMissionsPanelWrapper() {
  const { getSelectedHero, refreshQuests, availableQuests, acceptQuest } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🗡️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para ver missões dinâmicas.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  const handleMissionAccept = (_mission: import('./services/dynamicMissionsAI').DynamicMission) => {
    // Ao aceitar uma missão de IA, refletir no sistema de missões padrão
    refreshQuests(selectedHero.progression.level);
    const quest = availableQuests.find(q => selectedHero.progression.level >= q.levelRequirement && !selectedHero.activeQuests.includes(q.id));
    if (quest) {
      acceptQuest(selectedHero.id, quest.id);
      console.log('✅ Missão IA aceita, vinculada a missão:', quest.title);
    } else {
      console.log('⚠️ Nenhuma missão disponível para vincular');
    }
  };

  return <Suspense fallback={<div className="p-6">Carregando...</div>}><DynamicMissionsPanelLazy hero={selectedHero} className="max-w-6xl mx-auto" onMissionAccept={handleMissionAccept} /></Suspense>;
}

// Componente wrapper para AIRecommendationsPanel que precisa do herói selecionado
function AIRecommendationsPanelWrapper() {
  const { getSelectedHero, refreshQuests, availableQuests, acceptQuest, gainXP } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🧠</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para ver recomendações de IA.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  const handleApply = (rec: import('./services/recommendationAI').Recommendation) => {
    // Ações básicas ao aplicar recomendação
    if (rec.type === 'quest') {
      // Garantir lista atualizada e aceitar a primeira missão elegível
      refreshQuests(selectedHero.progression.level);
      const quest = availableQuests.find(q => selectedHero.progression.level >= q.levelRequirement && !selectedHero.activeQuests.includes(q.id));
      if (quest) {
        acceptQuest(selectedHero.id, quest.id);
        console.log('✅ Recomendação aplicada: missão aceita', quest.title);
      } else {
        console.log('⚠️ Nenhuma missão elegível para aceitar no momento');
      }
    } else if (rec.type === 'training' || rec.type === 'progression') {
      // Pequeno bônus para refletir ação aplicada
      gainXP(selectedHero.id, 25);
      console.log('✅ Recomendação aplicada: bônus de XP');
    } else {
      console.log('ℹ️ Recomendação aplicada:', rec.type);
    }
  };

  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <AIRecommendationsPanelLazy 
        hero={selectedHero} 
        className="max-w-6xl mx-auto" 
        onRecommendationApply={handleApply}
      />
    </Suspense>
  );
}

// Componente wrapper para EnhancedQuestBoard que precisa do herói selecionado

// Componente wrapper para HeroJournal que precisa do herói selecionado
function HeroJournalWrapper() {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">📖</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para ver seu diário de aventuras.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  
  return <HeroJournal hero={selectedHero} />;
}

// Wrapper para QuickMission que precisa do herói selecionado
function QuickMissionWrapper() {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🗡️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para jogar uma missão rápida.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }
  return <QuickMission />;
}

function App() {
  const heroes = useHeroStore(s => s.heroes);
  const markCelebrationViewed = useHeroStore(s => s.markCelebrationViewed);
  const selectedHeroId = useHeroStore(s => s.selectedHeroId);
  const selectedHero = heroes.find(h => h.id === selectedHeroId);
  
  // Configuração de segurança básica
  useEffect(() => {
    // Executar segurança apenas em produção para não interferir no preview/local
    if (!import.meta.env.DEV) {
      // Prevenir clickjacking: se estiver em iframe, tentar subir para o topo
      try {
        const topWin = window.top;
        if (topWin && window.self !== topWin) {
          topWin.location.href = window.self.location.href;
        }
      } catch {
        // Ignorar erros de mesma origem ou restrições
      }

      // Configurar Content Security Policy via meta tag
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      // Permite vercel.live para preview em produção e conexões ao Supabase
      const sbUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      let sbOrigin = '';
      try { sbOrigin = sbUrl ? new URL(sbUrl).origin : ''; } catch {}
      const connectSrc = [
        "'self'",
        sbOrigin,
        'https://vercel.live',
        'wss://vercel.live',
        'https://*.vercel.live',
        'wss://*.vercel.live'
      ].filter(Boolean).join(' ');
      const adsOrigins = [
        'https://pagead2.googlesyndication.com',
        'https://tpc.googlesyndication.com',
        'https://googleads.g.doubleclick.net'
      ];
      cspMeta.content = [
        "default-src 'self'",
        `frame-src 'self' https://vercel.live https://*.vercel.live ${adsOrigins.join(' ')}`,
        `connect-src ${connectSrc} ${adsOrigins.join(' ')}`,
        "style-src 'self' 'unsafe-inline'",
        `script-src 'self' ${adsOrigins.join(' ')} https://vercel.live https://*.vercel.live`,
        "img-src 'self' data: blob: https:"
      ].join('; ') + ';';
      document.head.appendChild(cspMeta);
    }
  }, []);

  useEffect(() => {
    try {
      if (selectedHero) {
        document.title = formatTitleDisplay(selectedHero);
      } else {
        document.title = 'HeroForgeNew';
      }
    } catch {}
  }, [selectedHero?.id, selectedHero?.activeTitle, selectedHero?.name]);

  useEffect(() => {
    try {
      startPlaytimeHeartbeat(1);
      const onVis = () => {
        if (document.hidden) {
          stopPlaytimeHeartbeat();
        } else {
          startPlaytimeHeartbeat(1);
        }
      };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        document.removeEventListener('visibilitychange', onVis);
        stopPlaytimeHeartbeat();
      };
    } catch {}
  }, []);

  // Coletar todas as celebrações pendentes
  const allCelebrations = heroes.flatMap(hero => 
    (hero.rankData?.pendingCelebrations || []).map((celebration, index) => ({
      ...celebration,
      heroId: hero.id,
      celebrationIndex: index
    }))
  );

  const handleCelebrationViewed = (celebrationIndex: number) => {
    const celebration = allCelebrations[celebrationIndex];
    if (celebration) {
      markCelebrationViewed(celebration.heroId, celebration.celebrationIndex);
    }
  };

  return (
    <>
      {/* OnboardingDetector removido temporariamente */}
      
      {/* Gerenciador de Celebrações de Rank */}
      {allCelebrations.length > 0 && (
        <RankCelebrationManager
          celebrations={allCelebrations}
          onCelebrationViewed={handleCelebrationViewed}
        />
      )}
      
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<JourneyFlow />} />
          <Route path="journey" element={<JourneyFlow />} />
          <Route path="intro" element={<IntroCinematic />} />
          <Route path="create" element={<HeroForm />} />
          <Route path="heroes/new" element={<HeroForm />} />
          <Route path="gallery" element={<HeroList />} />
          <Route path="hero/:id" element={<Suspense fallback={<div className="p-6">Carregando herói…</div>}><HeroDetailLazy /></Suspense>} />
          <Route path="progression" element={<HeroProgressionWrapper />} />
          <Route path="evolution" element={<EvolutionPanelWrapper />} />
          {/* Party agora aponta para PartySystem (inclui Lobby Online) */}
        <Route path="party" element={<PartySystemWrapper />} />
          {/* GuildSystem disponível em rota separada caso necessário */}
        <Route path="guild" element={<GuildSystemWrapper />} />
          {/* Rota dedicada para Lobby/PartySystem (UI com aba "Lobby Online") */}
        <Route path="party-lobby" element={<PartySystemWrapper />} />
          {/* Hub da Guilda dos Aventureiros */}
          <Route path="guild-hub" element={<AdventurersGuildHub />} />
          <Route path="missions" element={<Suspense fallback={<div className="p-6">Carregando...</div>}><MissionsHubLazy /></Suspense>} />
          <Route path="dungeon-20" element={<Dungeon20 />} />
          <Route path="dungeon-infinita" element={<Dungeon20 />} />
          <Route path="hunting" element={<HuntingMissions />} />
          {/* Quadro de Missões (disponíveis, ativas e concluídas) */}
          <Route path="quests" element={<QuestBoard />} />
          <Route path="daily-goals" element={<DailyGoalsWrapper />} />
          <Route path="events" element={<EventsPanel />} />
          <Route path="social-events" element={<SocialEventsPage />} />
          <Route path="//social-events" element={<SocialEventsPage />} />
          <Route path="event/:id" element={<EventDetailPage />} />
          <Route path="organizer" element={<OrganizerDashboard />} />
          <Route path="profile" element={<UserProfilePage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="notifications" element={<SocialNotificationsPage />} />
          <Route path="events-history" element={<UserEventsHistoryPage />} />
          <Route path="metrics" element={<MetricsDashboard />} />
          <Route path="activities" element={<ActivityFeed />} />
          {/* Cadastro básico de jogador (herói, itens e missão opcional) */}
          <Route path="cadastro" element={<PlayerRegistration />} />
          {/* Rota de tutorial removida temporariamente */}
          <Route path="titles" element={<TitlesManager />} />
          <Route path="leaderboards" element={<Leaderboards />} />
          <Route path="metrics" element={<Suspense fallback={<div className="p-6">Carregando...</div>}><AdminDashboardLazy /></Suspense>} />
          <Route path="ai-avatar" element={<AIAvatarGeneratorWrapper />} />
          <Route path="ai-missions" element={<DynamicMissionsPanelWrapper />} />
          <Route path="ai-recommendations" element={<AIRecommendationsPanelWrapper />} />
          {/* Taverna comunitária e murais */}
          <Route path="tavern" element={<Tavern />} />
          {/* Cartas e Mensageiros */}
          <Route path="messenger" element={<Messenger />} />
          {/* Rotas de missões narrativas removidas */}
          <Route path="hero-journal" element={<HeroJournalWrapper />} />
          <Route path="quick-mission" element={<QuickMissionWrapper />} />
          <Route path="admin" element={<Suspense fallback={<div className="p-6">Carregando...</div>}><AdminDashboardLazy /></Suspense>} />
          <Route path="shop" element={<Shop />} />
          <Route path="premium" element={<PremiumCenter />} />
          {/* Estábulo com sub-rotas para Mascotes e Montarias */}
          <Route path="stable" element={<StableHub />}>
            <Route index element={<Navigate to="/stable/pets" replace />} />
            <Route path="pets" element={<ErrorBoundary fallback={<div className="p-6 rounded bg-red-900/40 border border-red-700 text-red-200">Falha ao carregar Mascotes</div>}><PetsPanel /></ErrorBoundary>} />
            <Route path="mounts" element={<MountsPanel />} />
          </Route>
          <Route path="duel-arena" element={<DuelArena />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="hero-forge" element={<HeroForge />} />
          <Route path="training" element={<Training />} />
          {/* Redirecionar rotas antigas para novo hub */}
          <Route path="pets" element={<Navigate to="/stable/pets" replace />} />
          <Route path="mounts" element={<Navigate to="/stable/mounts" replace />} />
          <Route path="world-state-demo" element={<WorldStateDemo />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
