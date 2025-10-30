import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import OnboardingOverlay from './OnboardingOverlay';
import { onboardingManager } from '../utils/onboardingSystem';

const OnboardingDetector: React.FC = () => {
  const navigate = useNavigate();
  const { shouldShowOnboarding, markOnboardingShown, heroes } = useHeroStore();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if we should show onboarding for new users
    const checkOnboarding = () => {
      if (shouldShowOnboarding()) {
        setShowWelcomeModal(true);
      }
    };

    // Small delay to ensure the store is loaded
    const timer = setTimeout(checkOnboarding, 1000);
    return () => clearTimeout(timer);
  }, [shouldShowOnboarding]);

  const handleStartOnboarding = () => {
    setShowWelcomeModal(false);
    markOnboardingShown();
    
    // Load onboarding state and start first flow
    onboardingManager.loadState();
    const success = onboardingManager.startFlow('first-steps');
    if (success) {
      setShowOnboarding(true);
    }
  };

  const handleSkipOnboarding = () => {
    setShowWelcomeModal(false);
    markOnboardingShown();
  };

  const handleGoToTutorial = () => {
    setShowWelcomeModal(false);
    markOnboardingShown();
    navigate('/tutorial');
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    onboardingManager.saveState();
  };

  return (
    <>
      {/* Welcome Modal for New Users */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Bem-vindo ao HeroForge!
              </h2>
              <p className="text-gray-600">
                Transforme suas tarefas diárias em aventuras épicas! 
                Gostaria de fazer um tutorial rápido para aprender o básico?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartOnboarding}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                🚀 Sim, vamos começar!
              </button>
              
              <button
                onClick={handleGoToTutorial}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                📚 Ver todos os tutoriais
              </button>
              
              <button
                onClick={handleSkipOnboarding}
                className="w-full text-gray-500 py-2 px-4 rounded-lg hover:text-gray-700 transition-all duration-200 text-sm"
              >
                Pular por agora
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-800">
                💡 <strong>Dica:</strong> Você pode acessar os tutoriais a qualquer momento 
                através do menu de navegação rápida!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Overlay */}
      <OnboardingOverlay 
        isVisible={showOnboarding}
        onClose={handleCloseOnboarding}
      />
    </>
  );
};

export default OnboardingDetector;