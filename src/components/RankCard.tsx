// Componente Visual de Rank - HeroForge v2.2

import React, { useState, useEffect } from 'react';
import { RankLevel, RankProgress, RANK_CONFIG } from '../types/ranks';
import { medievalTheme, getRankGradient, getRankIcon, seasonalThemes } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';

interface RankCardProps {
  rank: RankLevel;
  progress?: RankProgress;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

export const RankCard: React.FC<RankCardProps> = ({
  rank,
  progress,
  size = 'medium',
  showProgress = false,
  animated = true,
  onClick
}) => {
  const { activeSeasonalTheme } = useMonetizationStore();
  const [isGlowing, setIsGlowing] = useState(false);
  const safeRank = (rank || (progress?.currentRank as any) || 'F') as RankLevel;
  const rankInfo = RANK_CONFIG[safeRank] || { name: String(safeRank), color: '#9CA3AF' } as any;

  useEffect(() => {
    if (animated && progress?.canPromote) {
      const interval = setInterval(() => {
        setIsGlowing(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [animated, progress?.canPromote]);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-16 h-16 text-xs';
      case 'large':
        return 'w-32 h-32 text-xl';
      default:
        return 'w-24 h-24 text-base';
    }
  };

  const getRankStyles = () => {
    const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || medievalTheme.effects.borders.gold : medievalTheme.effects.borders.gold;
    const baseStyles = `
      inline-flex items-center justify-center
      border-2 rounded-lg font-bold transition-all duration-300
      ${size === 'small' ? 'w-12 h-12 text-sm' : 
        size === 'medium' ? 'w-16 h-16 text-base' : 
        'w-20 h-20 text-lg'}
      ${animated ? 'hover:scale-110 cursor-pointer' : ''}
      bg-gradient-to-br ${getRankGradient(safeRank)} ${seasonalBorder} text-white ${medievalTheme.effects.shadows.glow}
    `;
    
    return baseStyles;
  };

  const getGlowEffect = () => {
    if (!isGlowing || !progress?.canPromote) return '';
    return `${medievalTheme.effects.shadows.large} scale-110`;
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Rank Badge */}
      <div
        className={`
          ${getSizeClasses()}
          ${getRankStyles()}
          ${getGlowEffect()}
          ${animated ? 'hover:scale-110' : ''}
          relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500
        `}
        tabIndex={onClick ? 0 : -1}
        role={onClick ? 'button' : undefined}
        onClick={onClick}
      >
        {/* Rank Letter */}
        <span className="font-bold z-10">{safeRank}</span>
        
        {/* Rank Icon */}
        <span className="absolute top-1 right-1 text-xs opacity-80">
          {getRankIcon(safeRank)}
        </span>
        
        {/* Legendary Sparkle Effect for S Rank */}
        {safeRank === 'S' && animated && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        )}
        
        {/* Promotion Ready Indicator */}
        {progress?.canPromote && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
        )}
      </div>

      {/* Rank Name */}
      <div className="text-center">
        <div className="font-semibold text-sm" style={{ color: rankInfo?.color || '#9CA3AF' }}>
          {rankInfo?.name || String(rank)}
        </div>
        
        {/* Progress Bar */}
        {showProgress && progress && progress.nextRank && (
          <div className="mt-2 w-24">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{safeRank}</span>
              <span>{progress.nextRank}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${progress.progressPercentage}%`,
                  backgroundColor: rankInfo?.color || '#9CA3AF'
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1 text-center">
              {Math.round(progress.progressPercentage)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para exibir múltiplos ranks (histórico)
interface RankHistoryProps {
  ranks: RankLevel[];
  currentRank: RankLevel;
  size?: 'small' | 'medium';
}

export const RankHistory: React.FC<RankHistoryProps> = ({
  ranks,
  currentRank,
  size = 'small'
}) => {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
      {ranks.map((rank, index) => (
        <div
          key={index}
          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          tabIndex={0}
          aria-label={`Rank ${rank}`}
        >
          <RankCard
            rank={rank}
            size={size}
            animated={rank === currentRank}
            showProgress={false}
          />
          {index < ranks.length - 1 && (
            <div className="mx-2 text-gray-400">→</div>
          )}
        </div>
      ))}
    </div>
  );
};

// Componente de comparação de ranks
interface RankComparisonProps {
  heroRank: RankLevel;
  compareRank: RankLevel;
  heroName: string;
  compareName: string;
}

export const RankComparison: React.FC<RankComparisonProps> = ({
  heroRank,
  compareRank,
  heroName,
  compareName
}) => {
  return (
    <div className={`flex items-center justify-between p-4 ${medievalTheme.layout.containers.card} ${medievalTheme.effects.borders.gold}`}>
      <div className="flex items-center space-x-3">
        <RankCard rank={heroRank} size="small" animated={false} />
        <div>
          <div className="font-semibold text-white">{heroName}</div>
          <div className="text-sm text-amber-600">{(RANK_CONFIG[heroRank]?.name) || String(heroRank)}</div>
        </div>
      </div>

      <div className="text-amber-400 text-xl font-bold">⚔️</div>

      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="font-semibold text-white">{compareName}</div>
          <div className="text-sm text-amber-600">{(RANK_CONFIG[compareRank]?.name) || String(compareRank)}</div>
        </div>
        <RankCard rank={compareRank} size="small" animated={false} />
      </div>
    </div>
  );
};

export default RankCard;
