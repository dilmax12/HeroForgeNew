import React from 'react';
import { Achievement as AchievementType } from '../types/hero';
import { medievalTheme } from '../styles/medievalTheme';

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
      case 'comum': return 'text-slate-300 border-slate-600';
      case 'raro': return 'text-blue-300 border-blue-500/40';
      case 'épico': return 'text-violet-300 border-violet-500/40';
      case 'lendário': return 'text-amber-300 border-amber-500/40';
      default: return 'text-slate-300 border-slate-600';
    }
  };

  const getRarityTrack = (rarity: string) => {
    switch (rarity) {
      case 'comum': return 'bg-slate-500';
      case 'raro': return 'bg-blue-500';
      case 'épico': return 'bg-violet-500';
      case 'lendário': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div 
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200 bg-slate-800
        ${isUnlocked 
          ? `${getRarityColor(achievement.rarity)} shadow-md` 
          : 'text-slate-400 border-slate-700 opacity-60'
        }
        ${isUnlocked ? 'hover:shadow-xl transform hover:-translate-y-1' : ''}
      `}
    >
      {/* Ícone do Achievement */}
      <div className="flex items-start space-x-3">
        <div 
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-2xl
            ${isUnlocked ? 'bg-slate-700' : 'bg-slate-600'}
          `}
        >
          {achievement.icon}
        </div>
        
        <div className="flex-1">
          {/* Título e Raridade */}
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-bold text-lg ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
              {achievement.title}
            </h3>
            <span 
              className={`
                px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide
                ${isUnlocked ? 'bg-slate-700 text-slate-200 border border-slate-600' : 'bg-slate-700 text-slate-400 border border-slate-600'}
              `}
            >
              {achievement.rarity}
            </span>
          </div>
          
          {/* Descrição */}
          <p className={`text-sm mb-2 ${isUnlocked ? 'text-slate-300' : 'text-slate-400'}`}>
            {achievement.description}
          </p>
          
          {/* Progresso */}
          {showProgress && achievement.maxProgress && achievement.maxProgress > 1 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1 text-slate-300">
                <span>Progresso</span>
                <span>{achievement.progress}/{achievement.maxProgress}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getRarityTrack(achievement.rarity)}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Data de Desbloqueio */}
          {isUnlocked && achievement.unlockedAt && (
            <div className="text-xs text-slate-400 mt-2">
              Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
            </div>
          )}
          
          {/* Recompensas */}
          {achievement.rewards && (
            <div className="mt-2 flex flex-wrap gap-2">
              {achievement.rewards.xp && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-900/30 text-emerald-300 border border-emerald-700/40">
                  +{achievement.rewards.xp} XP
                </span>
              )}
              {achievement.rewards.gold && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-900/30 text-amber-300 border border-amber-700/40">
                  +{achievement.rewards.gold} 🪙
                </span>
              )}
              {achievement.rewards.title && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-violet-900/30 text-violet-300 border border-violet-700/40">
                  Título: {achievement.rewards.title}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Efeito de Brilho para Achievements Desbloqueados */}
      {isUnlocked && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-amber-300/10 to-transparent opacity-0 hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
      )}
    </div>
  );
};

export default Achievement;