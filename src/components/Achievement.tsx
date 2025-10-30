import React from 'react';
import { Achievement as AchievementType } from '../types/hero';

interface AchievementProps {
  achievement: AchievementType;
  isUnlocked?: boolean;
  showProgress?: boolean;
}

const Achievement: React.FC<AchievementProps> = ({ 
  achievement, 
  isUnlocked = false, 
  showProgress = false 
}) => {
  const progressPercentage = achievement.maxProgress 
    ? Math.round((achievement.progress / achievement.maxProgress) * 100)
    : 100;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'comum': return 'text-gray-600 border-gray-300';
      case 'raro': return 'text-blue-600 border-blue-300';
      case 'épico': return 'text-purple-600 border-purple-300';
      case 'lendário': return 'text-yellow-600 border-yellow-300';
      default: return 'text-gray-600 border-gray-300';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'comum': return 'bg-gray-50';
      case 'raro': return 'bg-blue-50';
      case 'épico': return 'bg-purple-50';
      case 'lendário': return 'bg-yellow-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div 
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${isUnlocked 
          ? `${getRarityColor(achievement.rarity)} ${getRarityBg(achievement.rarity)} shadow-md` 
          : 'text-gray-400 border-gray-200 bg-gray-50 opacity-60'
        }
        ${isUnlocked ? 'hover:shadow-lg transform hover:-translate-y-1' : ''}
      `}
    >
      {/* Ícone do Achievement */}
      <div className="flex items-start space-x-3">
        <div 
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-2xl
            ${isUnlocked 
              ? getRarityBg(achievement.rarity) 
              : 'bg-gray-200'
            }
          `}
        >
          {achievement.icon}
        </div>
        
        <div className="flex-1">
          {/* Título e Raridade */}
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-bold text-lg ${isUnlocked ? '' : 'text-gray-400'}`}>
              {achievement.title}
            </h3>
            <span 
              className={`
                px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide
                ${isUnlocked 
                  ? getRarityColor(achievement.rarity).replace('text-', 'text-').replace('border-', 'bg-') + ' bg-opacity-20'
                  : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {achievement.rarity}
            </span>
          </div>
          
          {/* Descrição */}
          <p className={`text-sm mb-2 ${isUnlocked ? 'text-gray-700' : 'text-gray-400'}`}>
            {achievement.description}
          </p>
          
          {/* Progresso */}
          {showProgress && achievement.maxProgress && achievement.maxProgress > 1 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Progresso</span>
                <span>{achievement.progress}/{achievement.maxProgress}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`
                    h-2 rounded-full transition-all duration-300
                    ${isUnlocked 
                      ? getRarityColor(achievement.rarity).replace('text-', 'bg-').replace('border-', '')
                      : 'bg-gray-300'
                    }
                  `}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Data de Desbloqueio */}
          {isUnlocked && achievement.unlockedAt && (
            <div className="text-xs text-gray-500 mt-2">
              Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
            </div>
          )}
          
          {/* Recompensas */}
          {achievement.rewards && (
            <div className="mt-2 flex flex-wrap gap-2">
              {achievement.rewards.xp && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  +{achievement.rewards.xp} XP
                </span>
              )}
              {achievement.rewards.gold && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  +{achievement.rewards.gold} 🪙
                </span>
              )}
              {achievement.rewards.title && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  Título: {achievement.rewards.title}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Efeito de Brilho para Achievements Desbloqueados */}
      {isUnlocked && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
      )}
    </div>
  );
};

export default Achievement;