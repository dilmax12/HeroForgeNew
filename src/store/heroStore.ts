import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Hero, HeroCreationData, HeroAttributes, DerivedAttributes, Quest, Achievement, Guild, CombatResult, Title } from '../types/hero';
import type { Party } from '../types/hero';
import type { HeroInventory } from '../types/hero';
import type { ReferralInvite } from '../types/hero';
import type { EnhancedQuestChoice } from '../types/hero';
import { generateQuestBoard, generateQuest, QUEST_ACHIEVEMENTS } from '../utils/quests';
import { resolveCombat, autoResolveCombat } from '../utils/combat';
import { purchaseItem, sellItem, equipItem, useConsumable, SHOP_ITEMS, ITEM_SETS, generateProceduralItem } from '../utils/shop';
import { Jewel } from '../types/jewel';
import type { JewelType } from '../types/jewel';
import { RECIPES } from '../utils/forging';
import { updateHeroReputation, generateReputationEvents, inferQuestFactionChanges } from '../utils/reputationSystem';
import { generateAllLeaderboards, getHeroRanking, calculateTotalScore } from '../utils/leaderboardSystem';
import { generateDailyGoals, updateDailyGoalProgress, checkPerfectDayGoal, removeExpiredGoals, getDailyGoalRewards } from '../utils/dailyGoalsSystem';
import { getTitleAttributeBonus, AVAILABLE_TITLES, TITLE_ACHIEVEMENTS, updateAchievementProgress as updateTitleAchievementProgress, checkTitleUnlock } from '../utils/titles';
import { onboardingManager } from '../utils/onboardingSystem';
import { eventManager } from '../utils/eventSystem';
import { logActivity } from '../utils/activitySystem';
import { trackMetric } from '../utils/metricsSystem';
import { supabase } from '../lib/supabaseClient';
import { saveHero, canPerformAction, performAction, consumeInnXpBuff } from '../services/heroesService';
import { notificationBus } from '../components/NotificationSystem';
import { rankSystem } from '../utils/rankSystem';
import { RANK_XP_BONUS_PERCENT } from '../types/ranks';
import { computeSynergyBonus } from '../utils/synergy';
import { getNewSkillsForLevel } from '../utils/skillSystem';
import { updateProgressDelta } from '../services/progressService';
import { worldStateManager } from '../utils/worldState';
import { runTick as runNPCTick, seedPersonality } from '../utils/npcAI';
import { updateOnSocial } from '../utils/relationshipSystem';
import { simulateDuel } from '../utils/duel';
import { playAmbient, playVoiceCue } from '../utils/audio';
import { getGameSettings, useGameSettingsStore } from './gameSettingsStore';
import { getMonetization } from './monetizationStore';
import { useProgressionStore } from './progressionStore';
import { generateMysteryEgg, identifyEgg as utilIdentifyEgg, incubateEgg, canHatch, markReadyToHatch, hatchPet, accelerateIncubation, EGG_IDENTIFY_COST, INCUBATION_MS, addPetXP } from '../utils/pets';
import { canCreateHero, purchaseSlot, getCapacity, getUsed, getNextSlotPrice } from '../services/heroSlots';
import { ATTRIBUTE_CONSTRAINTS, getMaxAttributeForRank, getTotalAttributePointsCapForRank } from '../utils/attributeSystem';
import { ATTRIBUTE_POINTS_PER_LEVEL, checkLevelUp } from '../utils/progression';

interface HeroState {
  heroes: Hero[];
  selectedHeroId: string | null;
  availableQuests: Quest[];
  questCatalog: Record<string, Quest>;
  guilds: Guild[];
  parties: Party[];
  referralInvites: ReferralInvite[];
  dmOverrideLine?: string;
  duelOverlay?: any;
  npcInteractionOverlay?: any;
  activitiesLog: Array<{ ts: string; type: 'dialogue' | 'rumor' | 'tip' | 'event'; location?: 'tavern' | 'guild'; npcId?: string; text: string; importance?: 'low' | 'normal' | 'high' }>;
  lastAutoInteractionAt?: string;
  dedupeNPCs: () => { checked: number; removed: number };
  staminaModal?: { required: number; actionType: string; message?: string };
  setStaminaModal: (modal?: { required: number; actionType: string; message?: string }) => void;
  // Mascotes e Ovos
  generateEggForSelected: (rarity?: import('../types/hero').EggRarity) => boolean;
  identifyEggForSelected: (eggId: string) => boolean;
  startIncubationForSelected: (eggId: string, slotIndex?: number) => boolean;
  accelerateIncubationForSelected: (eggId: string, method: 'essencia' | 'brasas' | 'ouro', value?: number) => boolean;
  updateIncubationTick: () => void;
  hatchEggForSelected: (eggId: string) => boolean;
  consumeInventoryItem: (heroId: string, itemId: string, qty?: number) => boolean;
  addPetXPForSelected: (petId: string, xp: number) => boolean;
  sellPetForSelected: (petId: string) => boolean;
  
  // === AÇÕES BÁSICAS ===
  createHero: (heroData: HeroCreationData) => Hero;
  purchaseHeroSlotForSelected: () => boolean;
  updateHero: (id: string, heroData: Partial<Hero>) => void;
  deleteHero: (id: string) => void;
  selectHero: (id: string | null) => void;
  exportHeroJson: (id: string) => string;
  importHero: (hero: Hero, selectAfter?: boolean) => boolean;
  
  // === SISTEMA DE MISSÕES ===
  refreshQuests: (heroLevel?: number) => void;
  acceptQuest: (heroId: string, questId: string) => Promise<boolean>;
  completeQuest: (heroId: string, questId: string, autoResolve?: boolean) => CombatResult | null;
  abandonQuest: (heroId: string, questId: string) => boolean;
  clearActiveQuests: (heroId: string) => boolean;
  
  // === SISTEMA DE PROGRESSÃO ===
  gainXP: (heroId: string, xp: number) => void;
  gainGold: (heroId: string, gold: number) => void;
  gainGlory: (heroId: string, glory: number) => void;
  gainArcaneEssence: (heroId: string, essence: number) => void;
  addItemToInventory: (heroId: string, itemId: string, quantity?: number) => void;
  checkAchievements: (heroId: string) => Achievement[];
  // Pontos de atributo
  allocateAttributePoints: (heroId: string, allocations: Partial<HeroAttributes>) => boolean;

  // === SISTEMA DE COMPANHEIROS ===
  setActivePet: (petId?: string) => void;
  setActiveMount: (mountId?: string) => void;
  setFavoriteMount: (mountId?: string) => void;
  toggleFavoriteMount: (mountId: string) => void;

  // Joias
  addJewel: (heroId: string, tipo: JewelType, nivel: number, qty?: number) => boolean;
  socketJewel: (heroId: string, itemId: string, jewelKey: string) => boolean;
  removeJewel: (heroId: string, itemId: string, socketIndex: number) => boolean;
  fuseJewels: (heroId: string, jewelKey: string) => boolean;
  toggleLockMount: (mountId: string) => boolean;
  generateMountForSelected: (type?: import('../types/hero').Mount['type'], rarity?: import('../types/hero').MountRarity) => boolean;
  renameMountForSelected: (mountId: string, newName: string) => boolean;
  setMountNoteForSelected: (mountId: string, note: string) => boolean;
  buyMountOffer: (heroId: string, type: import('../types/hero').Mount['type'], rarity: import('../types/hero').MountRarity, price: number) => boolean;
  trainMountForSelected: (costGold?: number, bonusSpeed?: number, minutes?: number) => Promise<boolean>;
  importMountsForSelected: (json: string) => boolean;
  releaseCommonMounts: () => boolean;
  addMountToSelected: (mount: import('../types/hero').Mount) => boolean;
  evolveMountForSelected: (mountId: string) => boolean;
  refineCompanion: (heroId: string, kind: 'pet' | 'mount', id: string) => boolean;
  refinePetForSelected: (petId: string) => boolean;
  refineMountForSelected: (mountId: string) => boolean;
  suggestCompanionQuestForSelected: () => boolean;
  
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
  getQuestById: (id: string) => Quest | undefined;


  // === SISTEMA DE CONVITES ===
  createReferralInvite: (inviterHeroId: string) => ReferralInvite | null;
  getReferralInvitesForHero: (heroId: string) => ReferralInvite[];
  acceptReferralInvite: (code: string, newHeroId: string) => boolean;
  revokeReferralInvite: (inviteId: string) => boolean;
  expireOldInvites: () => void;
  getReferralStatsForHero: (heroId: string) => { total: number; pending: number; accepted: number; expired: number; rewardsGranted: number };
  logReferralActivity: (inviteId: string, action: 'shared' | 'revoked' | 'expired' | 'accepted', details?: string) => void;
  updateReferralInvite: (inviteId: string, updates: Partial<Pick<ReferralInvite, 'inviterTag' | 'personalizedSlug' | 'expiresAt'>>) => boolean;
  renewReferralInvite: (inviteId: string, extraDays?: number) => boolean;
  getReferralInviteByCode: (code: string) => ReferralInvite | undefined;

  // === NARRATIVA ===
  setDMOverrideLine: (line?: string) => void;
  appendJourneyNarrativeForSelected: (summary: string, title?: string) => boolean;

  createNPCAdventurer: (overrides?: Partial<HeroCreationData & { name: string }>) => Hero;
  ensureNPCAdventurersSeedExists: (targetCount?: number) => void;
  startNPCSimulation: () => void;
  stopNPCSimulation: () => void;
  seedRandomHatred: (count?: number) => void;
  getDuelInvitesForHero: (heroId: string) => { npcId: string; type: 'treino' | 'honra' | 'recompensas'; expiresAt: string; levelDiff: number }[];
  acceptDuelInvite: (heroId: string, npcId: string) => boolean;
  declineDuelInvite: (heroId: string, npcId: string) => boolean;
  setDuelOverlay: (overlay?: any) => void;
  setNPCInteractionOverlay: (overlay?: any) => void;
  respondToNPCInteraction: (choice: 'accept' | 'decline' | 'later') => Promise<void>;
  setPartyInviteTerms: (partyId: string, targetHeroId: string, terms: { duration: 'one_mission' | 'days'; days?: number; rewardShare?: number; leaderPref?: 'inviter' | 'invitee' | 'none' }) => void;
  recordActivity: (entry: { type: 'dialogue' | 'rumor' | 'tip' | 'event'; location?: 'tavern' | 'guild'; npcId?: string; text: string; importance?: 'low' | 'normal' | 'high' }) => void;
  triggerAutoInteraction: (location: 'tavern' | 'guild') => void;
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
    inventory.equippedMainHand,
    inventory.equippedOffHand,
    inventory.equippedHelm,
    inventory.equippedChest,
    inventory.equippedBelt,
    inventory.equippedGloves,
    inventory.equippedBoots,
    inventory.equippedCape,
    inventory.equippedRingLeft,
    inventory.equippedRingRight,
    inventory.equippedNecklace,
    inventory.equippedEarringLeft,
    inventory.equippedEarringRight,
    ...(Array.isArray(inventory.equippedWeapons) ? inventory.equippedWeapons : [inventory.equippedWeapon].filter(Boolean) as string[]),
    ...(Array.isArray(inventory.equippedArmorSlots) ? inventory.equippedArmorSlots : [inventory.equippedArmor].filter(Boolean) as string[]),
    ...(Array.isArray(inventory.equippedAccessories) ? inventory.equippedAccessories : [inventory.equippedAccessory].filter(Boolean) as string[])
  ].filter(Boolean);
  
  equippedItems.forEach(itemId => {
    const item = SHOP_ITEMS.find(i => i.id === itemId) || (inventory.customItems ? inventory.customItems[itemId!] : undefined);
    const upgradeLevel = inventory.upgrades?.[itemId!] ?? 0;
    if (item?.bonus) {
      Object.entries(item.bonus).forEach(([attr, bonus]) => {
        if (!bonus) return;
        const multiplier = 1 + Math.max(0, upgradeLevel) * 0.1;
        const adjusted = Math.round((bonus as number) * multiplier);
        const key = (attr === 'sabedoria') ? 'inteligencia' : (attr === 'carisma') ? 'destreza' : attr;
        if ((key as keyof HeroAttributes) in totalAttributes) {
          totalAttributes[key as keyof HeroAttributes] += adjusted;
        }
      });
    }
    const jewels = (inventory.equippedJewelsByItemId || {})[itemId!];
    if (Array.isArray(jewels) && jewels.length > 0) {
      const cap = item?.type === 'weapon' ? 10 : item?.type === 'armor' ? 15 : item?.type === 'accessory' ? 8 : 0;
      let attrAdds: Partial<HeroAttributes> = {};
      let sum = 0;
      jewels.forEach(jk => {
        const parts = jk.split(':');
        if (parts.length === 3) {
          const tipo = parts[1] as import('../types/jewel').JewelType;
          const nivel = Number(parts[2]);
          const j = new Jewel(crypto.randomUUID(), tipo, nivel);
          const b = j.getBonus();
          if (b.forca) { attrAdds.forca = (attrAdds.forca || 0) + b.forca; sum += b.forca; }
          if (b.inteligencia) { attrAdds.inteligencia = (attrAdds.inteligencia || 0) + b.inteligencia; sum += b.inteligencia; }
          if (b.destreza) { attrAdds.destreza = (attrAdds.destreza || 0) + b.destreza; sum += b.destreza; }
          if (b.constituicao) { attrAdds.constituicao = (attrAdds.constituicao || 0) + b.constituicao; sum += b.constituicao; }
        }
      });
      const scale = cap > 0 && sum > cap ? (cap / sum) : 1;
      Object.entries(attrAdds).forEach(([attr, val]) => {
        if (!val) return;
        const key = (attr === 'sabedoria') ? 'inteligencia' : (attr === 'carisma') ? 'destreza' : attr;
        if ((key as keyof HeroAttributes) in totalAttributes) {
          const add = Math.max(0, Math.floor((val as number) * scale));
          totalAttributes[key as keyof HeroAttributes] += add;
        }
      });
    }
  });

  // Aplicar bônus de conjunto (arma + armadura + acessório do mesmo conjunto)
  const weaponSetIds = ([inventory.equippedMainHand, inventory.equippedOffHand] as (string | undefined)[])
    .filter(Boolean)
    .map((id) => {
      const base = id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
      const custom = id && inventory.customItems ? inventory.customItems[id] : undefined;
      return (base || custom)?.setId;
    })
    .filter((sid): sid is string => !!sid);
  const armorSetIds = ([inventory.equippedHelm, inventory.equippedChest, inventory.equippedBelt, inventory.equippedGloves, inventory.equippedBoots, inventory.equippedCape] as (string | undefined)[])
    .filter(Boolean)
    .map((id) => {
      const base = id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
      const custom = id && inventory.customItems ? inventory.customItems[id] : undefined;
      return (base || custom)?.setId;
    })
    .filter((sid): sid is string => !!sid);
  const accessorySetIds = ([inventory.equippedRingLeft, inventory.equippedRingRight, inventory.equippedNecklace, inventory.equippedEarringLeft, inventory.equippedEarringRight] as (string | undefined)[])
    .filter(Boolean)
    .map((id) => {
      const base = id ? SHOP_ITEMS.find(i => i.id === id) : undefined;
      const custom = id && inventory.customItems ? inventory.customItems[id] : undefined;
      return (base || custom)?.setId;
    })
    .filter((sid): sid is string => !!sid);

  for (const w of weaponSetIds) {
    if (armorSetIds.includes(w) && accessorySetIds.includes(w)) {
      const activeSet = ITEM_SETS[w];
      if (activeSet?.bonus) {
        Object.entries(activeSet.bonus).forEach(([attr, bonus]) => {
          if (!bonus) return;
          const key = (attr === 'sabedoria') ? 'inteligencia' : (attr === 'carisma') ? 'destreza' : attr;
          if ((key as keyof HeroAttributes) in totalAttributes) {
            totalAttributes[key as keyof HeroAttributes] += bonus as number;
          }
        });
      }
      break;
    }
  }
  
  return totalAttributes;
};

