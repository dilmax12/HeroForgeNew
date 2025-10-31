import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Hero, HeroCreationData, HeroAttributes, DerivedAttributes, Quest, Achievement, Guild, Item, CombatResult, DailyGoal } from '../types/hero';
import { generateQuestBoard, QUEST_ACHIEVEMENTS } from '../utils/quests';
import { resolveCombat, autoResolveCombat } from '../utils/combat';
import { purchaseItem, sellItem, equipItem, useConsumable, SHOP_ITEMS } from '../utils/shop';
import { updateHeroReputation, generateReputationEvents } from '../utils/reputationSystem';
import { generateAllLeaderboards, getHeroRanking, calculateTotalScore } from '../utils/leaderboardSystem';
import { DailyGoal, generateDailyGoals, updateDailyGoalProgress, checkPerfectDayGoal, removeExpiredGoals, getDailyGoalRewards } from '../utils/dailyGoalsSystem';
import { onboardingManager } from '../utils/onboardingSystem';
import { eventManager } from '../utils/eventSystem';
import { logActivity } from '../utils/activitySystem';
import { trackMetric } from '../utils/metricsSystem';
import { rankSystem } from '../utils/rankSystem';

interface HeroState {
  heroes: Hero[];
  selectedHeroId: string | null;
  availableQuests: Quest[];
  guilds: Guild[];
  
  // === AÇÕES BÁSICAS ===
  createHero: (heroData: HeroCreationData) => Hero;
  updateHero: (id: string, heroData: Partial<Hero>) => void;
  deleteHero: (id: string) => void;
  selectHero: (id: string | null) => void;
  exportHeroJson: (id: string) => string;
  
  // === SISTEMA DE MISSÕES ===
  refreshQuests: (heroLevel?: number) => void;
  acceptQuest: (heroId: string, questId: string) => boolean;
  completeQuest: (heroId: string, questId: string, autoResolve?: boolean) => CombatResult | null;
  
  // === SISTEMA DE PROGRESSÃO ===
  gainXP: (heroId: string, xp: number) => void;
  gainGold: (heroId: string, gold: number) => void;
  addItemToInventory: (heroId: string, itemId: string, quantity?: number) => void;
  checkAchievements: (heroId: string) => Achievement[];
  
  // === SISTEMA DE LOJA ===
  buyItem: (heroId: string, itemId: string) => boolean;
  sellItem: (heroId: string, itemId: string, quantity?: number) => boolean;
  equipItem: (heroId: string, itemId: string) => boolean;
  useItem: (heroId: string, itemId: string) => boolean;
  
  // === SISTEMA DE GUILDAS ===
  createGuild: (heroId: string, guildName: string, description: string) => Guild | null;
  joinGuild: (heroId: string, guildId: string) => boolean;
  leaveGuild: (heroId: string) => boolean;
  
  // === SISTEMA DE TÍTULOS E REPUTAÇÃO ===
  setActiveTitle: (titleId?: string) => void;
  updateAchievementProgress: () => void;
  updateReputation: (heroId: string, faction: string, change: number) => void;
  processReputationEvents: (heroId: string) => void;
  
  // === SISTEMA DE METAS DIÁRIAS ===
  generateDailyGoalsForHero: (heroId: string) => void;
  updateDailyGoalProgress: (heroId: string, goalType: string, amount?: number) => void;
  completeDailyGoal: (heroId: string, goalId: string) => void;
  cleanupExpiredGoals: (heroId: string) => void;
  
  // Onboarding
  shouldShowOnboarding: () => boolean;
  markOnboardingShown: () => void;
  triggerOnboardingForNewUser: () => void;
  
  // Leaderboard functions
  getLeaderboards: () => any;
  getHeroRanking: (heroId: string) => any;
  calculateHeroScore: (heroId: string) => number;
  
  // === SISTEMA DE RANKS v2.2 ===
  promoteHero: (heroId: string) => boolean;
  getHeroRankProgress: (heroId: string) => any;
  getRankLeaderboard: () => any[];
  markCelebrationViewed: (heroId: string, celebrationIndex: number) => void;
  
