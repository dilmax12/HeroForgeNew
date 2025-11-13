export interface ActivityData {
  heroId: string;
  heroName: string;
  heroClass: string;
  heroLevel: number;
  questName?: string;
  questDifficulty?: string;
  xpGained?: number;
  goldGained?: number;
  levelGained?: number;
  titleEarned?: string;
  achievementUnlocked?: string;
  eventCompleted?: string;
  // Eventos de guilda
  guildName?: string;
  eventName?: string;
  xpBuffPercent?: number;
  trainingDiscountPercent?: number;
  eventExpiresAt?: string; // ISO
  costGold?: number;
  dailyGoalCompleted?: string;
  combatResult?: 'victory' | 'defeat';
  enemiesDefeated?: string[];
  newRank?: string;
  previousRank?: string;
  // Descanso na taverna
  restType?: string; // ex.: 'soneca', 'noite', 'luxo'
  goldSpent?: number;
  fatigueBefore?: number;
  fatigueRecovered?: number;
  fatigueAfter?: number;
  // Uso de item
  itemId?: string;
  itemName?: string;
  itemType?: string;
  hpRecovered?: number;
  mpRecovered?: number;
}

export interface Activity {
  id: string;
  type: 'quest-completed' | 'level-up' | 'achievement-unlocked' | 'title-earned' | 'event-completed' | 'daily-goal-completed' | 'combat-victory' | 'epic-quest-completed' | 'rank-promotion' | 'tavern-rest' | 'item-used' | 'guild-event-activated';
  timestamp: Date;
  data: ActivityData;
  message: string;
  icon: string;
  color: string;
  isPublic: boolean;
  likes: number;
  comments: ActivityComment[];
  shares: number;
}

export interface ActivityComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export interface ActivityFeed {
  activities: Activity[];
  lastUpdated: Date;
  totalActivities: number;
}

export interface ShareableActivity {
  activity: Activity;
  shareUrl: string;
  shareText: string;
  imageUrl?: string;
}

export interface ActivityFilter {
  types: string[];
  heroIds: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  showOnlyPublic: boolean;
}
