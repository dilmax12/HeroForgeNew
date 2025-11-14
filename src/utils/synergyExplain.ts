import { HeroClass, HeroRace, Element } from '../types/hero'
import { CLASS_METADATA } from './classRegistry'
import { getRecommendedElements } from './elementSystem'

export function getElementSuggestionReason(heroClass: HeroClass, race: HeroRace, element: Element): string {
  const meta = CLASS_METADATA[heroClass]
  const recEls = getRecommendedElements(heroClass, race)
  const raceTip = meta?.suggestedRaces?.includes(race) ? `${capitalize(race)} é uma boa escolha para ${capitalizeClass(heroClass)}.` : `${capitalize(race)} funciona, mas outras raças podem ter melhor sinergia.`
  const elemTip = recEls.includes(element)
    ? `${capitalize(element)} está entre os elementos recomendados para ${capitalizeClass(heroClass)} (${recEls.join(', ')}).`
    : `Recomendamos ${recEls.join(', ')} para ${capitalizeClass(heroClass)}; ajustei para priorizar afinidade.`
  return `${raceTip} ${elemTip}`
}

function capitalize(str: string) { return str.charAt(0).toUpperCase() + str.slice(1) }
function capitalizeClass(cls: string) { return cls.charAt(0).toUpperCase() + cls.slice(1) }