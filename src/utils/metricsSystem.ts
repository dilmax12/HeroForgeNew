import { 
  GameplayMetric, 
  MetricEventType, 
  SessionMetrics, 
  EngagementMetrics, 
  GameplayAnalytics, 
  PerformanceMetrics,
  KPIDashboard,
  AlertRule,
  MetricAlert
} from '../types/metrics';

export class MetricsManager {
  private static instance: MetricsManager;
  private metrics: GameplayMetric[] = [];
  private sessions: SessionMetrics[] = [];
  private currentSession: SessionMetrics | null = null;
  private alertRules: AlertRule[] = [];
  private alerts: MetricAlert[] = [];
  private maxMetrics = 10000; // Limite para performance

  private constructor() {
    this.loadMetrics();
    this.initializeSession();
    this.setupPerformanceMonitoring();
  }

  static getInstance(): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager();
    }
    return MetricsManager.instance;
  }

  // === COLETA DE MÉTRICAS ===

  // Registrar evento de gameplay
  trackEvent(
    eventType: MetricEventType,
    heroId: string,
    data: Record<string, any> = {}
  ): void {
    const metric: GameplayMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      heroId,
      eventType,
      data,
      sessionId: this.currentSession?.sessionId || 'unknown',
      userId: this.getUserId()
    };

    this.metrics.unshift(metric);

    // Manter apenas as métricas mais recentes
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }

    // Atualizar sessão atual
    if (this.currentSession) {
      this.updateCurrentSession(eventType, data);
    }

    // Verificar alertas
    this.checkAlerts(metric);

    this.saveMetrics();

    try {
      const g = (window as any).gtag
      if (g && import.meta.env.PROD) {
        const map: Record<MetricEventType, string> = {
          'purchase-initiated': 'begin_checkout',
          'purchase-completed': 'purchase',
          'ad-impression': 'ad_impression',
          'ad-click': 'ad_click',
          'rewarded-ad-completed': 'earn_virtual_currency',
          'page-visited': 'page_view',
          'hero-created': 'hero_created',
          'level-up': 'level_up',
          'xp-gained': 'xp_gained',
          'gold-gained': 'gold_gained',
          'attribute-increased': 'attribute_increased',
          'quest-started': 'quest_started',
          'quest-completed': 'quest_completed',
          'quest-failed': 'quest_failed',
          'epic-quest-completed': 'epic_quest_completed',
          'combat-started': 'combat_started',
          'combat-won': 'combat_won',
          'combat-lost': 'combat_lost',
          'enemy-defeated': 'enemy_defeated',
          'achievement-unlocked': 'achievement_unlocked',
          'title-earned': 'title_earned',
          'daily-goal-completed': 'daily_goal_completed',
          'event-completed': 'event_completed',
          'item-acquired': 'item_acquired',
          'item-used': 'item_used',
          'session-started': 'session_started',
          'session-ended': 'session_ended',
          'feature-used': 'feature_used',
          'tutorial-started': 'tutorial_started',
          'tutorial-completed': 'tutorial_completed',
          'onboarding-completed': 'onboarding_completed',
          'activity-liked': 'activity_liked',
          'activity-commented': 'activity_commented',
          'activity-shared': 'activity_shared',
          'guild-joined': 'guild_joined',
          'guild-left': 'guild_left'
        }
        const name = map[eventType]
        if (name) {
          const params: Record<string, any> = { hero_id: heroId, session_id: metric.sessionId, user_id: metric.userId, ...data }
          if (eventType === 'purchase-completed') {
            params.transaction_id = data.receiptId || `txn-${Date.now()}`
            params.items = [{ item_id: data.productId }]
          }
          g('event', name, params)
        }
      }
    } catch {}
  }

  // Inicializar sessão
  private initializeSession(): void {
    this.currentSession = {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      pagesVisited: [window.location.pathname],
      actionsPerformed: 0,
      questsCompleted: 0,
      xpGained: 0,
      goldGained: 0,
      achievementsUnlocked: 0
    };

    this.trackEvent('session-started', 'system', {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language
    });
  }

  // Finalizar sessão
  endSession(): void {
    if (!this.currentSession) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - this.currentSession.startTime.getTime()) / 1000);

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;

    this.sessions.unshift(this.currentSession);
    
    // Manter apenas as 1000 sessões mais recentes
    if (this.sessions.length > 1000) {
      this.sessions = this.sessions.slice(0, 1000);
    }

    this.trackEvent('session-ended', 'system', {
      duration,
      actionsPerformed: this.currentSession.actionsPerformed,
      pagesVisited: this.currentSession.pagesVisited.length
    });

    this.saveSessions();
    this.currentSession = null;
  }

  // Atualizar sessão atual
  private updateCurrentSession(eventType: MetricEventType, data: Record<string, any>): void {
    if (!this.currentSession) return;

    this.currentSession.actionsPerformed++;

    switch (eventType) {
      case 'quest-completed':
        this.currentSession.questsCompleted++;
        break;
      case 'xp-gained':
        this.currentSession.xpGained += data.amount || 0;
        break;
      case 'gold-gained':
        this.currentSession.goldGained += data.amount || 0;
        break;
      case 'achievement-unlocked':
        this.currentSession.achievementsUnlocked++;
        break;
      case 'page-visited':
        if (!this.currentSession.pagesVisited.includes(data.page)) {
          this.currentSession.pagesVisited.push(data.page);
        }
        break;
    }
  }

  // === ANALYTICS E RELATÓRIOS ===

  // Obter métricas de engajamento
  getEngagementMetrics(days: number = 30): EngagementMetrics {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const recentSessions = this.sessions.filter(s => s.startTime >= cutoffDate);
    
    const dailyUsers = this.getUniqueUsersInPeriod(1);
    const weeklyUsers = this.getUniqueUsersInPeriod(7);
    const monthlyUsers = this.getUniqueUsersInPeriod(30);

    const totalDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageSessionDuration = recentSessions.length > 0 ? totalDuration / recentSessions.length : 0;

    const totalActions = recentSessions.reduce((sum, s) => sum + s.actionsPerformed, 0);
    const averageActionsPerSession = recentSessions.length > 0 ? totalActions / recentSessions.length : 0;

    return {
      dailyActiveUsers: dailyUsers,
      weeklyActiveUsers: weeklyUsers,
      monthlyActiveUsers: monthlyUsers,
      averageSessionDuration,
      averageActionsPerSession,
      retentionRate: this.calculateRetentionRates(),
      churnRate: this.calculateChurnRate()
    };
  }

  // Obter analytics de gameplay
  getGameplayAnalytics(): GameplayAnalytics {
    const heroCreationEvents = this.metrics.filter(m => m.eventType === 'hero-created');
    const questEvents = this.metrics.filter(m => m.eventType === 'quest-completed');
    const xpEvents = this.metrics.filter(m => m.eventType === 'xp-gained');
    const goldEvents = this.metrics.filter(m => m.eventType === 'gold-gained');

    // Calcular classe mais popular
    const classCount: Record<string, number> = {};
    heroCreationEvents.forEach(event => {
      const heroClass = event.data.class;
      classCount[heroClass] = (classCount[heroClass] || 0) + 1;
    });
    const mostPopularClass = Object.entries(classCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Nenhuma';

    // Calcular missão mais completada
    const questCount: Record<string, number> = {};
    questEvents.forEach(event => {
      const questName = event.data.questName;
      questCount[questName] = (questCount[questName] || 0) + 1;
    });
    const mostCompletedQuest = Object.entries(questCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Nenhuma';

    const totalXp = xpEvents.reduce((sum, e) => sum + (e.data.amount || 0), 0);
    const totalGold = goldEvents.reduce((sum, e) => sum + (e.data.amount || 0), 0);

    return {
      totalHeroes: heroCreationEvents.length,
      averageHeroLevel: this.calculateAverageHeroLevel(),
      totalQuestsCompleted: questEvents.length,
      totalXpGained: totalXp,
      totalGoldEarned: totalGold,
      mostPopularClass,
      mostCompletedQuest,
      averageSessionsPerUser: this.calculateAverageSessionsPerUser(),
      conversionFunnels: this.calculateConversionFunnels()
    };
  }

  // Obter métricas de performance
  getPerformanceMetrics(): PerformanceMetrics {
    const performanceEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const pageLoadTime = performanceEntries[0]?.loadEventEnd - performanceEntries[0]?.navigationStart || 0;

    return {
      pageLoadTime,
      componentRenderTime: this.getAverageRenderTime(),
      apiResponseTime: this.getAverageApiResponseTime(),
      errorRate: this.calculateErrorRate(),
      crashRate: this.calculateCrashRate(),
      memoryUsage: this.getMemoryUsage()
    };
  }

  // Obter dashboard completo de KPIs
  getKPIDashboard(): KPIDashboard {
    const engagement = this.getEngagementMetrics();
    const gameplay = this.getGameplayAnalytics();
    const performance = this.getPerformanceMetrics();

    return {
      overview: {
        totalUsers: this.getTotalUsers(),
        activeUsers: engagement.dailyActiveUsers,
        totalSessions: this.sessions.length,
        averageSessionDuration: engagement.averageSessionDuration
      },
      engagement,
      gameplay,
      performance,
      trends: {
        userGrowth: this.getUserGrowthTrend(),
        engagementTrend: this.getEngagementTrend(),
        gameplayTrend: this.getGameplayTrend()
      }
    };
  }

  // === FUNÇÕES AUXILIARES ===

  private getUniqueUsersInPeriod(days: number): number {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentSessions = this.sessions.filter(s => s.startTime >= cutoffDate);
    return new Set(recentSessions.map(s => s.heroId).filter(Boolean)).size;
  }

  private calculateRetentionRates(): { day1: number; day7: number; day30: number } {
    // Implementação simplificada - em produção seria mais complexa
    const totalUsers = this.getTotalUsers();
    if (totalUsers === 0) return { day1: 0, day7: 0, day30: 0 };

    return {
      day1: Math.min(this.getUniqueUsersInPeriod(1) / totalUsers, 1),
      day7: Math.min(this.getUniqueUsersInPeriod(7) / totalUsers, 1),
      day30: Math.min(this.getUniqueUsersInPeriod(30) / totalUsers, 1)
    };
  }

  private calculateChurnRate(): number {
    const activeUsers = this.getUniqueUsersInPeriod(30);
    const totalUsers = this.getTotalUsers();
    return totalUsers > 0 ? Math.max(0, (totalUsers - activeUsers) / totalUsers) : 0;
  }

  private calculateAverageHeroLevel(): number {
    const levelUpEvents = this.metrics.filter(m => m.eventType === 'level-up');
    if (levelUpEvents.length === 0) return 1;

    const levels = levelUpEvents.map(e => e.data.newLevel || 1);
    return levels.reduce((sum, level) => sum + level, 0) / levels.length;
  }

  private calculateAverageSessionsPerUser(): number {
    const uniqueUsers = new Set(this.sessions.map(s => s.heroId).filter(Boolean));
    return uniqueUsers.size > 0 ? this.sessions.length / uniqueUsers.size : 0;
  }

  private calculateConversionFunnels(): any {
    const heroCreated = this.metrics.filter(m => m.eventType === 'hero-created').length;
    const firstQuest = this.metrics.filter(m => m.eventType === 'quest-completed').length;
    const firstLevelUp = this.metrics.filter(m => m.eventType === 'level-up').length;
    const firstAchievement = this.metrics.filter(m => m.eventType === 'achievement-unlocked').length;

    return {
      heroCreation: heroCreated,
      firstQuest: heroCreated > 0 ? firstQuest / heroCreated : 0,
      firstLevelUp: heroCreated > 0 ? firstLevelUp / heroCreated : 0,
      firstAchievement: heroCreated > 0 ? firstAchievement / heroCreated : 0,
      retention7Days: this.getUniqueUsersInPeriod(7) / Math.max(heroCreated, 1)
    };
  }

  private getTotalUsers(): number {
    const allUsers = new Set(this.sessions.map(s => s.heroId).filter(Boolean));
    return allUsers.size;
  }

  private getUserGrowthTrend(): Array<{ date: string; count: number }> {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayStart = new Date(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const newUsers = this.metrics.filter(m => 
        m.eventType === 'hero-created' &&
        m.timestamp >= dayStart &&
        m.timestamp < dayEnd
      ).length;

      return { date, count: newUsers };
    });
  }

  private getEngagementTrend(): Array<{ date: string; sessions: number; duration: number }> {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayStart = new Date(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const daySessions = this.sessions.filter(s => 
        s.startTime >= dayStart && s.startTime < dayEnd
      );

      const totalDuration = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgDuration = daySessions.length > 0 ? totalDuration / daySessions.length : 0;

      return { 
        date, 
        sessions: daySessions.length, 
        duration: avgDuration 
      };
    });
  }

  private getGameplayTrend(): Array<{ date: string; quests: number; xp: number }> {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayStart = new Date(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayQuests = this.metrics.filter(m => 
        m.eventType === 'quest-completed' &&
        m.timestamp >= dayStart &&
        m.timestamp < dayEnd
      ).length;

      const dayXp = this.metrics.filter(m => 
        m.eventType === 'xp-gained' &&
        m.timestamp >= dayStart &&
        m.timestamp < dayEnd
      ).reduce((sum, m) => sum + (m.data.amount || 0), 0);

      return { date, quests: dayQuests, xp: dayXp };
    });
  }

  // === PERFORMANCE MONITORING ===

  private setupPerformanceMonitoring(): void {
    // Monitor de erros
    window.addEventListener('error', (event) => {
      this.trackEvent('error-occurred', 'system', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Monitor de promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('promise-rejection', 'system', {
        reason: event.reason?.toString() || 'Unknown'
      });
    });

    // Monitor de performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.trackEvent('performance-measure', 'system', {
              name: entry.name,
              duration: entry.duration
            });
          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });
    }
  }

  private getAverageRenderTime(): number {
    const renderMetrics = this.metrics.filter(m => 
      m.eventType === 'performance-measure' && 
      m.data.name?.includes('render')
    );
    
    if (renderMetrics.length === 0) return 0;
    
    const totalTime = renderMetrics.reduce((sum, m) => sum + (m.data.duration || 0), 0);
    return totalTime / renderMetrics.length;
  }

  private getAverageApiResponseTime(): number {
    // Implementação simplificada
    return Math.random() * 200 + 50; // 50-250ms simulado
  }

  private calculateErrorRate(): number {
    const totalEvents = this.metrics.length;
    const errorEvents = this.metrics.filter(m => 
      m.eventType === 'error-occurred' || m.eventType === 'promise-rejection'
    ).length;
    
    return totalEvents > 0 ? errorEvents / totalEvents : 0;
  }

  private calculateCrashRate(): number {
    // Implementação simplificada
    return 0.001; // 0.1% simulado
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // === ALERTAS ===

  private checkAlerts(metric: GameplayMetric): void {
    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const value = this.extractMetricValue(metric, rule.metric);
      if (value === null) return;

      const shouldAlert = this.evaluateCondition(value, rule.condition, rule.threshold);
      
      if (shouldAlert) {
        this.createAlert(rule, metric, value);
      }
    });
  }

  private extractMetricValue(metric: GameplayMetric, metricName: string): number | null {
    switch (metricName) {
      case 'session_duration':
        return this.currentSession?.duration || 0;
      case 'error_rate':
        return this.calculateErrorRate();
      case 'memory_usage':
        return this.getMemoryUsage();
      default:
        return metric.data[metricName] || null;
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than': return value > threshold;
      case 'less_than': return value < threshold;
      case 'equals': return value === threshold;
      case 'not_equals': return value !== threshold;
      default: return false;
    }
  }

  private createAlert(rule: AlertRule, metric: GameplayMetric, value: number): void {
    const alert: MetricAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      timestamp: new Date(),
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      message: `Alert: ${rule.name} - ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      severity: this.calculateSeverity(value, rule.threshold),
      acknowledged: false
    };

    this.alerts.unshift(alert);
    console.warn('Metric Alert:', alert.message);
  }

  private calculateSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = Math.abs(value - threshold) / threshold;
    if (ratio > 2) return 'critical';
    if (ratio > 1) return 'high';
    if (ratio > 0.5) return 'medium';
    return 'low';
  }

  // Métodos públicos para regras e alertas
  addAlertRule(rule: AlertRule): void {
    const exists = this.alertRules.some(r => r.id === rule.id);
    if (exists) {
      this.alertRules = this.alertRules.map(r => (r.id === rule.id ? rule : r));
    } else {
      this.alertRules.unshift(rule);
    }
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  getAlerts(): MetricAlert[] {
    return [...this.alerts];
  }

  acknowledgeAlert(alertId: string): void {
    this.alerts = this.alerts.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a));
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  // Expor eventos/sessões para análises avançadas
  getEvents(): GameplayMetric[] {
    return [...this.metrics];
  }

  getSessions(): SessionMetrics[] {
    return [...this.sessions];
  }

  // === PERSISTÊNCIA ===

  private getUserId(): string {
    return localStorage.getItem('heroforge-user-id') || 'anonymous';
  }

  private saveMetrics(): void {
    try {
      const data = {
        metrics: this.metrics.slice(0, 1000), // Salvar apenas as 1000 mais recentes
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('heroforge-metrics', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar métricas:', error);
    }
  }

  private loadMetrics(): void {
    try {
      const saved = localStorage.getItem('heroforge-metrics');
      if (saved) {
        const data = JSON.parse(saved);
        this.metrics = (data.metrics || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      this.metrics = [];
    }
  }

  private saveSessions(): void {
    try {
      const data = {
        sessions: this.sessions.slice(0, 500), // Salvar apenas as 500 mais recentes
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('heroforge-sessions', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar sessões:', error);
    }
  }

  private loadSessions(): void {
    try {
      const saved = localStorage.getItem('heroforge-sessions');
      if (saved) {
        const data = JSON.parse(saved);
        this.sessions = (data.sessions || []).map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      this.sessions = [];
    }
  }

  // === LIMPEZA ===

  cleanupOldData(daysToKeep: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffDate);
    this.sessions = this.sessions.filter(s => s.startTime >= cutoffDate);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoffDate);

    this.saveMetrics();
    this.saveSessions();
  }
}

// Instância global e funções de conveniência
export const metricsManager = MetricsManager.getInstance();

export const trackMetric = {
  heroCreated: (heroId: string, data: any) => 
    metricsManager.trackEvent('hero-created', heroId, data),
  
  levelUp: (heroId: string, data: any) => 
    metricsManager.trackEvent('level-up', heroId, data),
  
  questCompleted: (heroId: string, data: any) => 
    metricsManager.trackEvent('quest-completed', heroId, data),
  
  xpGained: (heroId: string, amount: number) => 
    metricsManager.trackEvent('xp-gained', heroId, { amount }),
  
  goldGained: (heroId: string, amount: number) => 
    metricsManager.trackEvent('gold-gained', heroId, { amount }),
  
  achievementUnlocked: (heroId: string, data: any) => 
    metricsManager.trackEvent('achievement-unlocked', heroId, data),
  
  pageVisited: (heroId: string, page: string) => 
    metricsManager.trackEvent('page-visited', heroId, { page }),
  
  featureUsed: (heroId: string, feature: string) => 
    metricsManager.trackEvent('feature-used', heroId, { feature }),
  featureUsedData: (heroId: string, feature: string, data: Record<string, any>) =>
    metricsManager.trackEvent('feature-used', heroId, { feature, ...data }),

  attributePointsAllocated: (heroId: string, data: { totalSpent: number; allocations: Record<string, number> }) =>
    metricsManager.trackEvent('attribute-increased', heroId, data),

  purchaseInitiated: (heroId: string, productId: string) =>
    metricsManager.trackEvent('purchase-initiated', heroId, { productId }),
  purchaseCompleted: (heroId: string, productId: string, receiptId?: string) =>
    metricsManager.trackEvent('purchase-completed', heroId, { productId, receiptId }),
  adImpression: (heroId: string, placement: string) =>
    metricsManager.trackEvent('ad-impression', heroId, { placement }),
  adClick: (heroId: string, placement: string) =>
    metricsManager.trackEvent('ad-click', heroId, { placement }),
  itemAcquired: (heroId: string, data: any) =>
    metricsManager.trackEvent('item-acquired', heroId, data),
  rewardedAdCompleted: (heroId: string, reward: string) =>
    metricsManager.trackEvent('rewarded-ad-completed', heroId, { reward })
};

// Finalizar sessão quando a página é fechada
window.addEventListener('beforeunload', () => {
  metricsManager.endSession();
  try {
    const kpi = metricsManager.getKPIDashboard();
    const events = metricsManager.getEvents();
    const featureEvents = events.filter(e => e.eventType === 'feature-used');
    const installs = featureEvents.filter(e => String(e.data?.feature) === 'pwa-installed').length;
    const purchases = events.filter(e => e.eventType === 'purchase-completed').length;
    const themeSwitches = featureEvents.filter(e => String(e.data?.feature) === 'theme-switch').length;
    const frameSwitches = featureEvents.filter(e => String(e.data?.feature) === 'frame-switch').length;
    const body = { kpi, installs, purchases };
    (body as any).customizations = { themeSwitches, frameSwitches };
    const isDev = Boolean((import.meta as any)?.env?.DEV);
    if (isDev) return;
    const url = `http://localhost:3001/api/metrics/ingest`;
    try {
      if (navigator && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    } catch {}
  } catch {}
});
