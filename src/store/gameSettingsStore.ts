import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameSettingsState {
  regenHpPerMin: number;
  regenMpPerMin: number;
  regenStaminaPerMin: number;
  deathRecoveryMinutes: number;
  deathPenaltyEnabled: boolean;

  restBuffHpMpMultiplier?: number;
  restBuffStaminaMultiplier?: number;
  restBuffDurationMinutes?: number;
  meditationMpBonusPerMin?: number;
  meditationDurationMinutes?: number;
  meditationCooldownMinutes?: number;
  dungeonRegenMultiplier?: number;

  // Buffs globais aplicados pela Guilda (Conselho)
  guildXpBuffPercent?: number; // ex.: 20 para +20% XP
  trainingCostReductionPercent?: number; // ex.: 10 para -10% custo
  activeGuildEventName?: string;
  guildEventExpiresAt?: string; // ISO timestamp
  guildBuffSourceGuildId?: string; // para rastrear origem

  inviteLinksEnabled: boolean;
  inviteLinkValidityDays: number;
  invitePrivacyLevel: 'public' | 'friends' | 'private';
  inviteShareIncludeContacts: boolean;
  inviteRewardGold: number;
  inviteRewardXP: number;

  // NPC Immersive mode and dialogue fine-tuning
  npcImmersiveModeEnabled?: boolean;
  npcDialogueWhisperProb?: number; // 0..1
  npcDialogueThoughtProb?: number; // 0..1
  npcBiomeLexiconEnabled?: boolean;
  npcSeedTarget?: number;
  npcVisibleCap?: number;
  npcRotationSeconds?: number;
  npcNotificationsMode?: 'off' | 'compact' | 'normal';
  npcNotifyMaxPerTick?: number;
  npcInteractionDifficulty?: 'low' | 'normal' | 'high';
  npcRelationKnownThreshold?: number;
  npcRelationFriendThreshold?: number;
  npcRelationBestFriendThreshold?: number;
  npcRelationAllyThreshold?: number;
  npcRelationRivalThreshold?: number;
  npcDuelRivalryModerate?: number;
  npcDuelRivalryHigh?: number;
  npcDuelLevelDiffMax?: number;
  npcInteractionCooldownSeconds?: number;
  npcRelationDecayPerDay?: number;
  npcRelationPositiveWeight?: number;
  npcRelationNegativeWeight?: number;
  npcRelationFactionCascadePercent?: number;
  relationIntensityPercent?: number;
  eventsCascadePerDay?: number;
  interactionsCooldownMinutes?: number;
  randomEventsEnabled?: boolean;
  eventsCooldownDaysMin?: number;
  eventsCooldownDaysMax?: number;
  rivalEncounterChance?: number;
  autoInteractionEnabled?: boolean;
  autoChanceMinPercent?: number;
  autoChanceMaxPercent?: number;
  notifSoundEnabled?: boolean;
  notifVisualMode?: 'compact' | 'full';
  notifPriorityMode?: 'important_first' | 'normal';
  notifFrequency?: 'low' | 'normal' | 'high';
  dailyNpcInteractionsLimit?: number;

  reducedMotionEnabled?: boolean;
  saveDataEnabled?: boolean;
  networkEffectiveType?: string;

  updateSettings: (updates: Partial<GameSettingsState>) => void;
  resetDefaults: () => void;
  applyGuildBuffs: (params: {
    xpBuffPercent?: number;
    trainingDiscountPercent?: number;
    eventName?: string;
    expiresAt?: string;
    sourceGuildId?: string;
  }) => void;
  clearGuildBuffs: () => void;
}

