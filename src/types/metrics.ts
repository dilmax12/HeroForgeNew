export interface GameplayMetric {
  id: string;
  timestamp: Date;
  heroId: string;
  eventType: MetricEventType;
  data: Record<string, any>;
  sessionId: string;
  userId?: string;
}

export type MetricEventType = 
  // Eventos de progressão
  | 'hero-created'
  | 'level-up'
  | 'xp-gained'
  | 'gold-gained'
  | 'attribute-increased'
  
  // Eventos de missões
  | 'quest-started'
  | 'quest-completed'
  | 'quest-failed'
  | 'epic-quest-completed'
  
  // Eventos de combate
  | 'combat-started'
  | 'combat-won'
  | 'combat-lost'
  | 'enemy-defeated'
  
  // Eventos de sistema
  | 'achievement-unlocked'
  | 'title-earned'
  | 'daily-goal-completed'
  | 'event-completed'
  | 'item-acquired'
  | 'item-used'
  
  // Eventos de engajamento
  | 'session-started'
  | 'session-ended'
  | 'page-visited'
  | 'feature-used'
  | 'tutorial-started'
  | 'tutorial-completed'
  | 'onboarding-completed'
  
  // Eventos sociais
  | 'activity-liked'
  | 'activity-commented'
  | 'activity-shared'
  | 'guild-joined'
  | 'guild-left';

export interface SessionMetrics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // em segundos
  heroId?: string;
  pagesVisited: string[];
  actionsPerformed: number;
  questsCompleted: number;
  xpGained: number;
  goldGained: number;
  achievementsUnlocked: number;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  averageActionsPerSession: number;
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
  churnRate: number;
}

export interface GameplayAnalytics {
  totalHeroes: number;
  averageHeroLevel: number;
  totalQuestsCompleted: number;
  totalXpGained: number;
  totalGoldEarned: number;
  mostPopularClass: string;
  mostCompletedQuest: string;
  averageSessionsPerUser: number;
  conversionFunnels: {
    heroCreation: number;
    firstQuest: number;
    firstLevelUp: number;
    firstAchievement: number;
    retention7Days: number;
  };
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  componentRenderTime: number;
  apiResponseTime: number;
  errorRate: number;
  crashRate: number;
  memoryUsage: number;
}

export interface KPIDashboard {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
  };
  engagement: EngagementMetrics;
  gameplay: GameplayAnalytics;
  performance: PerformanceMetrics;
  trends: {
    userGrowth: Array<{ date: string; count: number }>;
    engagementTrend: Array<{ date: string; sessions: number; duration: number }>;
    gameplayTrend: Array<{ date: string; quests: number; xp: number }>;
  };
}

export interface MetricFilter {
  startDate?: Date;
  endDate?: Date;
  heroId?: string;
  eventTypes?: MetricEventType[];
  sessionId?: string;
}

export interface MetricAggregation {
  period: 'hour' | 'day' | 'week' | 'month';
  groupBy?: string[];
  metrics: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  enabled: boolean;
  notifications: {
    email?: string[];
    webhook?: string;
  };
}

export interface MetricAlert {
  id: string;
  ruleId: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}