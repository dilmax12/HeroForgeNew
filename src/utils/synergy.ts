import { Hero } from '../types/hero'
import { CLASS_METADATA } from './classRegistry'
import { getRecommendedElements } from './elementSystem'

export function computeSynergyBonus(hero: Hero): number {
  const meta = CLASS_METADATA[hero.class]
  if (!meta) return 0
  const raceGood = meta.suggestedRaces?.includes(hero.race) ? 1 : 0
  const elRecs = getRecommendedElements(hero.class, hero.race)
  const elemGood = elRecs.includes(hero.element) ? 1 : 0
  const score = raceGood + elemGood
  if (score === 2) return 0.1
  if (score === 1) return 0.05
  return 0
}