const DEFAULTS = {
  regenHpPerMin: 6,
  regenMpPerMin: 5,
  regenStaminaPerMin: 5,
  deathRecoveryMinutes: 10,
  deathPenaltyEnabled: true,
  restBuffHpMpMultiplier: 1.5,
  restBuffStaminaMultiplier: 2,
  restBuffDurationMinutes: 10,
  meditationMpBonusPerMin: 8,
  meditationDurationMinutes: 2,
  meditationCooldownMinutes: 10,
  dungeonRegenMultiplier: 0.5,
  inviteLinksEnabled: true,
  inviteLinkValidityDays: 7,
  invitePrivacyLevel: 'public' as const,
  inviteShareIncludeContacts: false,
  inviteRewardGold: 100,
  inviteRewardXP: 150,
  npcImmersiveModeEnabled: false,
  npcDialogueWhisperProb: 0.25,
  npcDialogueThoughtProb: 0.35,
  npcBiomeLexiconEnabled: true,
  npcSeedTarget: 30,
  npcVisibleCap: 6,
  npcRotationSeconds: 60,
  npcNotificationsMode: 'compact' as const,
  npcNotifyMaxPerTick: 3,
  npcInteractionDifficulty: 'normal' as const,
  npcRelationKnownThreshold: 10,
  npcRelationFriendThreshold: 40,
  npcRelationBestFriendThreshold: 75,
  npcRelationAllyThreshold: 90,
  npcRelationRivalThreshold: -30,
  npcDuelRivalryModerate: -30,
  npcDuelRivalryHigh: -60,
  npcDuelLevelDiffMax: 5,
  npcInteractionCooldownSeconds: 90,
  npcRelationDecayPerDay: 1,
  npcRelationPositiveWeight: 4,
  npcRelationNegativeWeight: 5,
  npcRelationFactionCascadePercent: 0.005,
  relationIntensityPercent: 100,
  eventsCascadePerDay: 2,
  interactionsCooldownMinutes: 15,
  randomEventsEnabled: true,
  eventsCooldownDaysMin: 2,
  eventsCooldownDaysMax: 4,
  rivalEncounterChance: 0.2,
  autoInteractionEnabled: true,
  autoChanceMinPercent: 30,
  autoChanceMaxPercent: 70,
  notifSoundEnabled: true,
  notifVisualMode: 'compact' as const,
  notifPriorityMode: 'important_first' as const,
  notifFrequency: 'normal' as const,
  dailyNpcInteractionsLimit: 2,
  reducedMotionEnabled: false,
  saveDataEnabled: false,
  networkEffectiveType: 'unknown',
};

