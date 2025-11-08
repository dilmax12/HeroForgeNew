export const LEVEL_CAP = 20;
export const ATTRIBUTE_POINTS_PER_LEVEL = 3;

export function calculateXPForLevel(level: number): number {
  return level * 100 + (level - 1) * 50;
}

export function checkLevelUp(currentXP: number, currentLevel: number): number {
  let level = currentLevel;
  while (level < LEVEL_CAP && currentXP >= calculateXPForLevel(level + 1)) {
    level++;
  }
  return level;
}

