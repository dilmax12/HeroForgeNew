import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameSettingsState {
  regenHpPerMin: number;
  regenMpPerMin: number;
  regenStaminaPerMin: number;
  deathRecoveryMinutes: number;
  deathPenaltyEnabled: boolean;

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
  npcDuelRivalryModerate?: number;
  npcDuelRivalryHigh?: number;
  npcDuelLevelDiffMax?: number;
  npcInteractionCooldownSeconds?: number;

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
  regenHpPerMin: 5,
  regenMpPerMin: 5,
  regenStaminaPerMin: 5,
  deathRecoveryMinutes: 10,
  deathPenaltyEnabled: true,
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
  npcDuelRivalryModerate: -30,
  npcDuelRivalryHigh: -60,
  npcDuelLevelDiffMax: 5,
  npcInteractionCooldownSeconds: 90,
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
        npcDuelRivalryModerate: state.npcDuelRivalryModerate,
        npcDuelRivalryHigh: state.npcDuelRivalryHigh,
        npcDuelLevelDiffMax: state.npcDuelLevelDiffMax,
        npcInteractionCooldownSeconds: state.npcInteractionCooldownSeconds,
      }),
    }
  )
);

// Helper para acesso fora de componentes React
export const getGameSettings = () => useGameSettingsStore.getState();
