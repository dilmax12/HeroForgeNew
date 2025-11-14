import { HeroClass, HeroRace, HeroAttributes, Element } from '../types/hero'
import { CLASS_METADATA } from './classRegistry'
import { getRecommendedElements } from './elementSystem'
import { getRecommendedTalentPlan } from './talentRecommendations'

export function getClassPreset(heroClass: HeroClass, race: HeroRace): { attributes: HeroAttributes; element: Element; plannedTalents: string[] } {
  const meta = CLASS_METADATA[heroClass]
  const attributes = meta?.baseAttributes as HeroAttributes
  const els = getRecommendedElements(heroClass, race)
  const element = (els[0] as Element) || 'physical'
  const plannedTalents = getRecommendedTalentPlan(heroClass)
  return { attributes, element, plannedTalents }
}

