import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HeroList from './components/HeroList'
import HeroForm from './components/HeroForm'
import HeroDetail from './components/HeroDetail'
import HeroProgression from './components/HeroProgression'
import GuildSystem from './components/GuildSystem'
import PlaytestPanel from './components/PlaytestPanel'
import QuestBoard from './components/QuestBoard'
import TitlesManager from './components/TitlesManager'
import Leaderboards from './components/Leaderboards'
import DailyGoals from './components/DailyGoals'
import OnboardingManager from './components/OnboardingManager'
import OnboardingDetector from './components/OnboardingDetector'
import EventsPanel from './components/EventsPanel'
import ActivityFeed from './components/ActivityFeed'
import MetricsDashboard from './components/MetricsDashboard'
import { EvolutionPanel } from './components/EvolutionPanel'
import { RankCelebrationManager } from './components/RankCelebration'
import { useEffect } from 'react'
import { useHeroStore } from './store/heroStore'

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
        <a href="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </a>
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
        <div className="text-6xl mb-4">🏰</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para acessar o sistema de guildas.</p>
        <a href="/" className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition-colors">
          Voltar à Lista de Heróis
        </a>
      </div>
    );
  }
  
  return <GuildSystem hero={selectedHero} />;
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
        <a href="/" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition-colors">
          Voltar à Lista de Heróis
        </a>
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
        <a href="/" className="bg-amber-600 text-white px-6 py-2 rounded hover:bg-amber-700 transition-colors">
          Voltar à Lista de Heróis
        </a>
      </div>
    );
  }
  
  return <EvolutionPanel heroId={selectedHero.id} className="max-w-6xl mx-auto" />;
}

function App() {
  const { heroes, markCelebrationViewed } = useHeroStore();
  
  // Configuração de segurança básica
  useEffect(() => {
    // Prevenir ataques de clickjacking
    if (window.self !== window.top) {
      window.top.location = window.self.location;
    }
    
    // Configurar Content Security Policy via meta tag
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:;";
    document.head.appendChild(cspMeta);
  }, []);

  // Coletar todas as celebrações pendentes
  const allCelebrations = heroes.flatMap(hero => 
    hero.rankData.pendingCelebrations.map((celebration, index) => ({
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
      <OnboardingDetector />
      
      {/* Gerenciador de Celebrações de Rank */}
      {allCelebrations.length > 0 && (
        <RankCelebrationManager
          celebrations={allCelebrations}
          onCelebrationViewed={handleCelebrationViewed}
        />
      )}
      
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HeroList />} />
          <Route path="create" element={<HeroForm />} />
          <Route path="hero/:id" element={<HeroDetail />} />
          <Route path="progression" element={<HeroProgressionWrapper />} />
          <Route path="evolution" element={<EvolutionPanelWrapper />} />
          <Route path="guilds" element={<GuildSystemWrapper />} />
          <Route path="quests" element={<QuestBoard />} />
          <Route path="daily-goals" element={<DailyGoalsWrapper />} />
          <Route path="events" element={<EventsPanel />} />
          <Route path="activities" element={<ActivityFeed />} />
          <Route path="tutorial" element={<OnboardingManager />} />
          <Route path="/titles" element={<TitlesManager />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="metrics" element={<MetricsDashboard />} />
          <Route path="playtest" element={<PlaytestPanel />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
