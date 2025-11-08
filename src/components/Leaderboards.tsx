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
import type { Leaderboard, LeaderboardEntry } from '../types/hero';
import { getOrRunDailyResult } from '../services/idleBattleService';
import { notificationBus } from './NotificationSystem';

interface DailyEntry {
  heroId: string;
  heroName: string;
  heroLevel: number;
  score: number;
  xpToday: number;
  goldToday: number;
  victoriesToday: number;
  timestamp: number;
}

const Leaderboards: React.FC = () => {
  const { getSelectedHero, heroes } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('xp');
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [viewMode, setViewMode] = useState<'top' | 'around'>('top');
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [dailySubmitting, setDailySubmitting] = useState(false);
  const [dailySummary, setDailySummary] = useState<any | null>(null);

  useEffect(() => {
    if (selectedHero) {
      // Gerar dados mock para demonstração
      const allHeroes = generateMockLeaderboardData(selectedHero);
      const generatedLeaderboards = generateAllLeaderboards(allHeroes);
      setLeaderboards(generatedLeaderboards);

      // Carregar ranking diário e resumo
      (async () => {
        try {
          const res = await fetch('/api/daily/leaderboard');
          const data = await res.json();
          setDailyEntries(Array.isArray(data.entries) ? data.entries : []);
        } catch {}
        try {
          const summary = await getOrRunDailyResult(selectedHero);
          setDailySummary(summary);
        } catch {}
      })();
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
      {/* Ranking Diário (MVP) */}
      {selectedHero && (
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 border border-amber-600/30">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center">
              <span className="mr-2">📅</span>
              Ranking Diário (MVP)
            </h3>
            <button
              onClick={async () => {
                if (dailySubmitting) return;
                setDailySubmitting(true);
                try {
                  await fetch('/api/daily/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hero: selectedHero })
                  });
                  const resLb = await fetch('/api/daily/leaderboard');
                  const dataLb = await resLb.json();
                  setDailyEntries(Array.isArray(dataLb.entries) ? dataLb.entries : []);
                  notificationBus.emit({
                    type: 'achievement',
                    title: 'Ranking Diário',
                    message: 'Resultado enviado com sucesso! Confira o Top do dia.',
                    icon: '📅',
                    duration: 3500
                  });
                } catch {
                  notificationBus.emit({
                    type: 'quest',
                    title: 'Falha no envio',
                    message: 'Não foi possível enviar seu resultado diário.',
                    icon: '⚠️',
                    duration: 4000
                  });
                } finally {
                  setDailySubmitting(false);
                }
              }}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
                dailySubmitting ? 'bg-gray-700 text-gray-400' : 'bg-amber-600 text-white hover:bg-amber-700'
              }`}
            >
              {dailySubmitting ? 'Enviando...' : 'Enviar Resultado de Hoje'}
            </button>
          </div>
          {dailySummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-3 md:mb-4 text-center">
              <div className="bg-gray-700 rounded p-2 md:p-3">
                <div className="text-blue-400 text-base md:text-lg">✨ XP Hoje</div>
                <div className="text-white text-lg md:text-xl font-bold">{dailySummary.xpTotal ?? 0}</div>
              </div>
              <div className="bg-gray-700 rounded p-2 md:p-3">
                <div className="text-yellow-400 text-base md:text-lg">🪙 Ouro Hoje</div>
                <div className="text-white text-lg md:text-xl font-bold">{dailySummary.goldTotal ?? 0}</div>
              </div>
              <div className="bg-gray-700 rounded p-2 md:p-3">
                <div className="text-green-400 text-base md:text-lg">✅ Vitórias</div>
                <div className="text-white text-lg md:text-xl font-bold">{dailySummary.victories ?? 0}</div>
              </div>
              <div className="bg-gray-700 rounded p-2 md:p-3">
                <div className="text-purple-400 text-base md:text-lg">♻️ Execuções</div>
                <div className="text-white text-lg md:text-xl font-bold">{Array.isArray(dailySummary.runs) ? dailySummary.runs.length : 0}</div>
              </div>
            </div>
          )}
          <div>
            <h4 className="text-base md:text-lg font-semibold text-white mb-2">Top de Hoje</h4>
            {dailyEntries.length === 0 ? (
              <div className="text-gray-400">Nenhuma entrada enviada ainda.</div>
            ) : (
              <div className="space-y-2">
                {dailyEntries.slice(0, 10).map(entry => (
                  <div key={entry.heroId} className={`flex items-center justify-between p-2 md:p-3 rounded ${entry.heroId === selectedHero.id ? 'bg-amber-600/20 border border-amber-500' : 'bg-gray-700'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm md:text-base font-medium">{entry.heroName}</span>
                      <span className="text-gray-400 text-xs md:text-sm">Nv {entry.heroLevel}</span>
                      {entry.heroId === selectedHero.id && (
                        <span className="text-amber-400 bg-amber-600/20 px-2 py-0.5 rounded text-[11px] md:text-xs">Você</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm md:text-base font-bold">{Math.round(entry.score)} pts</div>
                      <div className="text-gray-400 text-[11px] md:text-xs">{entry.victoriesToday} vitórias • {entry.xpToday} XP • {entry.goldToday} ouro</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header com Ranking do Herói */}
      <div className="bg-gradient-to-r from-amber-900/50 to-amber-800/30 rounded-lg p-4 md:p-6 border border-amber-500/30">
        <h2 className="text-xl md:text-2xl font-bold text-amber-400 mb-3 md:mb-4 flex items-center">
          <span className="text-2xl md:text-3xl mr-2 md:mr-3">🏆</span>
          Rankings & Leaderboards
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-yellow-400">#{heroRanking.globalRank}</div>
            <div className="text-xs md:text-sm text-gray-400">Ranking Global</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-blue-400">#{heroRanking.classRank}</div>
            <div className="text-xs md:text-sm text-gray-400">Ranking da Classe</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-purple-400">{heroRanking.achievements}</div>
            <div className="text-xs md:text-sm text-gray-400">Conquistas</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-green-400">{heroRanking.totalScore.toLocaleString()}</div>
            <div className="text-xs md:text-sm text-gray-400">Pontuação Total</div>
          </div>
        </div>
      </div>

      {/* Seletor de Leaderboard */}
      <div className="bg-gray-800 rounded-lg p-4 md:p-6">
        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          {LEADERBOARD_CONFIGS.map(config => (
            <button
              key={config.id}
              onClick={() => setSelectedLeaderboard(config.id)}
              className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
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
        <div className="flex space-x-2 mb-3 md:mb-4">
          <button
            onClick={() => setViewMode('top')}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
              viewMode === 'top'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Top 10
          </button>
          <button
            onClick={() => setViewMode('around')}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
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
