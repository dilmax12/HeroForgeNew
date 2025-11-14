import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Hero, HeroCreationData, HeroAttributes, DerivedAttributes, Quest, Achievement, Guild, CombatResult, Title } from '../types/hero';
import type { HeroInventory, Party } from '../types/hero';
import type { ReferralInvite } from '../types/hero';
import type { EnhancedQuestChoice } from '../types/hero';
import { generateQuestBoard, QUEST_ACHIEVEMENTS } from '../utils/quests';
import { resolveCombat, autoResolveCombat } from '../utils/combat';
import { purchaseItem, sellItem, equipItem, useConsumable, SHOP_ITEMS, ITEM_SETS, generateProceduralItem } from '../utils/shop';
import { RECIPES } from '../utils/forging';
import { updateHeroReputation, generateReputationEvents } from '../utils/reputationSystem';
import { generateAllLeaderboards, getHeroRanking, calculateTotalScore } from '../utils/leaderboardSystem';
import { generateDailyGoals, updateDailyGoalProgress, checkPerfectDayGoal, removeExpiredGoals, getDailyGoalRewards } from '../utils/dailyGoalsSystem';
import { getTitleAttributeBonus, AVAILABLE_TITLES, TITLE_ACHIEVEMENTS, updateAchievementProgress as updateTitleAchievementProgress, checkTitleUnlock } from '../utils/titles';
import { onboardingManager } from '../utils/onboardingSystem';
import { eventManager } from '../utils/eventSystem';
import { logActivity } from '../utils/activitySystem';
import { trackMetric } from '../utils/metricsSystem';
import { rankSystem } from '../utils/rankSystem';
import { computeSynergyBonus } from '../utils/synergy';
import { getNewSkillsForLevel } from '../utils/skillSystem';
import { updateProgressDelta } from '../services/progressService';
import { worldStateManager } from '../utils/worldState';
import { getGameSettings, useGameSettingsStore } from './gameSettingsStore';
import { getMonetization } from './monetizationStore';
import { generateMysteryEgg, identifyEgg as utilIdentifyEgg, incubateEgg, canHatch, markReadyToHatch, hatchPet, accelerateIncubation, EGG_IDENTIFY_COST, INCUBATION_MS, addPetXP } from '../utils/pets';
import { ATTRIBUTE_CONSTRAINTS } from '../utils/attributeSystem';
import { ATTRIBUTE_POINTS_PER_LEVEL, checkLevelUp } from '../utils/progression';

interface HeroState {
  heroes: Hero[];
  selectedHeroId: string | null;
  availableQuests: Quest[];
  guilds: Guild[];
  parties: Party[];
  referralInvites: ReferralInvite[];
  // Mascotes e Ovos
  generateEggForSelected: (rarity?: import('../types/hero').EggRarity) => boolean;
  identifyEggForSelected: (eggId: string) => boolean;
  startIncubationForSelected: (eggId: string, slotIndex?: number) => boolean;
  accelerateIncubationForSelected: (eggId: string, method: 'essencia' | 'brasas' | 'ouro', value?: number) => boolean;
  updateIncubationTick: () => void;
  hatchEggForSelected: (eggId: string) => boolean;
  consumeInventoryItem: (heroId: string, itemId: string, qty?: number) => boolean;
  addPetXPForSelected: (petId: string, xp: number) => boolean;
  
  // === AÇÕES BÁSICAS ===
  createHero: (heroData: HeroCreationData) => Hero;
  updateHero: (id: string, heroData: Partial<Hero>) => void;
  deleteHero: (id: string) => void;
  selectHero: (id: string | null) => void;
  exportHeroJson: (id: string) => string;
  importHero: (hero: Hero, selectAfter?: boolean) => boolean;
  
  // === SISTEMA DE MISSÕES ===
  refreshQuests: (heroLevel?: number) => void;
  acceptQuest: (heroId: string, questId: string) => boolean;
  completeQuest: (heroId: string, questId: string, autoResolve?: boolean) => CombatResult | null;
  
  // === SISTEMA DE PROGRESSÃO ===
  gainXP: (heroId: string, xp: number) => void;
  gainGold: (heroId: string, gold: number) => void;
  addItemToInventory: (heroId: string, itemId: string, quantity?: number) => void;
  checkAchievements: (heroId: string) => Achievement[];
  // Pontos de atributo
  allocateAttributePoints: (heroId: string, allocations: Partial<HeroAttributes>) => boolean;

  // === SISTEMA DE COMPANHEIROS ===
  setActivePet: (petId?: string) => void;
  setActiveMount: (mountId?: string) => void;
  setFavoriteMount: (mountId?: string) => void;
  generateMountForSelected: (type?: import('../types/hero').Mount['type'], rarity?: import('../types/hero').MountRarity) => boolean;
  addMountToSelected: (mount: import('../types/hero').Mount) => boolean;
  evolveMountForSelected: (mountId: string) => boolean;
  refineCompanion: (heroId: string, kind: 'pet' | 'mount', id: string) => boolean;
  refinePetForSelected: (petId: string) => boolean;
  refineMountForSelected: (mountId: string) => boolean;
  
  // === SISTEMA DE LOJA ===
  buyItem: (heroId: string, itemId: string) => boolean;
  sellItem: (heroId: string, itemId: string, quantity?: number) => boolean;
  equipItem: (heroId: string, itemId: string) => boolean;
  useItem: (heroId: string, itemId: string) => boolean;
  upgradeItem: (heroId: string, itemId: string) => boolean;
  craftItem: (heroId: string, recipeId: string) => boolean;
  // Serviços de Forja
  refineEquippedItem: (heroId: string, slot: 'weapon' | 'armor' | 'accessory') => boolean;
  fuseItems: (heroId: string, itemAId: string, itemBId: string) => boolean;
  enchantEquippedItem: (heroId: string, slot: 'weapon' | 'armor' | 'accessory', enchant: 'lifesteal') => boolean;
  
  // Taverna / Descanso
      restAtTavern: (heroId: string, costGold: number, fatigueRecovery: number, restType?: string) => boolean;
  
  // === SISTEMA DE GUILDAS ===
  createGuild: (heroId: string, guildName: string, description: string) => Guild | null;
  joinGuild: (heroId: string, guildId: string) => boolean;
  leaveGuild: (heroId: string) => boolean;
  depositGoldToGuild: (heroId: string, amount: number) => boolean;
  withdrawGoldFromGuild: (heroId: string, amount: number) => boolean;
  contributeXPToGuild: (heroId: string, amount: number) => boolean;
  setGuildRole: (guildId: string, actorId: string, targetId: string, role: 'lider' | 'oficial' | 'membro') => boolean;
  transferGuildLeadership: (guildId: string, actorId: string, newLeaderId: string) => boolean;
  ensureDefaultGuildExists: () => void;
  
  // === SISTEMA DE TÍTULOS E REPUTAÇÃO ===
  setActiveTitle: (titleId?: string) => void;
  addTitleToSelectedHero: (title: Title, setActive?: boolean) => void;
  toggleFavoriteTitle: (titleId: string, favored?: boolean) => void;
  updateAchievementProgress: () => void;
  updateReputation: (factionName: string, change: number) => void;
  processReputationEvents: () => void;
  
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

  // === SISTEMA DE PARTY ===
  createParty: (heroId: string, name: string) => Party | null;
  joinParty: (heroId: string, partyId: string) => boolean;
  leaveParty: (heroId: string) => boolean;
  getHeroParty: (heroId: string) => Party | undefined;
  inviteHeroToParty: (partyId: string, inviterId: string, targetHeroId: string) => boolean;
  acceptPartyInvite: (heroId: string, partyId: string) => boolean;
  transferPartyLeadership: (partyId: string, actorId: string, newLeaderId: string) => boolean;
  togglePartySharedLoot: (partyId: string, actorId: string, value?: boolean) => boolean;
  togglePartySharedXP: (partyId: string, actorId: string, value?: boolean) => boolean;
  removeMemberFromParty: (partyId: string, actorId: string, targetHeroId: string) => boolean;

