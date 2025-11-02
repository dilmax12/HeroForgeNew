import React, { useState, useEffect } from 'react';
import { useHeroStore } from '../store/heroStore';
import { 
  LEADERBOARD_CONFIGS, 
  generateAllLeaderboards, 
  getHeroRanking,
  getRankColor,
  getRankIcon,
  formatRankChange,
  getTopHeroes,
  getHeroesAroundRank,
  generateMockLeaderboardData
} from '../utils/leaderboardSystem';
import { Leaderboard, LeaderboardEntry } from '../types/hero';

const Leaderboards: React.FC = () => {
  const { getSelectedHero, heroes } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('xp');
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [viewMode, setViewMode] = useState<'top' | 'around'>('top');

  useEffect(() => {
    if (selectedHero) {
      // Gerar dados mock para demonstração
      const allHeroes = generateMockLeaderboardData(selectedHero);
      const generatedLeaderboards = generateAllLeaderboards(allHeroes);
      setLeaderboards(generatedLeaderboards);
    }
  }, [selectedHero, heroes]);

  if (!selectedHero) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Selecione um Herói</h2>
        <p className="text-gray-300">Você precisa selecionar um herói para ver os rankings.</p>
      </div>
    );
  }

  const currentLeaderboard = leaderboards.find(lb => lb.id === selectedLeaderboard);
  const heroRanking = getHeroRanking(selectedHero, generateMockLeaderboardData(selectedHero));
  const config = LEADERBOARD_CONFIGS.find(c => c.id === selectedLeaderboard);

  const renderLeaderboardEntry = (entry: LeaderboardEntry, isCurrentHero: boolean = false) => (
    <div 
      key={entry.heroId}
      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
        isCurrentHero 
          ? 'bg-amber-600/20 border border-amber-500 shadow-lg' 
          : 'bg-gray-700 hover:bg-gray-600'
      }`}
    >
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getRankIcon(entry.rank)}</span>
          <span className={`font-bold text-lg ${getRankColor(entry.rank)}`}>
            #{entry.rank}
          </span>
        </div>
        
        <div>
          <div className="flex items-center space-x-2">
            <h3 className={`font-semibold ${isCurrentHero ? 'text-amber-400' : 'text-white'}`}>
              {entry.heroName}
              {isCurrentHero && <span className="ml-2 text-xs bg-amber-600 px-2 py-1 rounded">VOCÊ</span>}
            </h3>
          </div>
          <p className="text-sm text-gray-400">
            {entry.heroRace} {entry.heroClass}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <div className={`font-bold ${config?.color || 'text-white'}`}>
          {config?.formatValue(entry.value) || entry.value}
        </div>
        {entry.change !== 0 && (
          <div className="text-xs text-gray-400">
            {formatRankChange(entry.change)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header com Ranking do Herói */}
      <div className="bg-gradient-to-r from-amber-900/50 to-amber-800/30 rounded-lg p-6 border border-amber-500/30">
        <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center">
          <span className="text-3xl mr-3">🏆</span>
          Rankings & Leaderboards
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">#{heroRanking.globalRank}</div>
            <div className="text-sm text-gray-400">Ranking Global</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">#{heroRanking.classRank}</div>
            <div className="text-sm text-gray-400">Ranking da Classe</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{heroRanking.achievements}</div>
            <div className="text-sm text-gray-400">Conquistas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{heroRanking.totalScore.toLocaleString()}</div>
            <div className="text-sm text-gray-400">Pontuação Total</div>
          </div>
        </div>
      </div>

      {/* Seletor de Leaderboard */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {LEADERBOARD_CONFIGS.map(config => (
            <button
              key={config.id}
              onClick={() => setSelectedLeaderboard(config.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedLeaderboard === config.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.name}</span>
            </button>
          ))}
        </div>

        {/* Modo de Visualização */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setViewMode('top')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'top'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Top 10
          </button>
          <button
            onClick={() => setViewMode('around')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'around'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Ao Redor de Você
          </button>
        </div>

        {/* Leaderboard Content */}
        {currentLeaderboard && config && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">{config.icon}</span>
                {config.name}
              </h3>
              <div className="text-sm text-gray-400">
                Atualizado: {currentLeaderboard.lastUpdated.toLocaleTimeString()}
              </div>
            </div>
            
            <p className="text-gray-400 mb-6">{config.description}</p>

            <div className="space-y-2">
              {viewMode === 'top' ? (
                // Top 10
                getTopHeroes(currentLeaderboard, 10).map(entry => 
                  renderLeaderboardEntry(entry, entry.heroId === selectedHero.id)
                )
              ) : (
                // Ao redor do herói
                getHeroesAroundRank(currentLeaderboard, selectedHero.id, 5).map(entry => 
                  renderLeaderboardEntry(entry, entry.heroId === selectedHero.id)
                )
              )}
            </div>

            {currentLeaderboard.entries.length === 0 && (
              <div className="text-center p-8 text-gray-400">
                <p>Nenhum herói encontrado neste ranking.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dicas de Ranking */}
      <div className="bg-blue-900/30 rounded-lg p-6 border border-blue-500/30">
        <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
          <span className="mr-2">💡</span>
          Como Melhorar seu Ranking
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <h5 className="font-medium text-white mb-2">📈 Experiência & Nível</h5>
            <ul className="space-y-1">
              <li>• Complete missões regularmente</li>
              <li>• Participe de combates</li>
              <li>• Explore novas áreas</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-white mb-2">💰 Riqueza</h5>
            <ul className="space-y-1">
              <li>• Venda itens desnecessários</li>
              <li>• Complete missões com recompensas altas</li>
              <li>• Invista em equipamentos valiosos</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-white mb-2">🏅 Conquistas</h5>
            <ul className="space-y-1">
              <li>• Desbloqueie títulos especiais</li>
              <li>• Complete desafios únicos</li>
              <li>• Mantenha streaks de login</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-white mb-2">⭐ Reputação</h5>
            <ul className="space-y-1">
              <li>• Faça escolhas narrativas positivas</li>
              <li>• Ajude diferentes facções</li>
              <li>• Mantenha boa reputação geral</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;