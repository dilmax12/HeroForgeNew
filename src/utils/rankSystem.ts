// Sistema de Ranks - Lógica e Progressão - HeroForge v2.2

import { 
  RankLevel, 
  RankProgress, 
  RankHistory, 
  RankCelebration, 
  HeroRankData,
  RankReward,
  RankComparison,
  RANK_CONFIG,
  RANK_THRESHOLDS,
  RANK_ORDER,
  RANK_REWARDS
} from '../types/ranks';
import { Hero } from '../types/hero';
import { logActivity } from './activitySystem';

export class RankSystem {
  private static instance: RankSystem;
  private celebrations: RankCelebration[] = [];

  static getInstance(): RankSystem {
    if (!RankSystem.instance) {
      RankSystem.instance = new RankSystem();
    }
    return RankSystem.instance;
  }

  /**
   * Calcula o rank atual baseado no XP, missões e títulos do herói
   */
  calculateRank(hero: Hero): RankLevel {
    let currentRank: RankLevel = 'F';
    
    for (const rank of RANK_ORDER) {
      const threshold = RANK_THRESHOLDS[rank];
      const meetsXP = hero.progression.xp >= threshold.xp;
      const meetsMissions = (hero.stats.questsCompleted || 0) >= threshold.missions;
      const meetsTitles = !threshold.titles || (hero.titles?.length || 0) >= threshold.titles;
      const meetsSpecial = this.checkSpecialRequirements(hero, threshold.specialRequirements);
      
      if (meetsXP && meetsMissions && meetsTitles && meetsSpecial) {
        currentRank = rank;
      } else {
        break;
      }
    }
    
    return currentRank;
  }

  /**
   * Verifica requisitos especiais para ranks avançados
   */
  private checkSpecialRequirements(hero: Hero, requirements?: string[]): boolean {
    if (!requirements) return true;
    
    for (const req of requirements) {
      switch (req) {
        case 'legendary_quest':
          // Verifica se completou pelo menos uma missão lendária
          if (!hero.achievements?.some(a => a.includes('Lendário'))) {
            return false;
          }
          break;
        case 'epic_achievement':
          // Verifica se tem conquistas épicas
          if (!hero.achievements?.some(a => a.includes('Épico'))) {
            return false;
          }
          break;
      }
    }
    
    return true;
  }

  /**
   * Calcula o progresso para o próximo rank
   */
  calculateProgress(hero: Hero): RankProgress {
    const currentRank = this.calculateRank(hero);
    const currentIndex = RANK_ORDER.indexOf(currentRank);
    const nextRank = currentIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentIndex + 1] : null;
    
    if (!nextRank) {
      return {
        currentRank,
        nextRank: null,
        currentXP: hero.progression.xp,
        requiredXP: hero.progression.xp,
        currentMissions: hero.stats.questsCompleted || 0,
        requiredMissions: hero.stats.questsCompleted || 0,
        progressPercentage: 100,
        canPromote: false
      };
    }
    
    const nextThreshold = RANK_THRESHOLDS[nextRank];
    const currentThreshold = RANK_THRESHOLDS[currentRank];
    
    const xpProgress = Math.min(100, ((hero.progression.xp - currentThreshold.xp) / (nextThreshold.xp - currentThreshold.xp)) * 100);
    const missionProgress = Math.min(100, ((hero.stats.questsCompleted || 0) / nextThreshold.missions) * 100);
    
    const progressPercentage = Math.min(xpProgress, missionProgress);
    
    const canPromote = hero.progression.xp >= nextThreshold.xp && 
                      (hero.stats.questsCompleted || 0) >= nextThreshold.missions &&
                      (!nextThreshold.titles || (hero.titles?.length || 0) >= nextThreshold.titles) &&
                      this.checkSpecialRequirements(hero, nextThreshold.specialRequirements);
    