export const calculateDerivedAttributes = (
  attributes: HeroAttributes,
  heroClass: string,
  level: number,
  inventory?: HeroInventory,
  activeTitleId?: string,
  companionBonus?: Partial<HeroAttributes>
): DerivedAttributes => {
  const keyParts = [
    heroClass,
    String(level),
    JSON.stringify(attributes),
    inventory ? JSON.stringify({
      ew: [inventory.equippedMainHand, inventory.equippedOffHand, ...(Array.isArray(inventory.equippedWeapons) ? inventory.equippedWeapons : [])].filter(Boolean).join(','),
      ea: [inventory.equippedHelm, inventory.equippedChest, inventory.equippedBelt, inventory.equippedGloves, inventory.equippedBoots, inventory.equippedCape, ...(Array.isArray(inventory.equippedArmorSlots) ? inventory.equippedArmorSlots : [])].filter(Boolean).join(','),
      ex: [inventory.equippedRingLeft, inventory.equippedRingRight, inventory.equippedNecklace, inventory.equippedEarringLeft, inventory.equippedEarringRight, ...(Array.isArray(inventory.equippedAccessories) ? inventory.equippedAccessories : [])].filter(Boolean).join(','),
      ic: Object.keys(inventory.items || {}).length
    }) : 'noinv',
    activeTitleId || '',
    companionBonus ? JSON.stringify(companionBonus) : 'nocomp'
  ];
  const cacheKey = keyParts.join('|');
  const selfAny = calculateDerivedAttributes as unknown as { _cache?: Map<string, DerivedAttributes> };
  if (!selfAny._cache) selfAny._cache = new Map<string, DerivedAttributes>();
  const cached = selfAny._cache.get(cacheKey);
  if (cached) return cached;
  // Calcular atributos totais incluindo bônus de equipamentos
  const baseTotal = inventory ? calculateTotalAttributes(attributes, inventory) : attributes;
  const titleBonus = getTitleAttributeBonus(activeTitleId);
  const totalAttributes: HeroAttributes = { ...baseTotal } as HeroAttributes;
  Object.entries(titleBonus).forEach(([attr, bonus]) => {
    if (!bonus) return;
    const key = (attr === 'sabedoria') ? 'inteligencia' : (attr === 'carisma') ? 'destreza' : attr;
    if ((key as keyof HeroAttributes) in totalAttributes) {
      totalAttributes[key as keyof HeroAttributes] += bonus as number;
    }
  });
  if (companionBonus) {
    Object.entries(companionBonus).forEach(([attr, bonus]) => {
      if (!bonus) return;
      const key = (attr === 'sabedoria') ? 'inteligencia' : (attr === 'carisma') ? 'destreza' : attr;
      if ((key as keyof HeroAttributes) in totalAttributes) {
        totalAttributes[key as keyof HeroAttributes] += bonus as number;
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
  let armorClass = 10 + Math.floor(totalAttributes.destreza / 4);
  if (inventory) {
    const eq = inventory.equippedJewelsByItemId || {};
    let acBonus = 0;
    Object.entries(eq).forEach(([itemId, list]) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId) || (inventory.customItems ? inventory.customItems[itemId] : undefined);
      const cap = item?.type === 'armor' ? 6 : item?.type === 'weapon' ? 2 : item?.type === 'accessory' ? 2 : 0;
      let acc = 0;
      list.forEach(jk => {
        const parts = jk.split(':');
        if (parts.length === 3) {
          const tipo = parts[1] as import('../types/jewel').JewelType;
          const nivel = Number(parts[2]);
          const j = new Jewel(crypto.randomUUID(), tipo, nivel);
          const b = j.getBonus();
          if (b.armorClass) acc += b.armorClass;
        }
      });
      acBonus += Math.min(cap, acc);
    });
    armorClass += Math.max(0, Math.floor(acBonus));
  }
  const luck = Math.max(0, Math.floor((totalAttributes.destreza + totalAttributes.inteligencia) / 2));
  const mountSpeed = (() => {
    try {
      const hero = get().getSelectedHero();
      if (hero?.activeMountId && Array.isArray(hero.mounts)) {
        const m = hero.mounts.find(mm => mm.id === hero.activeMountId);
        const base = Math.max(0, m?.speedBonus || 0);
        const buff = (() => {
          const mb = hero.mountBuff;
          if (!mb?.speedBonus) return 0;
          if (mb.expiresAt && Date.now() > new Date(mb.expiresAt).getTime()) return 0;
          return Math.max(0, mb.speedBonus || 0);
        })();
        return base + buff;
      }
    } catch {}
    return 0;
  })();
  const finalInitiative = initiative + mountSpeed;
  const attackBase = Math.max(0, (totalAttributes.forca || 0) + (totalAttributes.destreza || 0));
  const magicBase = Math.max(0, (totalAttributes.inteligencia || 0));
  const defenseBase = Math.max(0, (totalAttributes.constituicao || 0) + Math.floor(armorClass / 2));
  let wa = 1, wm = 1, wd = 1;
  switch (heroClass) {
    case 'guerreiro':
    case 'barbaro':
    case 'lanceiro':
    case 'paladino':
      wa = 1.4; wm = 0.8; wd = 1.2; break;
    case 'mago':
    case 'feiticeiro':
    case 'druida':
      wa = 0.8; wm = 1.5; wd = 1.0; break;
    case 'ladino':
    case 'assassino':
    case 'arqueiro':
    case 'patrulheiro':
    case 'monge':
      wa = 1.3; wm = 0.9; wd = 1.0; break;
    case 'clerigo':
    case 'bardo':
      wa = 1.0; wm = 1.2; wd = 1.1; break;
    default:
      wa = 1.1; wm = 1.1; wd = 1.0; break;
  }
  const power = Math.max(0, Math.round(
    wa * attackBase +
    wm * magicBase +
    wd * defenseBase +
    hp * 0.2 +
    mp * 0.2 +
    finalInitiative * 0.5 +
    armorClass * 0.5 +
    (luck || 0) * 0.3 +
    level * 2
  ));
  
  const result: DerivedAttributes = {
    hp,
    mp,
    initiative: finalInitiative,
    armorClass,
    currentHp: hp,
    currentMp: mp,
    luck,
    power
  };
  selfAny._cache.set(cacheKey, result);
  if (selfAny._cache.size > 200) {
    const first = selfAny._cache.keys().next().value as string | undefined;
    if (first) selfAny._cache.delete(first);
  }
  return result;
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
      const mastery = Math.max(0, m.mastery || 0);
      const masteryBonus = Math.floor(mastery / 10);
      if (masteryBonus > 0) {
        const agileTypes = ['grifo','hipogrifo','felino','wyvern','cavalo','lagarto','cervo','alce'];
        const strongTypes = ['lobo','urso','rinoceronte','javali'];
        if (agileTypes.includes(m.type)) {
          bonus['destreza'] = (bonus['destreza'] || 0) + masteryBonus;
        } else if (strongTypes.includes(m.type)) {
          bonus['forca'] = (bonus['forca'] || 0) + masteryBonus;
        } else if (m.type === 'draconiano') {
          bonus['inteligencia'] = (bonus['inteligencia'] || 0) + masteryBonus;
        }
      }
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
      questCatalog: {},
      guilds: [],
      parties: [],
      referralInvites: [],
      staminaModal: undefined,
      
      dmOverrideLine: undefined,
      
      // === AÇÕES BÁSICAS ===
      
      createHero: (heroData: HeroCreationData) => {
        const timestamp = new Date().toISOString();
        const heroesNow = get().heroes.filter(h => h.origin !== 'npc');
        if (!canCreateHero(heroesNow)) {
          try { notificationBus.emit({ type: 'quest', title: 'Limite de heróis', message: `Slots usados ${getUsed(heroesNow)}/${getCapacity(heroesNow)}. Compre ou desbloqueie mais slots.`, icon: '⚠️', duration: 3500 }); } catch {}
          throw new Error('Limite de criação atingido');
        }
        
        const validation = validateAttributes(heroData.attributes);
        if (!validation.isValid) {
          throw new Error(`Atributos inválidos: ${validation.errors.join(', ')}`);
        }
        
        const initialInventory = {
          items: {
            'pocao-pequena': 2,
            'espada-aprendiz': 1,
            'armadura-novato': 1,
            'capacete-ferro': 1,
            'cinto-couro': 1,
            'luvas-couro': 1,
            'botas-caminhante': 1,
            'capa-iniciante': 1,
            'anel-bronze': 1,
            'anel-vitalidade': 1,
            'colar-madeira': 1
          },
          equippedMainHand: 'espada-aprendiz',
          equippedOffHand: undefined,
          equippedHelm: 'capacete-ferro',
          equippedChest: 'armadura-novato',
          equippedBelt: 'cinto-couro',
          equippedGloves: 'luvas-couro',
          equippedBoots: 'botas-caminhante',
          equippedCape: 'capa-iniciante',
          equippedRingLeft: 'anel-bronze',
          equippedRingRight: 'anel-vitalidade',
          equippedNecklace: 'colar-madeira',
          equippedEarringLeft: undefined,
          equippedEarringRight: undefined,
          upgrades: {}
          ,jewels: {
            'jewel:vermelha:1': 2,
            'jewel:azul:1': 2,
            'jewel:verde:1': 2,
            'jewel:amarela:1': 2,
            'jewel:roxa:1': 2
          }
          ,equippedJewelsByItemId: {}
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
            { id: 'guarda', name: 'Guarda da Cidade', reputation: 0, level: 'neutral' },
            { id: 'ladroes', name: 'Ladrões', reputation: 0, level: 'neutral' },
            { id: 'clero', name: 'Clero', reputation: 0, level: 'neutral' },
            { id: 'cultistas', name: 'Cultistas', reputation: 0, level: 'neutral' },
            { id: 'comerciantes', name: 'Comerciantes', reputation: 0, level: 'neutral' },
            { id: 'exploradores', name: 'Exploradores', reputation: 0, level: 'neutral' }
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
            trainingDailyLimit: 10,
            trainingAttemptsByStatus: {}
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
        newHero.dungeon = {
          stamina: { current: 50, max: 50, lastRecovery: timestamp, recoveryRate: 5 },
          maxFloor: 0,
          eternalBuffs: [],
          rareItemBonusPercent: 0,
          specialSkills: [],
          permanentBonusAttributes: {}
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
        try { onboardingManager.markStepValidated('create-hero'); } catch {}
        try { onboardingManager.saveState(); } catch {}
        
        return newHero;
      },

      purchaseHeroSlotForSelected: () => {
        const sel = get().getSelectedHero();
        if (!sel) return false;
        const spend = (amount: number) => {
          const prog = { ...(sel.progression || {}) } as any;
          const cur = Math.max(0, prog.gold || 0);
          if (cur < amount) return false;
          prog.gold = cur - amount;
          get().updateHero(sel.id, { progression: prog } as any);
          return true;
        };
        const ok = purchaseSlot(spend);
        if (ok) {
          try { notificationBus.emit({ type: 'achievement', title: 'Slot comprado', message: `Novo slot de herói desbloqueado. Agora: ${getUsed(get().heroes.filter(h=>h.origin!=='npc'))}/${getCapacity(get().heroes.filter(h=>h.origin!=='npc'))}.`, icon: '⭐', duration: 3500 }); } catch {}
        } else {
          try { notificationBus.emit({ type: 'item', title: 'Compra falhou', message: `Preço atual: ${getNextSlotPrice()} ouro`, icon: '🪙', duration: 3000 }); } catch {}
        }
        return ok;
      },

      createNPCAdventurer: (overrides) => {
        const races: import('../types/hero').HeroRace[] = ['humano','elfo','anao','orc','halfling'];
        const classes: import('../types/hero').HeroClass[] = ['guerreiro','mago','ladino','clerigo','patrulheiro','paladino','arqueiro','bardo','monge','assassino','barbaro','lanceiro','druida','feiticeiro'];
        const elements: import('../types/hero').Element[] = ['fire','water','earth','air','thunder','light','dark','physical'];
        const names = ['Alenna','Borin','Calyra','Darius','Eldric','Fiora','Garruk','Hellan','Ilyon','Jorvik','Kaelis','Lyra','Morth','Nerion','Orla','Peren','Quen','Ragna','Sylas','Thorin'];
        const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random()*arr.length)];
        let attrs: HeroAttributes = { forca: 3, destreza: 3, constituicao: 3, inteligencia: 3, sabedoria: 3, carisma: 3 };
        if (overrides?.attributes) {
          attrs = { ...attrs, ...overrides.attributes } as HeroAttributes;
        }
        const heroData: HeroCreationData = {
          name: overrides?.name || pick(names),
          race: overrides?.race || pick(races),
          class: overrides?.class || pick(classes),
          attributes: attrs,
          element: overrides?.element || pick(elements),
          skills: overrides?.skills || []
        } as HeroCreationData;
        const h = get().createHero(heroData);
        seedPersonality(h);
        const player = get().getSelectedHero();
        const pers = h.npcPersonality || { archetype: 'explorador', traits: [], chatStyle: 'amigavel' };
        let baseRel = Math.floor(-20 + Math.random() * 40);
        if ((pers.traits || []).includes('generoso') || pers.chatStyle === 'amigavel') baseRel += 8;
        if ((pers.traits || []).includes('desconfiado') || pers.archetype === 'competitivo') baseRel -= 12;
        baseRel = Math.max(-60, Math.min(25, baseRel));
        const initialRelations = player && player.origin !== 'npc' ? { [player.id]: baseRel } : {};
        get().updateHero(h.id, { origin: 'npc', controlledByAI: true, npcPersonality: h.npcPersonality, npcRoutine: h.npcRoutine, npcMemory: h.npcMemory, socialRelations: initialRelations });
        return get().heroes.find(x => x.id === h.id)!;
      },

      ensureNPCAdventurersSeedExists: (targetCount = 5) => {
        const current = get().heroes.filter(h => h.origin === 'npc').length;
        const needed = Math.max(0, targetCount - current);
        for (let i = 0; i < needed; i++) { get().createNPCAdventurer({}); }
        try { get().dedupeNPCs(); } catch {}
      },
      seedRandomHatred: (count = 3) => {
        const player = get().getSelectedHero();
        if (!player) return;
        get().ensureNPCAdventurersSeedExists(Math.max(count, 5));
        const npcs = get().heroes.filter(h => h.origin === 'npc');
        if (npcs.length === 0) return;
        const pickCount = Math.min(count, npcs.length);
        const pool = npcs.slice();
        const chosen: typeof npcs = [];
        for (let i = 0; i < pickCount; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          chosen.push(pool.splice(idx, 1)[0]);
        }
        const ws = player.worldState || require('../utils/worldState').worldStateManager.initializeWorldState();
        ws.npcStatus = ws.npcStatus || {} as any;
        chosen.forEach(npc => {
          const relMap = { ...(npc.socialRelations || {}) } as Record<string, number>;
          const val = Math.max(-100, Math.min(-60, -60 - Math.floor(Math.random() * 40))); // -60 .. -100
          relMap[player.id] = val;
          npc.socialRelations = relMap;
          try { get().updateHero(npc.id, { socialRelations: relMap, npcMood: 'irritado' } as any); } catch {}
          (ws.npcStatus as any)[npc.id] = {
            alive: true,
            relationToPlayer: val,
            lastInteraction: new Date().toISOString(),
            currentLocation: 'taverna'
          };
        });
        try { get().updateHero(player.id, { worldState: ws } as any); } catch {}
        try { notificationBus.emit({ type: 'quest', title: 'Rivalidades', message: `${chosen.length} NPC(s) agora te odeiam`, icon: '⚠️', duration: 2500 }); } catch {}
      },
      startNPCSimulation: () => {
        const anySelf = useHeroStore as unknown as { _npcTimer?: any };
        if (anySelf._npcTimer) return;
        const tick = () => {
          const player = get().getSelectedHero();
          const npcs = get().heroes.filter(h => h.origin === 'npc');
          runNPCTick(player, npcs, (n) => notificationBus.emit(n));
          playAmbient(0.02);
          if (Math.random() < 0.4) playVoiceCue(420 + Math.floor(Math.random()*80), 180);
          npcs.forEach(n => {
            const compBonus = computeCompanionBonus(n);
            const derived = calculateDerivedAttributes(n.attributes, n.class, n.progression.level, n.inventory, n.activeTitle, compBonus);
            get().updateHero(n.id, { attributes: n.attributes, progression: n.progression, stats: n.stats, completedQuests: n.completedQuests, derivedAttributes: derived, socialRelations: n.socialRelations, npcMemory: n.npcMemory });
          });
          if (player) {
          }
          const heroes = get().heroes;
          const lbs = generateAllLeaderboards(heroes);
          trackMetric.custom?.('npc_tick', { npcs: npcs.length, ts: Date.now() });
        };
        anySelf._npcTimer = setInterval(tick, 30000);
      },
      stopNPCSimulation: () => {
        const anySelf = useHeroStore as unknown as { _npcTimer?: any };
        if (anySelf._npcTimer) {
          clearInterval(anySelf._npcTimer);
          anySelf._npcTimer = undefined;
        }
      },

      setDuelOverlay: (overlay) => {
        set({ duelOverlay: overlay });
      },
      setNPCInteractionOverlay: (overlay) => {
        set({ npcInteractionOverlay: overlay });
      },
      setStaminaModal: (modal) => {
        set({ staminaModal: modal });
      },
      respondToNPCInteraction: async (choice) => {
        const overlay = get().npcInteractionOverlay;
        if (!overlay) return;
        const player = get().getSelectedHero();
        const npc = get().heroes.find(h => h.id === overlay.npcId);
        if (!player || !npc) { set({ npcInteractionOverlay: undefined }); return; }
        if (choice === 'accept') {
          try {
            const check = await canPerformAction(player.id, 'SOCIAL_DEEP');
            if (!check.ok) {
            try { notificationBus.emit({ type: 'stamina', title: 'Fadiga alta', message: `Interação profunda requer ${check.cost} ⚡. Descanse para reduzir fadiga.`, duration: 2500, icon: '💤' }); } catch {}
              set({ npcInteractionOverlay: undefined });
              set({ staminaModal: { required: check.cost, actionType: 'SOCIAL_DEEP' } });
              return;
            }
            const perf = await performAction(player.id, 'SOCIAL_DEEP', { npcId: npc.id });
            const st = player.stamina || { current: 100, max: 100 } as any;
            get().updateHero(player.id, { stamina: { ...st, current: perf.newStamina } });
          } catch {}
        }
        let mood: 'amigável' | 'neutro' | 'hostil' = 'neutro';
        if (choice === 'accept') mood = 'amigável';
        else if (choice === 'decline') mood = 'hostil';
        const res = updateOnSocial(npc, player, mood);
        notificationBus.emit({ type: choice === 'accept' ? 'achievement' : 'stamina', title: 'Interação com NPC', message: `${npc.name}: ${choice === 'accept' ? 'Agradeço!' : choice === 'decline' ? 'Talvez outra hora...' : 'Certo, conversamos depois.'}`, icon: '💬', duration: 2500 });
        set({ npcInteractionOverlay: undefined });
      },
      recordActivity: (entry) => {
        const s = get();
        const now = new Date().toISOString();
        const newLog = [{ ts: now, ...entry }, ...s.activitiesLog].slice(0, 500);
        set({ activitiesLog: newLog });
        try {
          const gs = require('../store/gameSettingsStore').getGameSettings();
          const mode = gs.notifPriorityMode || 'important_first';
          const freq = gs.notifFrequency || 'normal';
          const shouldShow = entry.importance === 'high' || mode === 'normal';
          if (shouldShow) {
            const icon = entry.type === 'dialogue' ? '💬' : entry.type === 'rumor' ? '🗣️' : entry.type === 'tip' ? '📜' : '⭐';
            notificationBus.emit({ type: 'quest', title: 'Atividade', message: entry.text, icon, duration: freq === 'low' ? 2000 : freq === 'high' ? 4000 : 3000 });
            const gsSound = gs.notifSoundEnabled ?? true;
            if (gsSound) {
              const audio = require('../utils/audio');
              audio.playVoiceCue(430 + Math.floor(Math.random()*60), 180);
            }
          }
        } catch {}
      },
      triggerAutoInteraction: (location) => {
        try {
          const gs = require('../store/gameSettingsStore').getGameSettings();
          if (!gs.autoInteractionEnabled) return;
          const min = Math.max(0, gs.autoChanceMinPercent ?? 30);
          const max = Math.max(min, gs.autoChanceMaxPercent ?? 70);
          const chance = (min + Math.random() * (max - min)) / 100;
          const lastIso = get().lastAutoInteractionAt;
          const cooldownMin = gs.interactionsCooldownMinutes ?? Math.round((gs.npcInteractionCooldownSeconds ?? 900)/60);
          const okCooldown = !lastIso || ((Date.now() - new Date(lastIso).getTime()) / 60000) >= cooldownMin;
          if (!okCooldown) return;
          if (Math.random() < chance) {
            const player = get().getSelectedHero();
            const npc = get().heroes.find(h => h.origin === 'npc');
            if (!player || !npc) return;
            const dlg = require('../utils/dialogueEngine');
            const lines = dlg.generateMixed(npc, player, 2);
            set({ npcInteractionOverlay: { npcId: npc.id, npcName: npc.name, lines }, lastAutoInteractionAt: new Date().toISOString() });
            get().recordActivity({ type: 'dialogue', location, npcId: npc.id, text: `${npc.name}: ${lines[0]}`, importance: 'normal' });
          }
        } catch {}
      },
      dedupeNPCs: () => {
        const state = get();
        const npcs = state.heroes.filter(h => h.origin === 'npc');
        const keyOf = (h: Hero) => `${(h.name || '').toLowerCase()}::${(h.class || '')}`;
        const groups = new Map<string, Hero[]>();
        npcs.forEach(h => {
          const k = keyOf(h);
          const arr = groups.get(k) || [];
          arr.push(h);
          groups.set(k, arr);
        });
        let removed = 0;
        const toRemoveIds: string[] = [];
        const replacements: Record<string, Hero> = {};
        groups.forEach((arr, k) => {
          if (arr.length <= 1) return;
          // Choose primary by highest level/xp
          const primary = arr.slice().sort((a,b) => (b.progression?.level||0)-(a.progression?.level||0) || (b.progression?.xp||0)-(a.progression?.xp||0))[0];
          const others = arr.filter(h => h.id !== primary.id);
          const merged: Hero = { ...primary } as Hero;
          others.forEach(o => {
            merged.progression = {
              ...merged.progression,
              xp: Math.max(merged.progression?.xp || 0, o.progression?.xp || 0),
              gold: Math.max(merged.progression?.gold || 0, o.progression?.gold || 0),
              level: Math.max(merged.progression?.level || 1, o.progression?.level || 1)
            };
            merged.stats = {
              ...merged.stats,
              questsCompleted: (merged.stats?.questsCompleted || 0) + (o.stats?.questsCompleted || 0),
              enemiesDefeated: (merged.stats?.enemiesDefeated || 0) + (o.stats?.enemiesDefeated || 0),
              itemsFound: (merged.stats?.itemsFound || 0) + (o.stats?.itemsFound || 0),
              totalCombats: (merged.stats?.totalCombats || 0) + (o.stats?.totalCombats || 0),
              totalPlayTime: (merged.stats?.totalPlayTime || 0) + (o.stats?.totalPlayTime || 0)
            } as any;
            const memA = merged.npcMemory || { interactions: [], preferences: {}, scoreByAction: {}, socialNotesByHeroId: {} };
            const memB = o.npcMemory || { interactions: [], preferences: {}, scoreByAction: {}, socialNotesByHeroId: {} };
            merged.npcMemory = {
              interactions: [...memA.interactions, ...memB.interactions].slice(-50),
              preferences: { ...(memA.preferences || {}), ...(memB.preferences || {}) },
              scoreByAction: { ...(memA.scoreByAction || {}), ...(memB.scoreByAction || {}) },
              friendStatusByHeroId: { ...(memA.friendStatusByHeroId || {}), ...(memB.friendStatusByHeroId || {}) },
              lastContactByHeroId: { ...(memA.lastContactByHeroId || {}), ...(memB.lastContactByHeroId || {}) },
              lastInteractionByType: { ...(memA.lastInteractionByType || {}), ...(memB.lastInteractionByType || {}) },
              socialNotesByHeroId: { ...(memA.socialNotesByHeroId || {}), ...(memB.socialNotesByHeroId || {}) }
            } as any;
            removed++;
            toRemoveIds.push(o.id);
          });
          replacements[primary.id] = merged;
        });
        if (removed > 0) {
          const newHeroes = state.heroes
            .filter(h => !toRemoveIds.includes(h.id))
            .map(h => (replacements[h.id] ? replacements[h.id] : h));
          set({ heroes: newHeroes });
          try { notificationBus.emit({ type: 'item', title: 'NPCs Deduplicados', message: `Atualizados ${removed} duplicados`, icon: '🧹', duration: 2500 }); } catch {}
        }
        return { checked: npcs.length, removed };
      },
      setPartyInviteTerms: (partyId, targetHeroId, terms) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party) return;
        const order = ['F','E','D','C','B','A','S'];
        const idx = (r: string) => Math.max(0, order.indexOf((r || 'F').toUpperCase()));
        const inviter = get().heroes.find(h => h.id === party.leaderId);
        const target = get().heroes.find(h => h.id === targetHeroId);
        let adjusted = { ...terms };
        if (inviter && target) {
          const diff = Math.abs(idx(inviter.rankData?.currentRank || 'F') - idx(target.rankData?.currentRank || 'F'));
          if (diff === 2) {
            adjusted.rewardShare = Math.max(5, Math.floor((adjusted.rewardShare || 10) * 0.5));
            try { notificationBus.emit({ type: 'item', title: 'Ajuste de contrato', message: 'Diferença de 2 ranks: recompensa reduzida em 50%.', icon: '⚖️', duration: 2500 }); } catch {}
          }
        }
        const inviteTerms = { ...(party.inviteTerms || {}) };
        inviteTerms[targetHeroId] = adjusted;
        const updated = { ...party, inviteTerms };
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? updated : p) }));
      },

      // === DUEL SYSTEM ===
      getDuelInvitesForHero: (heroId) => {
        const hero = get().heroes.find(h => h.id === heroId);
        return Array.isArray(hero?.duelInvites) ? hero!.duelInvites! : [];
      },
      acceptDuelInvite: (heroId, npcId) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const invites = Array.isArray(hero.duelInvites) ? hero.duelInvites : [];
        const inviteIdx = invites.findIndex(i => i.npcId === npcId);
        if (inviteIdx === -1) return false;
        const invite = invites[inviteIdx];
        const nowInvites = invites.filter(i => i.npcId !== npcId);
        const npc = get().heroes.find(h => h.id === npcId);
        const duelRes = npc ? simulateDuel(hero, npc, invite.type) : null;
        const updates: Partial<Hero> = { duelInvites: nowInvites } as any;
        const stats = { ...hero.stats };
        stats.duelsPlayed = (stats.duelsPlayed || 0) + 1;
        if (duelRes && duelRes.winnerId === hero.id) stats.duelsWon = (stats.duelsWon || 0) + 1;
        (updates as any).stats = stats;
        const prog = { ...hero.progression };
        if (duelRes) {
          prog.xp = (prog.xp || 0) + duelRes.rewards.xp;
          prog.gold = (prog.gold || 0) + duelRes.rewards.gold;
        }
        (updates as any).progression = prog;
        if (npc && duelRes) {
          const rel = { ...(npc.socialRelations || {}) };
          rel[heroId] = (rel[heroId] || 0) + (invite.type === 'honra' ? (duelRes.winnerId === hero.id ? 10 : 5) : 2);
          get().updateHero(npc.id, { socialRelations: rel });
        }
        get().updateHero(heroId, updates);
        try {
          const won = duelRes ? duelRes.winnerId === hero.id : false;
          notificationBus.emit({ type: won ? 'achievement' : 'stamina', title: 'Duelo', message: `${npc?.name || 'NPC'} ${won ? 'foi derrotado' : 'venceu'} no duelo (${invite.type}).`, icon: '⚔️', duration: 3000 });
          set({ duelOverlay: duelRes ? { ...duelRes, aName: hero.name, bName: npc?.name || 'NPC', aClass: hero.class, bClass: npc?.class || 'guerreiro', aWeaponId: hero.inventory?.equippedMainHand, bWeaponId: npc?.inventory?.equippedMainHand } : undefined });
        } catch {}
        return true;
      },
      declineDuelInvite: (heroId, npcId) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const invites = Array.isArray(hero.duelInvites) ? hero.duelInvites : [];
        if (!invites.some(i => i.npcId === npcId)) return false;
        const nowInvites = invites.filter(i => i.npcId !== npcId);
        get().updateHero(heroId, { duelInvites: nowInvites });
        try { notificationBus.emit({ type: 'item', title: 'Duelo recusado', message: 'Convite removido.', icon: '⚔️', duration: 2000 }); } catch {}
        return true;
      },
      acceptPartyInvite: (heroId, partyId) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party) return false;
        if (!(party.invites || []).includes(heroId)) return false;
        const members = [...party.members, heroId];
        const invites = (party.invites || []).filter(id => id !== heroId);
        const inviteTerms = { ...(party.inviteTerms || {}) };
        const acceptedTerms = inviteTerms[heroId];
        const contractByHeroId = { ...(party.contractByHeroId || {}) };
        if (acceptedTerms) {
          contractByHeroId[heroId] = {
            duration: acceptedTerms.duration || 'one_mission',
            days: acceptedTerms.days,
            rewardShare: Math.max(5, Math.min(50, acceptedTerms.rewardShare || 10)),
            leaderPref: acceptedTerms.leaderPref
          };
        }
        delete inviteTerms[heroId];
        const updated = { ...party, members, invites, inviteTerms, contractByHeroId };
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? updated : p) }));
        // Recompensa imediata simbólica por aceitar ajudar
        const hero = get().heroes.find(h => h.id === heroId);
        if (hero && acceptedTerms) {
          const xpBonus = Math.round(10 + (acceptedTerms.rewardShare || 10));
          const goldBonus = Math.round((acceptedTerms.rewardShare || 10) * 2);
          const prog = { ...hero.progression, xp: (hero.progression.xp || 0) + xpBonus, gold: (hero.progression.gold || 0) + goldBonus };
          get().updateHero(heroId, { progression: prog });
          try { notificationBus.emit({ type: 'achievement', title: 'Apoio à Party', message: `Você recebeu +${xpBonus} XP e +${goldBonus} ouro pelo acordo`, icon: '🎖️', duration: 3500 }); } catch {}
        } else {
          try { notificationBus.emit({ type: 'achievement', title: 'Convite aceito', message: 'Você agora faz parte da party.', icon: '✅', duration: 3500 }); } catch {}
        }
        return true;
      },
      declinePartyInvite: (heroId, partyId) => {
        const party = get().parties.find(p => p.id === partyId);
        if (!party) return false;
        if (!(party.invites || []).includes(heroId)) return false;
        const invites = (party.invites || [])?.filter(id => id !== heroId);
        const inviteTerms = { ...(party.inviteTerms || {}) };
        delete inviteTerms[heroId];
        const updated = { ...party, invites, inviteTerms };
        set(state => ({ parties: state.parties.map(p => p.id === partyId ? updated : p) }));
        try { notificationBus.emit({ type: 'stamina', title: 'Convite recusado', message: 'Convite removido.', icon: '🚪', duration: 2500 }); } catch {}
        return true;
      },

      // === PARTY: implementação básica ===
      getHeroParty: (heroId: string) => {
        const state = get();
        const parties = Array.isArray((state as any).parties) ? (state as any).parties as Party[] : [];
        return parties.find(p => Array.isArray(p.members) && p.members.includes(heroId));
      },

      createParty: (heroId: string, name: string) => {
        const state = get();
        const existing = state.parties.find(p => Array.isArray(p.members) && p.members.includes(heroId));
        if (existing) return existing;
        const party = {
          id: `party-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          name: String(name).slice(0, 40),
          leaderId: heroId,
          members: [heroId],
          invites: [],
          createdAt: new Date().toISOString(),
          sharedLoot: true,
          sharedXP: true
        } as Party;
        set(s => ({ parties: [...(Array.isArray((s as any).parties) ? (s as any).parties : []), party] }));
        return party;
      },

      inviteHeroToParty: (partyId: string, inviterId: string, targetHeroId: string) => {
        const state = get();
        const party = (Array.isArray(state.parties) ? state.parties : []).find(p => p.id === partyId);
        if (!party) return false;
        if (party.leaderId !== inviterId && !party.members.includes(inviterId)) return false;
        const inviter = get().heroes.find(h => h.id === inviterId);
        const target = get().heroes.find(h => h.id === targetHeroId);
        if (inviter && target) {
          const inviterRank = inviter.rankData?.currentRank || 'F';
          const targetRank = target.rankData?.currentRank || 'F';
          if (inviterRank !== targetRank) {
            return false;
          }
        }
        party.invites = Array.isArray(party.invites) ? party.invites : [];
        if (!party.invites.includes(targetHeroId) && !party.members.includes(targetHeroId)) {
          party.invites.push(targetHeroId);
          set(s => ({ parties: s.parties.map(p => p.id === partyId ? party : p) }));
          return true;
        }
        return false;
      },

      

      

      leaveParty: (heroId: string) => {
        const state = get();
        const party = (Array.isArray(state.parties) ? state.parties : []).find(p => Array.isArray(p.members) && p.members.includes(heroId));
        if (!party) return false;
        party.members = party.members.filter(id => id !== heroId);
        if (party.leaderId === heroId) party.leaderId = party.members[0] || party.leaderId;
        const parties = party.members.length ? state.parties.map(p => p.id === party.id ? party : p) : state.parties.filter(p => p.id !== party.id);
        set({ parties });
        return true;
      },

      // === SISTEMA DE OVOS E MASCOTES ===

      generateEggForSelected: (rarity) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const MAX_EGGS = 30;
        if ((hero.eggs || []).length >= MAX_EGGS) {
          try { notificationBus.emit({ type: 'item', title: 'Inventário de Ovos Cheio', message: 'Libere espaço antes de obter novos ovos.', duration: 5000 }); } catch {}
          return false;
        }
        const egg = generateMysteryEgg(rarity);
        const eggs = [...(hero.eggs || []), egg];
        get().updateHero(hero.id, { eggs });
        try {
          
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
          try { notificationBus.emit({ type: 'item', title: 'Limite de Mascotes', message: 'Você atingiu o limite de mascotes. Libere espaço antes de chocar.', duration: 5000 }); } catch {}
          return false;
        }
        if (hero.hatchCooldownEndsAt) {
          const ends = new Date(hero.hatchCooldownEndsAt).getTime();
          if (Date.now() < ends) {
            try { notificationBus.emit({ type: 'item', title: 'Cooldown de Chocagem', message: 'Aguarde o fim do cooldown para chocar outro ovo.', duration: 4000 }); } catch {}
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
          try { notificationBus.emit({ type: 'gold', title: 'Ouro insuficiente', message: `Chocar este ovo requer ${hatchCost} ouro.`, duration: 4000 }); } catch {}
          return false;
        }
        const pet = hatchPet(egg);
        const nextEggs = eggs.filter(e => e.id !== eggId);
        const pets = [...(hero.pets || []), pet];
        const hatchHistory = [...(hero.hatchHistory || []), { eggId: egg.id, petId: pet.id, timestamp: new Date().toISOString(), rarity: egg.identified?.rarity || egg.baseRarity, hatchCost }];
        const cooldownMs = 30 * 1000;
        const progression = { ...hero.progression, gold: Math.max(0, (hero.progression.gold || 0) - hatchCost) };
        get().updateHero(hero.id, { eggs: nextEggs, pets, hatchHistory, hatchCooldownEndsAt: new Date(Date.now() + cooldownMs).toISOString(), progression });
        try { notificationBus.emit({ type: 'item', title: 'Mascote Obtido', message: `Você obteve ${pet.name}!`, duration: 4000, icon: '🐾' }); } catch {}
        try { notificationBus.emit({ type: 'item', title: 'Ovo Chocado', message: 'O ovo foi consumido e removido do inventário.', duration: 3000, icon: '🥚' }); } catch {}
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
          notificationBus.emit({ type: 'item', title: 'Cooldown reduzido', message: `- ${mins} min no cooldown de chocagem`, duration: 3000, icon: '⏱️' });
        } catch {}
        try {
          
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

      sellPetForSelected: (petId) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const pets = hero.pets || [];
        const idx = pets.findIndex(p => p.id === petId);
        if (idx === -1) return false;
        const pet = pets[idx];
        const baseByRarity: Record<import('../types/hero').EggRarity, number> = { comum: 100, incomum: 200, raro: 400, epico: 800, lendario: 1600, mistico: 3000 };
        const base = baseByRarity[pet.rarity] || 100;
        const levelBonus = Math.max(0, pet.level || 1) * 20;
        const refineBonus = Math.max(0, pet.refineLevel || 0) * 50;
        const mutationBonus = pet.mutation?.variant ? 200 : 0;
        const sellPrice = base + levelBonus + refineBonus + mutationBonus;
        const nextPets = pets.filter(p => p.id !== petId);
        const updates: Partial<Hero> = { pets: nextPets, progression: { ...hero.progression, gold: (hero.progression.gold || 0) + sellPrice } } as any;
        if (hero.activePetId === petId) (updates as any).activePetId = undefined;
        const compBonus = computeCompanionBonus({ ...hero, pets: nextPets, activePetId: (updates as any).activePetId } as Hero);
        const derived = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus);
        (updates as any).derivedAttributes = derived;
        get().updateHero(hero.id, updates);
        try { notificationBus.emit({ type: 'gold', title: 'Mascote vendido', message: `Recebido ${sellPrice} ouro por ${pet.name}.`, duration: 3500, icon: '💰' }); } catch {}
        try {
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
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
        if (exists) {
          const mounts = hero.mounts || [];
          const idx = mounts.findIndex(m => m.id === mountId);
          if (idx >= 0) {
            const mm = mounts[idx];
            const hist = [{ ts: new Date().toISOString(), action: 'activate', details: '' }, ...((mm.history)||[])].slice(0,50);
            const nextMounts = [...mounts];
            nextMounts[idx] = { ...mm, history: hist };
            hero.mounts = nextMounts;
          }
        }
        const compBonus = computeCompanionBonus({ ...hero, activeMountId: nextId } as Hero);
        const derived = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus);
        get().updateHero(hero.id, { activeMountId: nextId, derivedAttributes: derived });
        try { notificationBus.emit({ type: 'item', title: nextId ? 'Montaria Ativada' : 'Montaria Desativada', message: nextId ? 'Sua montaria está ativa e concedendo bônus.' : 'Você desativou sua montaria.', duration: 3000, icon: nextId ? '🏇' : '🛑' }); } catch {}
        try { trackMetric.custom?.('mount_activated', { heroId: hero.id, mountId: nextId }); } catch {}
      },

      setFavoriteMount: (mountId) => {
        const hero = get().getSelectedHero();
        if (!hero) return;
        const exists = (hero.mounts || []).some(m => m.id === mountId);
        const nextId = exists ? mountId : undefined;
        if (exists) {
          const mounts = hero.mounts || [];
          const idx = mounts.findIndex(m => m.id === mountId);
          if (idx >= 0) {
            const mm = mounts[idx];
            const hist = [{ ts: new Date().toISOString(), action: nextId ? 'favorite_set' : 'favorite_removed', details: '' }, ...((mm.history)||[])].slice(0,50);
            const nextMounts = [...mounts];
            nextMounts[idx] = { ...mm, history: hist };
            hero.mounts = nextMounts;
          }
        }
        get().updateHero(hero.id, { favoriteMountId: nextId });
        try { notificationBus.emit({ type: 'item', title: nextId ? 'Favorita definida' : 'Favorita removida', message: nextId ? 'Sua montaria favorita foi definida.' : 'Você removeu a favorita.', duration: 3000, icon: '⭐' }); } catch {}
        try { trackMetric.custom?.('mount_favorite_set', { heroId: hero.id, mountId: nextId }); } catch {}
      },

      setMountNoteForSelected: (mountId, note) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const mounts = hero.mounts || [];
        const idx = mounts.findIndex(m => m.id === mountId);
        if (idx === -1) return false;
        const next = [...mounts];
        next[idx] = { ...next[idx], note };
        get().updateHero(hero.id, { mounts: next });
        try { notificationBus.emit({ type: 'item', title: 'Nota salva', message: 'Sua nota foi atualizada.', duration: 2500, icon: '📝' }); } catch {}
        return true;
      },

      toggleFavoriteMount: (mountId) => {
        const hero = get().getSelectedHero();
        if (!hero) return;
        const exists = (hero.mounts || []).some(m => m.id === mountId);
        if (!exists) return;
        const current = hero.favoriteMountIds || [];
        let nextFavs = [...current];
        if (nextFavs.includes(mountId)) nextFavs = nextFavs.filter(id => id !== mountId);
        else if (nextFavs.length < 3) nextFavs.push(mountId);
        const mounts = hero.mounts || [];
        const idx = mounts.findIndex(m => m.id === mountId);
        if (idx >= 0) {
          const mm = mounts[idx];
          const hist = [{ ts: new Date().toISOString(), action: nextFavs.includes(mountId) ? 'favorite_set' : 'favorite_removed', details: 'multi' }, ...((mm.history)||[])].slice(0,50);
          const nextMounts = [...mounts];
          nextMounts[idx] = { ...mm, history: hist };
          get().updateHero(hero.id, { favoriteMountIds: nextFavs, mounts: nextMounts });
        } else {
          get().updateHero(hero.id, { favoriteMountIds: nextFavs });
        }
        try { notificationBus.emit({ type: 'item', title: nextFavs.includes(mountId) ? 'Favorito adicionado' : 'Favorito removido', message: `Slots: ${nextFavs.length}/3`, duration: 3000, icon: '⭐' }); } catch {}
        try { trackMetric.custom?.('mount_favorite_toggle', { heroId: hero.id, mountId, count: nextFavs.length }); } catch {}
      },

      toggleLockMount: (mountId) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const mounts = hero.mounts || [];
        const idx = mounts.findIndex(m => m.id === mountId);
        if (idx === -1) return false;
        const cur = mounts[idx];
        const next = [...mounts];
        next[idx] = { ...cur, locked: !cur.locked };
        get().updateHero(hero.id, { mounts: next });
        try { notificationBus.emit({ type: 'item', title: cur.locked ? 'Montaria Destravada' : 'Montaria Travada', message: cur.locked ? 'Agora pode ser liberada.' : 'Protegida contra liberação em lote.', duration: 3000, icon: cur.locked ? '🔓' : '🔒' }); } catch {}
        return true;
      },

      generateMountForSelected: (type, rarity) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const MAX_MOUNTS = hero.stableCapacity || 50;
        if ((hero.mounts || []).length >= MAX_MOUNTS) {
          try { notificationBus.emit({ type: 'item', title: 'Limite de Montarias', message: 'Você atingiu o limite de montarias. Libere espaço antes de recrutar.', duration: 5000 }); } catch {}
          return false;
        }
        const now = new Date().toISOString();
        const types: import('../types/hero').Mount['type'][] = ['cavalo','lobo','grifo','javali','lagarto','draconiano','urso','felino','cervo','alce','hipogrifo','rinoceronte','wyvern'];
        const pickType = type && types.includes(type) ? type : types[Math.floor(Math.random() * types.length)];
        const rarities: import('../types/hero').MountRarity[] = ['comum','incomum','raro','epico','lendario','mistico'];
        const pickRarity = rarity && rarities.includes(rarity) ? rarity : (Math.random() > 0.97 ? 'epico' : Math.random() > 0.9 ? 'raro' : 'comum');
        const namePool: Record<string, string[]> = {
          cavalo: ['Corcel Ágil','Corcel da Brisa','Cavalo de Estepes'],
          lobo: ['Alcateiro','Lobo da Neve','Lobo das Sombras'],
          grifo: ['Grifo Nobre','Asa Solar','Sentinela Alada'],
          javali: ['Javali Robusto','Dente de Ferro','Batedor da Mata'],
          lagarto: ['Lagarto Rápido','Corre-Folhas','Cauda Veloz'],
          draconiano: ['Draconiano Jovem','Escama Rubra','Enguia Arcana'],
          urso: ['Urso Montanhês','Urso das Rochas','Urso das Neves'],
          felino: ['Felino Ágil','Garra de Vento','Sombra Silenciosa'],
          cervo: ['Cervo Celeste','Cervo das Auroras','Cervo Etéreo'],
          alce: ['Alce Majestoso','Alce do Vale','Chifre Antigo'],
          hipogrifo: ['Hipogrifo Jovem','Hipogrifo do Crepúsculo','Asa de Prata'],
          rinoceronte: ['Rinoceronte de Guerra','Casco de Pedra','Chifre Tirano'],
          wyvern: ['Wyvern Veloz','Wyvern do Trovão','Rasga-Céus']
        };
        const speedBase: Record<string, number> = {
          cavalo: 1, lobo: 0, grifo: 1, javali: 0, lagarto: 0, draconiano: 1, urso: 0, felino: 1, cervo: 1, alce: 1, hipogrifo: 1, rinoceronte: 0, wyvern: 1
        };
        const attrBase: Record<string, Partial<import('../types/hero').HeroAttributes>> = {
          cavalo: { destreza: 1 }, lobo: { forca: 2 }, grifo: { destreza: 1 }, javali: { constituicao: 2 }, lagarto: { destreza: 1 }, draconiano: { inteligencia: 1 }, urso: { forca: 2 }, felino: { destreza: 2 }, cervo: { destreza: 1 }, alce: { constituicao: 2 }, hipogrifo: { destreza: 2 }, rinoceronte: { forca: 3, constituicao: 1 }, wyvern: { destreza: 2 }
        };
        const confNameList = namePool[pickType] || [pickType];
        const confName = confNameList[Math.floor(Math.random() * confNameList.length)];
        const speedBaseVal = speedBase[pickType] || 0;
        const attrs = attrBase[pickType] || {};
        const speedBonus = conf.speed + (pickRarity === 'raro' ? 1 : pickRarity === 'epico' ? 2 : pickRarity === 'lendario' ? 2 : 0);
        const mount: import('../types/hero').Mount = {
          id: uuidv4(),
          name: confName,
          type: pickType,
          rarity: pickRarity,
          stage: 'comum',
          speedBonus: speedBaseVal + (pickRarity === 'raro' ? 1 : pickRarity === 'epico' ? 2 : pickRarity === 'lendario' ? 2 : 0),
          attributes: { ...attrs },
          createdAt: now
        };
        const mounts = [...(hero.mounts || []), mount];
        get().updateHero(hero.id, { mounts });
        try {
          const flag = localStorage.getItem('auto_activate_recommended_mount') === '1';
          if (flag) {
            const stageOrder: Record<string, number> = { comum: 0, encantada: 1, lendaria: 2 };
            const rarityOrder: Record<string, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mistico: 5 };
            const score = (mm: import('../types/hero').Mount) => {
              const attrSum = Object.values(mm.attributes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
              return (mm.speedBonus || 0) * 3 + attrSum + (stageOrder[mm.stage] || 0) * 2 + (rarityOrder[mm.rarity] || 0);
            };
            const best = mounts.slice().sort((a,b)=>score(b)-score(a))[0]?.id;
            if (best) {
              const compBonus2 = computeCompanionBonus({ ...hero, activeMountId: best, mounts } as Hero);
              const derived2 = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus2);
              get().updateHero(hero.id, { activeMountId: best, derivedAttributes: derived2 });
              notificationBus.emit({ type: 'item', title: 'Recomendada ativada', message: 'Auto ativação da melhor montaria.', duration: 3000, icon: '⭐' });
            }
          }
        } catch {}
        try { notificationBus.emit({ type: 'item', title: 'Montaria Obtida', message: `Você obteve ${mount.name}!`, duration: 4000, icon: '🏇' }); } catch {}
        try { trackMetric.custom?.('mount_generated', { heroId: hero.id, type: pickType, rarity: pickRarity }); } catch {}
        return true;
      },

      renameMountForSelected: (mountId, newName) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const mounts = hero.mounts || [];
        const idx = mounts.findIndex(m => m.id === mountId);
        if (idx === -1) return false;
        const nextMounts = [...mounts];
        nextMounts[idx] = { ...nextMounts[idx], name: newName };
        get().updateHero(hero.id, { mounts: nextMounts });
        try { notificationBus.emit({ type: 'item', title: 'Montaria Renomeada', message: `Agora: ${newName}`, duration: 3000, icon: '✏️' }); } catch {}
        return true;
      },

      buyMountOffer: (heroId, type, rarity, price) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        let gold = hero.progression.gold || 0;
        let finalPrice = price;
        try {
          const m = getMonetization();
          if (m.seasonPassActive?.active) finalPrice = Math.ceil(price * 0.9);
        } catch {}
        if (gold < finalPrice) return false;
        const ok = get().generateMountForSelected(type, rarity);
        if (!ok) return false;
        get().updateHero(heroId, { progression: { ...hero.progression, gold: Math.max(0, gold - finalPrice) } });
        try { notificationBus.emit({ type: 'item', title: 'Compra de Montaria', message: `Oferta adquirida (${type}, ${rarity}).`, duration: 3500, icon: '🏇' }); } catch {}
        try { trackMetric.custom?.('mount_offer_bought', { heroId, type, rarity, price: finalPrice }); } catch {}
        return true;
      },

      importMountsForSelected: (json) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        let arr: any[] = [];
        try { const parsed = JSON.parse(json); if (Array.isArray(parsed)) arr = parsed; else return false; } catch { return false; }
        const MAX_MOUNTS = hero.stableCapacity || 50;
        const remain = Math.max(0, MAX_MOUNTS - (hero.mounts?.length || 0));
        if (remain <= 0) return false;
        const take = arr.slice(0, remain);
        const validTypes: string[] = ['cavalo','lobo','grifo','javali','lagarto','draconiano','urso','felino','cervo','alce','hipogrifo','rinoceronte','wyvern'];
        const validRarities: string[] = ['comum','incomum','raro','epico','lendario','mistico'];
        const now = new Date().toISOString();
        const mountsToAdd = take.map(m => ({
          id: uuidv4(),
          name: String(m.name || 'Montaria'),
          type: validTypes.includes(String(m.type)) ? m.type : 'cavalo',
          rarity: validRarities.includes(String(m.rarity)) ? m.rarity : 'comum',
          stage: ['comum','encantada','lendaria'].includes(String(m.stage)) ? m.stage : 'comum',
          speedBonus: Math.max(0, Number(m.speedBonus || 0)),
          attributes: typeof m.attributes === 'object' ? m.attributes : {},
          refineLevel: Math.max(0, Number(m.refineLevel || 0)),
          mastery: Math.max(0, Number(m.mastery || 0)),
          history: [{ ts: now, action: 'obtain', details: 'import' }],
          createdAt: now
        }));
        const next = [ ...(hero.mounts || []), ...mountsToAdd ];
        get().updateHero(hero.id, { mounts: next });
        try { notificationBus.emit({ type: 'item', title: 'Montarias Importadas', message: `Importadas ${mountsToAdd.length} montarias.`, duration: 3500, icon: '🏇' }); } catch {}
        return true;
      },

      releaseCommonMounts: () => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const favs = new Set(hero.favoriteMountIds || []);
        const next = (hero.mounts || []).filter(m => !(m.rarity === 'comum' && m.id !== hero.activeMountId && !favs.has(m.id) && !m.locked));
        if (next.length === (hero.mounts || []).length) return false;
        const updates: Partial<Hero> = { mounts: next } as any;
        if (hero.activeMountId && !next.some(m => m.id === hero.activeMountId)) (updates as any).activeMountId = undefined;
        get().updateHero(hero.id, updates);
        try { notificationBus.emit({ type: 'item', title: 'Montarias Comuns Liberadas', message: 'Liberadas montarias comuns não favoritas.', duration: 3500, icon: '🏇' }); } catch {}
        return true;
      },

      upgradeStableForSelected: (costGold: number = 500, increment: number = 10, maxCap: number = 100) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const cap = hero.stableCapacity || 50;
        if (cap >= maxCap) return false;
        let gold = hero.progression.gold || 0;
        let inc = increment;
        let price = costGold;
        try {
          const m = getMonetization();
          if (m.seasonPassActive?.active) {
            price = Math.ceil(costGold * 0.8);
            inc = increment + 5;
          }
        } catch {}
        if (gold < price) return false;
        const nextCap = Math.min(maxCap, cap + inc);
        get().updateHero(hero.id, { stableCapacity: nextCap, progression: { ...hero.progression, gold: Math.max(0, gold - price) } });
        try { notificationBus.emit({ type: 'item', title: 'Estábulo Expandido', message: `Capacidade aumentada para ${nextCap}.`, duration: 3500, icon: '🏛️' }); } catch {}
        try { trackMetric.custom?.('stable_upgraded', { heroId: hero.id, newCapacity: nextCap }); } catch {}
        return true;
      },

      trainMountForSelected: async (costGold = 150, bonusSpeed = 1, minutes = 30) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const stCost = 10;
        try {
          const check = await canPerformAction(hero.id, 'TRAIN');
          if (!check.ok) {
            try { notificationBus.emit({ type: 'stamina', title: 'Fadiga alta', message: `Treino requer ${check.cost} ⚡. Descanse para reduzir fadiga.`, duration: 2500, icon: '💤' }); } catch {}
            set({ staminaModal: { required: check.cost, actionType: 'TRAIN' } });
            return false;
          }
          const perf = await performAction(hero.id, 'TRAIN', {});
          const st = hero.stamina || { current: 100, max: 100 } as any;
          get().updateHero(hero.id, { stamina: { ...st, current: perf.newStamina } });
        } catch {}
        let gold = hero.progression.gold || 0;
        let durMin = minutes;
        let cost = costGold;
        try {
          const m = getMonetization();
          if (m.seasonPassActive?.active) {
            cost = Math.ceil(costGold * 0.7);
            durMin = Math.ceil(minutes * 1.5);
          }
        } catch {}
        if (gold < cost) return false;
        const expiresAt = new Date(Date.now() + durMin * 60 * 1000).toISOString();
        const mountBuff = { speedBonus: Math.max(0, bonusSpeed), expiresAt };
        let nextMounts = hero.mounts || [];
        const idx = nextMounts.findIndex(mm => mm.id === hero.activeMountId);
        if (idx >= 0) {
          const cur = nextMounts[idx];
          const mastery = Math.max(0, (cur.mastery || 0) + 1);
          const tier = mastery >= 30 ? 3 : mastery >= 20 ? 2 : mastery >= 10 ? 1 : 0;
          const prevTier = Math.max(0, cur.rewardTier || 0);
          let items = { ...hero.inventory.items } as Record<string, number>;
          if (tier > prevTier) {
            if (tier === 1) items['pergaminho-montaria'] = (items['pergaminho-montaria'] || 0) + 1;
            if (tier === 2) items['pedra-magica'] = (items['pedra-magica'] || 0) + 1;
            if (tier === 3) items['essencia-bestial'] = (items['essencia-bestial'] || 0) + 1;
            hero.inventory = { ...hero.inventory, items } as any;
            try { notificationBus.emit({ type: 'item', title: 'Marco de Maestria', message: `Recompensa recebida: ${tier===1?'📜 Pergaminho':tier===2?'🔷 Pedra Mágica':'🧬 Essência Bestial'}.`, duration: 4000, icon: '🎖️' }); } catch {}
          }
          nextMounts = [...nextMounts];
          nextMounts[idx] = { ...cur, mastery, rewardTier: Math.max(prevTier, tier) };
        }
        const compBonus = computeCompanionBonus({ ...hero, mounts: nextMounts } as Hero);
        const derived = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus);
        get().updateHero(hero.id, { mountBuff, mounts: nextMounts, derivedAttributes: derived, progression: { ...hero.progression, gold: Math.max(0, gold - cost) } });
        try { notificationBus.emit({ type: 'item', title: 'Treino de Montaria', message: `Velocidade +${bonusSpeed} por ${durMin} min. Maestria +1.`, duration: 3500, icon: '🏇' }); } catch {}
        try { get().updateDailyGoalProgress(hero.id, 'mount-trained', 1); } catch {}
        return true;
      },

      removeMountForSelected: (mountId: string) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const mounts = hero.mounts || [];
        if (!mounts.some(m => m.id === mountId)) return false;
        const target = mounts.find(m => m.id === mountId);
        if (target?.locked) { try { notificationBus.emit({ type: 'item', title: 'Montaria Travada', message: 'Destrave para poder liberar.', duration: 3000, icon: '🔒' }); } catch {} ; return false; }
        try {
          const idx = mounts.findIndex(m => m.id === mountId);
          if (idx >= 0) {
            const mm = mounts[idx];
            const hist = [{ ts: new Date().toISOString(), action: 'release', details: '' }, ...((mm.history)||[])].slice(0,50);
            const nextMounts = [...mounts];
            nextMounts[idx] = { ...mm, history: hist };
            hero.mounts = nextMounts;
          }
        } catch {}
        const next = mounts.filter(m => m.id !== mountId);
        const updates: Partial<Hero> = { mounts: next } as any;
        if (hero.activeMountId === mountId) (updates as any).activeMountId = undefined;
        if (hero.favoriteMountId === mountId) (updates as any).favoriteMountId = undefined;
        get().updateHero(hero.id, updates);
        try { notificationBus.emit({ type: 'item', title: 'Montaria Liberada', message: 'A montaria foi removida do seu estábulo.', duration: 3000, icon: '🏇' }); } catch {}
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
        if (m.stage === 'comum') nextStage = 'encantada'; else if (m.stage === 'encantada') nextStage = 'lendaria'; else { try { notificationBus.emit({ type: 'item', title: 'Estágio Máximo', message: 'Esta montaria já é Lendária.', duration: 3500, icon: '⚠️' }); } catch {} ; return false; }
        const hasScroll = (hero.inventory.items['pergaminho-montaria'] || 0) > 0;
        const needsEssence = nextStage === 'lendaria';
        const hasEssence = (hero.inventory.items['essencia-bestial'] || 0) > 0;
        const costGold = m.stage === 'comum' ? 200 : 700;
        if (!hasScroll) { try { notificationBus.emit({ type: 'item', title: 'Pergaminho insuficiente', message: 'Falta 📜 Pergaminho de Montaria para evoluir.', duration: 3500, icon: '📜' }); } catch {} ; return false; }
        if ((hero.progression.gold || 0) < costGold) { try { notificationBus.emit({ type: 'gold', title: 'Ouro insuficiente', message: `Evolução requer ${costGold} ouro.`, duration: 3500 }); } catch {} ; return false; }
        if (needsEssence && !hasEssence) { try { notificationBus.emit({ type: 'item', title: 'Essência necessária', message: 'Para Lendária, você precisa de 🧬 Essência Bestial.', duration: 4000, icon: '🧬' }); } catch {} ; return false; }
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
        const hist = [{ ts: new Date().toISOString(), action: 'evolve', details: `→ ${nextStage}` }, ...((m.history)||[])].slice(0,50);
        const newMount = { ...m, stage: nextStage, speedBonus: updatedSpeed, attributes: newAttrs, history: hist };
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
        try {
          const flag = localStorage.getItem('auto_activate_recommended_mount') === '1';
          if (flag) {
            const stageOrder: Record<string, number> = { comum: 0, encantada: 1, lendaria: 2 };
            const rarityOrder: Record<string, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mistico: 5 };
            const score = (mm: import('../types/hero').Mount) => {
              const attrSum = Object.values(mm.attributes || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
              return (mm.speedBonus || 0) * 3 + attrSum + (stageOrder[mm.stage] || 0) * 2 + (rarityOrder[mm.rarity] || 0);
            };
            const best = nextMounts.slice().sort((a,b)=>score(b)-score(a))[0]?.id;
            if (best) {
              const compBonus2 = computeCompanionBonus({ ...hero, activeMountId: best, mounts: nextMounts } as Hero);
              const derived2 = calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle, compBonus2);
              get().updateHero(hero.id, { activeMountId: best, derivedAttributes: derived2 });
              notificationBus.emit({ type: 'item', title: 'Recomendada ativada', message: 'Auto ativação da melhor montaria.', duration: 3000, icon: '⭐' });
            }
          }
        } catch {}
        try { notificationBus.emit({ type: 'item', title: 'Montaria Evoluída', message: `${m.name} agora é ${nextStage}. Velocidade +${updatedSpeed - (m.speedBonus || 0)}.`, duration: 4000, icon: '✨' }); } catch {}
        try { get().updateDailyGoalProgress(hero.id, 'mount-evolved', 1); } catch {}
        try { trackMetric.custom?.('mount_evolved', { heroId: hero.id, mountId, stage: nextStage }); } catch {}
        return true;
      },

      refineCompanion: (heroId, kind, id) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const stonesMagic = hero.inventory.items['pedra-magica'] || 0;
        const stonesLink = hero.inventory.items['essencia-vinculo'] || 0;
        const stones = stonesMagic + stonesLink;
        if (stones <= 0) { try { notificationBus.emit({ type: 'item', title: 'Materiais insuficientes', message: 'Você precisa de Pedra Mágica ou Essência de Vínculo.', duration: 3500, icon: '🔷' }); } catch {} ; return false; }
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
            const hist = [{ ts: new Date().toISOString(), action: 'refine', details: `→ ${newLevel}` }, ...((m.history)||[])].slice(0,50);
            nextMounts[idx] = { ...m, refineLevel: newLevel, history: hist };
            hero.mounts = nextMounts;
            changed = true;
          }
        }
        if (!changed) { try { notificationBus.emit({ type: 'item', title: 'Refino falhou', message: 'A tentativa de refino não teve efeito desta vez.', duration: 3000, icon: '⚠️' }); } catch {} ; return false; }
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
        try { notificationBus.emit({ type: 'item', title: kind === 'mount' ? 'Montaria Refinada' : 'Mascote Refinado', message: 'Bônus do companheiro aumentados em +1% por nível de refino.', duration: 3500, icon: kind === 'mount' ? '🏇' : '🐾' }); } catch {}
        try { if (kind === 'mount') get().updateDailyGoalProgress(hero.id, 'mount-refined', 1); } catch {}
        try { if (kind === 'mount') trackMetric.custom?.('mount_refined', { heroId: hero.id, mountId: id }); } catch {}
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

      suggestCompanionQuestForSelected: () => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const inv = hero.inventory.items || {} as Record<string, number>;
        const missing: string[] = [];
        const mount = (hero.mounts || []).find(m => m.id === hero.activeMountId);
        if (mount) {
          if (mount.stage === 'comum' && (inv['pergaminho-montaria'] || 0) < 1) missing.push('pergaminho-montaria');
          if (mount.stage === 'encantada') {
            if ((inv['pergaminho-montaria'] || 0) < 1) missing.push('pergaminho-montaria');
            if ((inv['essencia-bestial'] || 0) < 1) missing.push('essencia-bestial');
          }
        }
        const pet = (hero.pets || []).find(p => p.id === hero.activePetId);
        if (pet && (pet.refineLevel || 0) < 10) {
          if ((inv['pedra-magica'] || 0) < 1 && (inv['essencia-vinculo'] || 0) < 1) missing.push('pedra-magica');
        }
        if (missing.length === 0) return false;
        const target = missing[0];
        const q: Quest = {
          id: `companion-${target}-${Date.now()}`,
          title: target === 'essencia-bestial' ? 'Encontrar a Essência Bestial' : target === 'pergaminho-montaria' ? 'Conseguir Pergaminho de Montaria' : 'Refinar Vínculo do Mascote',
          description: target === 'essencia-bestial' ? 'Explore ruínas ou derrote um boss para coletar a Essência Bestial.' : target === 'pergaminho-montaria' ? 'Complete tarefas da guilda para obter um Pergaminho de Montaria.' : 'Participe de treinos e rituais para fortalecer o vínculo com seu mascote.',
          type: target === 'essencia-bestial' ? 'exploracao' : 'caca',
          difficulty: 'padrao',
          levelRequirement: Math.max(1, hero.progression.level),
          rewards: { gold: 50, xp: 40, items: [{ id: target, qty: 1 }] },
          repeatable: false,
          isGuildQuest: true,
          sticky: true
        };
        set((state) => ({ availableQuests: [q, ...state.availableQuests] }));
        try {
          const cur = hero.stats?.suggestedCompanionMissions || 0;
          get().updateHero(hero.id, { stats: { ...hero.stats, suggestedCompanionMissions: cur + 1 } });
        } catch {}
        try {
          const v = localStorage.getItem('auto_accept_companion_mission');
          if (v === '1') {
            get().acceptQuest(hero.id, q.id);
          }
        } catch {}
        return true;
      },

      // === SISTEMA DE CONVITES / INDICAÇÕES ===
      createReferralInvite: (inviterHeroId: string): ReferralInvite | null => {
        const state = get();
        const inviter = state.heroes.find(h => h.id === inviterHeroId);
        if (!inviter) return null;
        const code = uuidv4().slice(0, 8);
        const validityDays = Math.max(1, getGameSettings().inviteLinkValidityDays || 7);
        const expiresAt = new Date(Date.now() + validityDays * 24 * 3600 * 1000).toISOString();
        const inviterTag = String(inviter.name || 'heroi');
        const personalizedSlug = `${inviterTag.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${code}`;
        const invite: ReferralInvite = {
          id: uuidv4(),
          code,
          inviterHeroId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          rewardGranted: false,
          expiresAt,
          inviterTag,
          personalizedSlug,
          activity: [{ ts: new Date().toISOString(), action: 'created' }]
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
        if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
          const expiredInvite: ReferralInvite = { ...invite, status: 'expired', activity: [...(invite.activity||[]), { ts: new Date().toISOString(), action: 'expired' }] };
          set(s => ({ referralInvites: s.referralInvites.map((i, idx) => idx === inviteIndex ? expiredInvite : i) }));
          return false;
        }
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
          referralInvites: s.referralInvites.map((i, idx) => idx === inviteIndex ? { ...updatedInvite, activity: [...(updatedInvite.activity||invite.activity||[]), { ts: new Date().toISOString(), action: 'accepted', details: newHeroId }] } : i)
        }));
        // Conceder bônus ao convidador
        const bonusGold = Math.max(0, getGameSettings().inviteRewardGold || 0);
        const bonusXP = Math.max(0, getGameSettings().inviteRewardXP || 0);
        get().gainGold(inviter.id, bonusGold);
        get().gainXP(inviter.id, bonusXP);
        try {
          const acceptedCount = (get().getReferralInvitesForHero(inviter.id) || []).filter(i => i.status === 'accepted').length;
          if (acceptedCount === 1 || acceptedCount === 5 || acceptedCount === 10) {
            notificationBus.emit({ type: 'achievement', title: 'Convite bem-sucedido!', message: `Marcos atingidos: ${acceptedCount} aceites`, icon: '🎉', duration: 4000 });
            if (acceptedCount === 5) { get().gainGold(inviter.id, Math.floor(bonusGold * 2)); }
            if (acceptedCount === 10) { get().gainXP(inviter.id, Math.floor(bonusXP * 2)); }
          }
        } catch {}
        // Marcar recompensa concedida
        set(s => ({
          referralInvites: s.referralInvites.map(i => i.id === updatedInvite.id ? { ...i, rewardGranted: true } : i)
        }));
        // Métrica de aceite de convite
        trackMetric.custom?.('referral_accepted', { inviterHeroId: inviter.id, newHeroId, code, bonusGold, bonusXP });
        return true;
      },

      revokeReferralInvite: (inviteId: string): boolean => {
        const state = get();
        const idx = (state.referralInvites || []).findIndex(i => i.id === inviteId && i.status === 'pending');
        if (idx === -1) return false;
        const cur = state.referralInvites[idx];
        const next: ReferralInvite = { ...cur, status: 'expired', activity: [...(cur.activity||[]), { ts: new Date().toISOString(), action: 'revoked' }] };
        set(s => ({ referralInvites: s.referralInvites.map((i, j) => j === idx ? next : i) }));
        return true;
      },

      expireOldInvites: () => {
        const state = get();
        const now = Date.now();
        const next = (state.referralInvites || []).map(i => {
          if (i.status !== 'pending') return i;
          if (i.expiresAt && new Date(i.expiresAt).getTime() < now) {
            return { ...i, status: 'expired', activity: [...(i.activity||[]), { ts: new Date().toISOString(), action: 'expired' }] };
          }
          return i;
        });
        set({ referralInvites: next });
      },

      getReferralStatsForHero: (heroId: string) => {
        const list = get().getReferralInvitesForHero(heroId);
        const total = list.length;
        const pending = list.filter(i => i.status === 'pending').length;
        const accepted = list.filter(i => i.status === 'accepted').length;
        const expired = list.filter(i => i.status === 'expired').length;
        const rewardsGranted = list.filter(i => i.rewardGranted).length;
        return { total, pending, accepted, expired, rewardsGranted };
      },

      logReferralActivity: (inviteId: string, action: 'shared' | 'revoked' | 'expired' | 'accepted', details?: string) => {
        set(s => ({
          referralInvites: (s.referralInvites || []).map(i => i.id === inviteId ? { ...i, activity: [...(i.activity||[]), { ts: new Date().toISOString(), action, details }] } : i)
        }));
      },

      updateReferralInvite: (inviteId, updates) => {
        let changed = false;
        set(s => ({
          referralInvites: (s.referralInvites || []).map(i => {
            if (i.id !== inviteId) return i;
            changed = true;
            return { ...i, ...updates };
          })
        }));
        return changed;
      },

      renewReferralInvite: (inviteId, extraDays = Math.max(1, getGameSettings().inviteLinkValidityDays || 7)) => {
        const cur = get().referralInvites.find(i => i.id === inviteId);
        if (!cur) return false;
        const base = cur.expiresAt ? new Date(cur.expiresAt).getTime() : Date.now();
        const expiresAt = new Date(base + extraDays * 24 * 3600 * 1000).toISOString();
        set(s => ({
          referralInvites: (s.referralInvites || []).map(i => i.id === inviteId ? { ...i, expiresAt, status: i.status === 'expired' ? 'pending' : i.status, activity: [...(i.activity||[]), { ts: new Date().toISOString(), action: 'renewed' }] } : i)
        }));
        return true;
      },

      getReferralInviteByCode: (code: string) => {
        const state = get();
        return (state.referralInvites || []).find(i => i.code === code);
      },
      
      updateHero: (id, heroData) => {
        set(state => ({
          heroes: state.heroes.map(hero => {
            if (hero.id !== id) return hero;
            const nowIso = new Date().toISOString();
            const updatedTop = { ...hero, ...heroData, updatedAt: nowIso } as Hero;
            if (heroData.stats) {
              updatedTop.stats = { ...hero.stats, ...heroData.stats } as any;
            }
            if (heroData.stamina) {
              updatedTop.stamina = { ...(hero.stamina as any), ...(heroData.stamina as any) } as any;
            }
            if (heroData.progression) {
              updatedTop.progression = { ...hero.progression, ...heroData.progression } as any;
            }
            if (heroData.attributes || heroData.class || heroData.level || heroData.inventory || heroData.activeTitle !== undefined || heroData.activePetId !== undefined || heroData.activeMountId !== undefined || heroData.pets || heroData.mounts) {
              const finalAttributes = heroData.attributes 
                ? { ...hero.attributes, ...heroData.attributes }
                : hero.attributes;
              const finalClass = heroData.class || hero.class;
              const finalLevel = heroData.level || hero.progression.level;
              const finalInventory = heroData.inventory || hero.inventory;
              const finalActiveTitle = heroData.activeTitle !== undefined ? heroData.activeTitle : hero.activeTitle;
              const compBonus = computeCompanionBonus({ ...hero, ...heroData } as Hero);
              updatedTop.derivedAttributes = calculateDerivedAttributes(
                finalAttributes,
                finalClass,
                finalLevel,
                finalInventory,
                finalActiveTitle,
                compBonus
              );
            }
            const beforeCompleted = Array.isArray(hero.completedQuests) ? hero.completedQuests.length : 0;
            const afterCompleted = Array.isArray((updatedTop as any).completedQuests) ? (updatedTop as any).completedQuests.length : beforeCompleted;
            const beforeMissions = hero.stats?.questsCompleted || 0;
            const afterMissions = (updatedTop.stats?.questsCompleted ?? beforeMissions);
            if (afterCompleted < beforeCompleted || afterMissions < beforeMissions) {
              try { trackMetric.featureUsed(id, `mission-reset-detected:${beforeMissions}->${afterMissions}`); } catch {}
              try { console.warn('mission reset detected', { heroId: id, beforeMissions, afterMissions, beforeCompleted, afterCompleted, ts: nowIso }); } catch {}
            }
            return updatedTop;
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
        const hero = get().heroes.find(h => h.id === id);
        if (!hero || hero.origin === 'npc') return;
        set({ selectedHeroId: id });
      },

      // === NARRATIVA ===
      setDMOverrideLine: (line) => {
        set({ dmOverrideLine: line });
      },
      appendJourneyNarrativeForSelected: (summary, title) => {
        const hero = get().getSelectedHero();
        if (!hero) return false;
        const now = new Date().toISOString();
        const existing = hero.journeyChapters || [];
        const index = (existing.length || 0) + 1;
        const chapter = {
          id: `custom-${hero.id}-${index}-${Math.random().toString(36).slice(2)}`,
          index,
          title: title || `Crônica ${index}`,
          summary,
          createdAt: now,
          levelMilestone: hero.progression?.level || 1,
          locked: false,
          relatedQuests: hero.completedQuests || []
        } as any;
        get().updateHero(hero.id, { journeyChapters: [...existing, chapter] });
        return true;
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
        const heroRank = selectedHero ? rankSystem.calculateRank(selectedHero) : 'F';
        const newQuests = generateQuestBoard(heroLevel, guildLevel, heroRank as any);
        const nextCatalog: Record<string, Quest> = { ...state.questCatalog };

        // Manter missões sticky da lista anterior (evitar desaparecer em refresh)
        const previousStickyLimited = state.availableQuests.filter(q => q.sticky).slice(0, 3);
        const stickyIds = new Set(previousStickyLimited.map(q => q.id));

        // Preservar missões ATIVAS dos heróis durante o refresh
        // Coleta todos os IDs de missões ativas para evitar que sumam da aba "Ativas"
        const activeIds = new Set<string>(
          state.heroes.flatMap(h => h.activeQuests || [])
        );
        const carryOverActive = state.availableQuests.filter(q => activeIds.has(q.id));

        // Inserir Missão de Desafio da Guilda para Promoção de Rank, se elegível
        if (selectedHero) {
          const progress = rankSystem.calculateProgress(selectedHero);
          if (progress.canPromote && progress.nextRank) {
            const promoQuestId = `guild-promotion-${Date.now()}`;
            const rankInfo = (rankSystem as any).getRankInfo?.(progress.nextRank);
            const title = rankInfo ? `Desafio de Promoção: ${rankInfo.name}` : `Desafio de Promoção de Rank ${progress.nextRank}`;
            const description = rankInfo ? `A guilda convoca ${selectedHero.name} para provar seu valor e ascender ao rank ${progress.nextRank} - ${rankInfo.description}` : `Prove seu valor para ascender ao rank ${progress.nextRank}. Complete objetivos desafiadores sob avaliação da guilda.`;
            const promo = {
              id: promoQuestId,
              title,
              description,
              type: 'historia',
              difficulty: 'epica',
              levelRequirement: Math.max(1, selectedHero.progression.level),
              timeLimit: Math.floor(Math.random() * 61) + 120,
              enemies: [{ type: 'Campeão da Guilda', count: 1, level: selectedHero.progression.level }],
              rewards: { gold: 200, xp: 150, items: [{ id: 'pergaminho-xp', qty: 1 }] },
              repeatable: false,
              isGuildQuest: true,
              sticky: true,
              failurePenalty: { gold: 50, reputation: -10 }
            } as Quest;
            newQuests.push(promo);
            nextCatalog[promo.id] = promo;
            console.log('🏰 Missão de promoção de rank inserida:', title);
          }
        }
        // Reaplicar missões sticky anteriores que não conflitem por id
        previousStickyLimited.forEach(stq => {
          if (!stickyIds.has(stq.id)) {
            newQuests.push(stq);
            nextCatalog[stq.id] = stq;
          }
        });

        // Reaplicar missões ativas anteriores (não-sticky) para manter detalhes visíveis
        const existingIds = new Set(newQuests.map(q => q.id));
        carryOverActive.forEach(aq => {
          if (!existingIds.has(aq.id)) {
            newQuests.push(aq);
            nextCatalog[aq.id] = aq;
          }
        });

        console.log('📋 Missões geradas:', newQuests.length, 'total,', newQuests.filter(q => q.isGuildQuest).length, 'de guilda');
        const hasCaca = newQuests.some(q => q.type === 'caca');
        const hasExploracao = newQuests.some(q => q.type === 'exploracao');
        if (!hasCaca) {
          for (let i = 0; i < 5; i++) {
            const qTry = generateQuest('padrao', heroLevel, false);
            if (qTry.type === 'caca') { newQuests.push(qTry); nextCatalog[qTry.id] = qTry; break; }
          }
        }
        if (!hasExploracao) {
          for (let i = 0; i < 5; i++) {
            const qTry = generateQuest('padrao', heroLevel, false);
            if (qTry.type === 'exploracao') { newQuests.push(qTry); nextCatalog[qTry.id] = qTry; break; }
          }
        }
        const completedSet = new Set<string>(selectedHero?.completedQuests || []);
        newQuests.forEach(q => { nextCatalog[q.id] = q; });
        const filtered = newQuests.filter(q => !completedSet.has(q.id));
        set({ availableQuests: filtered, questCatalog: nextCatalog });
      },

      acceptQuest: async (heroId: string, questId: string) => {
        console.log('🔍 acceptQuest chamada:', { heroId, questId });
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        const quest = state.availableQuests.find(q => q.id === questId);
        console.log('👤 Herói encontrado:', hero ? `${hero.name} (Level ${hero.progression.level})` : 'Não encontrado');
        console.log('📋 Missão encontrada:', quest ? `${quest.title} (Level ${quest.levelRequirement})` : 'Não encontrada');
        if (!hero || !quest) {
          console.log('❌ Herói ou missão não encontrados');
          try { notificationBus.emit({ type: 'quest', title: 'Missão indisponível', message: 'Não foi possível localizar esta missão.', duration: 2500, icon: 'ℹ️' }); } catch {}
          return false;
        }
        if (hero.progression.level < quest.levelRequirement) {
          console.log('❌ Nível insuficiente:', hero.progression.level, '<', quest.levelRequirement);
          try { notificationBus.emit({ type: 'quest', title: 'Nível insuficiente', message: `Requer nível ${quest.levelRequirement}.`, duration: 2500, icon: '⚠️' }); } catch {}
          return false;
        }
        if (hero.activeQuests.includes(questId)) {
          console.log('ℹ️ Missão já ativa:', questId);
          try { notificationBus.emit({ type: 'quest', title: 'Missão já ativa', message: `${quest.title}`, duration: 2000, icon: '🐾' }); } catch {}
          return true;
        }
        if ((hero.completedQuests || []).includes(questId)) {
          console.log('ℹ️ Missão já concluída anteriormente:', questId);
          try { notificationBus.emit({ type: 'quest', title: 'Já concluída', message: `${quest.title}`, duration: 2000, icon: '✅' }); } catch {}
          return false;
        }
        if (hero.activeQuests.length >= 3) {
          console.log('❌ Máximo de missões ativas atingido:', hero.activeQuests.length);
          try { notificationBus.emit({ type: 'quest', title: 'Limite de missões', message: 'Máximo de 3 missões ativas.', duration: 2500, icon: '⛔' }); } catch {}
          return false;
        }
        try {
          const diff = String(quest.difficulty || '').toLowerCase();
          const actionType = diff === 'facil' ? 'MISSION_SHORT' : (diff === 'medio' || diff === 'padrao') ? 'MISSION_MEDIUM' : (diff === 'dificil' ? 'MISSION_LONG' : 'MISSION_MEDIUM');
          const check = await canPerformAction(heroId, actionType);
          if (!check.ok) {
            try { notificationBus.emit({ type: 'stamina', title: 'Fadiga alta', message: `Custo: ${check.cost} ⚡ — descanse para reduzir fadiga.`, duration: 3000, icon: '💤' }); } catch {}
            set({ staminaModal: { required: check.cost, actionType } });
            return false;
          }
          const perf = await performAction(heroId, actionType, { questId });
          const st = hero.stamina || { current: 100, max: 100 } as any;
          get().updateHero(heroId, { stamina: { ...st, current: perf.newStamina } });
        } catch {}
        console.log('✅ Todos os requisitos atendidos, adicionando missão às ativas');
        get().updateHero(heroId, { activeQuests: [...hero.activeQuests, questId] });
        set((s) => ({ questCatalog: { ...s.questCatalog, [questId]: quest } }));
        try { notificationBus.emit({ type: 'quest', title: 'Missão aceita', message: `${quest.title}`, duration: 2500, icon: '✅' }); } catch {}
        console.log('🎉 Missão aceita com sucesso!');
        try { onboardingManager.markStepValidated('accept-quest'); onboardingManager.saveState(); } catch {}
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
        
        if (!hero || !quest) {
          console.log('❌ Falha na validação inicial');
          return null;
        }
        
        let combatResult: CombatResult | null = null;

        
        
        // Resolver combate se houver inimigos
        if (quest.enemies && quest.enemies.length > 0) {
          const isGuildQuest = quest.isGuildQuest || false;
          combatResult = autoResolve 
            ? autoResolveCombat(hero, quest.enemies, isGuildQuest)
            : resolveCombat(hero, quest.enemies);
          
          if (!combatResult.victory) {
            if (quest.failurePenalty) {
              if (quest.failurePenalty.gold) {
                get().gainGold(heroId, -quest.failurePenalty.gold);
              }
              if (quest.failurePenalty.reputation) {
                const factionFail = quest.isGuildQuest ? 'Guarda da Cidade' : (quest.type === 'exploracao' ? 'Exploradores' : 'Guarda da Cidade');
                state.updateReputation(factionFail, quest.failurePenalty.reputation);
              }
            }
            // Continua fluxo de conclusão com recompensas reduzidas
          }
        }
        
        // Sucesso na missão - aplicar recompensas
        console.log('🎉 Missão completada com sucesso! Aplicando recompensas...');
        console.log('💰 Recompensas:', quest.rewards);
        console.log('⚔️ Resultado do combate:', combatResult);
        try {
          const curStats = hero.stats || ({} as any);
          const isColeta = quest.categoryHint === 'coleta' || quest.type === 'exploracao';
          const nextColeta = (curStats.collectionQuestsCompleted || 0) + (isColeta ? 1 : 0);
          const stableQuestDone = quest.isGuildQuest && quest.templateId === 'guild-ovo-basico' ? true : (curStats.stableUnlockQuestCompleted === true);
          get().updateHero(heroId, { stats: { ...hero.stats, collectionQuestsCompleted: nextColeta, stableUnlockQuestCompleted: stableQuestDone } });
        } catch {}
        
        const prevHeroBeforeXP = { ...hero } as Hero;
        get().gainXP(heroId, (quest.rewards?.xp || 0) + (combatResult?.xpGained || 0));
        get().gainGold(heroId, (quest.rewards?.gold || 0) + (combatResult?.goldGained || 0));
        if (quest.rewards?.glory) { get().gainGlory(heroId, quest.rewards.glory); }
        if (quest.rewards?.arcaneEssence) { get().gainArcaneEssence(heroId, quest.rewards.arcaneEssence); }
        
        // Adicionar itens das recompensas
        if (quest.rewards?.items) {
          quest.rewards.items.forEach(item => {
            // Suporta tanto formato objeto { id, qty } quanto string 'itemId'
            if (typeof (item as any) === 'string') {
              const id = item as unknown as string;
              if (id === 'reward-egg-basico') {
                const egg = generateMysteryEgg('comum' as any);
                const heroAfter = get().heroes.find(h => h.id === heroId)!;
                get().updateHero(heroId, { eggs: [...(heroAfter.eggs || []), egg] });
                try { notificationBus.emit({ type: 'item', title: 'Ovo Obtido', message: 'Você recebeu um Ovo Comum da Guilda.', duration: 3500, icon: '🥚' }); } catch {}
                return;
              }
              get().addItemToInventory(heroId, id, 1);
              try {
                const s = get().heroes.find(h => h.id === heroId)!.stats;
                if (id === 'essencia-bestial') {
                  get().updateHero(heroId, { stats: { ...s, beastEssenceCollected: (s.beastEssenceCollected || 0) + 1 } });
                } else if (id === 'pergaminho-montaria') {
                  get().updateHero(heroId, { stats: { ...s, mountScrollsFound: (s.mountScrollsFound || 0) + 1 } });
                }
              } catch {}
            } else {
              const it = item as { id: string; qty?: number };
              if (it.id === 'reward-egg-basico') {
                const qty = it.qty ?? 1;
                for (let i = 0; i < qty; i++) {
                  const egg = generateMysteryEgg('comum' as any);
                  const heroAfter = get().heroes.find(h => h.id === heroId)!;
                  get().updateHero(heroId, { eggs: [...(heroAfter.eggs || []), egg] });
                }
                try { notificationBus.emit({ type: 'item', title: 'Ovo Obtido', message: 'Você recebeu um Ovo Comum da Guilda.', duration: 3500, icon: '🥚' }); } catch {}
                return;
              }
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
              try { notificationBus.emit({ type: 'item', title: 'Ovo Encontrado', message: `${egg.name}`, duration: 3000, icon: '🥚' }); } catch {}
            } else {
              try { notificationBus.emit({ type: 'item', title: 'Inventário de Ovos Cheio', message: 'Você não tem espaço para novos ovos.', duration: 4000 }); } catch {}
            }
          }
        } catch {}

        if (quest.isGuildQuest) {
          const repByDifficulty: Record<string, number> = { 'facil': 5, 'medio': 8, 'dificil': 12, 'epica': 20 };
          const change = repByDifficulty[quest.difficulty] ?? 6;
          state.updateReputation('Guarda da Cidade', change);
          try {
            const curStats = hero.stats || ({} as any);
            const compDone = (curStats.companionQuestsCompleted || 0) + 1;
            get().updateHero(heroId, { stats: { ...hero.stats, companionQuestsCompleted: compDone } });
          } catch {}
        } else {
          const inferred = inferQuestFactionChanges(quest);
          inferred.forEach(({ factionName, change }) => state.updateReputation(factionName, change));
        }
        
        // Atualizar estatísticas e remover missão ativa (com limpeza de missionRunState)
        const updatedHero = get().heroes.find(h => h.id === heroId)!;
        const ms = { ...(updatedHero.stats as any) };
        if (ms.missionRunState) {
          try { delete ms.missionRunState[String(questId)]; } catch {}
        }
        get().updateHero(heroId, {
          activeQuests: updatedHero.activeQuests.filter(id => id !== questId),
          completedQuests: [...updatedHero.completedQuests, questId],
          stats: {
            ...updatedHero.stats,
            questsCompleted: updatedHero.stats.questsCompleted + 1,
            totalCombats: updatedHero.stats.totalCombats + (quest.enemies?.length || 0),
            lastActiveAt: new Date().toISOString(),
            missionRunState: ms.missionRunState
          }
        });

        try { updateProgressDelta({ missionsCompleted: 1 }); } catch {}
        try { logActivity({ type: 'mission_completed', heroId, questId }).catch(() => {}); } catch {}

        set((state) => ({
          availableQuests: state.availableQuests.filter(q => q.id !== questId)
        }));
        
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
          try { useProgressionStore.getState().evaluateUnlocks(finalHero, prevHeroBeforeXP); } catch {}
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

      abandonQuest: (heroId: string, questId: string) => {
        try {
          const state = get();
          const hero = state.heroes.find(h => h.id === heroId);
          if (!hero) return false;
          if (!hero.activeQuests.includes(questId)) return false;
          const nextActive = hero.activeQuests.filter(id => id !== questId);
          get().updateHero(heroId, { activeQuests: nextActive });
          try { notificationBus.emit({ type: 'quest', title: 'Missão abandonada', message: `${questId}`, duration: 2000, icon: '🗑️' }); } catch {}
          return true;
        } catch { return false; }
      },

      getQuestById: (id: string) => {
        const q = get().questCatalog[id];
        if (q) return q;
        return get().availableQuests.find(q => q.id === id);
      },

      clearActiveQuests: (heroId: string) => {
        try {
          const state = get();
          const hero = state.heroes.find(h => h.id === heroId);
          if (!hero) return false;
          if (!(hero.activeQuests || []).length) return true;
          get().updateHero(heroId, { activeQuests: [] });
          try { notificationBus.emit({ type: 'quest', title: 'Missões removidas', message: 'Limpeza de missões ativas concluída', duration: 2500, icon: '🧹' }); } catch {}
          return true;
        } catch { return false; }
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
        const currentRank = rankSystem.calculateRank(hero);
        const rankPercent = RANK_XP_BONUS_PERCENT[currentRank] || 0;
        let extraPercent = 0;
        const statsAny = (hero.stats as any) || {};
        if ((statsAny.innBuffUsesRemaining || 0) > 0 && (statsAny.innBuffXpPercent || 0) > 0) {
          extraPercent += Math.max(0, Number(statsAny.innBuffXpPercent || 0));
          statsAny.innBuffUsesRemaining = Math.max(0, Number(statsAny.innBuffUsesRemaining || 1) - 1);
          get().updateHero(heroId, { stats: { ...hero.stats, ...statsAny } });
        }
        const effectiveXP = Math.floor(xp * (1 + (buffPercent + synergyPercent + rankPercent + extraPercent) / 100));

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
          const prevRankData = updatedHero.rankData;
          const prevRank = prevRankData.currentRank;
          const prevUnlockedNames = new Set((prevRankData.unlockedRewards || []).map(r => r.name));
          const newRankData = rankSystem.updateRankData(updatedHero, prevRankData);
          get().updateHero(heroId, { rankData: newRankData });

          // Aplicar recompensas materiais na promoção
          if (newRankData.currentRank !== prevRank) {
            const newlyUnlocked = (newRankData.unlockedRewards || []).filter(r => !prevUnlockedNames.has(r.name));
            let inv = updatedHero.inventory || { items: {} } as any;
            let stats = updatedHero.stats || {} as any;

            const grantItem = (id: string, name: string, slot?: string, rarity: string = 'comum', description?: string, icon?: string) => {
              const item = { id, name, description: description || name, type: 'cosmetic', rarity, icon: icon || '🎁', slot } as any;
              inv.customItems = { ...(inv.customItems || {}), [id]: item };
              inv.items = { ...(inv.items || {}), [id]: Math.max(0, (inv.items?.[id] || 0)) + 1 };
              if (slot === 'cape') inv.equippedCape = inv.equippedCape || id;
              if (slot === 'chest') inv.equippedChest = inv.equippedChest || id;
              if (slot === 'helm') inv.equippedHelm = inv.equippedHelm || id;
            };

            newlyUnlocked.forEach(r => {
              const n = r.name.toLowerCase();
              if (n === 'capa verde') grantItem('capa-verde', 'Capa Verde', 'cape', 'comum', 'Capa do rank E', '🧥');
              if (n === 'armadura roxa') grantItem('armadura-roxa', 'Armadura Roxa', 'chest', 'raro', 'Armadura do rank C', '⚔️');
              if (n === 'capa de campeão') grantItem('capa-campeao', 'Capa de Campeão', 'cape', 'raro', 'Capa do rank A', '🎭');
              if (n === 'traje ícone imortal' || n === 'traje icone imortal') grantItem('traje-icone-imortal', 'Traje Ícone Imortal', 'chest', 'épico', 'Traje do rank SS', '👗');
              if (n === 'coroa do mito absoluto') grantItem('coroa-mito-absoluto', 'Coroa do Mito Absoluto', 'helm', 'lendário', 'Coroa do rank SSS', '👑');

              if (n.includes('xp bonus')) {
                const rankPercent = RANK_XP_BONUS_PERCENT[newRankData.currentRank] || 0;
                stats.rankXpBonusPercent = rankPercent;
              }
              if (n.includes('gold bonus')) {
                const goldPercent = Number(n.match(/\+?(\d+)%/)?.[1] || 10);
                stats.rankGoldBonusPercent = Math.max(Number(stats.rankGoldBonusPercent || 0), goldPercent);
              }
              if (n === 'título de guardião' || n === 'titulo de guardiao') {
                const titles = updatedHero.progression.titles || [];
                const id = 'guardiao';
                if (!titles.includes(id)) {
                  get().updateHero(heroId, { progression: { ...updatedHero.progression, titles: [...titles, id] } });
                }
              }
              if (n === 'efeito lendário') {
                const auras = Array.isArray(stats.rankVisualAuras) ? stats.rankVisualAuras : [];
                stats.rankVisualAuras = Array.from(new Set([...auras, 'legendary']));
              }
              if (n === 'aura dourada') {
                const auras = Array.isArray(stats.rankVisualAuras) ? stats.rankVisualAuras : [];
                stats.rankVisualAuras = Array.from(new Set([...auras, 'gold']));
              }
              if (n === 'aura mítica') {
                const auras = Array.isArray(stats.rankVisualAuras) ? stats.rankVisualAuras : [];
                stats.rankVisualAuras = Array.from(new Set([...auras, 'mythic']));
              }
              if (n === 'missões especiais' || n === 'missoes especiais') {
                stats.rankAccessSpecialMissions = true;
              }
              if (n === 'acesso total') {
                stats.rankAccessTotal = true;
              }
              if (n === 'convite para missões míticas' || n === 'convite para missoes miticas') {
                stats.rankAccessMythicMissions = true;
              }
              if (n === 'história épica ia' || n === 'historia epica ia' || n === 'lenda personalizada') {
                stats.rankLegendUnlocked = true;
              }
            });
            get().updateHero(heroId, { inventory: inv, stats });
            try { notificationBus.emit({ type: 'achievement', title: 'Recompensas de Rank aplicadas', message: `Itens e bônus liberados para rank ${newRankData.currentRank}`, duration: 3000, icon: '🎁' }); } catch {}
          }
          try { useProgressionStore.getState().evaluateUnlocks(updatedHero, hero); } catch {}
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
        const bonusPercent = Number((hero.stats as any)?.rankGoldBonusPercent || 0);
        const effectiveGold = Math.floor(gold * (1 + bonusPercent / 100));
        get().updateHero(heroId, {
          progression: {
            ...hero.progression,
            gold: Math.max(0, hero.progression.gold + effectiveGold)
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
        if (effectiveGold > 0) {
          get().updateDailyGoalProgress(heroId, 'gold-earned', effectiveGold);
        }
        
        // Update event progress
        if (effectiveGold > 0) {
          eventManager.updateEventProgress(heroId, 'gold-earned', effectiveGold);
        }
        
        // Track gold gained metrics
        if (effectiveGold > 0) {
          trackMetric.goldGained(heroId, effectiveGold);
        }
      },
      
      gainGlory: (heroId: string, glory: number) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        
        get().updateHero(heroId, {
          progression: {
            ...hero.progression,
            glory: Math.max(0, (hero.progression.glory || 0) + glory)
          }
        });
        
        if (glory > 0) {
          try { eventManager.updateEventProgress(heroId, 'glory-earned', glory); } catch {}
        }
      },
      
      gainArcaneEssence: (heroId: string, essence: number) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return;
        
        get().updateHero(heroId, {
          progression: {
            ...hero.progression,
            arcaneEssence: Math.max(0, (hero.progression.arcaneEssence || 0) + essence)
          }
        });
        
        if (essence > 0) {
          try { eventManager.updateEventProgress(heroId, 'arcane-essence-earned', essence); } catch {}
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
            notificationBus.emit({ type: 'item', title: 'Pergaminho de Montaria', message: `Você obteve 📜 x${quantity}.`, duration: 3500, icon: '📜' });
          }
          if (itemId === 'essencia-bestial') {
            const s = hero.stats || ({} as any);
            const next = (s.beastEssenceCollected || 0) + quantity;
            get().updateHero(heroId, { stats: { ...hero.stats, beastEssenceCollected: next } });
            notificationBus.emit({ type: 'item', title: 'Essência Bestial', message: `Você obteve 🧬 x${quantity}.`, duration: 3500, icon: '🧬' });
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
          try { logActivity({ type: 'achievement_unlocked', heroId, count: newAchievements.length }).catch(() => {}); } catch {}
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
          
          const updatedInventory = { ...hero.inventory } as HeroInventory;
          if (item.type === 'weapon') {
            const prefer = item.slot === 'offHand' ? 'offHand' : 'mainHand';
            if (prefer === 'mainHand') {
              if (!updatedInventory.equippedMainHand) updatedInventory.equippedMainHand = itemId;
              else if (!updatedInventory.equippedOffHand) updatedInventory.equippedOffHand = itemId;
              else return false;
            } else {
              if (!updatedInventory.equippedOffHand) updatedInventory.equippedOffHand = itemId;
              else if (!updatedInventory.equippedMainHand) updatedInventory.equippedMainHand = itemId;
              else return false;
            }
            updatedInventory.equippedWeapon = undefined;
            updatedInventory.equippedWeapons = [];
          } else if (item.type === 'armor') {
            const s = item.slot;
            if (!s) {
              if (!updatedInventory.equippedChest) updatedInventory.equippedChest = itemId; else return false;
            } else if (s === 'helm') { if (!updatedInventory.equippedHelm) updatedInventory.equippedHelm = itemId; else return false; }
            else if (s === 'chest') { if (!updatedInventory.equippedChest) updatedInventory.equippedChest = itemId; else return false; }
            else if (s === 'belt') { if (!updatedInventory.equippedBelt) updatedInventory.equippedBelt = itemId; else return false; }
            else if (s === 'gloves') { if (!updatedInventory.equippedGloves) updatedInventory.equippedGloves = itemId; else return false; }
            else if (s === 'boots') { if (!updatedInventory.equippedBoots) updatedInventory.equippedBoots = itemId; else return false; }
            else if (s === 'cape') { if (!updatedInventory.equippedCape) updatedInventory.equippedCape = itemId; else return false; }
            updatedInventory.equippedArmor = undefined;
            updatedInventory.equippedArmorSlots = [];
          } else if (item.type === 'accessory') {
            const s = item.slot;
            if (!s) {
              if (!updatedInventory.equippedRingLeft) updatedInventory.equippedRingLeft = itemId;
              else if (!updatedInventory.equippedRingRight) updatedInventory.equippedRingRight = itemId;
              else if (!updatedInventory.equippedNecklace) updatedInventory.equippedNecklace = itemId;
              else if (!updatedInventory.equippedEarringLeft) updatedInventory.equippedEarringLeft = itemId;
              else if (!updatedInventory.equippedEarringRight) updatedInventory.equippedEarringRight = itemId;
              else return false;
            } else if (s === 'necklace') { if (!updatedInventory.equippedNecklace) updatedInventory.equippedNecklace = itemId; else return false; }
            else if (s === 'ring') {
              if (!updatedInventory.equippedRingLeft) updatedInventory.equippedRingLeft = itemId;
              else if (!updatedInventory.equippedRingRight) updatedInventory.equippedRingRight = itemId;
              else return false;
            } else if (s === 'earring') {
              if (!updatedInventory.equippedEarringLeft) updatedInventory.equippedEarringLeft = itemId;
              else if (!updatedInventory.equippedEarringRight) updatedInventory.equippedEarringRight = itemId;
              else return false;
            }
            updatedInventory.equippedAccessory = undefined;
            updatedInventory.equippedAccessories = [];
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
          try {
            supabase.auth.getUser().then(({ data }: any) => {
              const userId = data?.user?.id;
              if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
            });
          } catch {}
          try {
            const snapshot = {
              weapons: (updatedInventory.equippedWeapons || []),
              armor: (updatedInventory.equippedArmorSlots || []),
              accessories: (updatedInventory.equippedAccessories || []),
              updatedAt: new Date().toISOString()
            };
            localStorage.setItem(`hfn:equipmentBackup:${hero.id}`, JSON.stringify(snapshot));
          } catch {}
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
        const equippedId = (() => {
          if (slot === 'weapon') return inv.equippedMainHand || inv.equippedOffHand || inv.equippedWeapon || (inv.equippedWeapons || [])[0];
          if (slot === 'armor') return inv.equippedChest || inv.equippedArmor || (inv.equippedArmorSlots || [])[0];
          return inv.equippedNecklace || inv.equippedRingLeft || inv.equippedRingRight || inv.equippedAccessory || (inv.equippedAccessories || [])[0];
        })();
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

      addJewel: (heroId: string, tipo: JewelType, nivel: number, qty: number = 1) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const key = `jewel:${tipo}:${Math.max(1, Math.min(10, nivel))}`;
        const inv = hero.inventory;
        const nextJewels = { ...(inv.jewels || {}) } as Record<string, number>;
        nextJewels[key] = (nextJewels[key] || 0) + Math.max(1, qty);
        hero.inventory.jewels = nextJewels;
        set({ heroes: state.heroes.map(h => h.id === heroId ? { ...hero, updatedAt: new Date().toISOString() } : h) });
        return true;
      },

      socketJewel: (heroId: string, itemId: string, jewelKey: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const inv = hero.inventory;
        const qty = inv.jewels?.[jewelKey] || 0;
        if (qty <= 0) return false;
        const baseItem = SHOP_ITEMS.find(i => i.id === itemId) || (inv.customItems ? inv.customItems[itemId] : undefined);
        if (!baseItem) return false;
        const maxSlots = baseItem.type === 'weapon' ? 2 : baseItem.type === 'armor' ? 3 : baseItem.type === 'accessory' ? 1 : 0;
        if (maxSlots <= 0) return false;
        const parts = jewelKey.split(':');
        if (parts.length !== 3) return false;
        const tipo = parts[1] as JewelType;
        const nivel = Number(parts[2]);
        const reqLevel = Jewel.minHeroLevelToEquip(nivel);
        const heroLevel = hero.progression.level || hero.level || 1;
        if (heroLevel < reqLevel) return false;
        const current = { ...(inv.equippedJewelsByItemId || {}) } as Record<string, string[]>;
        const list = [...(current[itemId] || [])];
        if (list.length >= maxSlots) return false;
        list.push(jewelKey);
        current[itemId] = list;
        const nextJewels = { ...(inv.jewels || {}) } as Record<string, number>;
        nextJewels[jewelKey] = Math.max(0, (nextJewels[jewelKey] || 0) - 1);
        hero.inventory.equippedJewelsByItemId = current;
        hero.inventory.jewels = nextJewels;
        const derived = calculateDerivedAttributes(
          hero.attributes,
          hero.class,
          hero.progression.level,
          hero.inventory,
          hero.activeTitle,
          computeCompanionBonus(hero)
        );
        set({ heroes: state.heroes.map(h => h.id === heroId ? { ...hero, derivedAttributes: derived, updatedAt: new Date().toISOString() } : h) });
        try {
          const snapshot = {
            jewels: hero.inventory.jewels,
            equippedJewels: hero.inventory.equippedJewelsByItemId,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(`hfn:jewelState:${hero.id}`, JSON.stringify(snapshot));
        } catch {}
        try {
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      removeJewel: (heroId: string, itemId: string, socketIndex: number) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const inv = hero.inventory;
        const current = { ...(inv.equippedJewelsByItemId || {}) } as Record<string, string[]>;
        const list = [...(current[itemId] || [])];
        if (socketIndex < 0 || socketIndex >= list.length) return false;
        const jewelKey = list[socketIndex];
        list.splice(socketIndex, 1);
        current[itemId] = list;
        const nextJewels = { ...(inv.jewels || {}) } as Record<string, number>;
        nextJewels[jewelKey] = (nextJewels[jewelKey] || 0) + 1;
        hero.inventory.equippedJewelsByItemId = current;
        hero.inventory.jewels = nextJewels;
        const derived = calculateDerivedAttributes(
          hero.attributes,
          hero.class,
          hero.progression.level,
          hero.inventory,
          hero.activeTitle,
          computeCompanionBonus(hero)
        );
        set({ heroes: state.heroes.map(h => h.id === heroId ? { ...hero, derivedAttributes: derived, updatedAt: new Date().toISOString() } : h) });
        try {
          const snapshot = {
            jewels: hero.inventory.jewels,
            equippedJewels: hero.inventory.equippedJewelsByItemId,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(`hfn:jewelState:${hero.id}`, JSON.stringify(snapshot));
        } catch {}
        try {
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      fuseJewels: (heroId: string, jewelKey: string) => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const inv = hero.inventory;
        const qty = inv.jewels?.[jewelKey] || 0;
        if (qty < 2) return false;
        const parts = jewelKey.split(':');
        if (parts.length !== 3) return false;
        const tipo = parts[1] as JewelType;
        const nivel = Number(parts[2]);
        if (nivel >= 10) return false;
        const a = new Jewel(crypto.randomUUID(), tipo, nivel);
        const b = new Jewel(crypto.randomUUID(), tipo, nivel);
        const fused = Jewel.fuse(a, b);
        if (!fused) return false;
        const nextKey = `jewel:${tipo}:${nivel + 1}`;
        const nextJewels = { ...(inv.jewels || {}) } as Record<string, number>;
        nextJewels[jewelKey] = Math.max(0, qty - 2);
        nextJewels[nextKey] = (nextJewels[nextKey] || 0) + 1;
        hero.inventory.jewels = nextJewels;
        set({ heroes: state.heroes.map(h => h.id === heroId ? { ...hero, updatedAt: new Date().toISOString() } : h) });
        try {
          const log = { ts: new Date().toISOString(), from: jewelKey, to: nextKey };
          const snapshot = {
            jewels: hero.inventory.jewels,
            lastFusion: log,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(`hfn:jewelState:${hero.id}`, JSON.stringify(snapshot));
        } catch {}
        try {
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        return true;
      },

      // === FORJA: Encantamento aplicado ao item equipado ===
      enchantEquippedItem: (heroId: string, slot: 'weapon' | 'armor' | 'accessory', enchant: 'lifesteal') => {
        const state = get();
        const hero = state.heroes.find(h => h.id === heroId);
        if (!hero) return false;
        const inv = hero.inventory;
        const equippedId = (() => {
          if (slot === 'weapon') return inv.equippedMainHand || inv.equippedOffHand || inv.equippedWeapon || (inv.equippedWeapons || [])[0];
          if (slot === 'armor') return inv.equippedChest || inv.equippedArmor || (inv.equippedArmorSlots || [])[0];
          return inv.equippedNecklace || inv.equippedRingLeft || inv.equippedRingRight || inv.equippedAccessory || (inv.equippedAccessories || [])[0];
        })();
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

        const updatedInventory = { ...hero.inventory } as HeroInventory;
        let changed = false;
        if (item.type === 'weapon') {
          if (updatedInventory.equippedMainHand === itemId) { updatedInventory.equippedMainHand = undefined; changed = true; }
          if (updatedInventory.equippedOffHand === itemId) { updatedInventory.equippedOffHand = undefined; changed = true; }
          updatedInventory.equippedWeapon = undefined;
          updatedInventory.equippedWeapons = [];
        } else if (item.type === 'armor') {
          if (updatedInventory.equippedHelm === itemId) { updatedInventory.equippedHelm = undefined; changed = true; }
          if (updatedInventory.equippedChest === itemId) { updatedInventory.equippedChest = undefined; changed = true; }
          if (updatedInventory.equippedBelt === itemId) { updatedInventory.equippedBelt = undefined; changed = true; }
          if (updatedInventory.equippedGloves === itemId) { updatedInventory.equippedGloves = undefined; changed = true; }
          if (updatedInventory.equippedBoots === itemId) { updatedInventory.equippedBoots = undefined; changed = true; }
          if (updatedInventory.equippedCape === itemId) { updatedInventory.equippedCape = undefined; changed = true; }
          updatedInventory.equippedArmor = undefined;
          updatedInventory.equippedArmorSlots = [];
        } else if (item.type === 'accessory') {
          if (updatedInventory.equippedRingLeft === itemId) { updatedInventory.equippedRingLeft = undefined; changed = true; }
          if (updatedInventory.equippedRingRight === itemId) { updatedInventory.equippedRingRight = undefined; changed = true; }
          if (updatedInventory.equippedNecklace === itemId) { updatedInventory.equippedNecklace = undefined; changed = true; }
          if (updatedInventory.equippedEarringLeft === itemId) { updatedInventory.equippedEarringLeft = undefined; changed = true; }
          if (updatedInventory.equippedEarringRight === itemId) { updatedInventory.equippedEarringRight = undefined; changed = true; }
          updatedInventory.equippedAccessory = undefined;
          updatedInventory.equippedAccessories = [];
        } else {
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
        try {
          supabase.auth.getUser().then(({ data }: any) => {
            const userId = data?.user?.id;
            if (userId) saveHero(userId, useHeroStore.getState().heroes.find(h => h.id === hero.id));
          });
        } catch {}
        try {
          const snapshot = {
            weapons: (updatedInventory.equippedWeapons || []),
            armor: (updatedInventory.equippedArmorSlots || []),
            accessories: (updatedInventory.equippedAccessories || []),
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(`hfn:equipmentBackup:${hero.id}`, JSON.stringify(snapshot));
        } catch {}
        return true;
      },
      
      useItem: (heroId: string, itemId: string) => {
        const hero = get().heroes.find(h => h.id === heroId);
        if (!hero) return false;
        
        // Capturar estados antes para deltas
        const beforeHp = hero.derivedAttributes.currentHp ?? hero.derivedAttributes.hp;
        const beforeMp = hero.derivedAttributes.currentMp ?? hero.derivedAttributes.mp;
        const beforeFatigue = hero.progression.fatigue ?? 0;

        if (itemId === 'contrato-montaria') {
          const ok = get().generateMountForSelected();
          if (!ok) return false;
          // Remover o item do inventário
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
          return true;
        }

        if (itemId === 'kit-montaria') {
          const items = hero.inventory.items || {} as Record<string, number>;
          const nextItems = { ...items };
          nextItems['contrato-montaria'] = (nextItems['contrato-montaria'] || 0) + 1;
          nextItems['pergaminho-montaria'] = (nextItems['pergaminho-montaria'] || 0) + 1;
          nextItems['essencia-bestial'] = (nextItems['essencia-bestial'] || 0) + 1;
          nextItems['pedra-magica'] = (nextItems['pedra-magica'] || 0) + 1;
          const currentQuantity = hero.inventory.items[itemId] || 0;
          get().updateHero(heroId, { inventory: { ...hero.inventory, items: { ...nextItems, [itemId]: Math.max(0, currentQuantity - 1) } } });
          try { notificationBus.emit({ type: 'item', title: 'Kit de Montaria', message: 'Itens adicionados: 📜, 🧬, 🔷 e Contrato.', duration: 3500, icon: '🎁' }); } catch {}
          return true;
        }

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

        const rewardTotals = newlyUnlocked.reduce((acc, a) => {
          acc.xp += Number(a.rewards?.xp || 0);
          acc.gold += Number(a.rewards?.gold || 0);
          return acc;
        }, { xp: 0, gold: 0 });

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

        const progression = {
          ...hero.progression,
          xp: (hero.progression.xp || 0) + rewardTotals.xp,
          gold: (hero.progression.gold || 0) + rewardTotals.gold
        } as any;
        get().updateHero(hero.id, {
          achievements: updatedAchievements,
          titles: updatedTitles,
          progression
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
        const selected = heroes.find(h => h.id === selectedHeroId && h.origin !== 'npc');
        if (selected) return selected;
        const firstPlayer = heroes.find(h => h.origin !== 'npc');
        return firstPlayer || heroes[0];
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
          let goalsSource = hero.dailyGoals && hero.dailyGoals.length > 0 ? hero.dailyGoals : generateDailyGoals(hero);

          const activeGoals = removeExpiredGoals(goalsSource);

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

        const currentRank = hero.rankData?.currentRank || rankSystem.calculateRank(hero);
        const maxAttr = getMaxAttributeForRank(currentRank);
        const totalCap = getTotalAttributePointsCapForRank(currentRank);
        
        // Validar limites máximos por atributo
        const newAttributes = { ...hero.attributes };
        for (const { key, inc } of increments) {
          const current = newAttributes[key];
          const proposed = current + inc;
          if (proposed > maxAttr) {
            return false;
          }
          newAttributes[key] = proposed;
        }

        const totalAfter = Object.values(newAttributes).reduce((s, v) => s + v, 0);

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
              gold: hero.progression.gold + rewards.gold,
              glory: (hero.progression.glory || 0) + (rewards as any).glory || (hero.progression.glory || 0),
              arcaneEssence: (hero.progression.arcaneEssence || 0) + (rewards as any).arcaneEssence || (hero.progression.arcaneEssence || 0)
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
            const rankOrder = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E', 'F'];
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
        referralInvites: state.referralInvites
      }),
      migrate: (persistedState: any, _version: number) => {
        // Migração para garantir que heróis tenham as propriedades necessárias
        if (persistedState?.heroes) {
          persistedState.heroes = persistedState.heroes.map((hero: any) => {
            const migratedHero = {
              ...hero,
              reputationFactions: hero.reputationFactions || [
                { id: 'guarda', name: 'Guarda da Cidade', reputation: 0, level: 'neutral' },
                { id: 'ladroes', name: 'Ladrões', reputation: 0, level: 'neutral' },
                { id: 'clero', name: 'Clero', reputation: 0, level: 'neutral' },
                { id: 'cultistas', name: 'Cultistas', reputation: 0, level: 'neutral' },
                { id: 'comerciantes', name: 'Comerciantes', reputation: 0, level: 'neutral' },
                { id: 'exploradores', name: 'Exploradores', reputation: 0, level: 'neutral' }
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
