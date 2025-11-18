import { Hero } from '../types/hero';
import { getGameSettings } from '../store/gameSettingsStore';
import { computeTier } from './relationshipSystem';

export type BenefitTier = 'none' | 'tier1' | 'tier3' | 'tier5';

function getBestRelationTier(hero: Hero): { tierName: string; value: number } {
  try {
    const map = hero.npcMemory?.friendStatusByHeroId || {};
    const ids = Object.keys(map);
    if (ids.length === 0) return { tierName: 'neutro', value: 0 };
    const vals = ids.map(id => ({ id, status: map[id] }));
    const order = ['rival','neutro','conhecido','amigo','melhor_amigo','aliado'];
    vals.sort((a,b) => order.indexOf(b.status) - order.indexOf(a.status));
    return { tierName: vals[0].status, value: 1 } as any;
  } catch { return { tierName: 'neutro', value: 0 }; }
}

export function getShopDiscountPercent(hero: Hero): number {
  const s = getGameSettings();
  const intensity = (s.relationIntensityPercent ?? 100) / 100;
  const best = getBestRelationTier(hero).tierName;
  const base = best === 'amigo' ? 0.10 : best === 'melhor_amigo' ? 0.20 : best === 'aliado' ? 0.30 : 0;
  return Math.min(0.5, base * intensity);
}

export function getMissionBuffPercent(hero: Hero): number {
  const s = getGameSettings();
  const intensity = (s.relationIntensityPercent ?? 100) / 100;
  const best = getBestRelationTier(hero).tierName;
  const base = best === 'amigo' ? 0.05 : best === 'melhor_amigo' ? 0.10 : best === 'aliado' ? 0.15 : 0;
  return Math.min(0.25, base * intensity);
}

export function getUnlockTier(hero: Hero): BenefitTier {
  const val = Math.max(...Object.values(hero.socialRelations || {}));
  const tier = computeTier(val);
  if (tier === 'conhecido') return 'tier1';
  if (tier === 'melhor_amigo') return 'tier5';
  if (tier === 'amigo') return 'tier3';
  return 'none';
}