    return {
      currentRank,
      nextRank,
      currentXP: hero.progression.xp,
      requiredXP: nextThreshold.xp,
      currentMissions: hero.stats.questsCompleted || 0,
      requiredMissions: nextThreshold.missions,
      progressPercentage,
      canPromote
    };
  }

  /**
   * Promove o herói para o próximo rank se elegível
   */
  promoteHero(hero: Hero, currentRankData: HeroRankData): { promoted: boolean; newRank?: RankLevel; celebration?: RankCelebration } {
    const progress = this.calculateProgress(hero);
    
    if (!progress.canPromote || !progress.nextRank) {
      return { promoted: false };
    }
    
    const newRank = progress.nextRank;
    const celebration = this.createCelebration(newRank, hero);
    
    // Log da atividade de promoção
    logActivity.rankPromotion({
      heroId: hero.id,
      heroName: hero.name,
      heroClass: hero.class,
      previousRank: currentRankData.currentRank,
      newRank: newRank
    });
    
    return {
      promoted: true,
      newRank,
      celebration
    };
  }

  /**
   * Cria uma celebração para a promoção de rank
   */
  private createCelebration(rank: RankLevel, hero: Hero): RankCelebration {
    const rankInfo = RANK_CONFIG[rank];
    const rewards = RANK_REWARDS[rank] || [];
    
    let animationType: 'ascension' | 'legendary' | 'epic' = 'ascension';
    if (rank === 'S') animationType = 'legendary';
    else if (['A', 'B'].includes(rank)) animationType = 'epic';
    
    return {
      rank,
      title: `Promoção para ${rankInfo.name}!`,
      message: `Parabéns, ${hero.name}! Você alcançou o rank ${rank} - ${rankInfo.name}. ${rankInfo.description}`,
      rewards: rewards.map(r => ({ ...r, unlocked: true })),
      animationType,
      soundEffect: rank === 'S' ? 'legendary_fanfare' : 'rank_up_trumpet',
      particleEffect: rank === 'S' ? 'golden_explosion' : 'sparkle_burst'
    };
  }

  /**
   * Determina uma conquista notável para o histórico
   */
  private getNotableAchievement(hero: Hero, _rank: RankLevel): string {
    const achievements = [
      `Alcançou ${hero.progression.xp} XP total`,
      `Completou ${hero.stats.questsCompleted || 0} missões`,
      `Nível ${hero.progression.level} conquistado`,
      `Classe ${hero.class} dominada`
    ];
    
    if (hero.achievements && hero.achievements.length > 0) {
      achievements.push(hero.achievements[hero.achievements.length - 1]);
    }
    
    return achievements[Math.floor(Math.random() * achievements.length)];
  }

  /**
   * Calcula pontos de rank baseado em múltiplos fatores
   */
  calculateRankPoints(hero: Hero): number {
    const basePoints = hero.progression.xp;
    const missionBonus = (hero.stats.questsCompleted || 0) * 50;
    
    const levelBonus = hero.progression.level * 100;
    const titleBonus = (hero.titles?.length || 0) * 200;
    const achievementBonus = (hero.achievements?.length || 0) * 150;
    
    return basePoints + missionBonus + levelBonus + titleBonus + achievementBonus;
  }

  /**
   * Cria dados de comparação para rankings
   */
  createComparison(hero: Hero, position: number): RankComparison {
    return {
      heroId: hero.id,
      heroName: hero.name,
      rank: this.calculateRank(hero),
      level: hero.progression.level,
      totalXP: hero.progression.xp,
      missionsCompleted: hero.stats.questsCompleted || 0,
      rankPoints: this.calculateRankPoints(hero),
      position
    };
  }

  /**
   * Verifica se há recompensas pendentes para desbloquear
   */
  checkPendingRewards(hero: Hero, currentRankData: HeroRankData): RankReward[] {
    const currentRank = this.calculateRank(hero);
    const availableRewards = RANK_REWARDS[currentRank] || [];
    const unlockedIds = currentRankData.unlockedRewards.map(r => r.name);
    
    return availableRewards.filter(reward => !unlockedIds.includes(reward.name));
  }

  /**
   * Inicializa dados de rank para um novo herói
   */
  initializeRankData(hero: Hero): HeroRankData {
    const initialRank = this.calculateRank(hero);
    
    return {
      currentRank: initialRank,
      rankHistory: [{
        rank: initialRank,
        achievedAt: new Date(),
        heroLevel: hero.progression.level,
        notableAchievement: 'Início da jornada épica',
        celebrationViewed: true
      }],
      totalRankPoints: this.calculateRankPoints(hero),
      rankProgress: this.calculateProgress(hero),
      unlockedRewards: RANK_REWARDS[initialRank]?.map(r => ({ ...r, unlocked: true })) || [],
      pendingCelebrations: [],
      rankAchievements: {
        fastestPromotion: 0,
        highestRankReached: initialRank,
        totalPromotions: 0,
        legendaryStoriesUnlocked: 0
      }
    };
  }

  /**
   * Atualiza dados de rank após mudanças no herói
   */
  updateRankData(hero: Hero, currentRankData: HeroRankData): HeroRankData {
    const newRank = this.calculateRank(hero);
    const progress = this.calculateProgress(hero);
    const rankPoints = this.calculateRankPoints(hero);
    
    // Verificar se houve promoção
    if (newRank !== currentRankData.currentRank) {
      const celebration = this.createCelebration(newRank, hero);
      const newHistory: RankHistory = {
        rank: newRank,
        achievedAt: new Date(),
        heroLevel: hero.progression.level,
        notableAchievement: this.getNotableAchievement(hero, newRank),
        celebrationViewed: false
      };

      try {
        logActivity.rankPromotion({
          heroId: hero.id,
          heroName: hero.name,
          heroClass: hero.class,
          previousRank: currentRankData.currentRank,
          newRank: newRank
        });
      } catch {}

      return {
        ...currentRankData,
        currentRank: newRank,
        rankHistory: [...currentRankData.rankHistory, newHistory],
        totalRankPoints: rankPoints,
        rankProgress: progress,
        pendingCelebrations: [...currentRankData.pendingCelebrations, celebration],
        rankAchievements: {
          ...currentRankData.rankAchievements,
          highestRankReached: newRank,
          totalPromotions: currentRankData.rankAchievements.totalPromotions + 1
        }
      };
    }
    
    return {
      ...currentRankData,
      totalRankPoints: rankPoints,
      rankProgress: progress
    };
  }

  /**
   * Obtém informações visuais do rank
   */
  getRankInfo(rank: RankLevel) {
    return RANK_CONFIG[rank];
  }

  /**
   * Obtém todas as recompensas disponíveis para um rank
   */
  getRankRewards(rank: RankLevel): RankReward[] {
    return RANK_REWARDS[rank] || [];
  }

  /**
   * Calcula tempo estimado para próximo rank
   */
  estimateTimeToNextRank(hero: Hero): { days: number; description: string } {
    const progress = this.calculateProgress(hero);
    
    if (!progress.nextRank) {
      return { days: 0, description: 'Rank máximo alcançado!' };
    }
    
    const xpNeeded = progress.requiredXP - progress.currentXP;
    const missionsNeeded = progress.requiredMissions - progress.currentMissions;
    
    // Estimativa baseada em progresso médio diário (assumindo 100 XP e 1 missão por dia)
    const daysForXP = Math.ceil(xpNeeded / 100);
    const daysForMissions = missionsNeeded;
    
    const estimatedDays = Math.max(daysForXP, daysForMissions);
    
    let description = '';
    if (estimatedDays <= 1) {
      description = 'Muito próximo da promoção!';
    } else if (estimatedDays <= 7) {
      description = `Aproximadamente ${estimatedDays} dias`;
    } else if (estimatedDays <= 30) {
      description = `Cerca de ${Math.ceil(estimatedDays / 7)} semanas`;
    } else {
      description = `Aproximadamente ${Math.ceil(estimatedDays / 30)} meses`;
    }
    
    return { days: estimatedDays, description };
  }
}

// Instância singleton
export const rankSystem = RankSystem.getInstance();
