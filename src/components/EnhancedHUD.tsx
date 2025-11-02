import React from 'react';
import { useHeroStore } from '../store/heroStore';
import { Hero } from '../types/hero';

interface EnhancedHUDProps {
  hero: Hero;
}

const EnhancedHUD: React.FC<EnhancedHUDProps> = ({ hero }) => {
  // Calculate XP for next level using the same logic as in the store
  const calculateXPForLevel = (level: number): number => {
    return level * 100 + (level - 1) * 50;
  };
  
  const currentLevelXP = calculateXPForLevel(hero.progression.level);
  const nextLevelXP = calculateXPForLevel(hero.progression.level + 1);
  const xpProgress = hero.progression.xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpPercentage = Math.max(0, Math.min(100, (xpProgress / xpNeeded) * 100));
  
  // Calculate stamina based on constitution and current HP
  const maxStamina = hero.attributes.constituicao * 5; // Base stamina on constitution
  const currentStamina = Math.floor((hero.derivedAttributes.currentHp || hero.derivedAttributes.hp) / hero.derivedAttributes.hp * maxStamina);
  const staminaPercentage = (currentStamina / maxStamina) * 100;
  
  const activeQuestId = hero.activeQuests[0]; // Get the first active quest ID
  
  const getStaminaColor = (stamina: number) => {
    if (stamina >= 70) return 'bg-green-500';
    if (stamina >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getXPColor = (progress: number) => {
    if (progress >= 80) return 'bg-blue-500';
    if (progress >= 50) return 'bg-blue-400';
    return 'bg-blue-300';
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 min-w-80 shadow-xl">
      {/* Hero Level and Name */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {hero.progression.level}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{hero.name}</div>
            <div className="text-gray-400 text-xs">{hero.class}</div>
          </div>
        </div>
        <div className="text-amber-400 text-lg">⚡</div>
      </div>

      {/* XP Progress */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-blue-400 text-xs font-medium">Experiência</span>
          <span className="text-gray-300 text-xs">
            {xpProgress}/{xpNeeded} XP
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getXPColor(xpPercentage)}`}
            style={{ width: `${xpPercentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {xpPercentage.toFixed(1)}% para o nível {hero.progression.level + 1}
        </div>
      </div>

      {/* Stamina */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-green-400 text-xs font-medium">Stamina</span>
          <span className="text-gray-300 text-xs">{currentStamina}/{maxStamina}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStaminaColor(hero.stamina)}`}
            style={{ width: `${staminaPercentage}%` }}
          />
        </div>
        {hero.stamina < 30 && (
          <div className="text-xs text-red-400 mt-1 flex items-center">
            ⚠️ Stamina baixa - Descanse para recuperar
          </div>
        )}
      </div>

      {/* Active Quest */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-purple-400 text-xs font-medium">Missão Ativa</span>
          {activeQuestId && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs">Em Progresso</span>
            </div>
          )}
        </div>
        
        {activeQuestId ? (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 text-xs font-medium">Missão Ativa</span>
              <span className="text-gray-400 text-xs">⚔️</span>
            </div>
            <div className="text-white text-sm font-medium mb-1 truncate">
              Missão em Andamento
            </div>
            <div className="text-gray-400 text-xs mb-2">
              Você tem uma missão ativa
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">Em progresso</span>
              </div>
              <span className="text-gray-500">⭐</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-sm">Nenhuma missão ativa</div>
            <div className="text-gray-500 text-xs mt-1">Visite o Quadro de Missões</div>
          </div>
        )}
      </div>

      {/* Daily Goals Preview */}
      {hero.dailyGoals && hero.dailyGoals.length > 0 && (
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white text-sm font-medium flex items-center gap-1">
              🎯 Metas Diárias
            </div>
            <div className="text-xs text-gray-400">
              {hero.dailyGoals.filter(g => g.completed).length}/{hero.dailyGoals.length}
            </div>
          </div>
          <div className="space-y-1">
            {hero.dailyGoals.slice(0, 2).map((goal) => {
              const progressPercentage = (goal.progress / goal.maxProgress) * 100;
              return (
                <div key={goal.id} className="bg-gray-800 rounded p-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`text-gray-300 ${goal.completed ? 'line-through' : ''}`}>
                      {goal.description}
                    </span>
                    {goal.completed && <span className="text-green-400">✓</span>}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        goal.completed ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {hero.dailyGoals.length > 2 && (
              <div className="text-center text-xs text-gray-500 mt-1">
                +{hero.dailyGoals.length - 2} mais metas
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="border-t border-gray-700 pt-3 mt-3">
        <div className="grid grid-cols-3 gap-2 text-center" data-testid="hero-stats">
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-yellow-400 text-lg">🪙</div>
            <div className="text-white text-sm font-medium">{hero.progression.gold}</div>
            <div className="text-gray-400 text-xs">Ouro</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-green-400 text-lg">✅</div>
            <div className="text-white text-sm font-medium">{hero.completedQuests.length}</div>
            <div className="text-gray-400 text-xs">Missões</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-purple-400 text-lg">👑</div>
            <div className="text-white text-sm font-medium">{hero.titles?.length || 0}</div>
            <div className="text-gray-400 text-xs">Títulos</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedHUD;