import React, { useState, useMemo, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion'; // Temporariamente comentado
import { useHeroStore } from '../store/heroStore';
import { resumeAudioContextIfNeeded, playLevelUp } from '../utils/audioEffects';
import { Hero } from '../types/hero';
import { RankLevel, RankHistory, RankComparison } from '../types/ranks';
import { RankProgressAnimation, FloatingRankBadge } from './RankAnimations';
import { rankSystem } from '../utils/rankSystem';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes } from '../styles/medievalTheme';
import { 
  TrendingUp, 
  Trophy, 
  Target, 
  Clock, 
  Users, 
  Star,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Calendar,
  Award
} from 'lucide-react';

interface EvolutionPanelProps {
  heroId?: string;
  className?: string;
}

type ViewMode = 'overview' | 'progress' | 'history' | 'leaderboard' | 'comparison';

// Componentes auxiliares
const LocalRankCard: React.FC<{ 
  rank: RankLevel; 
  size?: 'small' | 'medium' | 'large'; 
  isFloating?: boolean;
  className?: string;
}> = ({ 
  rank, 
  size = 'medium',
  isFloating = true,
  className = ''
}) => (
  <div className={className}>
    <FloatingRankBadge rank={rank} isFloating={isFloating} />
  </div>
);

const RankProgress: React.FC<{ progress: number; color: string; isAnimating?: boolean }> = ({ 
  progress, 
  color, 
  isAnimating = false 
}) => (
  <RankProgressAnimation
    progress={progress}
    isAnimating={isAnimating}
    color={color}
  />
);

