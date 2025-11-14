import { HeroClass } from '../types/hero'
import { PROGRESSION_SKILLS } from './skillSystem'

const CLASS_PREF: Record<HeroClass, ('attack'|'buff'|'support')[]> = {
  guerreiro: ['attack','buff','support'],
  mago: ['attack','buff','support'],
  ladino: ['attack','buff','support'],
  clerigo: ['support','buff','attack'],
  patrulheiro: ['attack','buff','support'],
  paladino: ['buff','attack','support'],
  arqueiro: ['attack','buff','support'],
  bardo: ['support','buff','attack'],
  monge: ['buff','attack','support'],
  assassino: ['attack','buff','support'],
  barbaro: ['attack','buff','support'],
  lanceiro: ['attack','buff','support'],
  druida: ['support','buff','attack'],
  feiticeiro: ['attack','buff','support']
}

export function getRecommendedTalentPlan(heroClass: HeroClass): string[] {
  const defs = PROGRESSION_SKILLS[heroClass] || []
  const pref = CLASS_PREF[heroClass] || ['attack','buff','support']
  const plan: string[] = []
  for (const d of defs) {
    const sorted = [...d.skills].sort((a,b) => pref.indexOf(a.type as any) - pref.indexOf(b.type as any))
    const chosen = sorted[0]
    if (chosen?.id) plan.push(chosen.id)
  }
  return plan
}

