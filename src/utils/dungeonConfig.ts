export type DungeonConfig = {
  enemyBase: { hp: number; atk: number; def: number };
  scaling: { hpPerFloor: number; atkPerFloor: number; defPerFloor: number; bossMultiplier: number; affixBonus: number };
  rewards: { xpPerFloor: number; goldPerFloor: number; rarityIncreasePerFloor: number; streakMultiplierPerFloor: number };
  events: { baseChance: number };
  deathPenalty: { normal: { gold: number; xp: number } };
  bossSchedule: number[];
};

export const dungeonConfig: DungeonConfig = {
  enemyBase: { hp: 30, atk: 6, def: 3 },
  scaling: { hpPerFloor: 0.12, atkPerFloor: 0.1, defPerFloor: 0.08, bossMultiplier: 1.8, affixBonus: 0.2 },
  rewards: { xpPerFloor: 6, goldPerFloor: 2, rarityIncreasePerFloor: 0.6, streakMultiplierPerFloor: 0.07 },
  events: { baseChance: 0.1 },
  deathPenalty: { normal: { gold: 0.5, xp: 0.3 } },
  bossSchedule: [10, 20, 30, 40]
};

export function isBossFloor(floor: number): boolean {
  return dungeonConfig.bossSchedule.includes(floor);
}

export function computeRewardMultiplier(streak: number) {
  return 1 + streak * dungeonConfig.rewards.streakMultiplierPerFloor;
}
