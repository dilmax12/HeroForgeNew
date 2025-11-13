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
      }),
    }
  )
);

// Helper para acesso fora de componentes React
export const getGameSettings = () => useGameSettingsStore.getState();
