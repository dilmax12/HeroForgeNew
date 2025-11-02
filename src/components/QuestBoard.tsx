import React, { useState, useEffect } from 'react';
import { useHeroStore } from '../store/heroStore';
import { Quest, QuestDifficulty, Hero } from '../types/hero';
import { generateQuestBoard } from '../utils/quests';
import { generateNarrativeMission } from '../utils/narrativeMissions';
import NarrativeQuest from './NarrativeQuest';
import { getClassIcon } from '../styles/medievalTheme';
import { ELEMENT_INFO } from '../utils/elementSystem';

// Componente para seleção de herói
const HeroSelector: React.FC<{ 
  heroes: Hero[], 
  onHeroSelect: (heroId: string) => void 
}> = ({ heroes, onHeroSelect }) => {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const selectedHeroId = selectedHero?.id || null;

  const handleClick = (heroId: string) => {
    onHeroSelect(heroId);
  };

  if (heroes.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-800/50 rounded-lg border border-amber-500/30">
        <div className="text-4xl mb-4">🦸</div>
        <h3 className="text-xl font-bold text-amber-400 mb-2">Nenhum Herói Criado</h3>
        <p className="text-gray-300 mb-4">Você precisa criar um herói primeiro para acessar as missões.</p>
        <a 
          href="/" 
          className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          Criar Primeiro Herói
        </a>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-amber-500/30 p-6">
      <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">Escolha seu Herói</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {heroes.map(hero => {
          const elementInfo = ELEMENT_INFO[hero.element];
          return (
            <div
              key={hero.id}
              onClick={() => handleClick(hero.id)}
              className={`bg-slate-700/50 rounded-lg p-4 border transition-all cursor-pointer group ${
                selectedHeroId === hero.id 
                  ? 'border-amber-500 bg-amber-900/20' 
                  : 'border-slate-600 hover:border-amber-500 hover:bg-slate-700/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{hero.avatar}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors">
                    {hero.name}
                  </h4>
                  <div className="text-sm text-gray-300 flex items-center space-x-2">
                    <span>{getClassIcon(hero.class)} {hero.class}</span>
                    <span className={elementInfo.color}>
                      {elementInfo.icon} {hero.element}
                    </span>
                  </div>
                  <div className="text-xs text-amber-600">
                    Nível {hero.progression.level} • {hero.progression.experience} XP
                  </div>
                  {selectedHeroId === hero.id && (
                    <div className="text-xs text-green-400 mt-1 font-medium">
                      ✓ Herói selecionado! Carregando missões...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const QuestBoard: React.FC = () => {
  const { 
    getSelectedHero, 
    availableQuests, 
    refreshQuests, 
    acceptQuest, 
    completeQuest,
    selectHero,
    heroes
  } = useHeroStore();
  
  const selectedHero = getSelectedHero();
  
  const [selectedTab, setSelectedTab] = useState<'available' | 'narrative' | 'active' | 'completed'>('available');
  const [selectedNarrativeQuest, setSelectedNarrativeQuest] = useState<Quest | null>(null);
  const [narrativeQuests, setNarrativeQuests] = useState<Quest[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Selecionar automaticamente o primeiro herói se não há nenhum selecionado
  useEffect(() => {
    if (!selectedHero && heroes.length > 0) {
      console.log('Nenhum herói selecionado, selecionando automaticamente o primeiro:', heroes[0].name);
      selectHero(heroes[0].id);
      refreshQuests(heroes[0].progression.level);
    }
  }, [selectedHero?.id, heroes.length]);

  // Monitorar mudanças no herói selecionado
  useEffect(() => {
    console.log('Estado do herói selecionado mudou:', selectedHero?.name || 'Nenhum');
  }, [selectedHero]);

  // Gerar missões narrativas quando o herói for selecionado
  useEffect(() => {
    if (selectedHero) {
      const newNarrativeQuests = [];
      // Gerar 2-3 missões narrativas baseadas no nível do herói
      for (let i = 0; i < Math.min(3, Math.max(1, Math.floor(selectedHero.progression.level / 2))); i++) {
        newNarrativeQuests.push(generateNarrativeMission(selectedHero.progression.level));
      }
      setNarrativeQuests(newNarrativeQuests);
    }
  }, [selectedHero?.id, selectedHero?.progression.level]);

  const handleHeroSelect = (heroId: string) => {
    console.log('Clique detectado! Selecionando herói:', heroId);
    selectHero(heroId);
    
    // Atualizar missões para o herói selecionado
    const selectedHeroData = heroes.find(h => h.id === heroId);
    if (selectedHeroData) {
      console.log('Atualizando missões para herói:', selectedHeroData.name, 'Level:', selectedHeroData.progression.level);
      refreshQuests(selectedHeroData.progression.level);
    }
    
    console.log('Herói selecionado, forçando atualização...');
    setForceUpdate(prev => prev + 1);
    
    // Verificar se a seleção funcionou
    setTimeout(() => {
      const currentSelected = heroes.find(h => h.id === heroId);
      console.log('Herói encontrado:', currentSelected?.name);
    }, 100);
  };

  const handleNarrativeQuestComplete = (questId: string, outcome: any) => {
    // Aplicar recompensas ao herói
    if (outcome.success && selectedHero) {
      // Aqui você aplicaria as recompensas usando o store
      console.log('Aplicando recompensas:', outcome.rewards);
      
      // Remover a missão narrativa da lista
      setNarrativeQuests(prev => prev.filter(q => q.id !== questId));
    }
    setSelectedNarrativeQuest(null);
  };

  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📜</div>
          <h2 className="text-3xl font-bold text-amber-400 mb-4">Quadro de Missões</h2>
          <p className="text-gray-300 mb-6">Selecione um herói para ver as missões disponíveis</p>
        </div>
        
        <HeroSelector heroes={heroes} onHeroSelect={handleHeroSelect} />
      </div>
    );
  }

  const getDifficultyColor = (difficulty: QuestDifficulty) => {
    switch (difficulty) {
      case 'rapida': return 'text-green-400 bg-green-900/20';
      case 'padrao': return 'text-yellow-400 bg-yellow-900/20';
      case 'epica': return 'text-purple-400 bg-purple-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getDifficultyLabel = (difficulty: QuestDifficulty) => {
    switch (difficulty) {
      case 'rapida': return 'Rápida';
      case 'padrao': return 'Padrão';
      case 'epica': return 'Épica';
      default: return 'Desconhecido';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'contrato': return '📜';
      case 'caca': return '⚔️';
      case 'exploracao': return '🗺️';
      case 'historia': return '📖';
      default: return '❓';
    }
  };

  const canAcceptQuest = (quest: Quest) => {
    return selectedHero.progression.level >= quest.levelRequirement &&
           !selectedHero.activeQuests.some(q => q.id === quest.id);
  };

  const handleAcceptQuest = (quest: Quest) => {
    if (canAcceptQuest(quest) && selectedHero) {
      console.log('🎯 Aceitando missão:', quest.title, 'para herói:', selectedHero.name);
      acceptQuest(selectedHero.id, quest.id);
    }
  };

  const handleCompleteQuest = (questId: string) => {
    if (selectedHero) {
      console.log('✅ Completando missão:', questId, 'para herói:', selectedHero.name);
      completeQuest(selectedHero.id, questId);
    }
  };

  const renderQuestCard = (quest: Quest, isActive = false, isCompleted = false) => (
    <div key={quest.id} data-testid="quest-card" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-amber-500 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getTypeIcon(quest.type)}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{quest.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
                {getDifficultyLabel(quest.difficulty)}
              </span>
              <span className="text-gray-400 text-sm">Nível {quest.levelRequirement}+</span>
            </div>
          </div>
        </div>
        {quest.timeLimit && (
          <div className="text-right">
            <span className="text-red-400 text-sm">⏰ {quest.timeLimit}h</span>
          </div>
        )}
      </div>

      <p className="text-gray-300 mb-4">{quest.description}</p>

      {quest.objectives && quest.objectives.length > 0 && (
        <div className="mb-4">
          <h4 className="text-amber-400 font-medium mb-2">Objetivos:</h4>
          <ul className="space-y-1">
            {quest.objectives.map((objective, index) => (
              <li key={index} className="text-gray-300 text-sm flex items-center space-x-2">
                <span className="text-amber-400">•</span>
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-amber-400 font-medium mb-2">Recompensas:</h4>
        <div className="flex items-center space-x-4 text-sm">
          <span className="flex items-center space-x-1">
            <span>🪙</span>
            <span>{quest.rewards?.gold || 0} ouro</span>
          </span>
          <span className="flex items-center space-x-1">
            <span>⭐</span>
            <span>{quest.rewards?.xp || 0} XP</span>
          </span>
          {quest.rewards?.items && quest.rewards.items.length > 0 && (
            <span className="flex items-center space-x-1">
              <span>🎁</span>
              <span>{quest.rewards.items.length} item(s)</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        {!isActive && !isCompleted && (
          <button
            onClick={() => handleAcceptQuest(quest)}
            disabled={!canAcceptQuest(quest)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              canAcceptQuest(quest)
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canAcceptQuest(quest) ? 'Aceitar Missão' : 'Requisitos não atendidos'}
          </button>
        )}
        {isActive && (
          <button
            onClick={() => handleCompleteQuest(quest.id)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
          >
            Completar Missão
          </button>
        )}
        {isCompleted && (
          <span className="px-4 py-2 bg-gray-600 rounded-md font-medium text-gray-300">
            ✅ Concluída
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-amber-400">Quadro de Missões</h2>
        <button
          onClick={() => {
            console.log('🔄 Atualizando missões para herói:', selectedHero?.name, 'Level:', selectedHero?.progression.level);
            refreshQuests(selectedHero?.progression.level || 1);
          }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md font-medium transition-colors"
        >
          🔄 Atualizar Missões
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setSelectedTab('available')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            selectedTab === 'available'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Disponíveis ({availableQuests.length})
        </button>
        <button
          onClick={() => setSelectedTab('narrative')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            selectedTab === 'narrative'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Narrativas ({narrativeQuests.length})
        </button>
        <button
          onClick={() => setSelectedTab('active')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            selectedTab === 'active'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Ativas ({selectedHero.activeQuests.length})
        </button>
        <button
          onClick={() => setSelectedTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            selectedTab === 'completed'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Concluídas ({selectedHero.completedQuests.length})
        </button>
      </div>

      {/* Quest Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedTab === 'available' && availableQuests.map(quest => renderQuestCard(quest))}
        {selectedTab === 'narrative' && narrativeQuests.map(quest => (
          <div key={quest.id} className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg p-6 border border-purple-500 hover:border-purple-400 transition-all">
            {renderQuestCard(quest)}
            <button
              onClick={() => setSelectedNarrativeQuest(quest)}
              className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-medium transition-colors"
            >
              Iniciar Missão Narrativa
            </button>
          </div>
        ))}
        {selectedTab === 'active' && selectedHero.activeQuests.map(quest => renderQuestCard(quest, true))}
        {selectedTab === 'completed' && selectedHero.completedQuests.map(quest => renderQuestCard(quest, false, true))}
      </div>

      {selectedTab === 'available' && availableQuests.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400">Nenhuma missão disponível no momento.</p>
          <button
            onClick={() => {
              console.log('🎲 Gerando novas missões para herói:', selectedHero?.name, 'Level:', selectedHero?.progression.level);
              refreshQuests(selectedHero?.progression.level || 1);
            }}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md font-medium transition-colors"
          >
            Gerar Novas Missões
          </button>
        </div>
      )}

      {selectedTab === 'active' && selectedHero.activeQuests.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400">Você não tem missões ativas.</p>
        </div>
      )}

      {selectedTab === 'completed' && selectedHero.completedQuests.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400">Você ainda não completou nenhuma missão.</p>
        </div>
      )}

      {selectedTab === 'narrative' && narrativeQuests.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400">Nenhuma missão narrativa disponível no momento.</p>
        </div>
      )}

      {/* Narrative Quest Modal */}
      {selectedNarrativeQuest && (
        <NarrativeQuest
          quest={selectedNarrativeQuest}
          hero={selectedHero}
          onComplete={handleNarrativeQuestComplete}
          onClose={() => setSelectedNarrativeQuest(null)}
        />
      )}
    </div>
  );
};

export default QuestBoard;