  // === GETTERS ===
  getSelectedHero: () => Hero | undefined;
  getHeroQuests: (heroId: string) => Quest[];
  getHeroGuild: (heroId: string) => Guild | undefined;
}

// === VALIDAÇÃO E CÁLCULOS ===

export const validateAttributes = (attributes: HeroAttributes): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const total = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  
  if (total > 18) {
    errors.push(`Total de pontos (${total}) excede o máximo de 18`);
  }
  
  Object.entries(attributes).forEach(([attr, value]) => {
    if (value < 0) {
      errors.push(`${attr} não pode ser negativo`);
    }
    if (value > 10) {
      errors.push(`${attr} não pode exceder 10 pontos`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const calculateDerivedAttributes = (
  attributes: HeroAttributes, 
  heroClass: string, 
  level: number
): DerivedAttributes => {
  let hpBase = 0;
  let mpBase = 0;
  
  switch (heroClass) {
    case 'guerreiro':
      hpBase = 10;
      mpBase = 3;
      break;
    case 'mago':
      hpBase = 6;
      mpBase = 10;
      break;
    case 'ladino':
      hpBase = 8;
      mpBase = 6;
      break;
    case 'clerigo':
      hpBase = 8;
      mpBase = 8;
      break;
    case 'patrulheiro':
      hpBase = 8;
      mpBase = 6;
      break;
    case 'paladino':
      hpBase = 10;
      mpBase = 5;
      break;
    default:
      hpBase = 8;
      mpBase = 6;
  }
  
  const hp = hpBase + Math.floor(attributes.constituicao / 2) * level;
  const mp = mpBase + Math.floor(attributes.inteligencia / 2) * level;
  const initiative = Math.floor(attributes.destreza / 2);
  const armorClass = 10 + Math.floor(attributes.destreza / 4);
  
  return {
    hp,
    mp,
    initiative,
    armorClass,
    currentHp: hp,
    currentMp: mp
  };
};

function calculateXPForLevel(level: number): number {
  return level * 100 + (level - 1) * 50; // Progressão: 100, 250, 450, 700...
}

function checkLevelUp(currentXP: number, currentLevel: number): number {
  let newLevel = currentLevel;
  while (currentXP >= calculateXPForLevel(newLevel + 1)) {
    newLevel++;
  }
  return newLevel;
}

// === STORE PRINCIPAL ===

export const useHeroStore = create<HeroState>()(
  persist(
    (set, get) => ({
      heroes: [],
      selectedHeroId: null,
      availableQuests: [],
      guilds: [],
      
      // === AÇÕES BÁSICAS ===
      
      createHero: (heroData: HeroCreationData) => {
        const timestamp = new Date().toISOString();
        
        const validation = validateAttributes(heroData.attributes);
        if (!validation.isValid) {
          throw new Error(`Atributos inválidos: ${validation.errors.join(', ')}`);
        }
        
        const newHero: Hero = {
          id: uuidv4(),
          ...heroData,
          level: 1,
          derivedAttributes: calculateDerivedAttributes(heroData.attributes, heroData.class, 1),
          progression: {
            xp: 0,
            level: 1,
            gold: 100, // Ouro inicial
            reputation: 0,
            titles: [],
            achievements: []
          },
          // Título inicial para novos heróis
          titles: [{
            id: 'novato',
            name: 'Novato',
            description: 'Primeiro passo na jornada épica',
            badge: '🌱',
            category: 'achievement' as const,
            rarity: 'comum' as const,
            unlockedAt: timestamp
          }],
          activeTitle: 'novato',
          inventory: {
            items: {
              'pocao-pequena': 2 // Poções iniciais
            },
            equippedWeapon: undefined,
            equippedArmor: undefined,
            equippedAccessory: undefined
          },
          activeQuests: [],
          completedQuests: [],
          stats: {
            questsCompleted: 0,
            totalCombats: 0,
            totalPlayTime: 0,
            lastActiveAt: timestamp
          },
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        // Inicializar dados de rank
        newHero.rankData = rankSystem.initializeRankData(newHero);
        
        set(state => ({
          heroes: [...state.heroes, newHero],
          selectedHeroId: newHero.id
        }));
        
        // Tracking de métricas
        trackMetric.heroCreated(newHero.id, {
          class: newHero.class,
          attributes: newHero.attributes,
          timestamp: timestamp
        });
        
        // Gerar missões iniciais
        get().refreshQuests(1);
        
        return newHero;
      },
      
      updateHero: (id, heroData) => {
        set(state => ({
          heroes: state.heroes.map(hero => 
            hero.id === id 
              ? { 
                  ...hero, 
                  ...heroData, 
                  updatedAt: new Date().toISOString(),
                  derivedAttributes: heroData.attributes 
                    ? calculateDerivedAttributes(
                        { ...hero.attributes, ...heroData.attributes },
                        heroData.class || hero.class,
                        heroData.level || hero.level
                      ) 
                    : hero.derivedAttributes
                } 
              : hero
          )
        }));
      },

      exportHeroJson: (id: string) => {
        const hero = get().heroes.find(h => h.id === id);
        if (!hero) return '';
        try {
          return JSON.stringify(hero, null, 2);
        } catch {
          return '';
        }
      },
      
      deleteHero: (id) => {
        set(state => ({
          heroes: state.heroes.filter(hero => hero.id !== id),
          selectedHeroId: state.selectedHeroId === id ? null : state.selectedHeroId
        }));
      },
      
      selectHero: (id) => {
        set({ selectedHeroId: id });
      },
      
      // === SISTEMA DE MISSÕES ===
      
      refreshQuests: (heroLevel = 1) => {
        const newQuests = generateQuestBoard(heroLevel);
        set({ availableQuests: newQuests });
      },
      
      acceptQuest: (heroId: string, questId: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        const quest = state.availableQuests.find(q => q.id === questId);
        
        if (!hero || !quest) return false;
        
        if (hero.level < quest.levelRequirement) return false;
        if (hero.activeQuests.length >= 3) return false; // Máximo 3 missões ativas
        
        get().updateHero(heroId, {
          activeQuests: [...hero.activeQuests, questId]
        });
        
        return true;
      },
      
      completeQuest: (heroId: string, questId: string, autoResolve = false) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        const quest = state.availableQuests.find(q => q.id === questId);
        
        if (!hero || !quest || !hero.activeQuests.includes(questId)) return null;
        
        let combatResult: CombatResult | null = null;
        
        // Resolver combate se houver inimigos
        if (quest.enemies && quest.enemies.length > 0) {
          combatResult = autoResolve 
            ? autoResolveCombat(hero, quest.enemies)
            : resolveCombat(hero, quest.enemies);
          
          if (!combatResult.victory) {
            // Falha na missão
            if (quest.failurePenalty) {
              if (quest.failurePenalty.gold) {
                get().gainGold(heroId, -quest.failurePenalty.gold);
              }
              if (quest.failurePenalty.reputation) {
                get().updateHero(heroId, {
                  progression: {
                    ...hero.progression,
                    reputation: Math.max(0, hero.progression.reputation + quest.failurePenalty.reputation)
                  }
                });
              }
            }
            return combatResult;
          }
        }
        
        // Sucesso na missão - aplicar recompensas
        get().gainXP(heroId, quest.rewards.xp + (combatResult?.xpGained || 0));
        get().gainGold(heroId, quest.rewards.gold + (combatResult?.goldGained || 0));
        
        // Adicionar itens das recompensas
        if (quest.rewards.items) {
          quest.rewards.items.forEach(item => {
            get().addItemToInventory(heroId, item.id, item.qty);
          });
        }
        
        // Adicionar itens do combate
        if (combatResult?.itemsGained) {
          combatResult.itemsGained.forEach(item => {
            get().addItemToInventory(heroId, item.id, 1);
          });
        }
        
        // Atualizar estatísticas
        const updatedHero = get().heroes.find(h => h.id === heroId)!;
        get().updateHero(heroId, {
          activeQuests: updatedHero.activeQuests.filter(id => id !== questId),
          completedQuests: [...updatedHero.completedQuests, questId],
          stats: {
            ...updatedHero.stats,
            questsCompleted: updatedHero.stats.questsCompleted + 1,
            totalCombats: updatedHero.stats.totalCombats + (quest.enemies?.length || 0),
            lastActiveAt: new Date().toISOString()
          }
        });
        
        // Verificar achievements
        get().checkAchievements(heroId);
        
        // Atualizar dados de rank após completar missão
        const finalHero = get().heroes.find(h => h.id === heroId);
        if (finalHero) {
          const newRankData = rankSystem.updateRankData(finalHero, finalHero.rankData);
          get().updateHero(heroId, { rankData: newRankData });
        }
        
        // Update daily goals progress
        get().updateDailyGoalProgress(heroId, 'quest-completed', 1);
        if (quest.difficulty === 'épica') {
          get().updateDailyGoalProgress(heroId, 'epic-quest-completed', 1);
        }
        if (quest.enemies && quest.enemies.length > 0) {
          get().updateDailyGoalProgress(heroId, 'enemy-defeated', quest.enemies.length);
        }
        
        // Update event progress
        eventManager.updateEventProgress(heroId, 'quests-completed', 1);
        
        // Log quest completion activity
        if (quest.difficulty === 'épica') {
          logActivity.epicQuestCompleted({
            heroId,
            heroName: hero.name,
            heroClass: hero.class,
            questName: quest.title,
            questDifficulty: quest.difficulty,
            questReward: quest.reward
          });
        } else {
          logActivity.questCompleted({
            heroId,
            heroName: hero.name,
            heroClass: hero.class,
            questName: quest.title,
            questDifficulty: quest.difficulty,
            questReward: quest.reward
          });
        }
        
        // Track quest completion metrics
        trackMetric.questCompleted(heroId, {
          questName: quest.title,
          questDifficulty: quest.difficulty,
          questType: quest.type,
          xpReward: quest.reward.xp,
          goldReward: quest.reward.gold
        });
        
        return combatResult;
      },
      
      // === SISTEMA DE PROGRESSÃO ===
      
      gainXP: (heroId: string, xp: number) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        
        const newXP = hero.progression.xp + xp;
        const newLevel = checkLevelUp(newXP, hero.progression.level);
        
        const updates: Partial<Hero> = {
          progression: {
            ...hero.progression,
            xp: newXP,
            level: newLevel
          }
        };
        
        // Se subiu de nível, recalcular atributos derivados
        if (newLevel > hero.progression.level) {
          updates.level = newLevel;
          updates.derivedAttributes = calculateDerivedAttributes(
            hero.attributes,
            hero.class,
            newLevel
          );
        }
        
        get().updateHero(heroId, updates);
        
        // Atualizar dados de rank após ganhar XP
        const updatedHero = get().heroes.find(h => h.id === heroId);
        if (updatedHero) {
          const newRankData = rankSystem.updateRankData(updatedHero, updatedHero.rankData);
          get().updateHero(heroId, { rankData: newRankData });
        }
        
        // Update daily goals progress
        get().updateDailyGoalProgress(heroId, 'xp-gained', xp);
        if (newLevel > hero.progression.level) {
          get().updateDailyGoalProgress(heroId, 'level-up', 1);
        }
        
        // Update event progress
        eventManager.updateEventProgress(heroId, 'xp-gained', xp);
        if (newLevel > hero.progression.level) {
          eventManager.updateEventProgress(heroId, 'levels-gained', newLevel - hero.progression.level);
          
          // Log level up activity
          logActivity.levelUp({
            heroId,
            heroName: hero.name,
            heroClass: hero.class,
            heroLevel: newLevel,
            previousLevel: hero.progression.level
          });
          
          // Track level up metrics
          trackMetric.levelUp(heroId, {
            newLevel,
            previousLevel: hero.progression.level,
            heroClass: hero.class
          });
        }
        
        // Track XP gained metrics
        trackMetric.xpGained(heroId, xp);
      },
      
      gainGold: (heroId: string, gold: number) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        
        get().updateHero(heroId, {
          progression: {
            ...hero.progression,
            gold: Math.max(0, hero.progression.gold + gold)
          }
        });
        
        // Atualizar dados de rank após mudanças no herói
        const updatedHero = get().heroes.find(h => h.id === heroId);
        if (updatedHero) {
          const newRankData = rankSystem.updateRankData(updatedHero, updatedHero.rankData);
          get().updateHero(heroId, { rankData: newRankData });
        }
        
        // Update daily goals progress
        if (gold > 0) {
          get().updateDailyGoalProgress(heroId, 'gold-earned', gold);
        }
        
        // Update event progress
        if (gold > 0) {
          eventManager.updateEventProgress(heroId, 'gold-earned', gold);
        }
        
        // Track gold gained metrics
        if (gold > 0) {
          trackMetric.goldGained(heroId, gold);
        }
      },
      
      addItemToInventory: (heroId: string, itemId: string, quantity = 1) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        
        const currentQuantity = hero.inventory.items[itemId] || 0;
        
        get().updateHero(heroId, {
          inventory: {
            ...hero.inventory,
            items: {
              ...hero.inventory.items,
              [itemId]: currentQuantity + quantity
            }
          }
        });
      },
      
      checkAchievements: (heroId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return [];
        
        const newAchievements: Achievement[] = [];
        
        QUEST_ACHIEVEMENTS.forEach(template => {
          const hasAchievement = hero.progression.achievements.some(a => a.id === template.id);
          if (hasAchievement) return;
          
          let progress = 0;
          
          switch (template.id) {
            case 'primeira-missao':
              progress = hero.stats.questsCompleted >= 1 ? 1 : 0;
              break;
            case 'heroi-da-vila':
              progress = hero.stats.questsCompleted;
              break;
            case 'cacador-experiente':
              // Contar missões de caça completadas (simplificado)
              progress = Math.min(template.maxProgress!, Math.floor(hero.stats.questsCompleted * 0.4));
              break;
            case 'explorador-corajoso':
              progress = Math.min(template.maxProgress!, Math.floor(hero.stats.questsCompleted * 0.3));
              break;
            case 'lenda-epica':
              progress = Math.min(template.maxProgress!, Math.floor(hero.stats.questsCompleted * 0.1));
              break;
          }
          
          if (progress >= template.maxProgress!) {
            const achievement: Achievement = {
              ...template,
              unlockedAt: new Date().toISOString(),
              progress: template.maxProgress
            };
            newAchievements.push(achievement);
          }
        });
        
        if (newAchievements.length > 0) {
          get().updateHero(heroId, {
            progression: {
              ...hero.progression,
              achievements: [...hero.progression.achievements, ...newAchievements]
            }
          });
        }
        
        return newAchievements;
      },
      
      // === SISTEMA DE LOJA ===
      
      buyItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        const result = purchaseItem(hero, itemId);
        if (result.success && result.item) {
          get().updateHero(heroId, {
            progression: {
              ...hero.progression,
              gold: result.newGold!
            }
          });
          get().addItemToInventory(heroId, itemId, 1);
        }
        
        return result.success;
      },
      
      sellItem: (heroId: string, itemId: string, quantity = 1) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        const result = sellItem(hero, itemId, quantity);
        if (result.success) {
          get().updateHero(heroId, {
            progression: {
              ...hero.progression,
              gold: result.newGold!
            }
          });
          
          const currentQuantity = hero.inventory.items[itemId] || 0;
          get().updateHero(heroId, {
            inventory: {
              ...hero.inventory,
              items: {
                ...hero.inventory.items,
                [itemId]: Math.max(0, currentQuantity - quantity)
              }
            }
          });
        }
        
        return result.success;
      },
      
      equipItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        const result = equipItem(hero, itemId);
        if (result.success) {
          const item = SHOP_ITEMS.find(i => i.id === itemId);
          if (!item) return false;
          
          const updates: any = { inventory: { ...hero.inventory } };
          
          switch (item.type) {
            case 'weapon':
              updates.inventory.equippedWeapon = itemId;
              break;
            case 'armor':
              updates.inventory.equippedArmor = itemId;
              break;
            case 'accessory':
              updates.inventory.equippedAccessory = itemId;
              break;
          }
          
          get().updateHero(heroId, updates);
        }
        
        return result.success;
      },
      
      useItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        const result = useConsumable(hero, itemId);
        if (result.success) {
          // Remover item do inventário
          const currentQuantity = hero.inventory.items[itemId] || 0;
          get().updateHero(heroId, {
            inventory: {
              ...hero.inventory,
              items: {
                ...hero.inventory.items,
                [itemId]: Math.max(0, currentQuantity - 1)
              }
            }
          });
          
          // Aplicar efeitos
          if (result.effects) {
            const updates: any = {};
            
            if (result.effects.hp !== undefined) {
              updates.derivedAttributes = {
                ...hero.derivedAttributes,
                currentHp: result.effects.hp
              };
            }
            
            if (result.effects.mp !== undefined) {
              updates.derivedAttributes = {
                ...updates.derivedAttributes || hero.derivedAttributes,
                currentMp: result.effects.mp
              };
            }
            
            if (result.effects.xp !== undefined) {
              get().gainXP(heroId, result.effects.xp);
            }
            
            if (Object.keys(updates).length > 0) {
              get().updateHero(heroId, updates);
            }
          }
        }
        
        return result.success;
      },
      
      // === SISTEMA DE GUILDAS ===
      
      createGuild: (heroId: string, guildName: string, description: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero || hero.progression.guildId) return null;
        
        const newGuild: Guild = {
          id: uuidv4(),
          name: guildName,
          description,
          members: [heroId],
          guildXP: 0,
          bankGold: 0,
          createdAt: new Date().toISOString(),
          quests: []
        };
        
        set(state => ({
          guilds: [...state.guilds, newGuild]
        }));
        
        get().updateHero(heroId, {
          progression: {
            ...hero.progression,
            guildId: newGuild.id
          }
        });
        
        return newGuild;
      },
      
      joinGuild: (heroId: string, guildId: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        const guild = state.guilds.find(g => g.id === guildId);
        
        if (!hero || !guild || hero.progression.guildId) return false;
        
        set(state => ({
          guilds: state.guilds.map(g => 
            g.id === guildId 
              ? { ...g, members: [...g.members, heroId] }
              : g
          )
        }));
        
        get().updateHero(heroId, {
          progression: {
            ...hero.progression,
            guildId: guildId
          }
        });
        
        return true;
      },
      
      leaveGuild: (heroId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero || !hero.progression.guildId) return false;
        
        set(state => ({
          guilds: state.guilds.map(g => 
            g.id === hero.progression.guildId
              ? { ...g, members: g.members.filter(id => id !== heroId) }
              : g
          )
        }));
        
        get().updateHero(heroId, {
          progression: {
            ...hero.progression,
            guildId: undefined
          }
        });
        
        return true;
      },
      
      // === SISTEMA DE TÍTULOS E REPUTAÇÃO ===
       
       setActiveTitle: (titleId?: string) => {
         const hero = get().getSelectedHero();
         if (!hero) return;
 
         // Verificar se o título existe nos títulos do herói
         if (titleId && !hero.titles.find(t => t.id === titleId)) {
           console.warn('Título não encontrado nos títulos do herói');
           return;
         }
 
         get().updateHero(hero.id, {
           activeTitle: titleId
         });
       },
 
       updateAchievementProgress: () => {
         const hero = get().getSelectedHero();
         if (!hero) return;
 
         // Esta função será implementada para atualizar progresso de conquistas
         // baseado nas estatísticas do herói
         console.log('Atualizando progresso de conquistas para:', hero.name);
       },

       updateReputation: (factionName: string, change: number) => {
         const hero = get().getSelectedHero();
         if (!hero) return;

         updateHeroReputation(hero, factionName, change);
         get().updateHero(hero.id, {
           progression: {
             ...hero.progression,
             reputation: hero.progression.reputation + change
           }
         });
       },

       processReputationEvents: () => {
         const hero = get().getSelectedHero();
         if (!hero) return;

         const events = generateReputationEvents(hero);
         // Processar eventos de reputação
         events.forEach(event => {
           console.log('Evento de reputação:', event);
         });
       },

      // Leaderboard functions
      getLeaderboards: () => {
        const heroes = get().heroes;
        return generateAllLeaderboards(heroes);
      },

      getHeroRanking: (heroId: string) => {
        const heroes = get().heroes;
        const hero = heroes.find(h => h.id === heroId);
        if (!hero) return null;
        
        return getHeroRanking(hero, heroes);
      },

      calculateHeroScore: (heroId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return 0;
        
        return calculateTotalScore(hero);
      },
      
      // === GETTERS ===
      
      getSelectedHero: () => {
        const { heroes, selectedHeroId } = get();
        return heroes.find(hero => hero.id === selectedHeroId);
      },
      
      getHeroQuests: (heroId: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return [];
        
        return state.availableQuests.filter(quest => 
          hero.activeQuests.includes(quest.id)
        );
      },
      
      getHeroGuild: (heroId: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero || !hero.progression.guildId) return undefined;
        
        return state.guilds.find(g => g.id === hero.progression.guildId);
      },

      // === SISTEMA DE METAS DIÁRIAS ===
      
      generateDailyGoalsForHero: (heroId: string) => {
        set((state) => {
          const heroIndex = state.heroes.findIndex(h => h.id === heroId);
          if (heroIndex === -1) return state;

          const hero = state.heroes[heroIndex];
          const newGoals = generateDailyGoals(hero);

          const updatedHeroes = [...state.heroes];
          updatedHeroes[heroIndex] = {
            ...hero,
            dailyGoals: newGoals
          };

          return { ...state, heroes: updatedHeroes };
        });
      },

      updateDailyGoalProgress: (heroId: string, goalType: string, amount = 1) => {
        set((state) => {
          const heroIndex = state.heroes.findIndex(h => h.id === heroId);
          if (heroIndex === -1) return state;

          const hero = state.heroes[heroIndex];
          if (!hero.dailyGoals || hero.dailyGoals.length === 0) return state;

          // Remove expired goals first
          const activeGoals = removeExpiredGoals(hero.dailyGoals);
          
          // Update progress
          let updatedGoals = updateDailyGoalProgress(activeGoals, goalType, amount);
          
          // Check perfect day goal
          updatedGoals = checkPerfectDayGoal(updatedGoals);

          const updatedHeroes = [...state.heroes];
          updatedHeroes[heroIndex] = {
            ...hero,
            dailyGoals: updatedGoals
          };

          return { ...state, heroes: updatedHeroes };
        });
      },

      completeDailyGoal: (heroId: string, goalId: string) => {
        set((state) => {
          const heroIndex = state.heroes.findIndex(h => h.id === heroId);
          if (heroIndex === -1) return state;

          const hero = state.heroes[heroIndex];
          if (!hero.dailyGoals) return state;

          const goal = hero.dailyGoals.find(g => g.id === goalId);
          if (!goal || !goal.completed) return state;

          // Give rewards
          const rewards = getDailyGoalRewards(goal);
          const updatedHero = {
            ...hero,
            progression: {
              ...hero.progression,
              xp: hero.progression.xp + rewards.xp,
              gold: hero.progression.gold + rewards.gold
            }
          };

          // Check for level up
          const newLevel = checkLevelUp(updatedHero.progression.xp, updatedHero.level);
          if (newLevel > updatedHero.level) {
            updatedHero.level = newLevel;
            updatedHero.progression.level = newLevel;
            updatedHero.derivedAttributes = calculateDerivedAttributes(
              updatedHero.attributes, 
              updatedHero.class, 
              newLevel
            );
          }

          // Add items to inventory if any
          if (rewards.items) {
            rewards.items.forEach(item => {
              const currentQuantity = updatedHero.inventory.items[item.id] || 0;
              updatedHero.inventory.items[item.id] = currentQuantity + 1;
            });
          }

          const updatedHeroes = [...state.heroes];
          updatedHeroes[heroIndex] = updatedHero;

          return { ...state, heroes: updatedHeroes };
        });
      },

      cleanupExpiredGoals: (heroId: string) => {
        set((state) => {
          const heroIndex = state.heroes.findIndex(h => h.id === heroId);
          if (heroIndex === -1) return state;

          const hero = state.heroes[heroIndex];
          if (!hero.dailyGoals) return state;

          const activeGoals = removeExpiredGoals(hero.dailyGoals);

          const updatedHeroes = [...state.heroes];
          updatedHeroes[heroIndex] = {
            ...hero,
            dailyGoals: activeGoals
          };

          return { ...state, heroes: updatedHeroes };
        });
      },

      // Onboarding functions
      shouldShowOnboarding: () => {
        const state = get();
        const hasShownOnboarding = localStorage.getItem('heroforge-onboarding-shown');
        return !hasShownOnboarding && state.heroes.length === 0;
      },

      markOnboardingShown: () => {
        localStorage.setItem('heroforge-onboarding-shown', 'true');
      },

      triggerOnboardingForNewUser: () => {
        const state = get();
        if (state.shouldShowOnboarding()) {
          // Load onboarding state and start first flow if not already started
          onboardingManager.loadState();
          const availableFlows = onboardingManager.getAvailableFlows();
          if (availableFlows.length > 0 && !onboardingManager.getCurrentStep()) {
            onboardingManager.startFlow('first-steps');
          }
          state.markOnboardingShown();
        }
      },

      // === SISTEMA DE RANKS v2.2 ===
      
      promoteHero: (heroId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        const progress = rankSystem.calculateProgress(hero);
        if (!progress.canPromote) return false;
        
        const promotion = rankSystem.promoteHero(hero, hero.rankData);
        if (promotion.promoted && promotion.newRank && promotion.celebration) {
          // Atualizar dados de rank com a promoção
          const newRankData = rankSystem.updateRankData(hero, hero.rankData);
          get().updateHero(heroId, { rankData: newRankData });
          
          // Log da promoção
          logActivity.rankPromotion({
            heroId,
            heroName: hero.name,
            heroClass: hero.class,
            newRank: promotion.newRank,
            previousRank: progress.currentRank
          });
          
          return true;
        }
        
        return false;
      },
      
      getHeroRankProgress: (heroId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return null;
        
        return {
          progress: rankSystem.calculateProgress(hero),
          rankData: hero.rankData,
          estimate: rankSystem.estimateTimeToNextRank(hero)
        };
      },
      
      getRankLeaderboard: () => {
        const heroes = get().heroes;
        return heroes
          .map(hero => rankSystem.createComparison(hero, 0))
          .sort((a, b) => {
            // Ordenar por rank primeiro, depois por pontos
            const rankOrder = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
            const aRankIndex = rankOrder.indexOf(a.rank);
            const bRankIndex = rankOrder.indexOf(b.rank);
            
            if (aRankIndex !== bRankIndex) {
              return aRankIndex - bRankIndex;
            }
            
            return b.rankPoints - a.rankPoints;
          })
          .map((comparison, index) => ({ ...comparison, position: index + 1 }));
      },
      
      markCelebrationViewed: (heroId: string, celebrationIndex: number) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero || !hero.rankData?.pendingCelebrations?.[celebrationIndex]) return;
        
        const updatedCelebrations = [...hero.rankData.pendingCelebrations];
        updatedCelebrations.splice(celebrationIndex, 1);
        
        get().updateHero(heroId, {
          rankData: {
            ...hero.rankData,
            pendingCelebrations: updatedCelebrations
          }
        });
      }
    }),
    {
      name: 'hero-forge-epic-storage',
      partialize: (state) => ({ 
        heroes: state.heroes,
        selectedHeroId: state.selectedHeroId,
        availableQuests: state.availableQuests,
        guilds: state.guilds
      })
    }
  )
);