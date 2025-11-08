/**
 * Componente de Missões Aprimoradas
 * Interface para o novo sistema de decisões e consequências
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHeroStore } from '../store/heroStore';
import { EnhancedQuest, EnhancedQuestChoice, Hero } from '../types/hero';
import { enhancedMissionGenerator } from '../utils/enhancedMissions';
import { worldStateManager } from '../utils/worldState';
import { resumeAudioContextIfNeeded, playSuccess, playFailure } from '../utils/audioEffects';

interface EnhancedQuestBoardProps {
  hero: Hero;
}

export const EnhancedQuestBoard: React.FC<EnhancedQuestBoardProps> = ({ hero }) => {
  const [availableMissions, setAvailableMissions] = useState<EnhancedQuest[]>([]);
  const [selectedMission, setSelectedMission] = useState<EnhancedQuest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { updateHero, gainXP, gainGold } = useHeroStore();

  // Gerar missões quando o componente carrega
  useEffect(() => {
    generateMissions();
  }, [hero.id]);

  // Atualizar stamina periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      worldStateManager.updateStamina(hero);
      updateHero(hero.id, { stamina: hero.stamina });
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [hero.id]);

  const generateMissions = () => {
    const missions: EnhancedQuest[] = [];
    
    // Gerar 3-5 missões baseadas no nível e estado do mundo
    const missionCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < missionCount; i++) {
      const mission = enhancedMissionGenerator.generateEnhancedMission(hero);
      missions.push(mission);
    }
    
    setAvailableMissions(missions);
  };

  const handleChoiceSelection = async (mission: EnhancedQuest, choice: EnhancedQuestChoice) => {
    setIsProcessing(true);
    
    try {
      resumeAudioContextIfNeeded();
      const result = enhancedMissionGenerator.processEnhancedChoice(hero, mission, choice.id);
      
      // Aplicar recompensas/penalidades
      if (result.results.appliedEffects) {
        result.results.appliedEffects.forEach((effect: any) => {
          switch (effect.type) {
            case 'gold':
              gainGold(hero.id, effect.value || 0);
              break;
            case 'xp':
              gainXP(hero.id, effect.value || 0);
              break;
          }
        });
      }
      
      // Atualizar herói com novo WorldState
      updateHero(hero.id, { 
        worldState: hero.worldState,
        stamina: hero.stamina 
      });
      
      setLastResult(result);
      setSelectedMission(null);
      // Áudio de feedback simples
      playSuccess();
      
      // Regenerar missões após completar uma
      setTimeout(() => {
        generateMissions();
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao processar escolha:', error);
      // Áudio de falha
      resumeAudioContextIfNeeded();
      playFailure();
    } finally {
      setIsProcessing(false);
    }
  };

  const getStaminaColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 70) return 'text-green-400';
    if (percentage > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const canAffordMission = (mission: EnhancedQuest) => {
    return worldStateManager.canAcceptQuest(hero, mission.staminaCost || 30);
  };

  return (
    <div className="space-y-6">
      {/* Header com Stamina */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Missões Narrativas</h2>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Stamina</div>
              <div className={`text-lg font-bold ${getStaminaColor(hero.stamina?.current || 100, hero.stamina?.max || 100)}`}>
                {hero.stamina?.current || 100} / {hero.stamina?.max || 100}
              </div>
            </div>
            <button
              onClick={generateMissions}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Atualizar Missões
            </button>
          </div>
        </div>
        
        {/* Barra de Stamina */}
        <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${((hero.stamina?.current || 100) / (hero.stamina?.max || 100)) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Resultado da Última Missão */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-lg ${lastResult.success ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'} border`}
          >
            <h3 className="font-bold text-white mb-2">
              {lastResult.success ? '✅ Sucesso!' : '❌ Falha'}
            </h3>
            <p className="text-gray-300 whitespace-pre-line">{lastResult.narrative}</p>
            
            {lastResult.results.appliedEffects && lastResult.results.appliedEffects.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-sm font-semibold text-gray-400">Efeitos:</div>
                {lastResult.results.appliedEffects.map((effect: any, index: number) => (
                  <div key={index} className="text-sm text-gray-300">
                    • {effect.description || `${effect.type}: ${effect.value}`}
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setLastResult(null)}
              className="mt-3 text-sm text-gray-400 hover:text-white"
            >
              Fechar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Missões */}
      <div className="grid gap-4">
        {availableMissions.map((mission) => (
          <motion.div
            key={mission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${
              selectedMission?.id === mission.id 
                ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-xl font-bold text-white">{mission.title}</h3>
                <p className="text-gray-400 text-sm">
                  {mission.location} • Nível {mission.levelRequirement}+ • 
                  <span className={`ml-1 ${canAffordMission(mission) ? 'text-green-400' : 'text-red-400'}`}>
                    {mission.staminaCost || 30} Stamina
                  </span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold">{mission.rewards.gold} ouro</div>
                <div className="text-blue-400 font-bold">{mission.rewards.xp} XP</div>
              </div>
            </div>
            
            <p className="text-gray-300 mb-4">{mission.description}</p>
            
            {mission.narrative && (
              <div className="bg-gray-900 rounded p-3 mb-4">
                <p className="text-gray-300 italic">{mission.narrative.intro}</p>
                {mission.narrative.situation && (
                  <p className="text-gray-400 text-sm mt-2">{mission.narrative.situation}</p>
                )}
              </div>
            )}
            
            {selectedMission?.id === mission.id ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-white">Escolha sua ação:</h4>
                {mission.enhancedChoices?.map((choice) => (
                  <motion.button
                    key={choice.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChoiceSelection(mission, choice)}
                    disabled={isProcessing || !canAffordMission(mission)}
                    className={`w-full p-3 rounded border-2 text-left transition-all ${
                      !canAffordMission(mission)
                        ? 'border-gray-600 bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'border-gray-600 bg-gray-700 hover:border-blue-500 hover:bg-gray-600 text-white'
                    }`}
                  >
                    <div className="font-semibold">{choice.text}</div>
                    <div className="text-sm text-gray-400 mt-1">{choice.description}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Dificuldade: {choice.riskThreshold}% • 
                      {choice.rollModifiers?.attribute && (
                        <span className="ml-1">
                          Usa {choice.rollModifiers.attribute.charAt(0).toUpperCase() + choice.rollModifiers.attribute.slice(1)}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
                <button
                  onClick={() => setSelectedMission(null)}
                  className="w-full p-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedMission(mission)}
                disabled={!canAffordMission(mission)}
                className={`w-full p-3 rounded font-semibold transition-all ${
                  !canAffordMission(mission)
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {!canAffordMission(mission) ? 'Stamina Insuficiente' : 'Ver Opções'}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Loading State */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Processando sua escolha...</p>
          </div>
        </div>
      )}
    </div>
  );
};
