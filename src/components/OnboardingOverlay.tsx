import React, { useState, useEffect, useRef } from 'react';
import { OnboardingStep } from '../types/onboarding';
import { onboardingManager } from '../utils/onboardingSystem';
import { useHeroStore } from '../store/heroStore';

interface OnboardingOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ isVisible, onClose }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const { gainXP, gainGold, addItem } = useHeroStore();

  useEffect(() => {
    const handleStepChanged = (data: { step: OnboardingStep | null }) => {
      setCurrentStep(data.step);
      if (data.step?.targetElement) {
        highlightElement(data.step.targetElement);
      } else {
        clearHighlight();
      }
    };

    const handleStepCompleted = (data: { step: OnboardingStep }) => {
      // Award rewards if any
      if (data.step.rewards) {
        const { xp, gold, items } = data.step.rewards;
        if (xp) gainXP(xp);
        if (gold) gainGold(gold);
        if (items) {
          items.forEach(itemId => addItem(itemId, 1));
        }
      }
    };

    const handleFlowCompleted = () => {
      onClose();
    };

    onboardingManager.on('step-changed', handleStepChanged);
    onboardingManager.on('step-completed', handleStepCompleted);
    onboardingManager.on('flow-completed', handleFlowCompleted);

    // Load initial state
    if (isVisible) {
      setCurrentStep(onboardingManager.getCurrentStep());
    }

    return () => {
      onboardingManager.off('step-changed', handleStepChanged);
      onboardingManager.off('step-completed', handleStepCompleted);
      onboardingManager.off('flow-completed', handleFlowCompleted);
    };
  }, [isVisible, onClose, gainXP, gainGold, addItem]);

  const highlightElement = (selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      setHighlightedElement(element);
      
      // Calculate tooltip position
      const rect = element.getBoundingClientRect();
      const position = calculateTooltipPosition(rect, currentStep?.position || 'bottom');
      setTooltipPosition(position);
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const clearHighlight = () => {
    setHighlightedElement(null);
  };

  const calculateTooltipPosition = (elementRect: DOMRect, position: string) => {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const offset = 20;

    switch (position) {
      case 'top':
        return {
          x: elementRect.left + elementRect.width / 2 - tooltipWidth / 2,
          y: elementRect.top - tooltipHeight - offset
        };
      case 'bottom':
        return {
          x: elementRect.left + elementRect.width / 2 - tooltipWidth / 2,
          y: elementRect.bottom + offset
        };
      case 'left':
        return {
          x: elementRect.left - tooltipWidth - offset,
          y: elementRect.top + elementRect.height / 2 - tooltipHeight / 2
        };
      case 'right':
        return {
          x: elementRect.right + offset,
          y: elementRect.top + elementRect.height / 2 - tooltipHeight / 2
        };
      default:
        return {
          x: window.innerWidth / 2 - tooltipWidth / 2,
          y: window.innerHeight / 2 - tooltipHeight / 2
        };
    }
  };

  const handleNext = () => {
    const hasNext = onboardingManager.nextStep();
    if (!hasNext) {
      onClose();
    }
  };

  const handlePrevious = () => {
    onboardingManager.previousStep();
  };

  const handleSkip = () => {
    if (currentStep?.skippable) {
      onboardingManager.skipStep();
    }
  };

  const handleClose = () => {
    onboardingManager.reset();
    onClose();
  };

  if (!isVisible || !currentStep) return null;

  const isCenter = currentStep.position === 'center' || !currentStep.targetElement;

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-auto" />
      
      {/* Highlight spotlight */}
      {highlightedElement && (
        <div
          className="absolute border-4 border-yellow-400 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: highlightedElement.getBoundingClientRect().left - 4,
            top: highlightedElement.getBoundingClientRect().top - 4,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            zIndex: 51
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-sm pointer-events-auto"
        style={{
          left: isCenter ? '50%' : tooltipPosition.x,
          top: isCenter ? '50%' : tooltipPosition.y,
          transform: isCenter ? 'translate(-50%, -50%)' : 'none',
          zIndex: 52
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {currentStep.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {currentStep.description}
          </p>
          <div className="text-sm text-gray-700">
            {currentStep.content}
          </div>
        </div>

        {/* Rewards preview */}
        {currentStep.rewards && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-xs font-medium text-yellow-800 mb-1">Recompensas:</div>
            <div className="flex items-center space-x-3 text-xs">
              {currentStep.rewards.xp && (
                <span className="text-blue-600">+{currentStep.rewards.xp} XP</span>
              )}
              {currentStep.rewards.gold && (
                <span className="text-yellow-600">+{currentStep.rewards.gold} 🪙</span>
              )}
              {currentStep.rewards.items && (
                <span className="text-purple-600">+{currentStep.rewards.items.length} itens</span>
              )}
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso</span>
            <span>{onboardingManager.getProgress().percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${onboardingManager.getProgress().percentage}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={handlePrevious}
              disabled={!onboardingManager.getCurrentStep()}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            {currentStep.skippable && (
              <button
                onClick={handleSkip}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
              >
                Pular
              </button>
            )}
          </div>
          
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            {onboardingManager.getCurrentStep() ? 'Próximo →' : 'Finalizar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;