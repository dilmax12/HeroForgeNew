export interface EventReward {
  type: 'xp' | 'gold' | 'title' | 'item';
  amount?: number;
  titleId?: string;
  itemName?: string;
  itemDescription?: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  
  // Event mechanics
  objective: string;
  targetValue: number;
  currentProgress: number;
  progressType: 'xp-gained' | 'quests-completed' | 'gold-earned' | 'levels-gained' | 'login-days';
  
  // Rewards
  rewards: EventReward[];
  
  // Visual
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface EventProgress {
  eventId: string;
  heroId: string;
  progress: number;
  completed: boolean;
  rewardsClaimed: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface EventRotation {
  dailyEvents: GameEvent[];
  weeklyEvents: GameEvent[];
  specialEvents: GameEvent[];
  lastRotation: Date;
  nextRotation: Date;
}

export interface EventState {
  activeEvents: GameEvent[];
  eventProgress: EventProgress[];
  eventHistory: GameEvent[];
  rotation: EventRotation;
}