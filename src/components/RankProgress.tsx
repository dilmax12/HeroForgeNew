// Componente de Progresso de Rank - HeroForge v2.2

import React from 'react';
import { RankProgress as RankProgressType, RANK_CONFIG, RANK_THRESHOLDS } from '../types/ranks';
import { Hero } from '../types/hero';
import { rankSystem } from '../utils/rankSystem';
import RankCard from './RankCard';

interface RankProgressProps {
  hero: Hero;
  progress: RankProgressType;
  showEstimate?: boolean;
  compact?: boolean;
}

export const RankProgress: React.FC<RankProgressProps> = ({
  hero,
  progress,
  showEstimate = true,
  compact = false
}) => {
  const currentRankInfo = RANK_CONFIG[progress.currentRank] || { name: String(progress.currentRank || ''), description: '' } as any;
  const nextRankInfo = progress.nextRank ? (RANK_CONFIG[progress.nextRank] || { name: String(progress.nextRank || ''), description: '' } as any) : null;
  const estimate = showEstimate ? rankSystem.estimateTimeToNextRank(hero) : null;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <RankCard rank={progress.currentRank} size="small" />
          {progress.nextRank && (
            <>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(progress.progressPercentage)}`}
                    style={{ width: `${progress.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 mt-1 text-center">
                  {Math.round(progress.progressPercentage)}%
                </div>
              </div>
              <RankCard rank={progress.nextRank} size="small" />
            </>
          )}
        </div>
        
        {progress.nextRank && (
          <div className="text-sm text-gray-400 text-center">
            {progress.canPromote ? '🎉 Pronto para promoção!' : `Próximo: ${nextRankInfo?.name}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Header com Ranks */}
      <div className="flex items-center justify-between">
        <div className="text-center">
          <RankCard rank={progress.currentRank} size="medium" />
          <div className="mt-2">
            <div className="font-semibold text-lg">{currentRankInfo?.name || 'Rank'}</div>
            <div className="text-sm text-gray-400">{currentRankInfo?.description || ''}</div>
          </div>
        </div>

        {progress.nextRank && (
          <>
            <div className="flex-1 mx-8">
              <div className="text-center mb-2">
                <span className="text-2xl">→</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4 relative">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${getProgressColor(progress.progressPercentage)}`}
                  style={{ width: `${progress.progressPercentage}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                  {Math.round(progress.progressPercentage)}%
                </div>
              </div>
              {estimate && (
                <div className="text-xs text-gray-400 mt-2 text-center">
                  {estimate.description}
                </div>
              )}
            </div>

            <div className="text-center">
              <RankCard 
                rank={progress.nextRank} 
                size="medium" 
                animated={progress.canPromote}
              />
              <div className="mt-2">
                <div className="font-semibold text-lg">{nextRankInfo?.name || 'Próximo Rank'}</div>
                <div className="text-sm text-gray-400">{nextRankInfo?.description || ''}</div>
              </div>
            </div>
          </>
        )}

        {!progress.nextRank && (
          <div className="text-center">
            <div className="text-6xl mb-2">👑</div>
            <div className="font-semibold text-xl text-yellow-400">Rank Máximo!</div>
            <div className="text-sm text-gray-400">Lenda Viva Alcançada</div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-4">
        {(() => {
          const thresholds = progress.nextRank ? RANK_THRESHOLDS[progress.nextRank] : undefined;
          const hasNext = !!progress.nextRank && !!thresholds;
          if (!hasNext) {
            return (
              <div className="text-center text-sm text-gray-400">Sem próximo rank — requisitos concluídos.</div>
            );
          }
          const missingXP = Math.max(0, (progress.requiredXP || 0) - (progress.currentXP || 0));
          const missingMissions = Math.max(0, (progress.requiredMissions || 0) - (progress.currentMissions || 0));
          const missingTitles = thresholds && typeof thresholds.titles === 'number' ? Math.max(0, thresholds.titles - (hero.titles?.length || 0)) : 0;
          const specials = Array.isArray(thresholds?.specialRequirements) ? thresholds!.specialRequirements! : [];
          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              <div className="text-sm text-gray-300">
                <div className="font-semibold">⚡ XP</div>
                <div className={missingXP > 0 ? 'text-red-400' : 'text-green-400'}>{missingXP > 0 ? `${missingXP.toLocaleString()} restante` : '✓'}</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="font-semibold">🗡️ Missões</div>
                <div className={missingMissions > 0 ? 'text-red-400' : 'text-green-400'}>{missingMissions > 0 ? `${missingMissions} restantes` : '✓'}</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="font-semibold">🏆 Títulos</div>
                <div className={missingTitles > 0 ? 'text-red-400' : 'text-green-400'}>{missingTitles > 0 ? `${missingTitles} restantes` : '✓'}</div>
              </div>
              <div className="text-sm text-gray-300">
                <div className="font-semibold">✨ Especiais</div>
                {specials.length > 0 ? (
                  <div className="text-red-400">{specials.map((s) => (s === 'legendary_quest' ? 'Missão lendária' : s === 'epic_achievement' ? 'Feito épico' : String(s))).join(' • ')}</div>
                ) : (
                  <div className="text-green-400">✓</div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Requisitos Detalhados */}
      {progress.nextRank && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* XP Progress */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">⚡ Experiência</span>
              <span className="text-sm text-gray-400">
                {progress.currentXP.toLocaleString()} / {progress.requiredXP.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-blue-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (progress.currentXP / progress.requiredXP) * 100)}%` 
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {progress.requiredXP - progress.currentXP > 0 
                ? `${(progress.requiredXP - progress.currentXP).toLocaleString()} XP restante`
                : 'Requisito cumprido ✓'
              }
            </div>
          </div>

          {/* Missions Progress */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">🗡️ Missões</span>
              <span className="text-sm text-gray-400">
                {progress.currentMissions} / {progress.requiredMissions}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (progress.currentMissions / progress.requiredMissions) * 100)}%` 
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {progress.requiredMissions - progress.currentMissions > 0 
                ? `${progress.requiredMissions - progress.currentMissions} missões restantes`
                : 'Requisito cumprido ✓'
              }
            </div>
          </div>

          {/* Additional Requirements */}
          {(() => {
            const thresholds = progress.nextRank ? RANK_THRESHOLDS[progress.nextRank] : undefined;
            if (!thresholds || typeof thresholds.titles !== 'number') return null;
            return (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">🏆 Títulos</span>
                <span className="text-sm text-gray-400">
                  {hero.titles?.length || 0} / {thresholds.titles}
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-purple-500 transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, ((hero.titles?.length || 0) / (thresholds.titles || 1)) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {(thresholds.titles || 0) - (hero.titles?.length || 0) > 0 
                  ? `${(thresholds.titles || 0) - (hero.titles?.length || 0)} títulos restantes`
                  : 'Requisito cumprido ✓'
                }
              </div>
            </div>
            );
          })()}

          {/* Special Requirements */}
          {(() => {
            const thresholds = progress.nextRank ? RANK_THRESHOLDS[progress.nextRank] : undefined;
            const reqs = thresholds?.specialRequirements;
            if (!Array.isArray(reqs) || reqs.length === 0) return null;
            return (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">✨ Requisitos Especiais</span>
              </div>
              <div className="space-y-1">
                {reqs.map((req, index) => (
                  <div key={index} className="text-sm text-gray-400">
                    {req === 'legendary_quest' && '🌟 Completar missão lendária'}
                    {req === 'epic_achievement' && '⚡ Conquistar feito épico'}
                  </div>
                ))}
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* Promotion Button */}
      {progress.canPromote && (
        <div className="text-center">
          <button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-yellow-900 font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            🎉 Promover para {nextRankInfo?.name}!
          </button>
        </div>
      )}

      {/* Current Stats Summary */}
      <div className="border-t border-gray-700 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{hero.progression.level}</div>
            <div className="text-sm text-gray-400">Nível</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{hero.progression.xp.toLocaleString()}</div>
            <div className="text-sm text-gray-400">XP Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{hero.stats.questsCompleted || 0}</div>
            <div className="text-sm text-gray-400">Missões</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{hero.titles?.length || 0}</div>
            <div className="text-sm text-gray-400">Títulos</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankProgress;
