export type DungeonDifficulty = 'facil' | 'normal' | 'dificil' | 'epico' | 'hardcore' | 'caotico';

export type DungeonConfig = {
  enemyBase: { hp: number; atk: number; def: number };
  scaling: { hpPerFloor: number; atkPerFloor: number; defPerFloor: number; bossMultiplier: number; affixBonus: number };
  rewards: { xpPerFloor: number; goldPerFloor: number; rarityIncreasePerFloor: number; streakMultiplierPerFloor: number };
  events: { baseChance: number };
  deathPenalty: { normal: { gold: number; xp: number }, hardcore: { gold: number; xp: number } };
  difficultyMultipliers: Record<DungeonDifficulty, { enemy: number; rewards: number; successBaseBias: number }>;
};

export const dungeonConfig: DungeonConfig = {
  enemyBase: { hp: 30, atk: 6, def: 3 },
  scaling: { hpPerFloor: 0.12, atkPerFloor: 0.1, defPerFloor: 0.08, bossMultiplier: 1.8, affixBonus: 0.2 },
  rewards: { xpPerFloor: 6, goldPerFloor: 2, rarityIncreasePerFloor: 0.6, streakMultiplierPerFloor: 0.07 },
  events: { baseChance: 0.1 },
  deathPenalty: { normal: { gold: 0.5, xp: 0.3 }, hardcore: { gold: 0.8, xp: 0.6 } },
  difficultyMultipliers: {
    facil: { enemy: 0.85, rewards: 0.9, successBaseBias: 0.1 },
    normal: { enemy: 1.0, rewards: 1.0, successBaseBias: 0.0 },
    dificil: { enemy: 1.2, rewards: 1.25, successBaseBias: -0.05 },
    epico: { enemy: 1.45, rewards: 1.5, successBaseBias: -0.1 },
    hardcore: { enemy: 1.6, rewards: 1.7, successBaseBias: -0.15 },
    caotico: { enemy: 1.3, rewards: 1.6, successBaseBias: -0.2 }
  }
};

export function isBossFloor(floor: number): boolean {
  return floor > 0 && floor % 10 === 0;
}

export function isMiniBossFloor(floor: number): boolean {
  return floor > 0 && floor % 5 === 0 && floor % 10 !== 0;
}

export function computeRewardMultiplier(streak: number) {
  return 1 + streak * dungeonConfig.rewards.streakMultiplierPerFloor;
}

export function getDifficultyParams(diff: DungeonDifficulty) {
  return dungeonConfig.difficultyMultipliers[diff] || dungeonConfig.difficultyMultipliers.normal;
}
