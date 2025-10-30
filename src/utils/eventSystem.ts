import { GameEvent, EventProgress, EventRotation, EventReward } from '../types/events';

// Event templates for rotation
const DAILY_EVENT_TEMPLATES: Omit<GameEvent, 'id' | 'startDate' | 'endDate' | 'isActive' | 'currentProgress'>[] = [
  {
    name: 'Caçador de XP',
    description: 'Ganhe experiência completando tarefas',
    type: 'daily',
    objective: 'Ganhar {target} pontos de experiência',
    targetValue: 500,
    progressType: 'xp-gained',
    rewards: [
      { type: 'gold', amount: 100 },
      { type: 'xp', amount: 50 }
    ],
    icon: '⚡',
    color: 'from-yellow-400 to-orange-500',
    rarity: 'common'
  },
  {
    name: 'Completador de Missões',
    description: 'Complete missões para ganhar recompensas',
    type: 'daily',
    objective: 'Completar {target} missões',
    targetValue: 3,
    progressType: 'quests-completed',
    rewards: [
      { type: 'gold', amount: 150 },
      { type: 'xp', amount: 100 }
    ],
    icon: '🎯',
    color: 'from-blue-400 to-blue-600',
    rarity: 'common'
  },
  {
    name: 'Coletor de Ouro',
    description: 'Acumule ouro através de suas aventuras',
    type: 'daily',
    objective: 'Ganhar {target} moedas de ouro',
    targetValue: 300,
    progressType: 'gold-earned',
    rewards: [
      { type: 'xp', amount: 200 },
      { type: 'gold', amount: 50 }
    ],
    icon: '💰',
    color: 'from-yellow-500 to-yellow-600',
    rarity: 'common'
  },
  {
    name: 'Ascensão Heroica',
    description: 'Evolua seu herói subindo de nível',
    type: 'daily',
    objective: 'Subir {target} nível(is)',
    targetValue: 1,
    progressType: 'levels-gained',
    rewards: [
      { type: 'gold', amount: 300 },
      { type: 'xp', amount: 150 },
      { type: 'title', titleId: 'level-master' }
    ],
    icon: '🌟',
    color: 'from-purple-400 to-purple-600',
    rarity: 'rare'
  }
];

const WEEKLY_EVENT_TEMPLATES: Omit<GameEvent, 'id' | 'startDate' | 'endDate' | 'isActive' | 'currentProgress'>[] = [
  {
    name: 'Maratona Semanal',
    description: 'Uma semana intensa de aventuras',
    type: 'weekly',
    objective: 'Ganhar {target} pontos de experiência',
    targetValue: 2500,
    progressType: 'xp-gained',
    rewards: [
      { type: 'gold', amount: 500 },
      { type: 'xp', amount: 300 },
      { type: 'title', titleId: 'weekly-champion' }
    ],
    icon: '🏃‍♂️',
    color: 'from-green-400 to-green-600',
    rarity: 'epic'
  },
  {
    name: 'Mestre das Missões',
    description: 'Domine a arte de completar missões',
    type: 'weekly',
    objective: 'Completar {target} missões',
    targetValue: 15,
    progressType: 'quests-completed',
    rewards: [
      { type: 'gold', amount: 750 },
      { type: 'xp', amount: 400 },
      { type: 'title', titleId: 'quest-master' }
    ],
    icon: '🗡️',
    color: 'from-red-400 to-red-600',
    rarity: 'epic'
  },
  {
    name: 'Fortuna Dourada',
    description: 'Acumule uma fortuna em ouro',
    type: 'weekly',
    objective: 'Ganhar {target} moedas de ouro',
    targetValue: 1500,
    progressType: 'gold-earned',
    rewards: [
      { type: 'gold', amount: 1000 },
      { type: 'xp', amount: 500 },
      { type: 'title', titleId: 'gold-collector' }
    ],
    icon: '👑',
    color: 'from-yellow-400 to-yellow-600',
    rarity: 'legendary'
  }
];

export class EventManager {
  private static instance: EventManager;
  private events: GameEvent[] = [];
  private eventProgress: EventProgress[] = [];
  private rotation: EventRotation;

  private constructor() {
    this.rotation = this.initializeRotation();
    this.loadState();
  }

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  private initializeRotation(): EventRotation {
    const now = new Date();
    const nextDaily = new Date(now);
    nextDaily.setDate(nextDaily.getDate() + 1);
    nextDaily.setHours(0, 0, 0, 0);

    const nextWeekly = new Date(now);
    nextWeekly.setDate(nextWeekly.getDate() + (7 - nextWeekly.getDay()));
    nextWeekly.setHours(0, 0, 0, 0);

    return {
      dailyEvents: [],
      weeklyEvents: [],
      specialEvents: [],
      lastRotation: now,
      nextRotation: nextDaily
    };
  }

  generateDailyEvents(): GameEvent[] {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Select 2-3 random daily events
    const selectedTemplates = this.shuffleArray([...DAILY_EVENT_TEMPLATES]).slice(0, Math.floor(Math.random() * 2) + 2);

    return selectedTemplates.map((template, index) => ({
      ...template,
      id: `daily-${now.getTime()}-${index}`,
      startDate: now,
      endDate: endOfDay,
      isActive: true,
      currentProgress: 0,
      objective: template.objective.replace('{target}', template.targetValue.toString())
    }));
  }

