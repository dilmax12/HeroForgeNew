/**
 * Sistema de Mini-Metas Diárias
 */

import { DailyGoal, Hero, Item } from '../types/hero';

export interface DailyGoalTemplate {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'exploration' | 'social' | 'progression' | 'collection';
  maxProgress: number;
  baseRewards: {
    xp: number;
    gold: number;
    items?: Item[];
  };
  difficulty: 'easy' | 'medium' | 'hard';
  levelRequirement: number;
}

const DAILY_GOAL_TEMPLATES: DailyGoalTemplate[] = [
  // EASY GOALS (Level 1+)
  {
    id: 'complete-quest',
    name: 'Aventureiro Ativo',
    description: 'Complete 1 missão',
    category: 'exploration',
    maxProgress: 1,
    baseRewards: { xp: 50, gold: 25 },
    difficulty: 'easy',
    levelRequirement: 1
  },
  {
    id: 'gain-xp',
    name: 'Crescimento Constante',
    description: 'Ganhe 100 XP',
    category: 'progression',
    maxProgress: 100,
    baseRewards: { xp: 25, gold: 15 },
    difficulty: 'easy',
    levelRequirement: 1
  },
  {
    id: 'earn-gold',
    name: 'Coletor de Moedas',
    description: 'Ganhe 50 moedas de ouro',
    category: 'collection',
    maxProgress: 50,
    baseRewards: { xp: 30, gold: 20 },
    difficulty: 'easy',
    levelRequirement: 1
  },
  {
    id: 'train-attribute',
    name: 'Fortalecimento',
    description: 'Treine qualquer atributo 1 vez',
    category: 'progression',
    maxProgress: 1,
    baseRewards: { xp: 40, gold: 30 },
    difficulty: 'easy',
    levelRequirement: 1
  },

  // MEDIUM GOALS (Level 3+)
  {
    id: 'complete-multiple-quests',
    name: 'Herói Dedicado',
    description: 'Complete 3 missões',
    category: 'exploration',
    maxProgress: 3,
    baseRewards: { xp: 100, gold: 75 },
    difficulty: 'medium',
    levelRequirement: 3
  },
  {
    id: 'defeat-enemies',
    name: 'Caçador de Monstros',
    description: 'Derrote 5 inimigos',
    category: 'combat',
    maxProgress: 5,
    baseRewards: { xp: 80, gold: 60 },
    difficulty: 'medium',
    levelRequirement: 3
  },
  {
    id: 'gain-large-xp',
    name: 'Sede de Conhecimento',
    description: 'Ganhe 300 XP',
    category: 'progression',
    maxProgress: 300,
    baseRewards: { xp: 75, gold: 50 },
    difficulty: 'medium',
    levelRequirement: 3
  },
  {
    id: 'social-interaction',
    name: 'Diplomata',
    description: 'Interaja com 3 NPCs diferentes',
    category: 'social',
    maxProgress: 3,
    baseRewards: { xp: 60, gold: 40 },
    difficulty: 'medium',
    levelRequirement: 3
  },

  // HARD GOALS (Level 5+)
  {
    id: 'epic-quest',
    name: 'Lenda em Formação',
    description: 'Complete 1 missão épica',
    category: 'exploration',
    maxProgress: 1,
    baseRewards: { xp: 200, gold: 150 },
    difficulty: 'hard',
    levelRequirement: 5
  },
  {
    id: 'level-up',
    name: 'Evolução',
    description: 'Suba 1 nível',
    category: 'progression',
    maxProgress: 1,
    baseRewards: { xp: 100, gold: 100 },
    difficulty: 'hard',
    levelRequirement: 5
  },
  {
    id: 'reputation-gain',
    name: 'Construtor de Reputação',
    description: 'Ganhe 50 pontos de reputação',
    category: 'social',
    maxProgress: 50,
    baseRewards: { xp: 120, gold: 80 },
    difficulty: 'hard',
    levelRequirement: 5
  },
  {
    id: 'perfect-day',
    name: 'Dia Perfeito',
    description: 'Complete todas as outras metas diárias',
    category: 'progression',
    maxProgress: 1,
    baseRewards: { xp: 300, gold: 200 },
    difficulty: 'hard',
    levelRequirement: 3
  }
];

export function generateDailyGoals(hero: Hero): DailyGoal[] {
  const availableTemplates = DAILY_GOAL_TEMPLATES.filter(
    template => hero.progression.level >= template.levelRequirement
  );

  const goals: DailyGoal[] = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Always include 1 easy goal
  const easyTemplates = availableTemplates.filter(t => t.difficulty === 'easy');
  if (easyTemplates.length > 0) {
    const template = easyTemplates[Math.floor(Math.random() * easyTemplates.length)];
    goals.push(createDailyGoalFromTemplate(template, tomorrow));
  }

  // Include 1-2 medium goals if hero level >= 3
  if (hero.progression.level >= 3) {
    const mediumTemplates = availableTemplates.filter(t => t.difficulty === 'medium');
    const mediumCount = Math.min(2, mediumTemplates.length);
    
    for (let i = 0; i < mediumCount; i++) {
      const template = mediumTemplates[Math.floor(Math.random() * mediumTemplates.length)];
      if (!goals.some(g => g.id.includes(template.id))) {
        goals.push(createDailyGoalFromTemplate(template, tomorrow));
      }
    }
  }

  // Include 1 hard goal if hero level >= 5
  if (hero.progression.level >= 5) {
    const hardTemplates = availableTemplates.filter(t => t.difficulty === 'hard' && t.id !== 'perfect-day');
    if (hardTemplates.length > 0) {
      const template = hardTemplates[Math.floor(Math.random() * hardTemplates.length)];
      goals.push(createDailyGoalFromTemplate(template, tomorrow));
    }
  }

  // Add "Perfect Day" goal if there are other goals
  if (goals.length >= 2 && hero.progression.level >= 3) {
    const perfectDayTemplate = DAILY_GOAL_TEMPLATES.find(t => t.id === 'perfect-day');
    if (perfectDayTemplate) {
      const perfectDayGoal = createDailyGoalFromTemplate(perfectDayTemplate, tomorrow);
      perfectDayGoal.maxProgress = goals.length; // Set to number of other goals
      perfectDayGoal.description = `Complete todas as outras ${goals.length} metas diárias`;
      goals.push(perfectDayGoal);
    }
  }

  return goals;
}

