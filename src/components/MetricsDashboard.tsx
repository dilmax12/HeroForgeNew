import React, { useMemo } from 'react';
import { metricsManager } from '../utils/metricsSystem';

const MetricsDashboard: React.FC = () => {
  const kpi = useMemo(() => metricsManager.getKPIDashboard(), []);
  const perf = kpi.performance;
  const eng = kpi.engagement;
  const gp = kpi.gameplay;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📊 Métricas e KPIs</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Visão Geral</div>
          <div className="text-sm text-gray-700">Usuários totais: {kpi.overview.totalUsers}</div>
          <div className="text-sm text-gray-700">Usuários ativos: {kpi.overview.activeUsers}</div>
          <div className="text-sm text-gray-700">Sessões: {kpi.overview.totalSessions}</div>
          <div className="text-sm text-gray-700">Duração média: {Math.round(kpi.overview.averageSessionDuration)}s</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Engajamento</div>
          <div className="text-sm text-gray-700">DAU: {eng.dailyActiveUsers}</div>
          <div className="text-sm text-gray-700">WAU: {eng.weeklyActiveUsers}</div>
          <div className="text-sm text-gray-700">MAU: {eng.monthlyActiveUsers}</div>
          <div className="text-sm text-gray-700">Ações por sessão: {eng.averageActionsPerSession.toFixed(1)}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Performance</div>
          <div className="text-sm text-gray-700">Load: {Math.round(perf.pageLoadTime)}ms</div>
          <div className="text-sm text-gray-700">Render: {Math.round(perf.componentRenderTime)}ms</div>
          <div className="text-sm text-gray-700">API: {Math.round(perf.apiResponseTime)}ms</div>
          <div className="text-sm text-gray-700">Erros: {(perf.errorRate*100).toFixed(2)}%</div>
          <div className="text-sm text-gray-700">Memória: {Math.round(perf.memoryUsage)}MB</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Gameplay</div>
          <div className="text-sm text-gray-700">Heróis: {gp.totalHeroes}</div>
          <div className="text-sm text-gray-700">Missões: {gp.totalQuestsCompleted}</div>
          <div className="text-sm text-gray-700">XP Total: {gp.totalXpGained}</div>
          <div className="text-sm text-gray-700">Ouro Total: {gp.totalGoldEarned}</div>
          <div className="text-sm text-gray-700">Classe popular: {gp.mostPopularClass}</div>
          <div className="text-sm text-gray-700">Missão mais completada: {gp.mostCompletedQuest}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Tendências</div>
          <div className="text-sm text-gray-700">Retenção 7 dias: {(gp.conversionFunnels.retention7Days*100).toFixed(1)}%</div>
          <div className="text-xs text-gray-600 mt-2">Usuários por dia (últimos 7): {kpi.trends.userGrowth.slice(-7).map(t=>t.count).join(', ')}</div>
          <div className="text-xs text-gray-600 mt-1">Sessões por dia (últimos 7): {kpi.trends.engagementTrend.slice(-7).map(t=>t.sessions).join(', ')}</div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;