  generateWeeklyEvents(): GameEvent[] {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    // Select 1-2 weekly events
    const selectedTemplates = this.shuffleArray([...WEEKLY_EVENT_TEMPLATES]).slice(0, Math.floor(Math.random() * 2) + 1);

    return selectedTemplates.map((template, index) => ({
      ...template,
      id: `weekly-${now.getTime()}-${index}`,
      startDate: now,
      endDate: endOfWeek,
      isActive: true,
      currentProgress: 0,
      objective: template.objective.replace('{target}', template.targetValue.toString())
    }));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  checkAndRotateEvents(): void {
    const now = new Date();
    
    // Check if we need to rotate daily events
    if (now >= this.rotation.nextRotation) {
      this.rotateDailyEvents();
    }

    // Check if we need to rotate weekly events (every Sunday)
    if (now.getDay() === 0 && this.rotation.weeklyEvents.length === 0) {
      this.rotateWeeklyEvents();
    }

    // Remove expired events
    this.events = this.events.filter(event => event.endDate > now);
  }

  private rotateDailyEvents(): void {
    // Archive current daily events
    const currentDailyEvents = this.events.filter(e => e.type === 'daily');
    
    // Generate new daily events
    const newDailyEvents = this.generateDailyEvents();
    
    // Update events list
    this.events = this.events.filter(e => e.type !== 'daily');
    this.events.push(...newDailyEvents);

    // Update rotation
    const nextRotation = new Date();
    nextRotation.setDate(nextRotation.getDate() + 1);
    nextRotation.setHours(0, 0, 0, 0);
    
    this.rotation.dailyEvents = newDailyEvents;
    this.rotation.lastRotation = new Date();
    this.rotation.nextRotation = nextRotation;

    this.saveState();
  }

  private rotateWeeklyEvents(): void {
    // Generate new weekly events
    const newWeeklyEvents = this.generateWeeklyEvents();
    
    // Update events list
    this.events = this.events.filter(e => e.type !== 'weekly');
    this.events.push(...newWeeklyEvents);

    // Update rotation
    this.rotation.weeklyEvents = newWeeklyEvents;
    this.saveState();
  }

  getActiveEvents(): GameEvent[] {
    this.checkAndRotateEvents();
    return this.events.filter(event => event.isActive && event.endDate > new Date());
  }

  updateEventProgress(heroId: string, progressType: string, amount: number = 1): void {
    const activeEvents = this.getActiveEvents().filter(event => event.progressType === progressType);

    activeEvents.forEach(event => {
      let progress = this.eventProgress.find(p => p.eventId === event.id && p.heroId === heroId);
      
      if (!progress) {
        progress = {
          eventId: event.id,
          heroId: heroId,
          progress: 0,
          completed: false,
          rewardsClaimed: false,
          startedAt: new Date()
        };
        this.eventProgress.push(progress);
      }

      if (!progress.completed) {
        progress.progress = Math.min(progress.progress + amount, event.targetValue);
        
        if (progress.progress >= event.targetValue) {
          progress.completed = true;
          progress.completedAt = new Date();
        }
      }
    });

    this.saveState();
  }

  claimEventRewards(heroId: string, eventId: string): EventReward[] | null {
    const progress = this.eventProgress.find(p => p.eventId === eventId && p.heroId === heroId);
    const event = this.events.find(e => e.id === eventId);

    if (!progress || !event || !progress.completed || progress.rewardsClaimed) {
      return null;
    }

    progress.rewardsClaimed = true;
    this.saveState();

    return event.rewards;
  }

  getEventProgress(heroId: string): EventProgress[] {
    return this.eventProgress.filter(p => p.heroId === heroId);
  }

  getTimeUntilNextRotation(): { hours: number; minutes: number } {
    const now = new Date();
    const diff = this.rotation.nextRotation.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  }

  private saveState(): void {
    const state = {
      events: this.events,
      eventProgress: this.eventProgress,
      rotation: this.rotation
    };
    localStorage.setItem('heroforge-events', JSON.stringify(state));
  }

  private loadState(): void {
    const saved = localStorage.getItem('heroforge-events');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.events = state.events?.map((e: any) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate)
        })) || [];
        this.eventProgress = state.eventProgress?.map((p: any) => ({
          ...p,
          startedAt: new Date(p.startedAt),
          completedAt: p.completedAt ? new Date(p.completedAt) : undefined
        })) || [];
        this.rotation = state.rotation ? {
          ...state.rotation,
          lastRotation: new Date(state.rotation.lastRotation),
          nextRotation: new Date(state.rotation.nextRotation)
        } : this.initializeRotation();
      } catch (error) {
        console.error('Error loading event state:', error);
        this.initializeEvents();
      }
    } else {
      this.initializeEvents();
    }
  }

  private initializeEvents(): void {
    // Generate initial events if none exist
    if (this.events.length === 0) {
      const dailyEvents = this.generateDailyEvents();
      const weeklyEvents = this.generateWeeklyEvents();
      
      this.events = [...dailyEvents, ...weeklyEvents];
      this.rotation.dailyEvents = dailyEvents;
      this.rotation.weeklyEvents = weeklyEvents;
      
      this.saveState();
    }
  }
}

export const eventManager = EventManager.getInstance();