  // === SISTEMA DE CONVITES ===
  createReferralInvite: (inviterHeroId: string) => ReferralInvite | null;
  getReferralInvitesForHero: (heroId: string) => ReferralInvite[];
  acceptReferralInvite: (code: string, newHeroId: string) => boolean;
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

const calculateTotalAttributes = (
  baseAttributes: HeroAttributes,
  inventory: HeroInventory
): HeroAttributes => {
  const totalAttributes = { ...baseAttributes };
  
  // Aplicar bônus dos equipamentos
  const equippedItems = [
    inventory.equippedWeapon,
    inventory.equippedArmor,
    inventory.equippedAccessory
  ].filter(Boolean);
  
  equippedItems.forEach(itemId => {
    const item = SHOP_ITEMS.find(i => i.id === itemId) || (inventory.customItems ? inventory.customItems[itemId!] : undefined);
    const upgradeLevel = inventory.upgrades?.[itemId!] ?? 0;
    if (item?.bonus) {
      Object.entries(item.bonus).forEach(([attr, bonus]) => {
        if (bonus && attr in totalAttributes) {
          const multiplier = 1 + Math.max(0, upgradeLevel) * 0.1; // +10% por nível
          const adjusted = Math.round((bonus as number) * multiplier);
          totalAttributes[attr as keyof HeroAttributes] += adjusted;
        }
      });
    }
  });

  // Aplicar bônus de conjunto (arma + armadura + acessório do mesmo conjunto)
  const equippedSetIds = [
    inventory.equippedWeapon,
    inventory.equippedArmor,
    inventory.equippedAccessory
  ]
    .map(id => {
      const base = id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
      const custom = id && inventory.customItems ? inventory.customItems[id] : undefined;
      return (base || custom)?.setId;
    })
    .filter((sid): sid is string => !!sid);

  if (equippedSetIds.length === 3) {
    const unique = new Set(equippedSetIds);
    if (unique.size === 1) {
      const activeSetId = equippedSetIds[0];
      const activeSet = ITEM_SETS[activeSetId];
      if (activeSet?.bonus) {
        Object.entries(activeSet.bonus).forEach(([attr, bonus]) => {
          if (bonus && (attr as keyof HeroAttributes) in totalAttributes) {
            totalAttributes[attr as keyof HeroAttributes] += bonus as number;
          }
        });
      }
    }
  }
  
  return totalAttributes;
};

const calculateDerivedAttributes = (
  attributes: HeroAttributes,
  heroClass: string,
  level: number,
  inventory?: HeroInventory,
  activeTitleId?: string,
  companionBonus?: Partial<HeroAttributes>
): DerivedAttributes => {
  // Calcular atributos totais incluindo bônus de equipamentos
  const baseTotal = inventory ? calculateTotalAttributes(attributes, inventory) : attributes;
  const titleBonus = getTitleAttributeBonus(activeTitleId);
  const totalAttributes: HeroAttributes = { ...baseTotal } as HeroAttributes;
  Object.entries(titleBonus).forEach(([attr, bonus]) => {
    if (bonus && (attr as keyof HeroAttributes) in totalAttributes) {
      totalAttributes[attr as keyof HeroAttributes] += bonus as number;
    }
  });
  if (companionBonus) {
    Object.entries(companionBonus).forEach(([attr, bonus]) => {
      if (bonus && (attr as keyof HeroAttributes) in totalAttributes) {
        totalAttributes[attr as keyof HeroAttributes] += bonus as number;
      }
    });
  }
  
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
  
  const hp = hpBase + Math.floor(totalAttributes.constituicao / 2) * level;
  const mp = mpBase + Math.floor(totalAttributes.inteligencia / 2) * level;
  const initiative = Math.floor(totalAttributes.destreza / 2);
  const armorClass = 10 + Math.floor(totalAttributes.destreza / 4);
  const luck = Math.max(0, Math.floor((totalAttributes.carisma + totalAttributes.sabedoria) / 2));
  const mountSpeed = (() => {
    try {
      const hero = get().getSelectedHero();
      if (hero?.activeMountId && Array.isArray(hero.mounts)) {
        const m = hero.mounts.find(mm => mm.id === hero.activeMountId);
        return Math.max(0, m?.speedBonus || 0);
      }
    } catch {}
    return 0;
  })();
  const finalInitiative = initiative + mountSpeed;
  
  return {
    hp,
    mp,
    initiative: finalInitiative,
    armorClass,
    currentHp: hp,
    currentMp: mp,
    luck
  };
};

const computeCompanionBonus = (hero: Hero): Partial<HeroAttributes> => {
  const bonus: Partial<HeroAttributes> = {};
  if (hero.activePetId && Array.isArray(hero.pets)) {
    const pet = hero.pets.find(p => p.id === hero.activePetId);
    if (pet && pet.attributes) {
      const mult = 1 + Math.max(0, pet.refineLevel || 0) * 0.01;
      Object.entries(pet.attributes).forEach(([k, v]) => {
        if (typeof v === 'number') {
          const val = Math.round(v * mult);
          bonus[k as keyof HeroAttributes] = (bonus[k as keyof HeroAttributes] || 0) + val;
        }
      });
    }
  }
  if (hero.activeMountId && Array.isArray(hero.mounts)) {
    const m = hero.mounts.find(mm => mm.id === hero.activeMountId);
    if (m && m.attributes) {
      const mult = 1 + Math.max(0, m.refineLevel || 0) * 0.01;
      Object.entries(m.attributes).forEach(([k, v]) => {
        if (typeof v === 'number') {
          const val = Math.round(v * mult);
          bonus[k as keyof HeroAttributes] = (bonus[k as keyof HeroAttributes] || 0) + val;
        }
      });
    }
  }
  return bonus;
};

// Progressão centralizada em utils/progression.ts

// === STORE PRINCIPAL ===

export const useHeroStore = create<HeroState>()(
  persist(
    (set, get) => ({
      heroes: [],
      selectedHeroId: null,
      availableQuests: [],
      guilds: [],
      parties: [],
      referralInvites: [],
      
      // === AÇÕES BÁSICAS ===
      
      createHero: (heroData: HeroCreationData) => {
        const timestamp = new Date().toISOString();
        
        const validation = validateAttributes(heroData.attributes);
        if (!validation.isValid) {
          throw new Error(`Atributos inválidos: ${validation.errors.join(', ')}`);
        }
        
        const initialInventory = {
          items: {
            'pocao-pequena': 2 // Poções iniciais
          },
          equippedWeapon: undefined,
          equippedArmor: undefined,
          equippedAccessory: undefined,
          upgrades: {}
        };
        
        const newHero: Hero = {
          id: uuidv4(),
          ...heroData,
          level: 1,
          attributePoints: 0,
          derivedAttributes: calculateDerivedAttributes(heroData.attributes, heroData.class, 1, initialInventory, 'novato'),
          element: heroData.element,
          skills: heroData.skills,
          image: heroData.image,
          battleQuote: heroData.battleQuote,
          progression: {
            xp: 0,
            level: 1,
            gold: 100, // Ouro inicial
            glory: 0,
            arcaneEssence: 0,
            fatigue: 0,
            reputation: 0,
            titles: [],
            achievements: [],
            stars: 0
          },
          journeyChapters: [],
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
          inventory: initialInventory,
          activeQuests: [],
          completedQuests: [],
          reputationFactions: [
            { id: 'ordem', name: 'Ordem', reputation: 0, level: 'neutral' },
            { id: 'sombra', name: 'Sombra', reputation: 0, level: 'neutral' },
            { id: 'livre', name: 'Livre', reputation: 0, level: 'neutral' }
          ],
          dailyGoals: [],
          achievements: TITLE_ACHIEVEMENTS.map(a => ({ ...a })),
          stats: {
            questsCompleted: 0,
            totalCombats: 0,
            totalPlayTime: 0,
            lastActiveAt: timestamp,
            trainingsToday: 0,
            lastTrainingDate: timestamp,
            trainingDailyLimit: 5
          },
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        // Inicializar dados de rank
        newHero.rankData = rankSystem.initializeRankData(newHero);
        
        // Inicializar WorldState
        newHero.worldState = worldStateManager.initializeWorldState();
        
        // Inicializar stamina
        newHero.stamina = {
          current: 100,
          max: 100,
          lastRecovery: timestamp,
          recoveryRate: 5
        };
        
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
        
        // Garantir guilda padrão
        get().ensureDefaultGuildExists();
        // Gerar missões iniciais
        get().refreshQuests(1);
        
        return newHero;
      },

      // === SISTEMA DE OVOS E MASCOTES ===

      generateEggForSelected: (rarity) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const MAX_EGGS = 30;
        if ((hero.eggs || []).length >= MAX_EGGS) {
          try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Inventário de Ovos Cheio', message: 'Libere espaço antes de obter novos ovos.', duration: 5000 }); } catch {}
          return false;
        }
        const egg = generateMysteryEgg(rarity);
        const eggs = [...(hero.eggs || []), egg];
        get().updateHero(hero.id, { eggs });
        try {
          const { supabase } = require('../lib/supabaseClient');
          const { saveHero } = require('../services/heroesService');
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      identifyEggForSelected: (eggId) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const idx = (hero.eggs || []).findIndex(e => e.id === eggId);
        if (idx === -1) return false;
        const egg = hero.eggs![idx];
        if (egg.status !== 'misterioso') return false;
        const costRange = EGG_IDENTIFY_COST[egg.baseRarity];
        const cost = Math.floor(costRange.min + Math.random() * (costRange.max - costRange.min));
        if ((hero.progression.gold || 0) < cost) return false;
        const info = utilIdentifyEgg(egg);
        const updatedEgg: import('../types/hero').Egg = { ...egg, status: 'identificado', identified: info, name: info.revealedName || egg.name };
        const nextEggs = [...hero.eggs!];
        nextEggs[idx] = updatedEgg;
        get().updateHero(hero.id, { 
          eggs: nextEggs,
          progression: { ...hero.progression, gold: Math.max(0, (hero.progression.gold || 0) - cost) }
        });
        try {
          const { supabase } = require('../lib/supabaseClient');
          const { saveHero } = require('../services/heroesService');
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      startIncubationForSelected: (eggId, slotIndex = 0) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const eggs = hero.eggs || [];
        const idx = eggs.findIndex(e => e.id === eggId);
        if (idx === -1) return false;
        const usedSlots = eggs.filter(e => e.status === 'incubando' && typeof e.incubatingSlot === 'number').map(e => e.incubatingSlot as number);
        if (usedSlots.length >= 3) return false;
        let targetSlot = slotIndex;
        for (let s = 0; s < 3; s++) { if (!usedSlots.includes(s)) { targetSlot = s; break; } }
        const egg = eggs[idx];
        if (egg.status !== 'identificado') return false;
        const inc = incubateEgg(egg);
        const updatedEgg = { ...inc, incubatingSlot: targetSlot };
        const nextEggs = [...eggs];
        nextEggs[idx] = updatedEgg;
        get().updateHero(hero.id, { eggs: nextEggs });
        try {
          const { supabase } = require('../lib/supabaseClient');
          const { saveHero } = require('../services/heroesService');
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      accelerateIncubationForSelected: (eggId, method, value) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const eggs = hero.eggs || [];
        const idx = eggs.findIndex(e => e.id === eggId);
        if (idx === -1) return false;
        const egg = eggs[idx];
        if (egg.status !== 'incubando') return false;
        let ms = 0;
        if (method === 'essencia') ms = 15 * 60 * 1000;
        if (method === 'brasas') ms = 60 * 60 * 1000;
        if (method === 'ouro') {
          const invest = Math.max(0, value || 0);
          if ((hero.progression.gold || 0) < invest) return false;
          ms = Math.min(INCUBATION_MS[egg.identified?.rarity || egg.baseRarity], invest * 60 * 1000 / 10); // 10 ouro = 1 min
          get().updateHero(hero.id, { progression: { ...hero.progression, gold: Math.max(0, (hero.progression.gold || 0) - invest) } });
        }
        const updated = accelerateIncubation(egg, ms);
        const nextEggs = [...eggs];
        nextEggs[idx] = updated;
        get().updateHero(hero.id, { eggs: nextEggs });
        try {
          const { supabase } = require('../lib/supabaseClient');
          const { saveHero } = require('../services/heroesService');
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      updateIncubationTick: () => {
        const hero = get().getSelectedHero();
        if (!hero) return;
        const eggs = hero.eggs || [];
        const next = eggs.map(e => markReadyToHatch(e));
        get().updateHero(hero.id, { eggs: next });
      },

      hatchEggForSelected: (eggId) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const MAX_PETS = 50;
        if ((hero.pets || []).length >= MAX_PETS) {
          try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Limite de Mascotes', message: 'Você atingiu o limite de mascotes. Libere espaço antes de chocar.', duration: 5000 }); } catch {}
          return false;
        }
        if (hero.hatchCooldownEndsAt) {
          const ends = new Date(hero.hatchCooldownEndsAt).getTime();
          if (Date.now() < ends) {
            try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Cooldown de Chocagem', message: 'Aguarde o fim do cooldown para chocar outro ovo.', duration: 4000 }); } catch {}
            return false;
          }
        }
        const eggs = hero.eggs || [];
        const idx = eggs.findIndex(e => e.id === eggId);
        if (idx === -1) return false;
        const egg = eggs[idx];
        if (!(egg.status === 'pronto_para_chocar' || (egg.status === 'incubando' && canHatch(egg)))) return false;
        const hatchCostByRarity: Record<import('../types/hero').EggRarity, number> = { comum: 5, incomum: 10, raro: 20, epico: 50, lendario: 100, mistico: 200 };
        const hatchCost = hatchCostByRarity[egg.identified?.rarity || egg.baseRarity];
        if ((hero.progression.gold || 0) < hatchCost) {
          try { require('../components/NotificationSystem').notificationBus.emit({ type: 'gold', title: 'Ouro insuficiente', message: `Chocar este ovo requer ${hatchCost} ouro.`, duration: 4000 }); } catch {}
          return false;
        }
        const pet = hatchPet(egg);
        const nextEggs = eggs.filter(e => e.id !== eggId);
        const pets = [...(hero.pets || []), pet];
        const hatchHistory = [...(hero.hatchHistory || []), { eggId: egg.id, petId: pet.id, timestamp: new Date().toISOString(), rarity: egg.identified?.rarity || egg.baseRarity, hatchCost }];
        const cooldownMs = 30 * 1000;
        const progression = { ...hero.progression, gold: Math.max(0, (hero.progression.gold || 0) - hatchCost) };
        get().updateHero(hero.id, { eggs: nextEggs, pets, hatchHistory, hatchCooldownEndsAt: new Date(Date.now() + cooldownMs).toISOString(), progression });
        try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Mascote Obtido', message: `Você obteve ${pet.name}!`, duration: 4000, icon: '🐾' }); } catch {}
        try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Ovo Chocado', message: 'O ovo foi consumido e removido do inventário.', duration: 3000, icon: '🥚' }); } catch {}
        try {
          logActivity.petHatched({
            heroId: hero.id,
            heroName: hero.name,
            heroClass: hero.class,
            heroLevel: hero.progression.level,
            petName: pet.name,
            petType: pet.type,
            eggRarity: egg.identified?.rarity || egg.baseRarity,
            costGold: hatchCost
          });
        } catch {}
        try {
          const { supabase } = require('../lib/supabaseClient');
          const { saveHero } = require('../services/heroesService');
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        try { get().updateDailyGoalProgress(hero.id, 'pet-hatched', 1); } catch {}
        return true;
      },

      accelerateHatchCooldownForSelected: (goldAmount: number) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        if (!hero.hatchCooldownEndsAt) return false;
        const invest = Math.max(0, goldAmount || 0);
        if ((hero.progression.gold || 0) < invest) return false;
        const endMs = new Date(hero.hatchCooldownEndsAt).getTime();
        const reduceMs = Math.floor((invest / 10) * 60 * 1000);
        const newEnd = Math.max(Date.now(), endMs - reduceMs);
        const progression = { ...hero.progression, gold: Math.max(0, (hero.progression.gold || 0) - invest) };
        get().updateHero(hero.id, { hatchCooldownEndsAt: new Date(newEnd).toISOString(), progression });
        try {
          const mins = Math.floor(reduceMs / 60000);
          require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Cooldown reduzido', message: `- ${mins} min no cooldown de chocagem`, duration: 3000, icon: '⏱️' });
        } catch {}
        try {
          const { supabase } = require('../lib/supabaseClient');
          const { saveHero } = require('../services/heroesService');
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      consumeInventoryItem: (heroId, itemId, qty = 1) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const current = hero.inventory.items[itemId] || 0;
        if (current < qty) return false;
        const newItems = { ...hero.inventory.items, [itemId]: Math.max(0, current - qty) };
        if (newItems[itemId] <= 0) delete newItems[itemId];
        get().updateHero(heroId, { inventory: { ...hero.inventory, items: newItems } });
        return true;
      },

      addPetXPForSelected: (petId, xp) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const pets = hero.pets || [];
        const idx = pets.findIndex(p => p.id === petId);
        if (idx === -1) return false;
        const updated = addPetXP(pets[idx], xp);
        const nextPets = [...pets];
        nextPets[idx] = updated;
        get().updateHero(hero.id, { pets: nextPets });
        try { get().updateDailyGoalProgress(hero.id, 'pet-trained', 1); } catch {}
        return true;
      },

      

      setActivePet: (petId) => {
        const hero = get().getSelectedHero();
        if (!hero) return;
        const exists = (hero.pets || []).some(p => p.id === petId);
        const nextId = exists ? petId : undefined;
        const compBonus = computeCompanionBonus({ ...hero, activePetId: nextId } as Hero);
        const derived = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus);
        get().updateHero(hero.id, { activePetId: nextId, derivedAttributes: derived });
      },

      setActiveMount: (mountId) => {
        const hero = get().getSelectedHero();
        if (!hero) return;
        const exists = (hero.mounts || []).some(m => m.id === mountId);
        const nextId = exists ? mountId : undefined;
        const compBonus = computeCompanionBonus({ ...hero, activeMountId: nextId } as Hero);
        const derived = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus);
        get().updateHero(hero.id, { activeMountId: nextId, derivedAttributes: derived });
        try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: nextId ? 'Montaria Ativada' : 'Montaria Desativada', message: nextId ? 'Sua montaria está ativa e concedendo bônus.' : 'Você desativou sua montaria.', duration: 3000, icon: nextId ? '🏇' : '🛑' }); } catch {}
        try { require('../utils/metricsSystem').trackMetric.custom?.('mount_activated', { heroId: hero.id, mountId: nextId }); } catch {}
      },

      setFavoriteMount: (mountId) => {
        const hero = get().getSelectedHero();
        if (!hero) return;
        const exists = (hero.mounts || []).some(m => m.id === mountId);
        const nextId = exists ? mountId : undefined;
        get().updateHero(hero.id, { favoriteMountId: nextId });
        try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: nextId ? 'Favorita definida' : 'Favorita removida', message: nextId ? 'Sua montaria favorita foi definida.' : 'Você removeu a favorita.', duration: 3000, icon: '⭐' }); } catch {}
        try { require('../utils/metricsSystem').trackMetric.custom?.('mount_favorite_set', { heroId: hero.id, mountId: nextId }); } catch {}
      },

