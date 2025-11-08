import { Routes, Route, Link } from 'react-router-dom'
import Layout from './components/Layout'
import HeroList from './components/HeroList'
import HeroForm from './components/HeroForm'
import HeroDetail from './components/HeroDetail'
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
import AIAvatarGenerator from './components/AIAvatarGenerator'
import DynamicMissionsPanel from './components/DynamicMissionsPanel'
import AIRecommendationsPanel from './components/AIRecommendationsPanel'
import Shop from './components/Shop'
import Training from './components/Training'
import { WorldStateDemo } from './components/WorldStateDemo'
import Inventory from './components/Inventory'
import { useEffect } from 'react'
import { useHeroStore } from './store/heroStore'
import { HeroJournal } from './components/HeroJournal'
import QuickMission from './components/QuickMission'
import JourneyFlow from './components/JourneyFlow'
import MissionsHub from './components/MissionsHub'
import AdminDashboard from './components/AdminDashboard'
import IntroCinematic from './components/IntroCinematic'

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
    // Salva a imagem gerada no herói selecionado
    updateHero(selectedHero.id, { image: url });
  };

  return (
    <AIAvatarGenerator 
      hero={selectedHero} 
      className="max-w-4xl mx-auto" 
      onAvatarGenerated={handleAvatarGenerated}
    />
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

  return <DynamicMissionsPanel hero={selectedHero} className="max-w-6xl mx-auto" onMissionAccept={handleMissionAccept} />;
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
    <AIRecommendationsPanel 
      hero={selectedHero} 
      className="max-w-6xl mx-auto" 
      onRecommendationApply={handleApply}
    />
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
  const { heroes, markCelebrationViewed } = useHeroStore();
  
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
      cspMeta.content = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:;";
      document.head.appendChild(cspMeta);
    }
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
          <Route path="gallery" element={<HeroList />} />
          <Route path="hero/:id" element={<HeroDetail />} />
          <Route path="progression" element={<HeroProgressionWrapper />} />
          <Route path="evolution" element={<EvolutionPanelWrapper />} />
          {/* Antiga guild agora é party */}
          <Route path="party" element={<GuildSystemWrapper />} />
          {/* Hub da Guilda dos Aventureiros */}
          <Route path="guild-hub" element={<AdventurersGuildHub />} />
          {/* Centralização de modos de missão em um único hub */}
          <Route path="quests" element={<MissionsHub />} />
          <Route path="missions" element={<MissionsHub />} />
          <Route path="daily-goals" element={<DailyGoalsWrapper />} />
          <Route path="events" element={<EventsPanel />} />
          <Route path="activities" element={<ActivityFeed />} />
          {/* Rota de tutorial removida temporariamente */}
          <Route path="titles" element={<TitlesManager />} />
          <Route path="leaderboards" element={<Leaderboards />} />
          <Route path="metrics" element={<AdminDashboard />} />
          <Route path="ai-avatar" element={<AIAvatarGeneratorWrapper />} />
          <Route path="ai-missions" element={<DynamicMissionsPanelWrapper />} />
          <Route path="ai-recommendations" element={<AIRecommendationsPanelWrapper />} />
          {/* Rotas de missões narrativas removidas */}
          <Route path="hero-journal" element={<HeroJournalWrapper />} />
          <Route path="quick-mission" element={<QuickMissionWrapper />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="shop" element={<Shop />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="training" element={<Training />} />
          <Route path="world-state-demo" element={<WorldStateDemo />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