export const EvolutionPanel: React.FC<EvolutionPanelProps> = ({ 
  heroId, 
  className = '' 
}) => {
  const { heroes, getHeroRankProgress, getRankLeaderboard, promoteHero, updateHero, getSelectedHero } = useHeroStore();
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-amber-700/30' : 'border-amber-700/30';
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedHeroForComparison, setSelectedHeroForComparison] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<RankLevel | 'all'>('all');
  const [localHeroId, setLocalHeroId] = useState<string | null>(
    heroId ?? getSelectedHero()?.id ?? (heroes[0]?.id ?? null)
  );

  // Sincronizar quando heroId de props mudar
  useEffect(() => {
    if (heroId) setLocalHeroId(heroId);
  }, [heroId]);

  // Garantir seleção válida ao carregar ou quando a lista de heróis muda
  useEffect(() => {
    if (!localHeroId && heroes.length > 0) {
      setLocalHeroId(getSelectedHero()?.id ?? heroes[0].id);
    }
  }, [heroes, localHeroId]);

  // Usar o herói escolhido localmente por padrão
  const currentHero = (localHeroId ? heroes.find(h => h.id === localHeroId) : undefined)
    || getSelectedHero() 
    || heroes[0];

  // Verificar e inicializar rankData para heróis existentes (migração)
  useEffect(() => {
    if (currentHero && !currentHero.rankData) {
      const initializedRankData = rankSystem.initializeRankData(currentHero);
      updateHero(currentHero.id, { rankData: initializedRankData });
    }
  }, [currentHero]);
  const rankProgress = currentHero ? getHeroRankProgress(currentHero.id) : null;
  const leaderboard = getRankLeaderboard();

  const filteredHistory = useMemo(() => {
    if (!currentHero?.rankData?.rankHistory) return [];
    
    if (historyFilter === 'all') {
      return currentHero.rankData.rankHistory;
    }
    
    return currentHero.rankData.rankHistory.filter(entry => entry.rank === historyFilter);
  }, [currentHero?.rankData?.rankHistory, historyFilter]);

  const comparisonData = useMemo(() => {
    if (!currentHero || !selectedHeroForComparison) return null;
    
    const compareHero = heroes.find(h => h.id === selectedHeroForComparison);
    if (!compareHero) return null;
    
    return {
      current: currentHero,
      compare: compareHero,
      currentProgress: getHeroRankProgress(currentHero.id),
      compareProgress: getHeroRankProgress(compareHero.id)
    };
  }, [currentHero, selectedHeroForComparison, heroes]);

  if (!currentHero || !rankProgress) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-slate-400">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum herói selecionado para análise de evolução</p>
        </div>
      </div>
    );
  }

  const handlePromotion = () => {
    if (rankProgress.progress.canPromote) {
      const promoted = promoteHero(currentHero.id);
      if (promoted) {
        resumeAudioContextIfNeeded();
        playLevelUp();
      }
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Hero Summary */}
      <div className={`bg-gradient-to-r from-amber-900/20 to-yellow-900/20 rounded-lg p-6 border ${seasonalBorder}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-amber-100">{currentHero.name}</h3>
            <p className="text-amber-300">{currentHero.class} • {currentHero.race}</p>
          </div>
          <LocalRankCard rank={rankProgress.progress.currentRank} size="large" />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <label className="text-xs text-amber-300">Selecionar herói:</label>
          <select
            value={localHeroId ?? ''}
            onChange={(e) => setLocalHeroId(e.target.value)}
            className="bg-slate-800 text-amber-100 text-sm px-2 py-1 rounded border border-amber-700/40"
          >
            {heroes.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-100">{currentHero.progression.level}</div>
            <div className="text-sm text-amber-300">Nível</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-100">{(currentHero.progression.xp || 0).toLocaleString()}</div>
            <div className="text-sm text-amber-300">XP Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-100">{currentHero.stats.questsCompleted}</div>
            <div className="text-sm text-amber-300">Missões</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-100">{rankProgress.rankData.totalRankPoints}</div>
            <div className="text-sm text-amber-300">Pontos de Rank</div>
          </div>
        </div>
      </div>

      {/* Quick Progress */}
      <RankProgress 
        progress={rankProgress.progress}
        estimate={rankProgress.estimate}
        onPromote={handlePromotion}
        variant="detailed"
      />

      {/* Recent Achievements */}
            {rankProgress.rankData?.rankHistory && rankProgress.rankData.rankHistory.length > 0 && (
        <div className="bg-slate-700 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-amber-400" />
            Conquistas Recentes
          </h4>
          <div className="space-y-2">
            {rankProgress.rankData.rankHistory.slice(-3).slice().reverse().map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-600 rounded">
                <div className="flex items-center">
                  <LocalRankCard rank={entry.rank} size="small" />
                  <div className="ml-3">
                    <div className="text-slate-100 font-medium">Promovido para Rank {entry.rank}</div>
                    <div className="text-slate-400 text-sm">
                      {new Date(entry.achievedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                {entry.notableAchievement && (
                  <div className="text-purple-300 text-sm">{entry.notableAchievement}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-6">
      <RankProgress 
        progress={rankProgress.progress}
        estimate={rankProgress.estimate}
        onPromote={handlePromotion}
        variant="detailed"
      />
      
      {/* Detailed Requirements */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-400" />
          Análise Detalhada de Progresso
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* XP Progress */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Experiência</span>
              <span className="text-slate-400">
                {(rankProgress.progress.currentXP || 0).toLocaleString()} / {(rankProgress.progress.requiredXP || 0).toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
              {(() => {
                const pct = Math.max(0, Math.min(100,
                  ((rankProgress.progress.currentXP || 0) / Math.max(1, (rankProgress.progress.requiredXP || 0))) * 100
                ));
                return (
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                );
              })()}
            </div>
            <div className="text-xs text-slate-400">
              {rankProgress.progress.nextRank ? 
                `Faltam ${((rankProgress.progress.requiredXP || 0) - (rankProgress.progress.currentXP || 0)).toLocaleString()} XP` :
                'Rank máximo atingido!'
              }
            </div>
          </div>

          {/* Missions Progress */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Missões</span>
              <span className="text-slate-400">
                {rankProgress.progress.currentMissions || 0} / {rankProgress.progress.requiredMissions || 0}
              </span>
            </div>
            <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
              {(() => {
                const pct = Math.max(0, Math.min(100,
                  ((rankProgress.progress.currentMissions || 0) / Math.max(1, (rankProgress.progress.requiredMissions || 0))) * 100
                ));
                return (
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                );
              })()}
            </div>
            <div className="text-xs text-slate-400">
              {rankProgress.progress.nextRank ? 
                `Faltam ${(rankProgress.progress.requiredMissions || 0) - (rankProgress.progress.currentMissions || 0)} missões` :
                'Todas as missões concluídas!'
              }
            </div>
            {/* Mensagem acima já cobre o restante de missões; removendo duplicação */}
          </div>
        </div>

        {/* Time Estimate */}
        {rankProgress.estimate && (
          <div className="mt-6 p-4 bg-slate-600 rounded-lg">
            <div className="flex items-center mb-2">
              <Clock className="w-4 h-4 mr-2 text-amber-400" />
              <span className="text-slate-200 font-medium">Estimativa para Próximo Rank</span>
            </div>
            <div className="text-slate-300">
              {rankProgress.estimate.estimatedDays} dias ({rankProgress.estimate.estimatedHours} horas de jogo)
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Baseado no seu ritmo atual de progresso
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-100 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-purple-400" />
          Histórico de Ranks
        </h4>
        <select
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value as RankLevel | 'all')}
          className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-slate-200"
        >
          <option value="all">Todos os Ranks</option>
          <option value="S">Rank S</option>
          <option value="A">Rank A</option>
          <option value="B">Rank B</option>
          <option value="C">Rank C</option>
          <option value="D">Rank D</option>
          <option value="E">Rank E</option>
          <option value="F">Rank F</option>
        </select>
      </div>

      {/* History Timeline */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum histórico encontrado para o filtro selecionado</p>
          </div>
        ) : (
          [...filteredHistory].reverse().map((entry, index) => (
            <div key={index} className="flex items-center p-4 bg-slate-700 rounded-lg">
              <LocalRankCard rank={entry.rank} size="medium" />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-100 font-medium">
                      Promovido para Rank {entry.rank}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {new Date(entry.achievedAt).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.notableAchievement && (
                      <div className="text-purple-300 text-sm">{entry.notableAchievement}</div>
                    )}
                  </div>
                </div>
                {entry.specialAchievement && (
                  <div className="mt-2 text-sm text-purple-300">
                    🏆 {entry.specialAchievement}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold text-slate-100 flex items-center">
        <Users className="w-5 h-5 mr-2 text-green-400" />
        Ranking Global
      </h4>

      <div className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div 
            key={entry.heroId}
            className={`flex items-center p-4 rounded-lg ${
              entry.heroId === currentHero.id 
                ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-700/50' 
                : 'bg-slate-700'
            }`}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 text-slate-200 font-bold mr-4">
              {entry.position}
            </div>
            
            <LocalRankCard rank={entry.rank} size="small" />
            
            <div className="ml-3 flex-1">
              <div className="text-slate-100 font-medium">{entry.heroName}</div>
              <div className="text-slate-400 text-sm">{entry.heroClass}</div>
            </div>
            
            <div className="text-right">
              <div className="text-amber-400 font-bold">{entry.rankPoints}</div>
              <div className="text-slate-400 text-sm">pontos</div>
            </div>
            
            {entry.heroId === currentHero.id && (
              <Star className="w-5 h-5 ml-2 text-amber-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-100 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-cyan-400" />
          Comparação de Heróis
        </h4>
        <select
          value={selectedHeroForComparison}
          onChange={(e) => setSelectedHeroForComparison(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-slate-200"
        >
          <option value="">Selecione um herói para comparar</option>
          {heroes.filter(h => h.id !== currentHero.id).map(hero => (
            <option key={hero.id} value={hero.id}>
              {hero.name} ({hero.class})
            </option>
          ))}
        </select>
      </div>

      {comparisonData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Hero */}
          <div className="bg-slate-700 rounded-lg p-6">
            <div className="text-center mb-4">
              <h5 className="text-lg font-semibold text-slate-100">{comparisonData.current.name}</h5>
              <p className="text-slate-400">{comparisonData.current.class}</p>
              <div className="mt-2">
                <LocalRankCard rank={comparisonData.currentProgress?.progress.currentRank || 'F'} size="large" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Nível</span>
                <span className="text-slate-100">{comparisonData.current.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">XP Total</span>
                <span className="text-slate-100">{(comparisonData.current.progression.xp || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Missões</span>
                <span className="text-slate-100">{comparisonData.current.stats.questsCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Pontos de Rank</span>
                <span className="text-slate-100">{comparisonData.currentProgress?.rankData.totalRankPoints || 0}</span>
              </div>
            </div>
          </div>

          {/* Compare Hero */}
          <div className="bg-slate-700 rounded-lg p-6">
            <div className="text-center mb-4">
              <h5 className="text-lg font-semibold text-slate-100">{comparisonData.compare.name}</h5>
              <p className="text-slate-400">{comparisonData.compare.class}</p>
              <LocalRankCard rank={comparisonData.compareProgress?.progress.currentRank || 'F'} size="large" className="mt-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Nível</span>
                <span className="text-slate-100">{comparisonData.compare.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">XP Total</span>
                <span className="text-slate-100">{(comparisonData.compare.progression.xp || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Missões</span>
                <span className="text-slate-100">{comparisonData.compare.stats.questsCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Pontos de Rank</span>
                <span className="text-slate-100">{comparisonData.compareProgress?.rankData.totalRankPoints || 0}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-400 py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Selecione um herói para comparar</p>
        </div>
      )}
    </div>
  );

  const viewModes = [
    { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
    { id: 'progress', label: 'Progresso', icon: Target },
    { id: 'history', label: 'Histórico', icon: Calendar },
    { id: 'leaderboard', label: 'Ranking', icon: Users },
    { id: 'comparison', label: 'Comparação', icon: BarChart3 }
  ] as const;

  return (
    <div className={`bg-slate-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center font-serif tracking-wide">
              <Trophy className="w-6 h-6 mr-2 text-amber-400" />
              Painel de Evolução
            </h2>
            {(() => {
              const cfg = (seasonalThemes as any)[activeSeasonalTheme || ''];
              const accents: string[] = cfg?.accents || [];
              return accents.length ? (
                <div className="text-xl opacity-80">{accents[0]}{accents[1]}{accents[2]}</div>
              ) : null;
            })()}
          </div>
          {(rankProgress.rankData?.pendingCelebrations?.length || 0) > 0 && (
            <div className="bg-amber-500 text-amber-900 px-3 py-1 rounded-full text-sm font-medium">
              {rankProgress.rankData?.pendingCelebrations?.length || 0} nova(s) conquista(s)!
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 sm:space-x-1 bg-slate-700 rounded-lg p-1 overflow-x-auto">
          {viewModes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id as ViewMode)}
              className={`flex items-center px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                viewMode === id
                  ? 'bg-slate-600 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'progress' && renderProgress()}
        {viewMode === 'history' && renderHistory()}
        {viewMode === 'leaderboard' && renderLeaderboard()}
        {viewMode === 'comparison' && renderComparison()}
      </div>
    </div>
  );
};