function createDailyGoalFromTemplate(template: DailyGoalTemplate, expiresAt: Date): DailyGoal {
  return {
    id: `${template.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description: template.description,
    progress: 0,
    maxProgress: template.maxProgress,
    completed: false,
    claimed: false,
    rewards: { ...template.baseRewards },
    expiresAt
  };
}

export function updateDailyGoalProgress(
  goals: DailyGoal[],
  goalType: string,
  amount: number = 1
): DailyGoal[] {
  return goals.map(goal => {
    if (goal.completed) return goal;

    let shouldUpdate = false;
    
    // Check if this goal should be updated based on the action type
    switch (goalType) {
      case 'quest-completed':
        shouldUpdate = goal.id.includes('complete-quest') || goal.id.includes('complete-multiple-quests');
        break;
      case 'epic-quest-completed':
        shouldUpdate = goal.id.includes('epic-quest');
        break;
      case 'xp-gained':
        shouldUpdate = goal.id.includes('gain-xp') || goal.id.includes('gain-large-xp');
        break;
      case 'gold-earned':
        shouldUpdate = goal.id.includes('earn-gold');
        break;
      case 'enemy-defeated':
        shouldUpdate = goal.id.includes('defeat-enemies');
        break;
      case 'attribute-trained':
        shouldUpdate = goal.id.includes('train-attribute');
        break;
      case 'level-up':
        shouldUpdate = goal.id.includes('level-up');
        break;
      case 'reputation-gained':
        shouldUpdate = goal.id.includes('reputation-gain');
        break;
      case 'npc-interaction':
        shouldUpdate = goal.id.includes('social-interaction');
        break;
    }

    if (shouldUpdate) {
      const newProgress = Math.min(goal.maxProgress, goal.progress + amount);
      return {
        ...goal,
        progress: newProgress,
        completed: newProgress >= goal.maxProgress
      };
    }

    return goal;
  });
}

export function checkPerfectDayGoal(goals: DailyGoal[]): DailyGoal[] {
  const perfectDayGoal = goals.find(g => g.id.includes('perfect-day'));
  if (!perfectDayGoal || perfectDayGoal.completed) return goals;

  const otherGoals = goals.filter(g => !g.id.includes('perfect-day'));
  const completedOtherGoals = otherGoals.filter(g => g.completed).length;

  return goals.map(goal => {
    if (goal.id.includes('perfect-day')) {
      return {
        ...goal,
        progress: completedOtherGoals,
        completed: completedOtherGoals >= goal.maxProgress
      };
    }
    return goal;
  });
}

export function getExpiredGoals(goals: DailyGoal[]): DailyGoal[] {
  const now = new Date();
  return goals.filter(goal => goal.expiresAt <= now);
}

export function removeExpiredGoals(goals: DailyGoal[]): DailyGoal[] {
  const now = new Date();
  return goals.filter(goal => goal.expiresAt > now);
}

export function getDailyGoalRewards(goal: DailyGoal): { xp: number; gold: number; items?: Item[] } {
  // Add bonus rewards based on difficulty
  const bonusMultiplier = goal.id.includes('perfect-day') ? 1.5 : 1;
  
  return {
    xp: Math.floor(goal.rewards.xp * bonusMultiplier),
    gold: Math.floor(goal.rewards.gold * bonusMultiplier),
    items: goal.rewards.items
  };
}

export function getDailyGoalCategoryIcon(goalId: string): string {
  if (goalId.includes('complete-quest') || goalId.includes('epic-quest')) return '⚔️';
  if (goalId.includes('gain-xp') || goalId.includes('level-up')) return '⭐';
  if (goalId.includes('earn-gold')) return '💰';
  if (goalId.includes('defeat-enemies')) return '🗡️';
  if (goalId.includes('train-attribute')) return '💪';
  if (goalId.includes('social-interaction') || goalId.includes('reputation-gain')) return '🤝';
  if (goalId.includes('perfect-day')) return '🏆';
  return '🎯';
}

export function getDailyGoalDifficultyColor(goalId: string): string {
  if (goalId.includes('perfect-day')) return 'text-purple-400';
  
  const template = DAILY_GOAL_TEMPLATES.find(t => goalId.includes(t.id));
  if (!template) return 'text-gray-400';
  
  switch (template.difficulty) {
    case 'easy': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'hard': return 'text-red-400';
    default: return 'text-gray-400';
  }
}