      generateMountForSelected: (type, rarity) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const now = new Date().toISOString();
        const types: import('../types/hero').Mount['type'][] = ['cavalo','lobo','grifo','javali','lagarto','draconiano','urso','felino','cervo','alce','hipogrifo','rinoceronte','wyvern'];
        const pickType = type && types.includes(type) ? type : types[Math.floor(Math.random() * types.length)];
        const rarities: import('../types/hero').MountRarity[] = ['comum','incomum','raro','epico','lendario','mistico'];
        const pickRarity = rarity && rarities.includes(rarity) ? rarity : (Math.random() > 0.97 ? 'epico' : Math.random() > 0.9 ? 'raro' : 'comum');
        const base: Record<string, { name: string; speed: number; attrs: Partial<import('../types/hero').HeroAttributes> }> = {
          cavalo: { name: 'Cavalo Ágil', speed: 1, attrs: { destreza: 1 } },
          lobo: { name: 'Lobo Feroz', speed: 0, attrs: { forca: 2 } },
          grifo: { name: 'Grifo Nobre', speed: 1, attrs: { destreza: 1 } },
          javali: { name: 'Javali Robusto', speed: 0, attrs: { constituicao: 2 } },
          lagarto: { name: 'Lagarto Rápido', speed: 0, attrs: { destreza: 1 } },
          draconiano: { name: 'Draconiano Jovem', speed: 1, attrs: { inteligencia: 1 } },
          urso: { name: 'Urso Montanhês', speed: 0, attrs: { forca: 2 } },
          felino: { name: 'Felino Ágil', speed: 1, attrs: { destreza: 2 } },
          cervo: { name: 'Cervo Celeste', speed: 1, attrs: { destreza: 1 } },
          alce: { name: 'Alce Majestoso', speed: 1, attrs: { constituicao: 2 } },
          hipogrifo: { name: 'Hipogrifo Jovem', speed: 1, attrs: { destreza: 2 } },
          rinoceronte: { name: 'Rinoceronte de Guerra', speed: 0, attrs: { forca: 3, constituicao: 1 } },
          wyvern: { name: 'Wyvern Veloz', speed: 1, attrs: { destreza: 2 } }
        };
        const conf = base[pickType];
        const speedBonus = conf.speed + (pickRarity === 'raro' ? 1 : pickRarity === 'epico' ? 2 : pickRarity === 'lendario' ? 2 : 0);
        const mount: import('../types/hero').Mount = {
          id: uuidv4(),
          name: conf.name,
          type: pickType,
          rarity: pickRarity,
          stage: 'comum',
          speedBonus,
          attributes: { ...conf.attrs },
          createdAt: now
        };
        const mounts = [...(hero.mounts || []), mount];
        get().updateHero(hero.id, { mounts });
        try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Montaria Obtida', message: `Você obteve ${mount.name}!`, duration: 4000, icon: '🏇' }); } catch {}
        try { require('../utils/metricsSystem').trackMetric.custom?.('mount_generated', { heroId: hero.id, type: pickType, rarity: pickRarity }); } catch {}
        return true;
      },

      addMountToSelected: (mount) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const mounts = [...(hero.mounts || []), mount];
        get().updateHero(hero.id, { mounts });
        return true;
      },

      evolveMountForSelected: (mountId) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const mounts = hero.mounts || [];
        const idx = mounts.findIndex(m => m.id === mountId);
        if (idx === -1) return false;
        const m = mounts[idx];
        let nextStage: import('../types/hero').MountStage | undefined;
        if (m.stage === 'comum') nextStage = 'encantada'; else if (m.stage === 'encantada') nextStage = 'lendaria'; else { try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Estágio Máximo', message: 'Esta montaria já é Lendária.', duration: 3500, icon: '⚠️' }); } catch {} ; return false; }
        const hasScroll = (hero.inventory.items['pergaminho-montaria'] || 0) > 0;
        const needsEssence = nextStage === 'lendaria';
        const hasEssence = (hero.inventory.items['essencia-bestial'] || 0) > 0;
        const costGold = m.stage === 'comum' ? 200 : 700;
        if (!hasScroll) { try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Pergaminho insuficiente', message: 'Falta 📜 Pergaminho de Montaria para evoluir.', duration: 3500, icon: '📜' }); } catch {} ; return false; }
        if ((hero.progression.gold || 0) < costGold) { try { require('../components/NotificationSystem').notificationBus.emit({ type: 'gold', title: 'Ouro insuficiente', message: `Evolução requer ${costGold} ouro.`, duration: 3500 }); } catch {} ; return false; }
        if (needsEssence && !hasEssence) { try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Essência necessária', message: 'Para Lendária, você precisa de 🧬 Essência Bestial.', duration: 4000, icon: '🧬' }); } catch {} ; return false; }
        const updatedSpeed = (m.speedBonus || 0) + (nextStage === 'encantada' ? 1 : 2);
        const stageAttrBoost: Partial<HeroAttributes> = (() => {
          const smallBoost = () => {
            switch (m.type) {
              case 'lobo':
              case 'urso':
              case 'rinoceronte':
              case 'javali':
                return { forca: 1 };
              case 'grifo':
              case 'hipogrifo':
              case 'felino':
              case 'cervo':
              case 'alce':
              case 'lagarto':
              case 'wyvern':
              case 'cavalo':
                return { destreza: 1 };
              case 'draconiano':
                return { inteligencia: 1 };
              default:
                return { destreza: 1 };
            }
          };
          const largeBoost = () => {
            switch (m.type) {
              case 'grifo':
              case 'hipogrifo':
              case 'felino':
              case 'wyvern':
              case 'cavalo':
              case 'lagarto':
              case 'cervo':
              case 'alce':
                return { destreza: 2 };
              case 'lobo':
              case 'urso':
              case 'rinoceronte':
              case 'javali':
                return { forca: 2 };
              case 'draconiano':
                return { inteligencia: 2 };
              default:
                return { forca: 2 };
            }
          };
          return nextStage === 'encantada' ? smallBoost() : largeBoost();
        })();
        const newAttrs = { ...(m.attributes || {}) };
        Object.entries(stageAttrBoost).forEach(([k, v]) => { newAttrs[k as keyof HeroAttributes] = (newAttrs[k as keyof HeroAttributes] || 0) + (v as number); });
        const newMount = { ...m, stage: nextStage, speedBonus: updatedSpeed, attributes: newAttrs };
        const nextMounts = [...mounts];
        nextMounts[idx] = newMount;
        const newItems = { ...hero.inventory.items } as Record<string, number>;
        newItems['pergaminho-montaria'] = (newItems['pergaminho-montaria'] || 1) - 1;
        if (newItems['pergaminho-montaria'] <= 0) delete newItems['pergaminho-montaria'];
        if (needsEssence) {
          newItems['essencia-bestial'] = (newItems['essencia-bestial'] || 1) - 1;
          if (newItems['essencia-bestial'] <= 0) delete newItems['essencia-bestial'];
        }
        const compBonus = computeCompanionBonus({ ...hero, mounts: nextMounts } as Hero);
        const derived = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus);
        get().updateHero(hero.id, { mounts: nextMounts, inventory: { ...hero.inventory, items: newItems }, progression: { ...hero.progression, gold: Math.max(0, (hero.progression.gold || 0) - costGold) }, derivedAttributes: derived });
        try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Montaria Evoluída', message: `${m.name} agora é ${nextStage}. Velocidade +${updatedSpeed - (m.speedBonus || 0)}.`, duration: 4000, icon: '✨' }); } catch {}
        try { get().updateDailyGoalProgress(hero.id, 'mount-evolved', 1); } catch {}
        try { require('../utils/metricsSystem').trackMetric.custom?.('mount_evolved', { heroId: hero.id, mountId, stage: nextStage }); } catch {}
        return true;
      },

      refineCompanion: (heroId, kind, id) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const stonesMagic = hero.inventory.items['pedra-magica'] || 0;
        const stonesLink = hero.inventory.items['essencia-vinculo'] || 0;
        const stones = stonesMagic + stonesLink;
        if (stones <= 0) { try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Materiais insuficientes', message: 'Você precisa de Pedra Mágica ou Essência de Vínculo.', duration: 3500, icon: '🔷' }); } catch {} ; return false; }
        const updateRefine = (current: number) => {
          const next = Math.min(10, current + 1);
          const chance = next <= 3 ? 1 : next <= 6 ? 0.75 : 0.45;
          return Math.random() <= chance ? next : current;
        };
        let changed = false;
        if (kind === 'pet') {
          const pets = hero.pets || [];
          const idx = pets.findIndex(p => p.id === id);
          if (idx === -1) return false;
          const p = pets[idx];
          const newLevel = updateRefine(p.refineLevel || 0);
          if (newLevel !== (p.refineLevel || 0)) {
            const nextPets = [...pets];
            nextPets[idx] = { ...p, refineLevel: newLevel };
            hero.pets = nextPets;
            changed = true;
          }
        } else {
          const mounts = hero.mounts || [];
          const idx = mounts.findIndex(m => m.id === id);
          if (idx === -1) return false;
          const m = mounts[idx];
          const newLevel = updateRefine(m.refineLevel || 0);
          if (newLevel !== (m.refineLevel || 0)) {
            const nextMounts = [...mounts];
            nextMounts[idx] = { ...m, refineLevel: newLevel };
            hero.mounts = nextMounts;
            changed = true;
          }
        }
        if (!changed) { try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Refino falhou', message: 'A tentativa de refino não teve efeito desta vez.', duration: 3000, icon: '⚠️' }); } catch {} ; return false; }
        const newItems = { ...hero.inventory.items } as Record<string, number>;
        if (stonesMagic > 0) {
          newItems['pedra-magica'] = stonesMagic - 1;
          if (newItems['pedra-magica'] <= 0) delete newItems['pedra-magica'];
        } else if (stonesLink > 0) {
          newItems['essencia-vinculo'] = stonesLink - 1;
          if (newItems['essencia-vinculo'] <= 0) delete newItems['essencia-vinculo'];
        }
        const compBonus = computeCompanionBonus(hero);
        const derived = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus);
        get().updateHero(hero.id, { inventory: { ...hero.inventory, items: newItems }, derivedAttributes: derived });
        try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: kind === 'mount' ? 'Montaria Refinada' : 'Mascote Refinado', message: 'Bônus do companheiro aumentados em +1% por nível de refino.', duration: 3500, icon: kind === 'mount' ? '🏇' : '🐾' }); } catch {}
        try { if (kind === 'mount') get().updateDailyGoalProgress(hero.id, 'mount-refined', 1); } catch {}
        try { if (kind === 'mount') require('../utils/metricsSystem').trackMetric.custom?.('mount_refined', { heroId: hero.id, mountId: id }); } catch {}
        return true;
      },

      refinePetForSelected: (petId) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        return get().refineCompanion(hero.id, 'pet', petId);
      },
      refineMountForSelected: (mountId) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        return get().refineCompanion(hero.id, 'mount', mountId);
      },

      // === SISTEMA DE CONVITES / INDICAÇÕES ===
      createReferralInvite: (inviterHeroId: string): ReferralInvite | null => {
        const state = get();
        const inviter = state.heroes.find(h => h.id === inviterHeroId);
        if (!inviter) return null;
        const code = uuidv4().slice(0, 8);
        const invite: ReferralInvite = {
          id: uuidv4(),
          code,
          inviterHeroId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          rewardGranted: false
        };
        set(s => ({ referralInvites: [...(s.referralInvites || []), invite] }));
        // Métrica de criação de convite
        trackMetric.custom?.('referral_created', { inviterHeroId, code });
        return invite;
      },

      getReferralInvitesForHero: (heroId: string): ReferralInvite[] => {
        const state = get();
        return (state.referralInvites || []).filter(i => i.inviterHeroId === heroId);
      },

      acceptReferralInvite: (code: string, newHeroId: string): boolean => {
        const state = get();
        const inviteIndex = (state.referralInvites || []).findIndex(i => i.code === code && i.status === 'pending');
        if (inviteIndex === -1) return false;
        const invite = state.referralInvites[inviteIndex];
        const inviter = state.heroes.find(h => h.id === invite.inviterHeroId);
        const newHero = state.heroes.find(h => h.id === newHeroId);
        if (!inviter || !newHero) return false;
        // Marcar aceitação
        const updatedInvite: ReferralInvite = {
          ...invite,
          status: 'accepted',
          acceptedHeroId: newHeroId,
          acceptedAt: new Date().toISOString()
        };
        set(s => ({
          referralInvites: s.referralInvites.map((i, idx) => idx === inviteIndex ? updatedInvite : i)
        }));
        // Conceder bônus ao convidador
        const bonusGold = 100;
        const bonusXP = 150;
        get().gainGold(inviter.id, bonusGold);
        get().gainXP(inviter.id, bonusXP);
        // Marcar recompensa concedida
        set(s => ({
          referralInvites: s.referralInvites.map(i => i.id === updatedInvite.id ? { ...i, rewardGranted: true } : i)
        }));
        // Métrica de aceite de convite
        trackMetric.custom?.('referral_accepted', { inviterHeroId: inviter.id, newHeroId, code, bonusGold, bonusXP });
        return true;
      },
      
      updateHero: (id, heroData) => {
        set(state => ({
          heroes: state.heroes.map(hero => {
            if (hero.id !== id) return hero;
            
            const updatedHero = { 
              ...hero, 
              ...heroData, 
              updatedAt: new Date().toISOString()
            };
            
            // Recalcular atributos derivados se atributos, classe, nível, inventário, título ou companheiros mudaram
            if (heroData.attributes || heroData.class || heroData.level || heroData.inventory || heroData.activeTitle !== undefined || heroData.activePetId !== undefined || heroData.activeMountId !== undefined || heroData.pets || heroData.mounts) {
              const finalAttributes = heroData.attributes 
                ? { ...hero.attributes, ...heroData.attributes }
                : hero.attributes;
              const finalClass = heroData.class || hero.class;
              const finalLevel = heroData.level || hero.progression.level;
              const finalInventory = heroData.inventory || hero.inventory;
              const finalActiveTitle = heroData.activeTitle !== undefined ? heroData.activeTitle : hero.activeTitle;
              const compBonus = computeCompanionBonus({ ...hero, ...heroData } as Hero);
              
              updatedHero.derivedAttributes = calculateDerivedAttributes(
                finalAttributes,
                finalClass,
                finalLevel,
                finalInventory,
                finalActiveTitle,
                compBonus
              );
            }
            
            return updatedHero;
          })
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

      importHero: (incomingHero: Hero, selectAfter = true) => {
        if (!incomingHero?.id) return false;
        const nowIso = new Date().toISOString();
        const ensuredDerived = calculateDerivedAttributes(
          incomingHero.attributes,
          incomingHero.class,
          incomingHero.progression?.level || incomingHero.level || 1,
          incomingHero.inventory,
          incomingHero.activeTitle,
          computeCompanionBonus(incomingHero as Hero)
        );
        const normalized: Hero = {
          ...incomingHero,
          derivedAttributes: ensuredDerived,
          updatedAt: nowIso,
          createdAt: incomingHero.createdAt || nowIso,
        } as Hero;
        set((state) => {
          const idx = state.heroes.findIndex(h => h.id === normalized.id);
          const updatedHeroes = [...state.heroes];
          if (idx >= 0) {
            updatedHeroes[idx] = { ...updatedHeroes[idx], ...normalized };
          } else {
            updatedHeroes.push(normalized);
          }
          return {
            heroes: updatedHeroes,
            selectedHeroId: selectAfter ? normalized.id : state.selectedHeroId,
          } as any;
        });
        return true;
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
        const state = get();
        const selectedHero = state.getSelectedHero();
        let guildLevel = 0;
        
        // Usar a Foja dos Herois como hub global para missões/ranking
        const defaultGuild = state.guilds.find(g => g.name === 'Foja dos Herois');
        if (defaultGuild) {
          const calcLevel = (xp: number) => Math.max(1, Math.floor(xp / 250) + 1);
          guildLevel = defaultGuild.level ?? calcLevel(defaultGuild.guildXP);
          if (defaultGuild.level !== guildLevel) {
            set(state => ({
              guilds: state.guilds.map(g => g.id === defaultGuild.id ? { ...g, level: guildLevel } : g)
            }));
          }
          console.log('🏰 Hub da Guilda encontrado:', defaultGuild.name, 'Nível:', guildLevel);
        }
        
        console.log('🔄 Gerando missões - Herói Level:', heroLevel, 'Guilda Level:', guildLevel);
        const newQuests = generateQuestBoard(heroLevel, guildLevel);

        // Manter missões sticky da lista anterior (evitar desaparecer em refresh)
        const previousSticky = state.availableQuests.filter(q => q.sticky);
        const stickyIds = new Set(previousSticky.map(q => q.id));

        // Inserir Missão de Desafio da Guilda para Promoção de Rank, se elegível
        if (selectedHero) {
          const progress = rankSystem.calculateProgress(selectedHero);
          if (progress.canPromote && progress.nextRank) {
            const promoQuestId = `guild-promotion-${Date.now()}`;
            const rankInfo = (rankSystem as any).getRankInfo?.(progress.nextRank);
            const title = rankInfo ? `Desafio de Promoção: ${rankInfo.name}` : `Desafio de Promoção de Rank ${progress.nextRank}`;
            const description = rankInfo ? `A guilda convoca ${selectedHero.name} para provar seu valor e ascender ao rank ${progress.nextRank} - ${rankInfo.description}` : `Prove seu valor para ascender ao rank ${progress.nextRank}. Complete objetivos desafiadores sob avaliação da guilda.`;
            newQuests.push({
              id: promoQuestId,
              title,
              description,
              type: 'historia',
              difficulty: 'epica',
              levelRequirement: Math.max(1, selectedHero.progression.level),
              timeLimit: 3,
              enemies: [{ type: 'Campeão da Guilda', count: 1, level: selectedHero.progression.level }],
              rewards: { gold: 200, xp: 150, items: [{ id: 'pergaminho-xp', qty: 1 }] },
              repeatable: false,
              isGuildQuest: true,
              sticky: true,
              failurePenalty: { gold: 50, reputation: -10 }
            });
            console.log('🏰 Missão de promoção de rank inserida:', title);
          }
        }
        // Reaplicar missões sticky anteriores que não conflitem por id
        previousSticky.forEach(stq => {
          if (!stickyIds.has(stq.id)) {
            newQuests.push(stq);
          }
        });

        console.log('📋 Missões geradas:', newQuests.length, 'total,', newQuests.filter(q => q.isGuildQuest).length, 'de guilda');
        set({ availableQuests: newQuests });
      },
      
      acceptQuest: (heroId: string, questId: string) => {
        console.log('🔍 acceptQuest chamada:', { heroId, questId });
        
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        const quest = state.availableQuests.find(q => q.id === questId);
        
        console.log('👤 Herói encontrado:', hero ? `${hero.name} (Level ${hero.progression.level})` : 'Não encontrado');
        console.log('📋 Missão encontrada:', quest ? `${quest.title} (Level ${quest.levelRequirement})` : 'Não encontrada');
        
        if (!hero || !quest) {
          console.log('❌ Herói ou missão não encontrados');
          return false;
        }
        
        if (hero.progression.level < quest.levelRequirement) {
          console.log('❌ Nível insuficiente:', hero.progression.level, '<', quest.levelRequirement);
          return false;
        }
        
        if (hero.activeQuests.length >= 3) {
          console.log('❌ Máximo de missões ativas atingido:', hero.activeQuests.length);
          return false;
        }
        
        console.log('✅ Todos os requisitos atendidos, adicionando missão às ativas');
        
        get().updateHero(heroId, {
          activeQuests: [...hero.activeQuests, questId]
        });
        
        console.log('🎉 Missão aceita com sucesso!');
        return true;
      },
      
      completeQuest: (heroId: string, questId: string, autoResolve = false) => {
        console.log('🎯 completeQuest chamada:', { heroId, questId, autoResolve });
        
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        const quest = state.availableQuests.find(q => q.id === questId);
        
        console.log('👤 Herói encontrado:', hero ? `${hero.name} (Level ${hero.progression.level})` : 'Não encontrado');
        console.log('📋 Missão encontrada:', quest ? `${quest.title} (Level ${quest.levelRequirement})` : 'Não encontrada');
        console.log('🔍 Missão está ativa?', hero?.activeQuests.includes(questId));
        
        if (!hero || !quest || !hero.activeQuests.includes(questId)) {
          console.log('❌ Falha na validação inicial');
          return null;
        }
        
        let combatResult: CombatResult | null = null;

        // Aplicar fadiga da missão (redução de stamina)
        {
          const stateRef = get();
          const currentHero = stateRef.heroes.find(h => h.id === heroId);
          if (currentHero) {
            const now = new Date().toISOString();
            const current = currentHero.stamina?.current ?? 100;
            const rate = currentHero.stamina?.recoveryRate ?? 10;
            const max = currentHero.stamina?.max ?? 100;
            const newStamina = Math.max(0, current - 20); // custo base da missão
            stateRef.updateHero(heroId, {
              stamina: { current: newStamina, max, lastRecovery: now, recoveryRate: rate },
              updatedAt: now
            });
          }
        }
        
        // Resolver combate se houver inimigos
        if (quest.enemies && quest.enemies.length > 0) {
          const isGuildQuest = quest.isGuildQuest || false;
          combatResult = autoResolve 
            ? autoResolveCombat(hero, quest.enemies, isGuildQuest)
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
        console.log('🎉 Missão completada com sucesso! Aplicando recompensas...');
        console.log('💰 Recompensas:', quest.rewards);
        console.log('⚔️ Resultado do combate:', combatResult);
        
        get().gainXP(heroId, (quest.rewards?.xp || 0) + (combatResult?.xpGained || 0));
        get().gainGold(heroId, (quest.rewards?.gold || 0) + (combatResult?.goldGained || 0));
        
        // Adicionar itens das recompensas
        if (quest.rewards?.items) {
          quest.rewards.items.forEach(item => {
            // Suporta tanto formato objeto { id, qty } quanto string 'itemId'
            if (typeof (item as any) === 'string') {
              get().addItemToInventory(heroId, item as unknown as string, 1);
              try {
                const s = get().heroes.find(h => h.id === heroId)!.stats;
                const id = item as unknown as string;
                if (id === 'essencia-bestial') {
                  get().updateHero(heroId, { stats: { ...s, beastEssenceCollected: (s.beastEssenceCollected || 0) + 1 } });
                } else if (id === 'pergaminho-montaria') {
                  get().updateHero(heroId, { stats: { ...s, mountScrollsFound: (s.mountScrollsFound || 0) + 1 } });
                }
              } catch {}
            } else {
              const it = item as { id: string; qty?: number };
              get().addItemToInventory(heroId, it.id, it.qty ?? 1);
              try {
                const s = get().heroes.find(h => h.id === heroId)!.stats;
                if (it.id === 'essencia-bestial') {
                  get().updateHero(heroId, { stats: { ...s, beastEssenceCollected: (s.beastEssenceCollected || 0) + (it.qty ?? 1) } });
                } else if (it.id === 'pergaminho-montaria') {
                  get().updateHero(heroId, { stats: { ...s, mountScrollsFound: (s.mountScrollsFound || 0) + (it.qty ?? 1) } });
                }
              } catch {}
            }
          });
        }
        
        // Adicionar itens do combate
        if (combatResult?.itemsGained) {
          combatResult.itemsGained.forEach(item => {
            get().addItemToInventory(heroId, item.id, 1);
          });
        }

        if (combatResult?.petEnergyUsed && combatResult.petEnergyUsed > 0) {
          const h = get().heroes.find(x => x.id === heroId);
          if (h && h.activePetId) {
            const pets = h.pets || [];
            const idx = pets.findIndex(p => p.id === h.activePetId);
            if (idx >= 0) {
              const p = pets[idx];
              const next = { ...p, energy: Math.max(0, (p.energy || 0) - combatResult.petEnergyUsed!) };
              const nextPets = [...pets];
              nextPets[idx] = next;
              get().updateHero(heroId, { pets: nextPets });
            }
          }
        }

        // Chance de obter um ovo misterioso ao completar missões de caça/exploração
        if (quest.type === 'caca' || quest.type === 'exploracao') {
          const eggChance = quest.difficulty === 'epica' ? 0.2 : quest.difficulty === 'dificil' ? 0.12 : 0.08;
          if (Math.random() < eggChance) {
            const egg = generateMysteryEgg();
            const heroAfter = get().heroes.find(h => h.id === heroId)!;
            get().updateHero(heroId, { eggs: [...(heroAfter.eggs || []), egg] });
            console.log('🥚 Ovo misterioso obtido como recompensa de missão!');
          }
        }

        // Chance de dropar um Ovo
        try {
          const dropBase = quest.type === 'caca' ? 0.1 : quest.type === 'exploracao' ? 0.06 : quest.type === 'historia' ? 0.03 : 0.04;
          const diffBonus = quest.difficulty === 'epica' ? 0.05 : quest.difficulty === 'dificil' ? 0.03 : quest.difficulty === 'medio' ? 0.01 : 0;
          const chance = Math.max(0, Math.min(0.25, dropBase + diffBonus));
          if (Math.random() < chance) {
            const rarityRoll = Math.random();
            const rarity = rarityRoll > 0.98 ? 'lendario' : rarityRoll > 0.9 ? 'epico' : rarityRoll > 0.6 ? 'raro' : rarityRoll > 0.35 ? 'incomum' : 'comum';
            if ((hero.eggs || []).length < 30) {
              const egg = generateMysteryEgg(rarity as any);
              const eggs = [...(hero.eggs || []), egg];
              get().updateHero(heroId, { eggs });
              try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Ovo Encontrado', message: `${egg.name}`, duration: 3000, icon: '🥚' }); } catch {}
            } else {
              try { require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Inventário de Ovos Cheio', message: 'Você não tem espaço para novos ovos.', duration: 4000 }); } catch {}
            }
          }
        } catch {}

        if (quest.isGuildQuest) {
          const repByDifficulty: Record<string, number> = { 'facil': 5, 'medio': 8, 'dificil': 12, 'epica': 20 };
          const change = repByDifficulty[quest.difficulty] ?? 6;
          state.updateReputation('Ordem', change);
          try {
            const curStats = hero.stats || ({} as any);
            const compDone = (curStats.companionQuestsCompleted || 0) + 1;
            get().updateHero(heroId, { stats: { ...hero.stats, companionQuestsCompleted: compDone } });
          } catch {}
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

        try { updateProgressDelta({ missionsCompleted: 1 }); } catch {}

        // Se a missão era sticky, removê-la do quadro disponível
        if (quest.sticky) {
          set((state) => ({
            availableQuests: state.availableQuests.filter(q => q.id !== questId)
          }));
        }
        
        // Verificar achievements
        get().checkAchievements(heroId);
        
        // Atualizar dados de rank após completar missão
        const finalHero = get().heroes.find(h => h.id === heroId);
        if (finalHero) {
          // Verificação de migração para rankData
          if (!finalHero.rankData) {
            const initializedRankData = rankSystem.initializeRankData(finalHero);
            get().updateHero(heroId, { rankData: initializedRankData });
            finalHero.rankData = initializedRankData;
          }
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

        // XP para Mascotes por participação
        try {
          const pets = hero.pets || [];
          if (pets.length > 0) {
            const xp = quest.type === 'caca' ? 100 : quest.type === 'exploracao' ? 60 : 40;
            const nextPets = pets.map(p => addPetXP(p, xp));
            get().updateHero(heroId, { pets: nextPets });
          }
        } catch {}
        
        // Update event progress
        eventManager.updateEventProgress(heroId, 'quests-completed', 1);
        
        // Log quest completion activity
        if (quest.difficulty === 'epica') {
          logActivity.epicQuestCompleted({
            heroId,
            heroName: hero.name,
            heroClass: hero.class,
            questName: quest.title,
            questDifficulty: quest.difficulty,
            questReward: quest.rewards
          });
        } else {
          logActivity.questCompleted({
            heroId,
            heroName: hero.name,
            heroClass: hero.class,
            questName: quest.title,
            questDifficulty: quest.difficulty,
            questReward: quest.rewards
          });
        }
        
        // Track quest completion metrics
        trackMetric.questCompleted(heroId, {
          questName: quest.title,
          questDifficulty: quest.difficulty,
          questType: quest.type,
          xpReward: quest.rewards?.xp || 0,
          goldReward: quest.rewards?.gold || 0
        });
        
        console.log('✅ completeQuest finalizada com sucesso!');
        return combatResult;
      },
      
      // Fluxo de escolhas narrativas removido

      // === SISTEMA DE PROGRESSÃO ===
      
      gainXP: (heroId: string, xp: number) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        // Aplicar buff global de XP da Guilda, se ativo
        const gs = getGameSettings();
        const buffPercent = Math.max(0, Math.min(100, gs.guildXpBuffPercent || 0));
        const synergyPercent = computeSynergyBonus(hero) * 100;
        const effectiveXP = Math.floor(xp * (1 + (buffPercent + synergyPercent) / 100));

        const newXP = Math.max(0, hero.progression.xp + effectiveXP);
        const newLevel = checkLevelUp(newXP, hero.progression.level);
        const prevLevel = hero.progression.level;
        const levelsGained = Math.max(0, newLevel - prevLevel);
        const currentStars = hero.progression.stars || 0;
        const thresholdTitles = [
          { level: 2, id: 'aprendiz' },
          { level: 5, id: 'veterano' },
          { level: 10, id: 'campeao' }
        ];
        const crossed = thresholdTitles.filter(t => prevLevel < t.level && newLevel >= t.level);
        const titleToAward = crossed.length > 0 ? crossed[crossed.length - 1].id : undefined;
        
        const progressionUpdated = {
          ...hero.progression,
          xp: newXP,
          level: newLevel,
          stars: currentStars + levelsGained,
          titles: hero.progression.titles || []
        };

        let titlesUpdated = hero.titles ? [...hero.titles] : [];
        if (titleToAward) {
          const hasAlready = titlesUpdated.some(t => t.id === titleToAward);
          if (!hasAlready) {
            const base = AVAILABLE_TITLES.find(t => t.id === titleToAward);
            const newTitle = base ? { ...base, unlockedAt: new Date() } : {
              id: titleToAward,
              name: titleToAward === 'aprendiz' ? 'Aprendiz' : titleToAward === 'veterano' ? 'Veterano' : 'Campeão',
              description: 'Recompensa por subir de nível',
              rarity: 'comum' as const,
              category: 'achievement' as const,
              badge: titleToAward === 'aprendiz' ? '⭐' : titleToAward === 'veterano' ? '🌟' : '🏆',
              unlockedAt: new Date()
            };
            titlesUpdated = [...titlesUpdated, newTitle];
          }
          if (!(progressionUpdated.titles || []).includes(titleToAward)) {
            progressionUpdated.titles = [...(progressionUpdated.titles || []), titleToAward];
          }
        }

        const updates: Partial<Hero> = {
          progression: progressionUpdated,
          titles: titlesUpdated
        };
        
        // Se subiu de nível, recalcular atributos derivados
        if (newLevel > hero.progression.level) {
          updates.level = newLevel;
          if (titleToAward) {
            updates.activeTitle = titleToAward;
          }
          // Conceder pontos de atributo por level-up
          updates.attributePoints = (hero.attributePoints || 0) + levelsGained * ATTRIBUTE_POINTS_PER_LEVEL;
          updates.derivedAttributes = calculateDerivedAttributes(
            hero.attributes,
            hero.class,
            newLevel,
            hero.inventory,
            titleToAward || hero.activeTitle,
            computeCompanionBonus(hero)
          );

          // Desbloquear novas skills por nível
          const unlocked = getNewSkillsForLevel(hero.class as any, hero.progression.level, newLevel);
          if (unlocked.length) {
            const existing = hero.skills || [];
            const merged = [...existing];
            unlocked.forEach(s => { if (!merged.find(m => m.id === s.id)) merged.push(s); });
            updates.skills = merged;

            // Atualizar progresso de talentos planejados
            const planned = hero.plannedTalents || [];
            if (planned.length) {
              const unlockedIds = unlocked.map(s => s.id);
              const nowUnlockedPlanned = planned.filter(id => merged.find(m => m.id === id)).length;
              updates.stats = {
                ...hero.stats,
                talentsUnlockedPlanned: nowUnlockedPlanned
              };
            }
          }

          // Gerar Capítulos da Jornada a cada 4 níveis (4, 8, 12, 16, 20)
          const milestones = [4, 8, 12, 16, 20];
          const crossedMilestones = milestones.filter(m => prevLevel < m && newLevel >= m);
          if (crossedMilestones.length > 0) {
            const now = new Date().toISOString();
            const existing = hero.journeyChapters || [];
            let chaptersToAdd = [] as any[];
            crossedMilestones.forEach(m => {
              const already = existing.some(c => c.levelMilestone === m);
              if (!already) {
                const index = (existing.length + chaptersToAdd.length) + 1;
                const relatedQuestTitles = (hero.completedQuests || [])
                  .map(qId => get().availableQuests.find(q => q.id === qId)?.title)
                  .filter(Boolean) as string[];
                const summary = `No marco de nível ${m}, ${hero.name} consolidou sua jornada como ${hero.class}. Conquistas recentes incluem: ${(relatedQuestTitles.slice(-3).join('; ') || 'missões iniciais da guilda')}. Combates: ${hero.stats.totalCombats || 0}, inimigos derrotados: ${hero.stats.enemiesDefeated || 0}, itens obtidos: ${hero.stats.itemsFound || 0}.`;
                chaptersToAdd.push({
                  id: `chapter-${hero.id}-${m}`,
                  index,
                  title: `Capítulo ${index}: Marco de Nível ${m}`,
                  summary,
                  createdAt: now,
                  levelMilestone: m,
                  locked: true,
                  relatedQuests: hero.completedQuests || []
                });

                // Missões narrativas associadas ao capítulo removidas
              }
            });
            if (chaptersToAdd.length > 0) {
              updates.journeyChapters = [...existing, ...chaptersToAdd];
              // Passe de temporada: adicionar capítulo exclusivo
              try {
                const m = getMonetization();
                if (m.seasonPassActive?.active) {
                  const nowSeason = new Date().toISOString();
                  const bonus = {
                    id: `season-${hero.id}-${newLevel}`,
                    index: (updates.journeyChapters.length || 0) + 1,
                    title: 'Crônica da Temporada',
                    summary: 'Um arco narrativo exclusivo da temporada foi revelado.',
                    createdAt: nowSeason,
                    levelMilestone: newLevel,
                    locked: false,
                    relatedQuests: hero.completedQuests || []
                  } as any;
                  updates.journeyChapters = [...updates.journeyChapters, bonus];
                }
              } catch {}
              // Exibir anúncio intersticial se permitido pela monetização
              try {
                const m = getMonetization();
                if (m.adsEnabled && !m.adsRemoved && m.interstitialOnChapterMilestones) {
                  m.triggerInterstitial('chapter');
                }
              } catch {}
            }
          }
        }
        
        get().updateHero(heroId, updates);
        
        // Atualizar dados de rank após ganhar XP
        const updatedHero = get().heroes.find(h => h.id === heroId);
        if (updatedHero) {
          // Verificação de migração para rankData
          if (!updatedHero.rankData) {
            const initializedRankData = rankSystem.initializeRankData(updatedHero);
            get().updateHero(heroId, { rankData: initializedRankData });
            updatedHero.rankData = initializedRankData;
          }
          const newRankData = rankSystem.updateRankData(updatedHero, updatedHero.rankData);
          get().updateHero(heroId, { rankData: newRankData });
        }
        
        // Update daily goals progress
        get().updateDailyGoalProgress(heroId, 'xp-gained', effectiveXP);
        if (newLevel > hero.progression.level) {
          get().updateDailyGoalProgress(heroId, 'level-up', 1);
        }
        
        // Update event progress
        eventManager.updateEventProgress(heroId, 'xp-gained', effectiveXP);
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
        trackMetric.xpGained(heroId, effectiveXP);
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
          // Verificação de migração para rankData
          if (!updatedHero.rankData) {
            const initializedRankData = rankSystem.initializeRankData(updatedHero);
            get().updateHero(heroId, { rankData: initializedRankData });
            updatedHero.rankData = initializedRankData;
          }
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

        try {
          if (itemId === 'pergaminho-montaria') {
            const s = hero.stats || ({} as any);
            const next = (s.mountScrollsFound || 0) + quantity;
            get().updateHero(heroId, { stats: { ...hero.stats, mountScrollsFound: next } });
            require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Pergaminho de Montaria', message: `Você obteve 📜 x${quantity}.`, duration: 3500, icon: '📜' });
          }
          if (itemId === 'essencia-bestial') {
            const s = hero.stats || ({} as any);
            const next = (s.beastEssenceCollected || 0) + quantity;
            get().updateHero(heroId, { stats: { ...hero.stats, beastEssenceCollected: next } });
            require('../components/NotificationSystem').notificationBus.emit({ type: 'item', title: 'Essência Bestial', message: `Você obteve 🧬 x${quantity}.`, duration: 3500, icon: '🧬' });
          }
        } catch {}
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
            case 'amigo-dos-animais':
              progress = Math.min(template.maxProgress!, (hero.stats.companionQuestsCompleted || 0));
              break;
            case 'domador-de-feras':
              progress = Math.min(template.maxProgress!, (hero.stats.beastEssenceCollected || 0));
              break;
            case 'cavaleiro-mitico':
              progress = Math.min(template.maxProgress!, (hero.stats.mountScrollsFound || 0));
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
          try { updateProgressDelta({ achievementsUnlocked: newAchievements.length }); } catch {}
        }
        
        return newAchievements;
      },
      
      // === SISTEMA DE LOJA ===
      
      buyItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        const result = purchaseItem(hero, itemId);
        if (result.success && result.item) {
          // Atualizar saldo conforme moeda
          if (result.currency && result.newBalance !== undefined) {
            const updatedProgression = { ...hero.progression };
            if (result.currency === 'gold') updatedProgression.gold = result.newBalance;
            if (result.currency === 'glory') updatedProgression.glory = result.newBalance;
            if (result.currency === 'arcaneEssence') updatedProgression.arcaneEssence = result.newBalance;
            get().updateHero(heroId, { progression: updatedProgression });
          } else if (result.newGold !== undefined) {
            get().updateHero(heroId, {
              progression: {
                ...hero.progression,
                gold: result.newGold!
              }
            });
          }
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
          
          const updatedInventory = { ...hero.inventory };
          
          switch (item.type) {
            case 'weapon':
              updatedInventory.equippedWeapon = itemId;
              break;
            case 'armor':
              updatedInventory.equippedArmor = itemId;
              break;
            case 'accessory':
              updatedInventory.equippedAccessory = itemId;
              break;
          }
          
          // Atualizar inventário e forçar recálculo dos atributos derivados
          const derived = calculateDerivedAttributes(
            hero.attributes,
            hero.class,
            hero.progression.level,
            updatedInventory,
            hero.activeTitle,
            computeCompanionBonus(hero)
          );
          get().updateHero(heroId, { inventory: updatedInventory, derivedAttributes: derived });
        }
        
        return result.success;
      },

      upgradeItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return false;
        // Apenas equipamentos podem ser aprimorados
        if (!(item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory')) return false;

        const currentLevel = hero.inventory.upgrades?.[itemId] ?? 0;
        const rarityFactor: Record<'comum' | 'raro' | 'epico' | 'lendario', number> = {
          comum: 0.25,
          raro: 0.4,
          epico: 0.6,
          lendario: 0.8
        };
        const baseCost = Math.ceil(item.price * rarityFactor[item.rarity] * (currentLevel + 1));
        const rank = hero.rankData?.currentRank ?? 'F';
        const rankDiscount: Record<'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S', number> = {
          F: 0,
          E: 0.03,
          D: 0.05,
          C: 0.07,
          B: 0.1,
          A: 0.12,
          S: 0.15
        };
        const finalCost = Math.max(1, Math.ceil(baseCost * (1 - rankDiscount[rank])));

        // Verificar ouro
        if ((hero.progression.gold || 0) < finalCost) return false;

        // Atualizar ouro e nível de upgrade
        const updatedInventory = { ...hero.inventory, upgrades: { ...(hero.inventory.upgrades || {}) } };
        updatedInventory.upgrades![itemId] = currentLevel + 1;

        const derived = calculateDerivedAttributes(
          hero.attributes,
          hero.class,
          hero.progression.level,
          updatedInventory,
          hero.activeTitle,
          computeCompanionBonus(hero)
        );

        get().updateHero(heroId, {
          progression: { ...hero.progression, gold: Math.max(0, (hero.progression.gold || 0) - finalCost) },
          inventory: updatedInventory,
          derivedAttributes: derived
        });

        return true;
      },

      craftItem: (heroId: string, recipeId: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const recipe = RECIPES.find(r => r.id === recipeId);
        if (!recipe) return false;
        const rankOrder = ['F','E','D','C','B','A','S'] as const;
        const heroRank = (hero.rankData?.currentRank || 'F') as typeof rankOrder[number];
        const heroRankIdx = rankOrder.indexOf(heroRank);
        const reqIdx = rankOrder.indexOf((recipe.rankRequired || 'F') as any);
        if (heroRankIdx < reqIdx) return false;
        for (const inp of recipe.inputs) {
          if ((hero.inventory.items[inp.id] || 0) < inp.qty) return false;
        }
        const newItems = { ...hero.inventory.items };
        recipe.inputs.forEach(inp => {
          newItems[inp.id] = Math.max(0, (newItems[inp.id] || 0) - inp.qty);
        });
        newItems[recipe.output.id] = (newItems[recipe.output.id] || 0) + recipe.output.qty;
        get().updateHero(heroId, { inventory: { ...hero.inventory, items: newItems } });
        return true;
      },

      // === FORJA: Refino de raridade do item equipado ===
      refineEquippedItem: (heroId: string, slot: 'weapon' | 'armor' | 'accessory') => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const inv = hero.inventory;
        const equippedId = slot === 'weapon' ? inv.equippedWeapon : slot === 'armor' ? inv.equippedArmor : inv.equippedAccessory;
        if (!equippedId) return false;

        const baseItem = SHOP_ITEMS.find(i => i.id === equippedId) || (inv.customItems ? inv.customItems[equippedId] : undefined);
        if (!baseItem) return false;

        const currentRarity = inv.refined?.[equippedId] || baseItem.rarity;
        const order: ('comum'|'incomum'|'raro'|'epico'|'lendario')[] = ['comum','incomum','raro','epico','lendario'];
        const idx = order.indexOf(currentRarity);
        if (idx < 0 || idx === order.length - 1) return false; // já lendário
        const next = order[idx + 1];

        const costTable: Record<string, { gold: number; essence: number; chance: number }> = {
          'comum->incomum': { gold: 100, essence: 10, chance: 0.7 },
          'incomum->raro': { gold: 200, essence: 20, chance: 0.5 },
          'raro->epico': { gold: 400, essence: 40, chance: 0.3 },
          'epico->lendario': { gold: 1000, essence: 100, chance: 0.1 }
        };
        const key = `${currentRarity}->${next}`;
        const cfg = costTable[key];
        if (!cfg) return false;

        const gold = hero.progression.gold || 0;
        const essence = hero.progression.arcaneEssence || 0;
        if (gold < cfg.gold || essence < cfg.essence) return false;

        // Consumir custo
        hero.progression.gold = gold - cfg.gold;
        hero.progression.arcaneEssence = essence - cfg.essence;

        // Chance de sucesso; falha não remove/baixa raridade
        const success = Math.random() <= cfg.chance;
        if (success) {
          const refined = { ...(inv.refined || {}) };
          refined[equippedId] = next;
          hero.inventory.refined = refined;
        }

        // Atualizar store
        set({ heroes: state.heroes.map(h => h.id === heroId ? { ...hero, updatedAt: new Date().toISOString() } : h) });
        return success;
      },

      // === FORJA: Fusão de dois itens em um novo procedural ===
      fuseItems: (heroId: string, itemAId: string, itemBId: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const inv = hero.inventory;
        const qtyA = inv.items[itemAId] || 0;
        const qtyB = inv.items[itemBId] || 0;
        if (qtyA < 1 || qtyB < 1) return false;

        const itemA = SHOP_ITEMS.find(i => i.id === itemAId);
        const itemB = SHOP_ITEMS.find(i => i.id === itemBId);
        if (!itemA || !itemB) return false;
        if (itemA.type !== itemB.type) return false;

        // Consumir itens
        inv.items[itemAId] = qtyA - 1;
        inv.items[itemBId] = qtyB - 1;
        if (inv.items[itemAId] <= 0) delete inv.items[itemAId];
        if (inv.items[itemBId] <= 0) delete inv.items[itemBId];

        const seed = (itemAId + itemBId).split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
        const luck = hero.derivedAttributes.luck || 0;
        const p = generateProceduralItem(seed, luck);

        const iconMap: Record<string, string> = { espada: '🗡️', arco: '🏹', cajado: '🪄', machado: '🪓' };
        const newItemId = p.id;
        const mapped: import('../types/hero').Item = {
          id: newItemId,
          name: p.name,
          description: 'Item forjado por fusão, único ao herói.',
          type: itemA.type,
          rarity: p.rarity,
          level: hero.progression.level,
          price: 100,
          icon: iconMap[p.baseType] || '⚒️',
          bonus: p.bonus
        };

        const customItems = { ...(inv.customItems || {}) };
        customItems[newItemId] = mapped;
        hero.inventory.customItems = customItems;
        hero.inventory.items[newItemId] = (hero.inventory.items[newItemId] || 0) + 1;

        set({ heroes: state.heroes.map(h => h.id === heroId ? { ...hero, updatedAt: new Date().toISOString() } : h) });
        return true;
      },

      // === FORJA: Encantamento aplicado ao item equipado ===
      enchantEquippedItem: (heroId: string, slot: 'weapon' | 'armor' | 'accessory', enchant: 'lifesteal') => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const inv = hero.inventory;
        const equippedId = slot === 'weapon' ? inv.equippedWeapon : slot === 'armor' ? inv.equippedArmor : inv.equippedAccessory;
        if (!equippedId) return false;

        const costEssence = 50;
        const essence = hero.progression.arcaneEssence || 0;
        if (essence < costEssence) return false;
        hero.progression.arcaneEssence = essence - costEssence;

        const ench = { ...(inv.enchantments || {}) };
        ench[equippedId] = { special: enchant };
        hero.inventory.enchantments = ench;

        set({ heroes: state.heroes.map(h => h.id === heroId ? { ...hero, updatedAt: new Date().toISOString() } : h) });
        return true;
      },

      unequipItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return false;

        const updatedInventory = { ...hero.inventory };
        let changed = false;
        switch (item.type) {
          case 'weapon':
            if (updatedInventory.equippedWeapon === itemId) {
              updatedInventory.equippedWeapon = undefined;
              changed = true;
            }
            break;
          case 'armor':
            if (updatedInventory.equippedArmor === itemId) {
              updatedInventory.equippedArmor = undefined;
              changed = true;
            }
            break;
          case 'accessory':
            if (updatedInventory.equippedAccessory === itemId) {
              updatedInventory.equippedAccessory = undefined;
              changed = true;
            }
            break;
          default:
            return false;
        }

        if (!changed) return false;
        const derived = calculateDerivedAttributes(
          hero.attributes,
          hero.class,
          hero.progression.level,
          updatedInventory,
          hero.activeTitle,
          computeCompanionBonus(hero)
        );
        get().updateHero(heroId, { inventory: updatedInventory, derivedAttributes: derived });
        return true;
      },
      
      useItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        // Capturar estados antes para deltas
        const beforeHp = hero.derivedAttributes.currentHp ?? hero.derivedAttributes.hp;
        const beforeMp = hero.derivedAttributes.currentMp ?? hero.derivedAttributes.mp;
        const beforeFatigue = hero.progression.fatigue ?? 0;

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
            
            if (result.effects.fatigue !== undefined) {
              updates.progression = {
                ...hero.progression,
                fatigue: result.effects.fatigue
              };
            }
            
            if (result.effects.xp !== undefined) {
              get().gainXP(heroId, result.effects.xp);
            }
            
            if (Object.keys(updates).length > 0) {
              get().updateHero(heroId, updates);
            }
            
            // Log de atividade de uso de item
            try {
              const itemInfo = SHOP_ITEMS.find(i => i.id === itemId);
              const afterHero = get().heroes.find(h => h.id === heroId)!;
              const afterHp = afterHero.derivedAttributes.currentHp ?? afterHero.derivedAttributes.hp;
              const afterMp = afterHero.derivedAttributes.currentMp ?? afterHero.derivedAttributes.mp;
              const afterFatigue = afterHero.progression.fatigue ?? 0;

              const hpRecovered = Math.max(0, (afterHp ?? 0) - (beforeHp ?? 0));
              const mpRecovered = Math.max(0, (afterMp ?? 0) - (beforeMp ?? 0));
              const fatigueRecovered = Math.max(0, (beforeFatigue ?? 0) - (afterFatigue ?? 0));

              logActivity.itemUsed({
                heroId: hero.id,
                heroName: hero.name,
                heroClass: hero.class,
                heroLevel: hero.progression.level,
                itemId: itemId,
                itemName: itemInfo?.name,
                itemType: itemInfo?.type,
                hpRecovered,
                mpRecovered,
                fatigueRecovered,
                xpGained: result.effects.xp ?? 0
              });
            } catch {}
          }
        }
        
        return result.success;
      },

      // === TAVERNA: DESCANSO PAGO ===
      restAtTavern: (heroId: string, costGold: number, fatigueRecovery: number, restType?: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const currentGold = hero.progression.gold ?? 0;
        const currentFatigue = hero.progression.fatigue ?? 0;
        if (currentGold < costGold) return false;
        if (currentFatigue <= 0) return false;
        const recovered = Math.min(fatigueRecovery, currentFatigue);
        const updatedProgression = {
          ...hero.progression,
          gold: currentGold - costGold,
          fatigue: currentFatigue - recovered
        };
        get().updateHero(heroId, { progression: updatedProgression });

        try {
          logActivity.tavernRest({
            heroId: hero.id,
            heroName: hero.name,
            heroClass: hero.class,
            heroLevel: hero.progression.level,
            restType: restType,
            goldSpent: costGold,
            fatigueBefore: currentFatigue,
            fatigueRecovered: recovered,
            fatigueAfter: updatedProgression.fatigue
          });
        } catch {}
        return true;
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
          quests: [],
          level: 1,
          roles: { [heroId]: 'lider' },
          councilMembers: [],
          policies: {},
          pendingAlliances: []
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
          guilds: state.guilds.map(g => {
            if (g.id !== guildId) return g;
            const isRankS = (hero.rankData?.currentRank === 'S');
            const councilMembers = g.councilMembers || [];
            const nextCouncil = isRankS && !councilMembers.includes(heroId)
              ? [...councilMembers, heroId]
              : councilMembers;
            return {
              ...g,
              members: [...g.members, heroId],
              roles: { ...(g.roles || {}), [heroId]: 'membro' },
              councilMembers: nextCouncil
            };
          })
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
              ? { 
                  ...g, 
                  members: g.members.filter(id => id !== heroId),
                  roles: (() => {
                    const roles = { ...(g.roles || {}) } as Record<string, 'lider'|'oficial'|'membro'>;
                    delete roles[heroId];
                    // Se o líder saiu, promover primeiro oficial ou primeiro membro
                    if (Object.values(roles).includes('lider') === false && g.members.length > 0) {
                      const candidate = g.members.find(id => id !== heroId);
                      if (candidate) roles[candidate] = 'lider';
                    }
                    return roles;
                  })()
                }
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

      depositGoldToGuild: (heroId: string, amount: number) => {
        if (amount <= 0) return false;
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero || !hero.progression.guildId) return false;
        if (hero.progression.gold < amount) return false;
        const guildId = hero.progression.guildId;
        set(state => ({
          guilds: state.guilds.map(g => g.id === guildId ? { ...g, bankGold: g.bankGold + amount } : g)
        }));
        get().updateHero(heroId, {
          progression: { ...hero.progression, gold: hero.progression.gold - amount }
        });
        return true;
      },

      withdrawGoldFromGuild: (heroId: string, amount: number) => {
        if (amount <= 0) return false;
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero || !hero.progression.guildId) return false;
        const guild = state.guilds.find(g => g.id === hero.progression.guildId);
        if (!guild) return false;
        const role = guild.roles?.[heroId] || 'membro';
        if (role === 'membro') return false; // Apenas líder/oficial podem sacar
        if (guild.bankGold < amount) return false;
        set(state => ({
          guilds: state.guilds.map(g => g.id === guild.id ? { ...g, bankGold: g.bankGold - amount } : g)
        }));
        get().updateHero(heroId, {
          progression: { ...hero.progression, gold: hero.progression.gold + amount }
        });
        return true;
      },

      contributeXPToGuild: (heroId: string, amount: number) => {
        if (amount <= 0) return false;
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero || !hero.progression.guildId) return false;
        const guildId = hero.progression.guildId;
        const calcLevel = (xp: number) => Math.max(1, Math.floor(xp / 250) + 1);
        let newLevel = 0;
        set(state => ({
          guilds: state.guilds.map(g => {
            if (g.id !== guildId) return g;
            const newXP = g.guildXP + amount;
            newLevel = calcLevel(newXP);
            return { ...g, guildXP: newXP, level: newLevel };
          })
        }));
        // Pequeno bônus de reputação de guilda como efeito colateral (se existir no futuro)
        return true;
      },

      setGuildRole: (guildId, actorId, targetId, role) => {
        const state = get();
        const guild = state.guilds.find(g => g.id === guildId);
        if (!guild) return false;
        const actorRole = guild.roles?.[actorId] || 'membro';
        if (actorRole !== 'lider') return false; // só líder pode alterar papéis
        set(state => ({
          guilds: state.guilds.map(g => g.id === guildId ? { ...g, roles: { ...(g.roles || {}), [targetId]: role } } : g)
        }));
        return true;
      },

      transferGuildLeadership: (guildId, actorId, newLeaderId) => {
        const state = get();
        const guild = state.guilds.find(g => g.id === guildId);
        if (!guild) return false;
        const actorRole = guild.roles?.[actorId] || 'membro';
        if (actorRole !== 'lider') return false;
        if (!guild.members.includes(newLeaderId)) return false;
        set(state => ({
          guilds: state.guilds.map(g => {
            if (g.id !== guildId) return g;
            const newRoles = { ...(g.roles || {}) } as Record<string, 'lider'|'oficial'|'membro'>;
            // Demote current leader, promote new leader
            Object.entries(newRoles).forEach(([hid, r]) => {
              if (r === 'lider') newRoles[hid] = 'oficial';
            });
            newRoles[newLeaderId] = 'lider';
            return { ...g, roles: newRoles };
          })
        }));
        return true;
      },

      ensureDefaultGuildExists: () => {
        const state = get();
        if (state.guilds.some(g => g.name === 'Foja dos Herois')) return;
        const defaultGuild: Guild = {
          id: uuidv4(),
          name: 'Foja dos Herois',
          description: 'A casa acolhedora de todos os heróis iniciantes. Cooperativa, social e focada em aprender e evoluir juntos.',
          members: [],
          guildXP: 0,
          bankGold: 0,
          createdAt: new Date().toISOString(),
          quests: [],
          level: 1,
          roles: {},
          councilMembers: [],
          policies: {},
          pendingAlliances: []
        };
        set(state => ({ guilds: [...state.guilds, defaultGuild] }));
      },

      // === Conselho da Guilda e Políticas ===
      activateGuildEvent: (guildId: string, actorId: string, params: { xpBuffPercent?: number; trainingDiscountPercent?: number; eventName?: string; durationHours?: number; costGold?: number }) => {
        const state = get();
        const guild = state.guilds.find(g => g.id === guildId);
        const actor = state.heroes.find(h => h.id === actorId);
        if (!guild || !actor) return false;
        const isCouncil = (guild.councilMembers || []).includes(actorId) || (guild.roles?.[actorId] === 'lider');
        const isRankS = actor.rankData?.currentRank === 'S';
        if (!isCouncil || !isRankS) return false;

        const durationMs = (params.durationHours ?? 24) * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + durationMs).toISOString();
        const eventName = params.eventName || 'Evento da Guilda';
        // Limites de balanceamento: XP até 30%, Treino até 25%
        const xpBuffPercent = Math.max(0, Math.min(30, params.xpBuffPercent ?? 0));
        const trainingDiscountPercent = Math.max(0, Math.min(25, params.trainingDiscountPercent ?? 0));
        const baseCost = params.costGold ?? 100;
        const totalCost = baseCost + xpBuffPercent * 10 + trainingDiscountPercent * 5; // custo simples
        if (guild.bankGold < totalCost) return false;

        // Cooldown: impedir ativação se evento recente em menos de 12h
        const lastActivatedIso = guild.policies?.lastEventActivatedAt;
        const nowMs = Date.now();
        const cooldownMs = 12 * 60 * 60 * 1000; // 12 horas
        if (lastActivatedIso) {
          const lastMs = new Date(lastActivatedIso).getTime();
          if (nowMs - lastMs < cooldownMs) return false;
        }

        // Deduzir do cofre
        set(state => ({
          guilds: state.guilds.map(g => g.id === guildId ? {
            ...g,
            bankGold: g.bankGold - totalCost,
            policies: {
              ...(g.policies || {}),
              xpBuffPercent,
              trainingDiscountPercent,
              activeEventName: eventName,
              eventExpiresAt: expiresAt,
              lastEventActivatedAt: new Date().toISOString()
            }
          } : g)
        }));

        // Aplicar buffs globais
        getGameSettings();
        useGameSettingsStore.getState().applyGuildBuffs({
          xpBuffPercent,
          trainingDiscountPercent,
          eventName,
          expiresAt,
          sourceGuildId: guildId,
        });

        // Auditoria: registrar evento de guilda
        logActivity.guildEventActivated({
          heroId: actor.id,
          heroName: actor.name,
          heroClass: actor.class,
          heroLevel: actor.level,
          guildName: guild.name,
          eventName,
          xpBuffPercent,
          trainingDiscountPercent,
          eventExpiresAt: expiresAt,
          costGold: totalCost
        });

        return true;
      },

      clearGuildEvent: (guildId: string, actorId: string) => {
        const state = get();
        const guild = state.guilds.find(g => g.id === guildId);
        const actor = state.heroes.find(h => h.id === actorId);
        if (!guild || !actor) return false;
        const isCouncil = (guild.councilMembers || []).includes(actorId) || (guild.roles?.[actorId] === 'lider');
        if (!isCouncil) return false;
        set(state => ({
          guilds: state.guilds.map(g => g.id === guildId ? {
            ...g,
            policies: { ...(g.policies || {}), xpBuffPercent: 0, trainingDiscountPercent: 0, activeEventName: undefined, eventExpiresAt: undefined }
          } : g)
        }));
        useGameSettingsStore.getState().clearGuildBuffs();
        return true;
      },

      // === Alianças de Party ===
      requestPartyAlliance: (partyId: string, guildId: string, requesterHeroId: string) => {
        const state = get();
        const guild = state.guilds.find(g => g.id === guildId);
        const party = state.parties.find(p => p.id === partyId);
        if (!guild || !party) return false;
        const request = {
          id: uuidv4(),
          partyId,
          partyName: party.name,
          requestedBy: requesterHeroId,
          status: 'pending' as const,
          requestedAt: new Date().toISOString()
        };
        set(state => ({
          guilds: state.guilds.map(g => g.id === guildId ? { ...g, pendingAlliances: [...(g.pendingAlliances || []), request] } : g)
        }));
        return true;
      },

      approvePartyAlliance: (guildId: string, actorId: string, requestId: string) => {
        const state = get();
        const guild = state.guilds.find(g => g.id === guildId);
        const actor = state.heroes.find(h => h.id === actorId);
        if (!guild || !actor) return false;
        const isCouncil = (guild.councilMembers || []).includes(actorId) || (guild.roles?.[actorId] === 'lider');
        if (!isCouncil) return false;
        set(state => ({
          guilds: state.guilds.map(g => {
            if (g.id !== guildId) return g;
            const nextPending = (g.pendingAlliances || []).map(r => r.id === requestId ? { ...r, status: 'approved', decidedAt: new Date().toISOString(), decidedBy: actorId } : r);
            return { ...g, pendingAlliances: nextPending };
          })
        }));
        return true;
      },

      rejectPartyAlliance: (guildId: string, actorId: string, requestId: string) => {
        const state = get();
        const guild = state.guilds.find(g => g.id === guildId);
        const actor = state.heroes.find(h => h.id === actorId);
        if (!guild || !actor) return false;
        const isCouncil = (guild.councilMembers || []).includes(actorId) || (guild.roles?.[actorId] === 'lider');
        if (!isCouncil) return false;
        set(state => ({
          guilds: state.guilds.map(g => {
            if (g.id !== guildId) return g;
            const nextPending = (g.pendingAlliances || []).map(r => r.id === requestId ? { ...r, status: 'rejected', decidedAt: new Date().toISOString(), decidedBy: actorId } : r);
            return { ...g, pendingAlliances: nextPending };
          })
        }));
        return true;
      },

      // === SISTEMA DE PARTY ===
      createParty: (heroId: string, name: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return null;
        const party: Party = { id: uuidv4(), name, members: [heroId], createdAt: new Date().toISOString(), sharedLoot: true, sharedXP: true, leaderId: heroId, invites: [] };
        set(state => ({ parties: [...state.parties, party] }));
        // Atribuir partyId ao herói
        get().updateHero(heroId, { progression: { ...hero.progression, partyId: party.id } as any });
        return party;
      },
      joinParty: (heroId: string, partyId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        const party = get().parties.find(p => p.id === partyId);
        if (!hero || !party) return false;
        if (party.members.includes(heroId)) return true;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, members: [...p.members, heroId], invites: (p.invites || []).filter(id => id !== heroId) } : p) }));
        get().updateHero(heroId, { progression: { ...hero.progression, partyId } as any });
        return true;
      },
      leaveParty: (heroId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero || !hero.progression.partyId) return false;
        const partyId = hero.progression.partyId;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, members: p.members.filter(id => id !== heroId), leaderId: p.leaderId === heroId ? p.members.find(id => id !== heroId) : p.leaderId } : p) }));
        get().updateHero(heroId, { progression: { ...hero.progression, partyId: undefined } as any });
        return true;
      },
      getHeroParty: (heroId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero || !hero.progression.partyId) return undefined;
        return get().parties.find(p => p.id === hero.progression.partyId);
      },
      inviteHeroToParty: (partyId: string, inviterId: string, targetHeroId: string) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party || party.leaderId !== inviterId) return false;
        if (party.members.includes(targetHeroId)) return false;
        if ((party.invites || []).includes(targetHeroId)) return true;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, invites: [...(p.invites || []), targetHeroId] } : p) }));
        return true;
      },
      acceptPartyInvite: (heroId: string, partyId: string) => {
        const party = get().parties.find(p => p.id === partyId);
        const hero = get().heroes.find(h => h.id === heroId);
        if (!party || !hero) return false;
        if (!(party.invites || []).includes(heroId)) return false;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, members: [...p.members, heroId], invites: (p.invites || []).filter(id => id !== heroId) } : p) }));
        get().updateHero(heroId, { progression: { ...hero.progression, partyId } as any });
        return true;
      },
      transferPartyLeadership: (partyId: string, actorId: string, newLeaderId: string) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party || party.leaderId !== actorId) return false;
        if (!party.members.includes(newLeaderId)) return false;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, leaderId: newLeaderId } : p) }));
        return true;
      },
      togglePartySharedLoot: (partyId: string, actorId: string, value?: boolean) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party || party.leaderId !== actorId) return false;
        const newValue = value !== undefined ? value : !party.sharedLoot;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, sharedLoot: newValue } : p) }));
        return true;
      },
      togglePartySharedXP: (partyId: string, actorId: string, value?: boolean) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party || party.leaderId !== actorId) return false;
        const newValue = value !== undefined ? value : !party.sharedXP;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, sharedXP: newValue } : p) }));
        return true;
      },
      removeMemberFromParty: (partyId: string, actorId: string, targetHeroId: string) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party || party.leaderId !== actorId) return false;
        if (targetHeroId === actorId) return false;
        if (!party.members.includes(targetHeroId)) return false;
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? { ...p, members: p.members.filter(id => id !== targetHeroId) } : p) }));
        const hero = get().heroes.find(h => h.id === targetHeroId);
        if (hero) {
          get().updateHero(targetHeroId, { progression: { ...hero.progression, partyId: undefined } as any });
        }
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

       addTitleToSelectedHero: (title: Title, setActive: boolean = false) => {
         const hero = get().getSelectedHero();
         if (!hero) return;

         // Evitar duplicados pelo id
         const has = hero.titles.some(t => t.id === title.id);
         const updatedTitles = has ? hero.titles : [...hero.titles, title];

         const updates: Partial<Hero> = { titles: updatedTitles } as any;
         if (setActive) {
           (updates as any).activeTitle = title.id;
         }

       get().updateHero(hero.id, updates);

        // Registrar atividade de título conquistado (se for novo)
        if (!has) {
          logActivity.titleEarned({
            heroId: hero.id,
            heroName: hero.name,
            heroClass: hero.class,
            heroLevel: hero.progression.level,
            titleEarned: title.name
          });
        }
      },

      toggleFavoriteTitle: (titleId: string, favored?: boolean) => {
        const hero = get().getSelectedHero();
        if (!hero) return;
        const updated = hero.titles.map(t => t.id === titleId ? { ...t, favorite: favored ?? !t.favorite } : t);
        get().updateHero(hero.id, { titles: updated } as any);
      },
 
       updateAchievementProgress: () => {
         const hero = get().getSelectedHero();
         if (!hero) return;

         // Atualiza progresso dos achievements de títulos com base nas estatísticas atuais
         const prevAchievements = hero.achievements || [];
         const updatedAchievements = updateTitleAchievementProgress(hero);

         // Coletar novos desbloqueios para recompensas de título
         const newlyUnlocked = updatedAchievements.filter(a => {
           const prev = prevAchievements.find(p => p.id === a.id);
           return a.unlocked && (!prev || !prev.unlocked);
         });

         let updatedTitles = [...hero.titles];
         newlyUnlocked.forEach(a => {
           const rewardTitleId = a.rewards?.title;
           if (!rewardTitleId) return;
           const tpl = AVAILABLE_TITLES.find(t => t.id === rewardTitleId);
           if (!tpl) return;
           const already = updatedTitles.some(t => t.id === rewardTitleId);
           if (!already) {
             updatedTitles.push({ ...tpl, unlockedAt: new Date() });
              logActivity.titleEarned({
                heroId: hero.id,
                heroName: hero.name,
                heroClass: hero.class,
                heroLevel: hero.progression.level,
                titleEarned: tpl.name
              });
           }
         });

         // Desbloqueios adicionais com base em classe/nível/estatísticas
         const lvl = hero.progression.level;
         switch (hero.class) {
           case 'guerreiro':
             if (lvl >= 5 && !updatedTitles.some(t => t.id === 'campeao-de-ferro')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'campeao-de-ferro');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             if (lvl >= 10 && !updatedTitles.some(t => t.id === 'portador-da-lamina-sagrada')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'portador-da-lamina-sagrada');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             break;
           case 'mago':
             if (lvl >= 5 && !updatedTitles.some(t => t.id === 'teurgo-do-veu')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'teurgo-do-veu');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             if (lvl >= 10 && !updatedTitles.some(t => t.id === 'guardiao-dos-arcanos')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'guardiao-dos-arcanos');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             break;
           case 'arqueiro':
             if (lvl >= 5 && !updatedTitles.some(t => t.id === 'olho-de-falcao')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'olho-de-falcao');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             if (lvl >= 10 && !updatedTitles.some(t => t.id === 'cacador-das-sombras')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'cacador-das-sombras');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             break;
           case 'clerigo':
             if (lvl >= 5 && !updatedTitles.some(t => t.id === 'mao-da-luz')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'mao-da-luz');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             if (lvl >= 10 && !updatedTitles.some(t => t.id === 'protetor-das-almas')) {
               const tpl = AVAILABLE_TITLES.find(t => t.id === 'protetor-das-almas');
               if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
             }
             break;
           default:
             break;
         }

         // Estatísticas gerais: itens encontrados, combates, exploração
         if (hero.stats.itemsFound >= 50 && !updatedTitles.some(t => t.id === 'domador-da-fortuna')) {
           const tpl = AVAILABLE_TITLES.find(t => t.id === 'domador-da-fortuna');
           if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
         }
         if (hero.stats.totalCombats >= 50 && !updatedTitles.some(t => t.id === 'sombra-invicta')) {
           const tpl = AVAILABLE_TITLES.find(t => t.id === 'sombra-invicta');
           if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
         }
         if (hero.stats.questsCompleted >= 25 && !updatedTitles.some(t => t.id === 'explorador-do-desconhecido')) {
           const tpl = AVAILABLE_TITLES.find(t => t.id === 'explorador-do-desconhecido');
           if (tpl) updatedTitles.push({ ...tpl, unlockedAt: new Date() });
         }

         get().updateHero(hero.id, {
           achievements: updatedAchievements,
           titles: updatedTitles
         });
       },

       updateReputation: (factionName: string, change: number) => {
         const hero = get().getSelectedHero();
         if (!hero) return;

         const updated = updateHeroReputation(hero, factionName, change);
         // Usar o estado mais recente do herói ao mesclar progressão para evitar sobrescrever ouro/XP
         const latest = get().heroes.find(h => h.id === hero.id) || hero;
         get().updateHero(hero.id, {
           reputationFactions: updated.reputationFactions,
           progression: {
             ...latest.progression,
             reputation: (latest.progression?.reputation || 0) + change
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

         // Desbloqueios de títulos baseados em reputação
         const factions = hero.reputationFactions || [];
         const allRevered = factions.length > 0 && factions.every(f => f.level === 'revered');
         const anyHonored = factions.some(f => f.level === 'honored' || f.level === 'revered');
         const allHonoredOrBetter = factions.length > 0 && factions.every(f => f.level === 'honored' || f.level === 'revered');

         const toAdd: string[] = [];
         if (anyHonored && !hero.titles.some(t => t.id === 'heroi-local')) toAdd.push('heroi-local');
         if (allHonoredOrBetter && !hero.titles.some(t => t.id === 'guardiao-do-reino')) toAdd.push('guardiao-do-reino');
         if (allRevered && !hero.titles.some(t => t.id === 'legend')) toAdd.push('legend');

         if (toAdd.length) {
           const newTitles = toAdd
             .map(id => AVAILABLE_TITLES.find(t => t.id === id))
             .filter(Boolean)
             .map(tpl => ({ ...(tpl as any), unlockedAt: new Date() }));
           get().updateHero(hero.id, {
             titles: [...hero.titles, ...newTitles]
           });

            newTitles.forEach(tpl => {
              logActivity.titleEarned({
                heroId: hero.id,
                heroName: hero.name,
                heroClass: hero.class,
                heroLevel: hero.progression.level,
                titleEarned: (tpl as any).name
              });
            });
         }
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

          // Contagem antes da atualização para detectar novas conclusões
          const previouslyCompletedCount = activeGoals.filter(g => g.completed).length;

          // Update progress
          let updatedGoals = updateDailyGoalProgress(activeGoals, goalType, amount);

          // Check perfect day goal
          updatedGoals = checkPerfectDayGoal(updatedGoals);

          // Contagem após atualização
          const nowCompletedCount = updatedGoals.filter(g => g.completed).length;

          // Lógica de streak: se houve nova conclusão hoje e ainda não marcada hoje
          let updatedStats = { ...hero.stats };
          if (nowCompletedCount > previouslyCompletedCount) {
            const today = new Date();
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            const lastCompletionRaw = hero.stats?.lastDailyCompletion;
            const lastCompletion = lastCompletionRaw ? new Date(lastCompletionRaw as any) : undefined;
            const isSameDay = lastCompletion &&
              lastCompletion.getFullYear() === today.getFullYear() &&
              lastCompletion.getMonth() === today.getMonth() &&
              lastCompletion.getDate() === today.getDate();

            if (!isSameDay) {
              // Verifica se foi ontem para incrementar, caso contrário reinicia em 1
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const wasYesterday = lastCompletion &&
                lastCompletion.getFullYear() === yesterday.getFullYear() &&
                lastCompletion.getMonth() === yesterday.getMonth() &&
                lastCompletion.getDate() === yesterday.getDate();

              const currentStreak = updatedStats.dailyCompletionStreak || 0;
              updatedStats.dailyCompletionStreak = wasYesterday ? currentStreak + 1 : 1;
              updatedStats.lastDailyCompletion = today.toISOString();
            }
          }

          const updatedHeroes = [...state.heroes];
          updatedHeroes[heroIndex] = {
            ...hero,
            dailyGoals: updatedGoals,
            stats: updatedStats
          };

          return { ...state, heroes: updatedHeroes };
        });
      },

      // Alocar pontos de atributo ganhos por level-up
      allocateAttributePoints: (heroId: string, allocations: Partial<HeroAttributes>) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;

        const availablePoints = hero.attributePoints || 0;
        const increments = Object.entries(allocations)
          .filter(([_, inc]) => typeof inc === 'number' && (inc as number) > 0)
          .map(([key, inc]) => ({ key: key as keyof HeroAttributes, inc: inc as number }));

        const pointsToSpend = increments.reduce((sum, item) => sum + item.inc, 0);

        if (pointsToSpend <= 0) return false;
        if (pointsToSpend > availablePoints) return false;

        // Validar limites máximos por atributo
        const newAttributes = { ...hero.attributes };
        for (const { key, inc } of increments) {
          const current = newAttributes[key];
          const proposed = current + inc;
          if (proposed > ATTRIBUTE_CONSTRAINTS.MAX_ATTRIBUTE) {
            return false;
          }
          newAttributes[key] = proposed;
        }

        // Atualizar herói: atributos, pontos restantes e derivados
        const remainingPoints = Math.max(0, availablePoints - pointsToSpend);
        const derived = calculateDerivedAttributes(
          newAttributes,
          hero.class,
          hero.progression.level,
          hero.inventory,
          hero.activeTitle,
          computeCompanionBonus(hero)
        );

        get().updateHero(heroId, {
          attributes: newAttributes,
          attributePoints: remainingPoints,
          derivedAttributes: derived
        });

        // Métrica de uso de feature
        trackMetric.featureUsed(heroId, 'attribute-allocation');
        // Métrica específica de alocação
        const allocationsSummary = increments.reduce((acc, { key, inc }) => {
          acc[key as string] = inc;
          return acc;
        }, {} as Record<string, number>);
        trackMetric.attributePointsAllocated(heroId, {
          totalSpent: pointsToSpend,
          allocations: allocationsSummary
        });

        return true;
      },

      completeDailyGoal: (heroId: string, goalId: string) => {
        set((state) => {
          const heroIndex = state.heroes.findIndex(h => h.id === heroId);
          if (heroIndex === -1) return state;

          const hero = state.heroes[heroIndex];
          if (!hero.dailyGoals) return state;

          const goalIndex = hero.dailyGoals.findIndex(g => g.id === goalId);
          if (goalIndex === -1) return state;
          const goal = hero.dailyGoals[goalIndex];
          if (!goal || !goal.completed || goal.claimed) return state;

          // Give rewards
          const rewards = getDailyGoalRewards(goal);
          const updatedHero: Hero = {
            ...hero,
            progression: {
              ...hero.progression,
              xp: hero.progression.xp + rewards.xp,
              gold: hero.progression.gold + rewards.gold
            },
            dailyGoals: hero.dailyGoals.map((g, idx) => idx === goalIndex ? { ...g, claimed: true } : g)
          } as Hero;

          // Check for level up
          const newLevel = checkLevelUp(updatedHero.progression.xp, updatedHero.progression.level);
          if (newLevel > updatedHero.progression.level) {
            updatedHero.level = newLevel;
            updatedHero.progression.level = newLevel;
            updatedHero.derivedAttributes = calculateDerivedAttributes(
              updatedHero.attributes, 
              updatedHero.class, 
              newLevel,
              updatedHero.inventory,
              updatedHero.activeTitle,
              computeCompanionBonus(updatedHero)
            );
          }

          // Add items to inventory if any
          if (rewards.items) {
            rewards.items.forEach(item => {
              const currentQuantity = updatedHero.inventory.items[item.id] || 0;
              updatedHero.inventory.items[item.id] = currentQuantity + 1;
            });
          }

          // Atualizar streak de conclusão diária se todas metas ativas foram concluídas e coletadas
          const now = new Date();
          const activeGoals = removeExpiredGoals(updatedHero.dailyGoals || []);
          const allClaimed = activeGoals.length > 0 && activeGoals.every(g => g.completed && g.claimed);
          if (allClaimed) {
            const last = updatedHero.stats.lastDailyCompletion ? new Date(updatedHero.stats.lastDailyCompletion as any) : null;
            const todayStr = now.toDateString();
            const lastStr = last ? last.toDateString() : '';
            const currentStreak = updatedHero.stats.dailyCompletionStreak || 0;
            const newStreak = lastStr === todayStr ? currentStreak : currentStreak + 1;
            updatedHero.stats = {
              ...updatedHero.stats,
              dailyCompletionStreak: newStreak,
              lastDailyCompletion: now.toISOString()
            };
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
        
        // Verificar e inicializar rankData se não existir (migração)
        if (!hero.rankData) {
          const initializedRankData = rankSystem.initializeRankData(hero);
          get().updateHero(heroId, { rankData: initializedRankData });
          hero.rankData = initializedRankData;
        }
        
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
        
        // Verificar e inicializar rankData se não existir (migração)
        if (!hero.rankData) {
          const initializedRankData = rankSystem.initializeRankData(hero);
          get().updateHero(heroId, { rankData: initializedRankData });
          hero.rankData = initializedRankData;
        }
        
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
        
        const updatedCelebrations = [...(hero.rankData?.pendingCelebrations || [])];
        updatedCelebrations.splice(celebrationIndex, 1);
        
        get().updateHero(heroId, {
          rankData: {
            ...hero.rankData,
            pendingCelebrations: updatedCelebrations
          }
        });
      },
    }),
    {
      name: 'hero-forge-epic-storage',
      partialize: (state) => ({ 
        heroes: state.heroes,
        selectedHeroId: state.selectedHeroId,
        availableQuests: state.availableQuests,
        guilds: state.guilds,
        parties: state.parties,
        referralInvites: state.referralInvites
      }),
      migrate: (persistedState: any, _version: number) => {
        // Migração para garantir que heróis tenham as propriedades necessárias
        if (persistedState?.heroes) {
          persistedState.heroes = persistedState.heroes.map((hero: any) => {
            const migratedHero = {
              ...hero,
              reputationFactions: hero.reputationFactions || [
                { id: 'ordem', name: 'Ordem', reputation: 0, level: 'neutral' },
                { id: 'sombra', name: 'Sombra', reputation: 0, level: 'neutral' },
                { id: 'livre', name: 'Livre', reputation: 0, level: 'neutral' }
              ],
              dailyGoals: hero.dailyGoals || [],
              achievements: hero.achievements || [],
              stats: hero.stats || {
                questsCompleted: 0,
                totalCombats: 0,
                totalPlayTime: 0,
                lastActiveAt: new Date().toISOString(),
                enemiesDefeated: 0,
                goldEarned: 0,
                itemsFound: 0,
                achievementsUnlocked: 0,
                loginStreak: 0,
                lastLogin: new Date(),
                dailyCompletionStreak: 0
              }
            };
            
            // Inicializar rankData se não existir
            if (!hero.rankData) {
              migratedHero.rankData = rankSystem.initializeRankData(migratedHero);
            }

            // Garantir novos campos de progressão
            migratedHero.progression = {
              ...migratedHero.progression,
              glory: migratedHero.progression?.glory ?? 0,
              arcaneEssence: migratedHero.progression?.arcaneEssence ?? 0,
              fatigue: migratedHero.progression?.fatigue ?? 0
            };
            
            return migratedHero;
          });
        }
        // Garantir array de convites
        if (!persistedState?.referralInvites) {
          persistedState.referralInvites = [];
        }
        return persistedState;
      }
    }
  )
);
