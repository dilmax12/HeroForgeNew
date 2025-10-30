import React, { useState, useEffect } from 'react';
import { metricsManager } from '../utils/metricsSystem';
import { KPIDashboard, EngagementMetrics, GameplayAnalytics, PerformanceMetrics } from '../types/metrics';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color, subtitle }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
    {change !== undefined && (
      <div className="mt-4 flex items-center">
        <span className="text-green-500 mr-1">📈</span>
        <span className={`text-sm font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500 ml-1">vs. período anterior</span>
      </div>
    )}
  </div>
);

interface ChartProps {
  title: string;
  data: Array<{ date: string; [key: string]: any }>;
  dataKeys: string[];
  colors: string[];
}

const SimpleChart: React.FC<ChartProps> = ({ title, data, dataKeys, colors }) => {
  const maxValue = Math.max(...data.flatMap(d => dataKeys.map(key => d[key] || 0)));
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {data.slice(-7).map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 w-16">
              {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
            <div className="flex-1 flex space-x-1">
              {dataKeys.map((key, keyIndex) => (
                <div
                  key={key}
                  className="h-6 rounded"
                  style={{
                    backgroundColor: colors[keyIndex],
                    width: `${((item[key] || 0) / maxValue) * 100}%`,
                    minWidth: '2px'
                  }}
                  title={`${key}: ${item[key] || 0}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-700 w-12 text-right">
              {dataKeys.reduce((sum, key) => sum + (item[key] || 0), 0)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {dataKeys.map((key, index) => (
          <div key={key} className="flex items-center space-x-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: colors[index] }}
            />
            <span className="text-xs text-gray-600 capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricsDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<KPIDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Simular delay de carregamento
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = metricsManager.getKPIDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedPeriod]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadDashboard, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const exportData = () => {
    if (!dashboard) return;

    const data = {
      exportDate: new Date().toISOString(),
      period: selectedPeriod,
      dashboard
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heroforge-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-lg text-gray-600">Carregando métricas...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <span className="text-6xl mb-4">⚠️</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao Carregar Métricas</h2>
            <p className="text-gray-600 mb-4">Não foi possível carregar os dados do dashboard.</p>
            <button
              onClick={loadDashboard}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-4xl mr-3">📊</span>
                Dashboard de Métricas
              </h1>
              <p className="text-gray-600 mt-1">
                Análise completa de KPIs e performance do HeroForge
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={autoRefresh ? 'Desativar atualização automática' : 'Ativar atualização automática'}
              >
                <span className={`text-lg ${autoRefresh ? 'animate-spin' : ''}`}>🔄</span>
              </button>
              
              <button
                onClick={exportData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>💾</span>
                <span>Exportar</span>
              </button>
              
              <button
                onClick={loadDashboard}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total de Usuários"
            value={formatNumber(dashboard.overview.totalUsers)}
            icon={<span className="text-2xl">👥</span>}
            color="#8B5CF6"
            subtitle="Usuários registrados"
          />
          
          <MetricCard
            title="Usuários Ativos"
            value={formatNumber(dashboard.overview.activeUsers)}
            icon={<span className="text-2xl">⚡</span>}
            color="#10B981"
            subtitle="Últimas 24 horas"
          />
          
          <MetricCard
            title="Total de Sessões"
            value={formatNumber(dashboard.overview.totalSessions)}
            icon={<span className="text-2xl">🎯</span>}
            color="#F59E0B"
            subtitle="Todas as sessões"
          />
          
          <MetricCard
            title="Duração Média"
            value={formatDuration(dashboard.overview.averageSessionDuration)}
            icon={<span className="text-2xl">⏰</span>}
            color="#EF4444"
            subtitle="Por sessão"
          />
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Usuários Diários"
            value={formatNumber(dashboard.engagement.dailyActiveUsers)}
            icon={<span className="text-2xl">📅</span>}
            color="#3B82F6"
            subtitle="Últimas 24h"
          />
          
          <MetricCard
            title="Usuários Semanais"
            value={formatNumber(dashboard.engagement.weeklyActiveUsers)}
            icon={<span className="text-2xl">📅</span>}
            color="#6366F1"
            subtitle="Últimos 7 dias"
          />
          
          <MetricCard
            title="Usuários Mensais"
            value={formatNumber(dashboard.engagement.monthlyActiveUsers)}
            icon={<span className="text-2xl">📅</span>}
            color="#8B5CF6"
            subtitle="Últimos 30 dias"
          />
        </div>

        {/* Gameplay Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total de Heróis"
            value={formatNumber(dashboard.gameplay.totalHeroes)}
            icon={<span className="text-2xl">👥</span>}
            color="#10B981"
            subtitle="Heróis criados"
          />
          
          <MetricCard
            title="Nível Médio"
            value={dashboard.gameplay.averageHeroLevel.toFixed(1)}
            icon={<span className="text-2xl">⭐</span>}
            color="#F59E0B"
            subtitle="Dos heróis"
          />
          
          <MetricCard
            title="Missões Completadas"
            value={formatNumber(dashboard.gameplay.totalQuestsCompleted)}
            icon={<span className="text-2xl">🏆</span>}
            color="#8B5CF6"
            subtitle="Total geral"
          />
          
          <MetricCard
            title="Ouro Total"
            value={formatNumber(dashboard.gameplay.totalGoldEarned)}
            icon={<span className="text-2xl">🪙</span>}
            color="#F59E0B"
            subtitle="Ouro ganho"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Tempo de Carregamento"
            value={`${dashboard.performance.pageLoadTime.toFixed(0)}ms`}
            icon={<span className="text-2xl">⚡</span>}
            color="#06B6D4"
            subtitle="Página inicial"
          />
          
          <MetricCard
            title="Taxa de Erro"
            value={`${(dashboard.performance.errorRate * 100).toFixed(2)}%`}
            icon={<span className="text-2xl">⚠️</span>}
            color="#EF4444"
            subtitle="Erros por evento"
          />
          
          <MetricCard
            title="Uso de Memória"
            value={`${dashboard.performance.memoryUsage.toFixed(1)}MB`}
            icon={<span className="text-2xl">💾</span>}
            color="#8B5CF6"
            subtitle="JavaScript heap"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SimpleChart
            title="Crescimento de Usuários"
            data={dashboard.trends.userGrowth}
            dataKeys={['count']}
            colors={['#8B5CF6']}
          />
          
          <SimpleChart
            title="Tendência de Engajamento"
            data={dashboard.trends.engagementTrend}
            dataKeys={['sessions']}
            colors={['#10B981']}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <SimpleChart
            title="Atividade de Gameplay"
            data={dashboard.trends.gameplayTrend}
            dataKeys={['quests', 'xp']}
            colors={['#F59E0B', '#EF4444']}
          />
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Classe Mais Popular</h4>
              <p className="text-2xl font-bold text-purple-600">{dashboard.gameplay.mostPopularClass}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Missão Mais Completada</h4>
              <p className="text-lg font-semibold text-green-600">{dashboard.gameplay.mostCompletedQuest}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Retenção (7 dias)</h4>
              <p className="text-2xl font-bold text-blue-600">
                {(dashboard.engagement.retentionRate.day7 * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Dashboard atualizado automaticamente • Dados em tempo real</p>
          <p className="mt-1">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;