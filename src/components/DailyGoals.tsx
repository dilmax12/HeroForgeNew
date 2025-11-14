/**
 * Componente de Mini-Metas Diárias
 */

import React, { useEffect, useRef } from 'react';
import { useHeroStore } from '../store/heroStore';
import { DailyGoal } from '../types/hero';
import { 
  getDailyGoalCategoryIcon, 
  getDailyGoalDifficultyColor, 
  getDailyGoalRewards 
} from '../utils/dailyGoalsSystem';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';

interface DailyGoalsProps {
  heroId: string;
}

export const DailyGoals: React.FC<DailyGoalsProps> = ({ heroId }) => {
  const { 
    heroes, 
    generateDailyGoalsForHero, 
    completeDailyGoal, 
    cleanupExpiredGoals 
  } = useHeroStore();

  const hero = heroes.find(h => h.id === heroId);
  const initializedRef = useRef<Set<string>>(new Set());
  const { activeSeasonalTheme } = useMonetizationStore();
  
  useEffect(() => {
    if (!heroId || initializedRef.current.has(heroId)) return;

    // Get the current hero state at the time of effect execution
    const currentHero = heroes.find(h => h.id === heroId);
    if (!currentHero) return;

    const now = new Date();
    
    // Only cleanup if there are actually expired goals
    const hasExpiredGoals = currentHero.dailyGoals && currentHero.dailyGoals.length > 0 && 
      currentHero.dailyGoals.some(goal => {
        const exp = typeof (goal.expiresAt as any) === 'string' 
          ? new Date(goal.expiresAt as unknown as string) 
          : (goal.expiresAt as Date);
        return exp <= now;
      });
    
    // Generate daily goals if hero doesn't have any or if it's a new day
    const hasValidGoals = currentHero.dailyGoals && currentHero.dailyGoals.length > 0 && 
      currentHero.dailyGoals.some(goal => {
        const exp = typeof (goal.expiresAt as any) === 'string' 
          ? new Date(goal.expiresAt as unknown as string) 
          : (goal.expiresAt as Date);
        return exp > now;
      });

    // Mark this hero as initialized first to prevent re-execution
    initializedRef.current.add(heroId);
    
    // Perform async operations after marking as initialized
    if (hasExpiredGoals) {
      setTimeout(() => cleanupExpiredGoals(heroId), 0);
    }

    if (!hasValidGoals) {
      setTimeout(() => generateDailyGoalsForHero(heroId), 0);
    }
  }, [heroId]);

  // Verificação periódica para expiração/renovação (a cada 60s)
  useEffect(() => {
    if (!heroId) return;
    const interval = setInterval(() => {
      const currentHero = heroes.find(h => h.id === heroId);
      if (!currentHero) return;
      const now = new Date();
      const hasValidGoals = currentHero.dailyGoals && currentHero.dailyGoals.length > 0 && 
        currentHero.dailyGoals.some(goal => {
          const exp = typeof (goal.expiresAt as any) === 'string' 
            ? new Date(goal.expiresAt as unknown as string) 
            : (goal.expiresAt as Date);
          return exp > now;
        });
      if (!hasValidGoals) {
        cleanupExpiredGoals(heroId);
        generateDailyGoalsForHero(heroId);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [heroId, heroes]);

  if (!hero || !hero.dailyGoals || hero.dailyGoals.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🎯 Metas Diárias
        </h3>
        <div className="text-gray-400 text-center py-8">
          <div className="text-4xl mb-2">⏳</div>
          <p>Gerando suas metas diárias...</p>
        </div>
      </div>
    );
  }

  const handleClaimReward = (goal: DailyGoal) => {
    if (goal.completed) {
      completeDailyGoal(heroId, goal.id);
    }
  };

  const getTimeRemaining = (expiresAt: Date | string): string => {
    const now = new Date();
    const expDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    const timeLeft = expDate.getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expirado';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const completedGoals = hero.dailyGoals.filter(g => g.completed);
  const claimableGoals = hero.dailyGoals.filter(g => g.completed && !g.claimed);
  const totalGoals = hero.dailyGoals.length;
  const completionPercentage = totalGoals > 0 ? (completedGoals.length / totalGoals) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          🎯 Metas Diárias
        </h3>
        <div className="text-right">
          <div className="text-sm text-gray-400">
            Progresso: {completedGoals.length}/{totalGoals}
          </div>
          <div className="w-24 bg-gray-700 rounded-full h-2 mt-1">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="mt-2 inline-flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-gray-700 text-orange-300 border border-orange-500/40">
              🔥 Streak: {hero.stats?.dailyCompletionStreak || 0}
            </span>
            <button
              onClick={() => { cleanupExpiredGoals(heroId); generateDailyGoalsForHero(heroId); }}
              className={`px-2 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white border border-white/10 hover:brightness-110 flex items-center gap-2`}
            >
              {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
              <span>♻️ Atualizar Metas</span>
            </button>
            {claimableGoals.length > 0 && (
              <button
                onClick={() => claimableGoals.forEach(g => completeDailyGoal(heroId, g.id))}
                className={`px-2 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white border border-white/10 hover:brightness-110 flex items-center gap-2`}
              >
                {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
                <span>🎁 Coletar Tudo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {hero.dailyGoals.map((goal) => {
          const rewards = getDailyGoalRewards(goal);
          const icon = getDailyGoalCategoryIcon(goal.id);
          const difficultyColor = getDailyGoalDifficultyColor(goal.id);
          const progressPercentage = (goal.progress / goal.maxProgress) * 100;
          const timeRemaining = getTimeRemaining(goal.expiresAt);
          
          return (
            <div 
              key={goal.id}
              className={`bg-gray-700 rounded-lg p-4 border-l-4 transition-all duration-300 ${
                goal.completed 
                  ? 'border-green-500 bg-green-900/20' 
                  : 'border-gray-600 hover:border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{icon}</span>
                    <h4 className={`font-semibold ${difficultyColor}`}>
                      {goal.description}
                    </h4>
                    {goal.completed && !goal.claimed && (
                      <span className="text-green-400 text-sm">✓ Completa</span>
                    )}
                    {goal.claimed && (
                      <span className="text-blue-300 text-sm">🎁 Coletado</span>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                      <span>Progresso: {goal.progress}/{goal.maxProgress}</span>
                      <span>Expira em: {timeRemaining}</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          goal.completed 
                            ? 'bg-green-500' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <span>⭐</span>
                      <span>{rewards.xp} XP</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <span>💰</span>
                      <span>{rewards.gold} Ouro</span>
                    </div>
                    {rewards.items && rewards.items.length > 0 && (
                      <div className="flex items-center gap-1 text-purple-400">
                        <span>🎁</span>
                        <span>{rewards.items.length} Item(s)</span>
                      </div>
                    )}
                  </div>
                </div>

                {goal.completed && !goal.claimed && (
                  <button
                    onClick={() => handleClaimReward(goal)}
                    className={`ml-4 bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 hover:brightness-110`}
                  >
                    <span>{(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || '🎁'}</span>
                    <span>Coletar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completedGoals.length === totalGoals && totalGoals > 0 && (
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <h4 className="text-white font-bold mb-1">Parabéns!</h4>
          <p className="text-purple-100 text-sm">
            Você completou todas as metas diárias! Volte amanhã para novas metas.
          </p>
        </div>
      )}

      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
          💡 Dicas
        </h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Complete missões para progredir em várias metas</li>
          <li>• Metas mais difíceis oferecem recompensas maiores</li>
          <li>• A meta "Dia Perfeito" oferece bônus especiais</li>
          <li>• Novas metas são geradas a cada dia</li>
        </ul>
      </div>
    </div>
  );
};

export default DailyGoals;
