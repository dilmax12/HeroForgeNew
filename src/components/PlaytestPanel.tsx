import React, { useState, useEffect } from 'react';
import { Hero } from '../types/hero';
import { useHeroStore } from '../store/heroStore';

interface PlaytestMetrics {
  totalHeroes: number;
  totalQuests: number;
  totalCombats: number;
  averageLevel: number;
  averageSessionTime: number;
  questSuccessRate: number;
  mostPopularClass: string;
  totalGuilds: number;
  activeUsers: number;
  retentionRate: number;
}

interface SessionData {
  heroId: string;
  startTime: number;
  lastActivity: number;
  questsStarted: number;
  questsCompleted: number;
  combatsWon: number;
  combatsLost: number;
}

const PlaytestPanel: React.FC = () => {
  const { heroes, guilds, availableQuests } = useHeroStore();
  const [metrics, setMetrics] = useState<PlaytestMetrics | null>(null);
  const [sessionData, setSessionData] = useState<SessionData[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'all'>('today');

  useEffect(() => {
    calculateMetrics();
    loadSessionData();
  }, [heroes, guilds, selectedTimeframe]);

  const calculateMetrics = () => {
    if (heroes.length === 0) {
      setMetrics({
        totalHeroes: 0,
        totalQuests: 0,
        totalCombats: 0,
        averageLevel: 0,
        averageSessionTime: 0,
        questSuccessRate: 0,
        mostPopularClass: 'N/A',
        totalGuilds: guilds.length,
        activeUsers: 0,
        retentionRate: 0
      });
      return;
    }

    // Calcular métricas básicas
    const totalQuests = heroes.reduce((sum, hero) => sum + hero.stats.questsCompleted, 0);
    const totalCombats = heroes.reduce((sum, hero) => sum + hero.stats.totalCombats, 0);
    const averageLevel = heroes.reduce((sum, hero) => sum + hero.progression.level, 0) / heroes.length;

    // Calcular classe mais popular
    const classCount: Record<string, number> = {};
    heroes.forEach(hero => {
      classCount[hero.class] = (classCount[hero.class] || 0) + 1;
    });
    const mostPopularClass = Object.entries(classCount).reduce((a, b) => 
      classCount[a[0]] > classCount[b[0]] ? a : b
    )[0] || 'N/A';

    // Calcular taxa de sucesso em missões (simulada)
    const questSuccessRate = totalQuests > 0 ? Math.min(95, 70 + (averageLevel * 2)) : 0;

    // Calcular usuários ativos (heróis criados nos últimos 7 dias)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const activeUsers = heroes.filter(hero => 
      new Date(hero.createdAt).getTime() > weekAgo
    ).length;

    // Calcular taxa de retenção (simulada baseada em atividade)
    const retentionRate = heroes.length > 0 ? Math.min(100, 40 + (totalQuests / heroes.length * 5)) : 0;

    setMetrics({
      totalHeroes: heroes.length,
      totalQuests,
      totalCombats,
      averageLevel: Math.round(averageLevel * 10) / 10,
      averageSessionTime: calculateAverageSessionTime(),
      questSuccessRate: Math.round(questSuccessRate),
      mostPopularClass,
      totalGuilds: guilds.length,
      activeUsers,
      retentionRate: Math.round(retentionRate)
    });
  };

  const loadSessionData = () => {
    // Simular dados de sessão baseados nos heróis existentes
    const sessions: SessionData[] = heroes.map(hero => ({
      heroId: hero.id,
      startTime: new Date(hero.createdAt).getTime(),
      lastActivity: new Date(hero.updatedAt).getTime(),
      questsStarted: hero.activeQuests.length + hero.stats.questsCompleted,
      questsCompleted: hero.stats.questsCompleted,
      combatsWon: Math.floor(hero.stats.totalCombats * 0.7), // 70% win rate
      combatsLost: Math.floor(hero.stats.totalCombats * 0.3)
    }));

    setSessionData(sessions);
  };

  const calculateAverageSessionTime = (): number => {
    if (sessionData.length === 0) return 0;
    
    const totalTime = sessionData.reduce((sum, session) => {
      return sum + (session.lastActivity - session.startTime);
    }, 0);
    
    return Math.round((totalTime / sessionData.length) / (1000 * 60)); // em minutos
  };

  const getTimeframeLabel = () => {
    switch (selectedTimeframe) {
      case 'today': return 'Hoje';
      case 'week': return 'Última Semana';
      case 'all': return 'Todos os Tempos';
    }
  };

  const exportMetrics = () => {
    const data = {
      timestamp: new Date().toISOString(),
      timeframe: selectedTimeframe,
      metrics,
      sessionData: sessionData.map(session => ({
        ...session,
        sessionDuration: session.lastActivity - session.startTime
      })),
      heroes: heroes.map(hero => ({
        id: hero.id,
        name: hero.name,
        class: hero.class,
        level: hero.progression.level,
        questsCompleted: hero.stats.questsCompleted,
        totalCombats: hero.stats.totalCombats,
        createdAt: hero.createdAt,
        updatedAt: hero.updatedAt
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hero-forge-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!metrics) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Painel de Playtest</h1>
            <p className="text-lg opacity-90">Métricas e análises do Hero Forge</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="bg-white text-gray-800 px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="today">Hoje</option>
              <option value="week">Última Semana</option>
              <option value="all">Todos os Tempos</option>
            </select>
            <button
              onClick={exportMetrics}
              className="bg-white text-indigo-600 px-4 py-2 rounded hover:bg-gray-100 transition-colors font-medium"
            >
              📥 Exportar Dados
            </button>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Heróis</p>
              <p className="text-3xl font-bold text-blue-600">{metrics.totalHeroes}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Missões Completas</p>
              <p className="text-3xl font-bold text-green-600">{metrics.totalQuests}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Combates</p>
              <p className="text-3xl font-bold text-red-600">{metrics.totalCombats}</p>
            </div>
            <div className="text-4xl">⚔️</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nível Médio</p>
              <p className="text-3xl font-bold text-purple-600">{metrics.averageLevel}</p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tempo Médio de Sessão</p>
              <p className="text-2xl font-bold text-indigo-600">{metrics.averageSessionTime}min</p>
            </div>
            <div className="text-3xl">⏱️</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-green-600">{metrics.questSuccessRate}%</p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.activeUsers}</p>
            </div>
            <div className="text-3xl">🔥</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Retenção</p>
              <p className="text-2xl font-bold text-teal-600">{metrics.retentionRate}%</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
      </div>

      {/* Análises Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Classes */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">🎭 Distribuição de Classes</h3>
          
          {heroes.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(
                heroes.reduce((acc, hero) => {
                  acc[hero.class] = (acc[hero.class] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([className, count]) => {
                const percentage = (count / heroes.length) * 100;
                return (
                  <div key={className}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{className}</span>
                      <span>{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <div>Nenhum dado disponível</div>
            </div>
          )}
        </div>

        {/* Atividade de Guildas */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">🏰 Atividade de Guildas</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total de Guildas</span>
              <span className="text-2xl font-bold text-purple-600">{metrics.totalGuilds}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Heróis em Guildas</span>
              <span className="text-lg font-medium">
                {heroes.filter(h => h.progression.guildId).length} / {heroes.length}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taxa de Participação</span>
              <span className="text-lg font-medium text-green-600">
                {heroes.length > 0 ? Math.round((heroes.filter(h => h.progression.guildId).length / heroes.length) * 100) : 0}%
              </span>
            </div>

            {guilds.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2 text-gray-700">Guildas Mais Ativas</h4>
                <div className="space-y-2">
                  {guilds.slice(0, 3).map(guild => (
                    <div key={guild.id} className="flex justify-between text-sm">
                      <span className="truncate">{guild.name}</span>
                      <span className="text-gray-600">{guild.members.length} membros</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights e Recomendações */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-xl font-bold mb-4 text-gray-800">💡 Insights e Recomendações</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.totalHeroes === 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="font-medium text-yellow-800">Primeiros Passos</span>
              </div>
              <p className="text-sm text-yellow-700">
                Nenhum herói criado ainda. Comece criando seu primeiro herói para testar o sistema!
              </p>
            </div>
          )}

          {metrics.averageLevel < 2 && metrics.totalHeroes > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600">📈</span>
                <span className="font-medium text-blue-800">Progressão Inicial</span>
              </div>
              <p className="text-sm text-blue-700">
                Nível médio baixo. Considere adicionar mais missões fáceis para iniciantes.
              </p>
            </div>
          )}

          {metrics.questSuccessRate < 60 && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-red-600">🎯</span>
                <span className="font-medium text-red-800">Taxa de Sucesso Baixa</span>
              </div>
              <p className="text-sm text-red-700">
                Taxa de sucesso em missões está baixa. Considere balancear a dificuldade.
              </p>
            </div>
          )}

          {metrics.totalGuilds === 0 && metrics.totalHeroes > 2 && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-purple-600">🏰</span>
                <span className="font-medium text-purple-800">Sistema Social</span>
              </div>
              <p className="text-sm text-purple-700">
                Nenhuma guilda criada. Incentive a criação de guildas para aumentar o engajamento social.
              </p>
            </div>
          )}

          {metrics.retentionRate > 80 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-green-600">🎉</span>
                <span className="font-medium text-green-800">Excelente Retenção</span>
              </div>
              <p className="text-sm text-green-700">
                Alta taxa de retenção! Os jogadores estão engajados com o sistema.
              </p>
            </div>
          )}

          {metrics.averageSessionTime > 30 && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-indigo-600">⏱️</span>
                <span className="font-medium text-indigo-800">Sessões Longas</span>
              </div>
              <p className="text-sm text-indigo-700">
                Sessões longas indicam alto engajamento. Continue adicionando conteúdo!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer com informações técnicas */}
      <div className="bg-gray-50 p-4 rounded-lg text-center text-sm text-gray-600">
        <p>
          Dados coletados em {getTimeframeLabel().toLowerCase()} • 
          Última atualização: {new Date().toLocaleString('pt-BR')} • 
          Versão do sistema: 1.0.0-beta
        </p>
      </div>
    </div>
  );
};

export default PlaytestPanel;