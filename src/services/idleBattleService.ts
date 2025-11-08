import { Hero, CombatResult, QuestEnemy } from '../types/hero';
import { autoResolveCombat } from '../utils/combat';

export interface DailyAutoMissionRun {
  victory: boolean;
  xpGained: number;
  goldGained: number;
  itemsGained: any[];
  log: string[];
  enemies: QuestEnemy[];
}

export interface DailyAutoMissionResult {
  heroId: string;
  dateKey: string; // YYYY-MM-DD
  runs: DailyAutoMissionRun[];
  xpTotal: number;
  goldTotal: number;
  victories: number;
}

function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pickEnemiesForLevel(level: number): QuestEnemy[] {
  if (level <= 2) {
    return [
      { type: 'Goblin', count: 2, level: Math.max(1, level) },
      { type: 'Lobo', count: 1, level }
    ];
  }
  if (level <= 5) {
    return [
      { type: 'Bandido', count: 1, level },
      { type: 'Esqueleto', count: 1, level }
    ];
  }
  return [
    { type: 'Troll', count: 1, level },
    { type: 'Bandido', count: 2, level }
  ];
}

function storageKey(heroId: string, dayKey: string) {
  return `idle_daily_${heroId}_${dayKey}`;
}

export function runDailyAutoMissions(hero: Hero, maxRuns?: number): DailyAutoMissionResult {
  const level = Number(hero?.progression?.level || 1);
  const runsCount = Math.max(1, Math.min(3, maxRuns || (level <= 2 ? 1 : level <= 5 ? 2 : 3)));
  const dayKey = dateKey(new Date());
  const heroId = hero.id || hero.name || 'anon';

  const runs: DailyAutoMissionRun[] = [];
  let xpTotal = 0;
  let goldTotal = 0;
  let victories = 0;

  for (let i = 0; i < runsCount; i++) {
    const enemies = pickEnemiesForLevel(level);
    const result: CombatResult = autoResolveCombat(hero, enemies);
    runs.push({
      victory: result.victory,
      xpGained: result.xpGained,
      goldGained: result.goldGained,
      itemsGained: result.itemsGained || [],
      log: result.log || [],
      enemies
    });
    xpTotal += result.xpGained;
    goldTotal += result.goldGained;
    victories += result.victory ? 1 : 0;
  }

  const payload: DailyAutoMissionResult = {
    heroId,
    dateKey: dayKey,
    runs,
    xpTotal,
    goldTotal,
    victories
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey(heroId, dayKey), JSON.stringify(payload));
    }
  } catch {}

  return payload;
}

export function getDailyResult(hero: Hero): DailyAutoMissionResult | null {
  const heroId = hero.id || hero.name || 'anon';
  const dayKey = dateKey(new Date());
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(storageKey(heroId, dayKey));
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function getOrRunDailyResult(hero: Hero, maxRuns?: number): DailyAutoMissionResult {
  const existing = getDailyResult(hero);
  if (existing) return existing;
  return runDailyAutoMissions(hero, maxRuns);
}

