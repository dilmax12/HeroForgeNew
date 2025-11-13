import { Activity, ActivityData, ActivityFeed, ShareableActivity, ActivityFilter, ActivityComment } from '../types/activity';

export class ActivityManager {
  private static instance: ActivityManager;
  private activities: Activity[] = [];
  private maxActivities = 1000; // Limite para performance

  private constructor() {
    this.loadActivities();
  }

  static getInstance(): ActivityManager {
    if (!ActivityManager.instance) {
      ActivityManager.instance = new ActivityManager();
    }
    return ActivityManager.instance;
  }

  // Criar uma nova atividade
  createActivity(
    type: Activity['type'],
    data: ActivityData,
    isPublic: boolean = true
  ): Activity {
    const activity: Activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      data,
      message: this.generateActivityMessage(type, data),
      icon: this.getActivityIcon(type),
      color: this.getActivityColor(type),
      isPublic,
      likes: 0,
      comments: [],
      shares: 0
    };

    this.activities.unshift(activity); // Adicionar no início

    // Manter apenas as atividades mais recentes
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }

    this.saveActivities();
    return activity;
  }

  // Gerar mensagem da atividade
  private generateActivityMessage(type: Activity['type'], data: ActivityData): string {
    const { heroName, heroClass } = data;

    switch (type) {
      case 'quest-completed':
        return `${heroName} (${heroClass}) completou a missão "${data.questName}"${data.questDifficulty ? ` (${data.questDifficulty})` : ''}!`;
      
      case 'epic-quest-completed':
        return `🌟 ${heroName} (${heroClass}) conquistou a missão épica "${data.questName}"! Uma verdadeira lenda!`;
      
      case 'level-up':
        return `🎉 ${heroName} (${heroClass}) subiu para o nível ${data.heroLevel}!`;
      
      case 'achievement-unlocked':
        return `🏆 ${heroName} (${heroClass}) desbloqueou a conquista "${data.achievementUnlocked}"!`;
      
      case 'title-earned':
        return `👑 ${heroName} (${heroClass}) conquistou o título "${data.titleEarned}"!`;
      
      case 'event-completed':
        return `🎪 ${heroName} (${heroClass}) completou o evento "${data.eventCompleted}"!`;
      
      case 'daily-goal-completed':
        return `✅ ${heroName} (${heroClass}) completou a meta diária "${data.dailyGoalCompleted}"!`;
      
      case 'combat-victory':
        const enemiesText = data.enemiesDefeated?.length === 1 
          ? data.enemiesDefeated[0] 
          : `${data.enemiesDefeated?.length} inimigos`;
        return `⚔️ ${heroName} (${heroClass}) derrotou ${enemiesText} em combate!`;
      
      case 'rank-promotion':
        return `🏆 ${heroName} (${heroClass}) foi promovido para Rank ${data.newRank}! Uma conquista épica!`;
      
      case 'tavern-rest': {
        const restLabel = data.restType ? ` (${data.restType})` : '';
        const recovered = typeof data.fatigueRecovered === 'number' ? data.fatigueRecovered : 0;
        const spent = typeof data.goldSpent === 'number' ? data.goldSpent : 0;
        return `🛏️ ${heroName} (${heroClass}) descansou na taverna${restLabel}, recuperou ${recovered} de Fadiga por ${spent} ouro.`;
      }
      
      case 'item-used': {
        const parts: string[] = [];
        if (typeof data.hpRecovered === 'number' && data.hpRecovered > 0) {
          parts.push(`+${data.hpRecovered} HP`);
        }
        if (typeof data.mpRecovered === 'number' && data.mpRecovered > 0) {
          parts.push(`+${data.mpRecovered} MP`);
        }
        if (typeof data.xpGained === 'number' && data.xpGained > 0) {
          parts.push(`+${data.xpGained} XP`);
        }
        if (typeof data.fatigueRecovered === 'number' && data.fatigueRecovered > 0) {
          parts.push(`-${data.fatigueRecovered} Fadiga`);
        }
        const effectText = parts.length ? ` (${parts.join(', ')})` : '';
        const itemLabel = data.itemName ? ` ${data.itemName}` : '';
        return `🧪 ${heroName} (${heroClass}) usou${itemLabel}${effectText}.`;
      }
      
      default:
        return `${heroName} (${heroClass}) realizou uma ação heroica!`;
    }
  }

  // Obter ícone da atividade
  private getActivityIcon(type: Activity['type']): string {
    const icons = {
      'quest-completed': '🎯',
      'epic-quest-completed': '🌟',
      'level-up': '📈',
      'achievement-unlocked': '🏆',
      'title-earned': '👑',
      'event-completed': '🎪',
      'daily-goal-completed': '✅',
      'combat-victory': '⚔️',
      'rank-promotion': '🏆',
      'tavern-rest': '🛏️',
      'item-used': '🧪'
    };
    return icons[type] || '🎮';
  }

  // Obter cor da atividade
  private getActivityColor(type: Activity['type']): string {
    const colors = {
      'quest-completed': 'from-blue-400 to-blue-600',
      'epic-quest-completed': 'from-purple-500 to-pink-600',
      'level-up': 'from-green-400 to-green-600',
      'achievement-unlocked': 'from-yellow-400 to-orange-500',
      'title-earned': 'from-purple-400 to-purple-600',
      'event-completed': 'from-pink-400 to-pink-600',
      'daily-goal-completed': 'from-teal-400 to-teal-600',
      'combat-victory': 'from-red-400 to-red-600',
      'rank-promotion': 'from-amber-400 to-yellow-600',
      'tavern-rest': 'from-amber-400 to-amber-600',
      'item-used': 'from-indigo-400 to-indigo-600'
    };
    return colors[type] || 'from-gray-400 to-gray-600';
  }

  // Obter feed de atividades
  getActivityFeed(filter?: Partial<ActivityFilter>): ActivityFeed {
    let filteredActivities = [...this.activities];

    if (filter) {
      if (filter.types && filter.types.length > 0) {
        filteredActivities = filteredActivities.filter(a => filter.types!.includes(a.type));
      }

      if (filter.heroIds && filter.heroIds.length > 0) {
        filteredActivities = filteredActivities.filter(a => filter.heroIds!.includes(a.data.heroId));
      }

      if (filter.showOnlyPublic) {
        filteredActivities = filteredActivities.filter(a => a.isPublic);
      }

      if (filter.dateRange) {
        filteredActivities = filteredActivities.filter(a => 
          a.timestamp >= filter.dateRange!.start && a.timestamp <= filter.dateRange!.end
        );
      }
    }

    return {
      activities: filteredActivities,
      lastUpdated: new Date(),
      totalActivities: filteredActivities.length
    };
  }

  // Obter atividades de um herói específico
  getHeroActivities(heroId: string, limit: number = 50): Activity[] {
    return this.activities
      .filter(a => a.data.heroId === heroId)
      .slice(0, limit);
  }

  // Obter atividades recentes
  getRecentActivities(limit: number = 20): Activity[] {
    return this.activities.slice(0, limit);
  }

  // Curtir uma atividade
  likeActivity(activityId: string): boolean {
    const activity = this.activities.find(a => a.id === activityId);
    if (activity) {
      activity.likes++;
      this.saveActivities();
      return true;
    }
    return false;
  }

  // Adicionar comentário
  addComment(activityId: string, authorId: string, authorName: string, content: string): boolean {
    const activity = this.activities.find(a => a.id === activityId);
    if (activity) {
      const comment: ActivityComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        authorId,
        authorName,
        content,
        timestamp: new Date()
      };
      activity.comments.push(comment);
      this.saveActivities();
      return true;
    }
    return false;
  }

  // Compartilhar atividade
  shareActivity(activityId: string): ShareableActivity | null {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return null;

    activity.shares++;
    this.saveActivities();

    const shareUrl = `${window.location.origin}/activity/${activityId}`;
    const shareText = `Confira esta conquista épica no HeroForge: ${activity.message}`;

    return {
      activity,
      shareUrl,
      shareText
    };
  }

  // Gerar estatísticas de atividades
  getActivityStats(heroId?: string): {
    totalActivities: number;
    activitiesByType: Record<string, number>;
    activitiesThisWeek: number;
    activitiesThisMonth: number;
    mostActiveDay: string;
  } {
    const activities = heroId 
      ? this.activities.filter(a => a.data.heroId === heroId)
      : this.activities;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activitiesByType: Record<string, number> = {};
    const activitiesByDay: Record<string, number> = {};

    activities.forEach(activity => {
      // Por tipo
      activitiesByType[activity.type] = (activitiesByType[activity.type] || 0) + 1;
      
      // Por dia
      const day = activity.timestamp.toDateString();
      activitiesByDay[day] = (activitiesByDay[day] || 0) + 1;
    });

    const mostActiveDay = Object.entries(activitiesByDay)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Nenhum';

    return {
      totalActivities: activities.length,
      activitiesByType,
      activitiesThisWeek: activities.filter(a => a.timestamp >= weekAgo).length,
      activitiesThisMonth: activities.filter(a => a.timestamp >= monthAgo).length,
      mostActiveDay
    };
  }

  // Limpar atividades antigas
  cleanupOldActivities(daysToKeep: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.activities.length;
    this.activities = this.activities.filter(a => a.timestamp >= cutoffDate);
    
    const removedCount = initialCount - this.activities.length;
    if (removedCount > 0) {
      this.saveActivities();
    }

    return removedCount;
  }

  // Salvar atividades no localStorage
  private saveActivities(): void {
    try {
      const data = {
        activities: this.activities,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('heroforge-activities', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar atividades:', error);
    }
  }

  // Carregar atividades do localStorage
  private loadActivities(): void {
    try {
      const saved = localStorage.getItem('heroforge-activities');
      if (saved) {
        const data = JSON.parse(saved);
        this.activities = (data.activities || []).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
          comments: (a.comments || []).map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      this.activities = [];
    }
  }

  // Exportar atividades para compartilhamento
  exportActivities(heroId?: string): string {
    const activities = heroId 
      ? this.getHeroActivities(heroId)
      : this.getRecentActivities();

    const exportData = {
      heroForgeActivities: activities,
      exportedAt: new Date().toISOString(),
      totalActivities: activities.length
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Funções de conveniência para registrar atividades
export const activityManager = ActivityManager.getInstance();

export const logActivity = {
  questCompleted: (data: ActivityData) => 
    activityManager.createActivity('quest-completed', data),
  
  epicQuestCompleted: (data: ActivityData) => 
    activityManager.createActivity('epic-quest-completed', data),
  
  levelUp: (data: ActivityData) => 
    activityManager.createActivity('level-up', data),
  
  achievementUnlocked: (data: ActivityData) => 
    activityManager.createActivity('achievement-unlocked', data),
  
  titleEarned: (data: ActivityData) => 
    activityManager.createActivity('title-earned', data),
  
  eventCompleted: (data: ActivityData) => 
    activityManager.createActivity('event-completed', data),
  
  dailyGoalCompleted: (data: ActivityData) => 
    activityManager.createActivity('daily-goal-completed', data),
  
  combatVictory: (data: ActivityData) => 
    activityManager.createActivity('combat-victory', data),
  
  rankPromotion: (data: ActivityData) => 
    activityManager.createActivity('rank-promotion', data),

  tavernRest: (data: ActivityData) =>
    activityManager.createActivity('tavern-rest', data),

  itemUsed: (data: ActivityData) =>
    activityManager.createActivity('item-used', data)
};
