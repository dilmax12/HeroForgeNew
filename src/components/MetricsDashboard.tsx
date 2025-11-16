import React, { useEffect, useMemo, useState } from 'react';
import { metricsManager } from '../utils/metricsSystem';

const MetricsDashboard: React.FC = () => {
  const kpi = useMemo(() => metricsManager.getKPIDashboard(), []);
  const perf = kpi.performance;
  const eng = kpi.engagement;
  const gp = kpi.gameplay;
  const install = useMemo(() => {
    const events = metricsManager.getEvents();
    const featureEvents = events.filter(e => e.eventType === 'feature-used');
    let accepted = 0, dismissed = 0;
    const byDevice: Record<string, { accepted: number; dismissed: number }> = {};
    featureEvents.forEach(ev => {
      const f = String(ev.data?.feature || '');
      const dev = String(ev.data?.device || 'unknown');
      if (!byDevice[dev]) byDevice[dev] = { accepted: 0, dismissed: 0 };
      if (f === 'pwa-install-accepted') { accepted++; byDevice[dev].accepted++; }
      if (f === 'pwa-install-dismissed') { dismissed++; byDevice[dev].dismissed++; }
    });
    const total = accepted + dismissed;
    const rate = total > 0 ? accepted / total : 0;
    const deviceRows = Object.entries(byDevice).map(([d, v]) => ({ device: d, accepted: v.accepted, dismissed: v.dismissed, rate: (v.accepted + v.dismissed) > 0 ? v.accepted / (v.accepted + v.dismissed) : 0 }));
    return { accepted, dismissed, total, rate, deviceRows };
  }, []);

  const installsByDay = useMemo(() => {
    const events = metricsManager.getEvents();
    const featureEvents = events.filter(e => e.eventType === 'feature-used' && String(e.data?.feature) === 'pwa-installed');
    const byDay: Record<string, number> = {};
    featureEvents.forEach(ev => {
      const day = ev.timestamp.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const series = last7Days.map(day => ({ day, count: byDay[day] || 0 }));
    return series;
  }, []);

  const monetizationFunnel = useMemo(() => {
    const events = metricsManager.getEvents();
    const featureEvents = events.filter(e => e.eventType === 'feature-used');
    const shopOpens = featureEvents.filter(e => e.data?.feature === 'shop-open').length;
    const premiumOpens = featureEvents.filter(e => e.data?.feature === 'premium-center-open').length;
    const premiumBannerClicks = featureEvents.filter(e => e.data?.feature === 'shop-premium-banner-click').length;
    const purchaseInitiated = events.filter(e => e.eventType === 'purchase-initiated').length;
    const purchaseCompleted = events.filter(e => e.eventType === 'purchase-completed').length;
    const rateBanner = shopOpens > 0 ? premiumBannerClicks / shopOpens : 0;
    const rateCheckout = premiumBannerClicks > 0 ? purchaseInitiated / premiumBannerClicks : 0;
    const ratePurchase = purchaseInitiated > 0 ? purchaseCompleted / purchaseInitiated : 0;
    const adImpressions = events.filter(e => e.eventType === 'ad-impression').length;
    const adClicks = events.filter(e => e.eventType === 'ad-click').length;
    const adCtr = adImpressions > 0 ? adClicks / adImpressions : 0;
    const purchases = events.filter(e => e.eventType === 'purchase-completed');
    const PRODUCT_PRICES: Record<string, number> = { 'remove-ads': 4.99, 'season-pass': 9.99 };
    const revenue = purchases.reduce((sum, p) => {
      const id = String(p.data?.productId || '');
      if (id && PRODUCT_PRICES[id] !== undefined) return sum + PRODUCT_PRICES[id];
      if (id.startsWith('frame-')) return sum + 1.99;
      if (id.startsWith('theme-')) return sum + 2.99;
      return sum;
    }, 0);
    const uniqueBuyers = new Set(purchases.map(p => p.userId).filter(Boolean)).size;
    const arppu = uniqueBuyers > 0 ? revenue / uniqueBuyers : 0;
    return { shopOpens, premiumOpens, premiumBannerClicks, purchaseInitiated, purchaseCompleted, rateBanner, rateCheckout, ratePurchase, adImpressions, adClicks, adCtr, revenue, arppu };
  }, []);
  const customizationLocal = useMemo(() => {
    const events = metricsManager.getEvents();
    const featureEvents = events.filter(e => e.eventType === 'feature-used');
    const themeSwitches = featureEvents.filter(e => e.data?.feature === 'theme-switch').length;
    const frameSwitches = featureEvents.filter(e => e.data?.feature === 'frame-switch').length;
    return { themeSwitches, frameSwitches };
  }, []);
  const [dailyRemote, setDailyRemote] = useState<Array<{ day: string; installs: number; purchases: number; sessions: number; dau: number }>>([]);
  const [summaryRemote, setSummaryRemote] = useState<{ installs: number; purchases: number; revenue: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/metrics/daily');
        const json = await res.json();
        if (res.ok && Array.isArray(json?.days)) setDailyRemote(json.days);
      } catch {}
      try {
        const res = await fetch('/api/metrics/summary');
        const json = await res.json();
        if (res.ok && json) setSummaryRemote(json);
      } catch {}
    })();
  }, []);

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
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Instalação PWA</div>
          <div className="text-sm text-gray-700">Total: {install.total}</div>
          <div className="text-sm text-gray-700">Aceitas: {install.accepted}</div>
          <div className="text-sm text-gray-700">Recusas: {install.dismissed}</div>
          <div className="text-sm text-gray-700">Taxa de aceitação: {(install.rate*100).toFixed(1)}%</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Conversão por dispositivo</div>
          {install.deviceRows.length === 0 ? (
            <div className="text-sm text-gray-700">Sem dados</div>
          ) : (
            <ul className="text-sm text-gray-700 space-y-1">
              {install.deviceRows.map(row => (
                <li key={row.device}>
                  <span className="font-medium">{row.device}</span>: {row.accepted}/{row.accepted + row.dismissed} ({(row.rate*100).toFixed(1)}%)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Instalações por dia (7d)</div>
          <div className="text-xs text-gray-700">{installsByDay.map(s => `${s.day.split('-').slice(1).join('/')}:${s.count}`).join(' | ')}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Funil de Monetização</div>
          <div className="text-sm text-gray-700">Aberturas Loja: {monetizationFunnel.shopOpens}</div>
          <div className="text-sm text-gray-700">Aberturas Premium: {monetizationFunnel.premiumOpens}</div>
          <div className="text-sm text-gray-700">Cliques em Banner Premium: {monetizationFunnel.premiumBannerClicks} ({(monetizationFunnel.rateBanner*100).toFixed(1)}%)</div>
          <div className="text-sm text-gray-700">Checkouts iniciados: {monetizationFunnel.purchaseInitiated} ({(monetizationFunnel.rateCheckout*100).toFixed(1)}%)</div>
          <div className="text-sm text-gray-700">Compras concluídas: {monetizationFunnel.purchaseCompleted} ({(monetizationFunnel.ratePurchase*100).toFixed(1)}%)</div>
          <div className="text-sm text-gray-700">Impressões de anúncio: {monetizationFunnel.adImpressions}</div>
          <div className="text-sm text-gray-700">Cliques em anúncio: {monetizationFunnel.adClicks} (CTR {(monetizationFunnel.adCtr*100).toFixed(2)}%)</div>
          <div className="text-sm text-gray-800 mt-2">Receita estimada: US${monetizationFunnel.revenue.toFixed(2)}</div>
          <div className="text-sm text-gray-800">ARPPU: US${monetizationFunnel.arppu.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Personalização (local)</div>
          <div className="text-sm text-gray-700">Trocas de tema: {customizationLocal.themeSwitches}</div>
          <div className="text-sm text-gray-700">Trocas de frame: {customizationLocal.frameSwitches}</div>
        </div>
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Personalização por dia (remoto)</div>
          {dailyRemote.length === 0 ? (
            <div className="text-sm text-gray-700">Sem dados</div>
          ) : (
            <div className="text-xs text-gray-700">{dailyRemote.slice(-7).map(d => `${d.day.split('-').slice(1).join('/')}: Tema ${Number((d as any).themeSwitches||0)}, Frame ${Number((d as any).frameSwitches||0)}`).join(' | ')}</div>
          )}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1">
        <div className="bg-white p-4 rounded border">
          <div className="text-lg font-semibold text-gray-800 mb-2">Métricas agregadas (remoto)</div>
          {dailyRemote.length === 0 ? (
            <div className="text-sm text-gray-700">Sem dados remotos</div>
          ) : (
            <div className="text-xs text-gray-700">{dailyRemote.slice(-7).map(d => `${d.day.split('-').slice(1).join('/')}: Inst ${d.installs}, Comp ${d.purchases}, Sess ${d.sessions}, DAU ${d.dau}`).join(' | ')}</div>
          )}
          {summaryRemote && (
            <div className="text-sm text-gray-800 mt-2">Total instalações: {summaryRemote.installs} • Compras: {summaryRemote.purchases} • Receita estimada: US${summaryRemote.revenue.toFixed(2)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;