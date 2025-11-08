import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameSettingsState {
  regenHpPerMin: number;
  regenMpPerMin: number;
  regenStaminaPerMin: number;
  deathRecoveryMinutes: number;
  deathPenaltyEnabled: boolean;
  updateSettings: (updates: Partial<GameSettingsState>) => void;
  resetDefaults: () => void;
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
      }),
    }
  )
);

// Helper para acesso fora de componentes React
export const getGameSettings = () => useGameSettingsStore.getState();