export const useGameSettingsStore = create<GameSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      updateSettings: (updates) => {
        const next = { ...get(), ...updates } as GameSettingsState;
        set(next);
      },
      resetDefaults: () => set(DEFAULTS),
      applyGuildBuffs: ({ xpBuffPercent, trainingDiscountPercent, eventName, expiresAt, sourceGuildId }) => {
        const current = get();
        set({
          ...current,
          guildXpBuffPercent: xpBuffPercent ?? current.guildXpBuffPercent ?? 0,
          trainingCostReductionPercent: trainingDiscountPercent ?? current.trainingCostReductionPercent ?? 0,
          activeGuildEventName: eventName ?? current.activeGuildEventName,
          guildEventExpiresAt: expiresAt ?? current.guildEventExpiresAt,
          guildBuffSourceGuildId: sourceGuildId ?? current.guildBuffSourceGuildId,
        });
      },
      clearGuildBuffs: () => {
        const current = get();
        set({
          ...current,
          guildXpBuffPercent: 0,
          trainingCostReductionPercent: 0,
          activeGuildEventName: undefined,
          guildEventExpiresAt: undefined,
          guildBuffSourceGuildId: undefined,
        });
      }
    }),
    {
      name: 'heroforge-game-settings',
      version: 1,
      partialize: (state) => ({
        regenHpPerMin: state.regenHpPerMin,
        regenMpPerMin: state.regenMpPerMin,
        regenStaminaPerMin: state.regenStaminaPerMin,
        deathRecoveryMinutes: state.deathRecoveryMinutes,
        deathPenaltyEnabled: state.deathPenaltyEnabled,
        restBuffHpMpMultiplier: state.restBuffHpMpMultiplier,
        restBuffStaminaMultiplier: state.restBuffStaminaMultiplier,
        restBuffDurationMinutes: state.restBuffDurationMinutes,
        meditationMpBonusPerMin: state.meditationMpBonusPerMin,
        meditationDurationMinutes: state.meditationDurationMinutes,
        meditationCooldownMinutes: state.meditationCooldownMinutes,
        dungeonRegenMultiplier: state.dungeonRegenMultiplier,
        guildXpBuffPercent: state.guildXpBuffPercent,
        trainingCostReductionPercent: state.trainingCostReductionPercent,
        activeGuildEventName: state.activeGuildEventName,
        guildEventExpiresAt: state.guildEventExpiresAt,
        guildBuffSourceGuildId: state.guildBuffSourceGuildId,
        inviteLinksEnabled: state.inviteLinksEnabled,
        inviteLinkValidityDays: state.inviteLinkValidityDays,
        invitePrivacyLevel: state.invitePrivacyLevel,
        inviteShareIncludeContacts: state.inviteShareIncludeContacts,
        inviteRewardGold: state.inviteRewardGold,
        inviteRewardXP: state.inviteRewardXP,
        npcImmersiveModeEnabled: state.npcImmersiveModeEnabled,
        npcDialogueWhisperProb: state.npcDialogueWhisperProb,
        npcDialogueThoughtProb: state.npcDialogueThoughtProb,
        npcBiomeLexiconEnabled: state.npcBiomeLexiconEnabled,
        npcSeedTarget: state.npcSeedTarget,
        npcVisibleCap: state.npcVisibleCap,
        npcRotationSeconds: state.npcRotationSeconds,
        npcNotificationsMode: state.npcNotificationsMode,
        npcNotifyMaxPerTick: state.npcNotifyMaxPerTick,
        npcInteractionDifficulty: state.npcInteractionDifficulty,
        npcRelationKnownThreshold: state.npcRelationKnownThreshold,
        npcRelationFriendThreshold: state.npcRelationFriendThreshold,
        npcRelationBestFriendThreshold: state.npcRelationBestFriendThreshold,
        npcRelationAllyThreshold: state.npcRelationAllyThreshold,
        npcRelationRivalThreshold: state.npcRelationRivalThreshold,
        npcDuelRivalryModerate: state.npcDuelRivalryModerate,
        npcDuelRivalryHigh: state.npcDuelRivalryHigh,
        npcDuelLevelDiffMax: state.npcDuelLevelDiffMax,
        npcInteractionCooldownSeconds: state.npcInteractionCooldownSeconds,
        npcRelationDecayPerDay: state.npcRelationDecayPerDay,
        npcRelationPositiveWeight: state.npcRelationPositiveWeight,
        npcRelationNegativeWeight: state.npcRelationNegativeWeight,
        npcRelationFactionCascadePercent: state.npcRelationFactionCascadePercent,
        relationIntensityPercent: state.relationIntensityPercent,
        eventsCascadePerDay: state.eventsCascadePerDay,
        interactionsCooldownMinutes: state.interactionsCooldownMinutes,
        randomEventsEnabled: state.randomEventsEnabled,
        eventsCooldownDaysMin: state.eventsCooldownDaysMin,
        eventsCooldownDaysMax: state.eventsCooldownDaysMax,
        rivalEncounterChance: state.rivalEncounterChance,
        autoInteractionEnabled: state.autoInteractionEnabled,
        autoChanceMinPercent: state.autoChanceMinPercent,
        autoChanceMaxPercent: state.autoChanceMaxPercent,
        notifSoundEnabled: state.notifSoundEnabled,
        notifVisualMode: state.notifVisualMode,
        notifPriorityMode: state.notifPriorityMode,
        notifFrequency: state.notifFrequency,
        dailyNpcInteractionsLimit: state.dailyNpcInteractionsLimit,
        reducedMotionEnabled: state.reducedMotionEnabled,
        saveDataEnabled: state.saveDataEnabled,
        networkEffectiveType: state.networkEffectiveType,
      }),
    }
  )
);

// Helper para acesso fora de componentes React
export const getGameSettings = () => useGameSettingsStore.getState();
