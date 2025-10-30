import React, { useState, useEffect } from 'react';
import { OnboardingFlow } from '../types/onboarding';
import { onboardingManager, ONBOARDING_FLOWS } from '../utils/onboardingSystem';
import OnboardingOverlay from './OnboardingOverlay';

const OnboardingManager: React.FC = () => {
  const [availableFlows, setAvailableFlows] = useState<OnboardingFlow[]>([]);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });

  useEffect(() => {
    // Load saved state
    onboardingManager.loadState();
    
    // Update available flows
    updateAvailableFlows();
    updateProgress();

    const handleFlowCompleted = () => {
      updateAvailableFlows();
      updateProgress();
      setIsOnboardingActive(false);
    };

    onboardingManager.on('flow-completed', handleFlowCompleted);

    return () => {
      onboardingManager.off('flow-completed', handleFlowCompleted);
    };
  }, []);

  const updateAvailableFlows = () => {
    setAvailableFlows(onboardingManager.getAvailableFlows());
  };

  const updateProgress = () => {
    setProgress(onboardingManager.getProgress());
  };

  const startFlow = (flowId: string) => {
    const success = onboardingManager.startFlow(flowId);
    if (success) {
      setIsOnboardingActive(true);
    }
  };

  const handleCloseOnboarding = () => {
    setIsOnboardingActive(false);
    onboardingManager.saveState();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'beginner': return '🌱';
      case 'intermediate': return '⚡';
      case 'advanced': return '🏆';
      default: return '📚';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCompletedFlows = () => {
    return ONBOARDING_FLOWS.filter(flow => onboardingManager.isFlowCompleted(flow.id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            🎓 Centro de Aprendizagem
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Domine o HeroForge com nossos tutoriais interativos
          </p>
          
          {/* Overall Progress */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span>Progresso Geral</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {progress.completed} de {progress.total} passos concluídos
            </div>
          </div>
        </div>

        {/* Available Flows */}
        {availableFlows.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📋 Tutoriais Disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableFlows.map(flow => (
                <div
                  key={flow.id}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getCategoryIcon(flow.category)}</span>
                      <div>
                        <h3 className="font-bold text-lg">{flow.name}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(flow.category)}`}>
                          {flow.category === 'beginner' && 'Iniciante'}
                          {flow.category === 'intermediate' && 'Intermediário'}
                          {flow.category === 'advanced' && 'Avançado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4">
                    {flow.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {flow.steps.length} passos
                    </span>
                    <button
                      onClick={() => startFlow(flow.id)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm font-medium"
                    >
                      Iniciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Flows */}
        {getCompletedFlows().length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">✅ Tutoriais Concluídos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getCompletedFlows().map(flow => (
                <div
                  key={flow.id}
                  className="bg-green-900/20 backdrop-blur-sm rounded-lg p-6 border border-green-500/30"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h3 className="font-bold text-lg text-green-400">{flow.name}</h3>
                        <span className="text-xs text-green-300">Concluído</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4">
                    {flow.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {flow.steps.length} passos
                    </span>
                    <button
                      onClick={() => startFlow(flow.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                    >
                      Revisar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No tutorials available */}
        {availableFlows.length === 0 && getCompletedFlows().length === ONBOARDING_FLOWS.length && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Parabéns!</h2>
            <p className="text-gray-300">
              Você concluiu todos os tutoriais disponíveis. Você é um verdadeiro mestre do HeroForge!
            </p>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">💡 Dicas Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-400">⚡</span>
              <div>
                <div className="font-medium">Complete metas diárias</div>
                <div className="text-gray-400">Ganhe bônus extras todos os dias</div>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-400">🏰</span>
              <div>
                <div className="font-medium">Una-se a uma guilda</div>
                <div className="text-gray-400">Colabore com outros heróis</div>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-purple-400">🛡️</span>
              <div>
                <div className="font-medium">Melhore seus equipamentos</div>
                <div className="text-gray-400">Aumente suas estatísticas</div>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-400">📈</span>
              <div>
                <div className="font-medium">Monitore seu progresso</div>
                <div className="text-gray-400">Use os rankings para se comparar</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Overlay */}
      <OnboardingOverlay 
        isVisible={isOnboardingActive}
        onClose={handleCloseOnboarding}
      />
    </div>
  );
};

export default OnboardingManager;