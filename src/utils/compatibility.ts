import { HeroClass, HeroRace, HeroAttributes } from '../types/hero'
import { CLASS_METADATA } from './classRegistry'

export function getRaceCompatibility(heroClass: HeroClass, race: HeroRace): { ok: boolean; message: string } {
  const meta = CLASS_METADATA[heroClass]
  if (!meta?.suggestedRaces || meta.suggestedRaces.length === 0) return { ok: true, message: 'Compatível' }
  const ok = meta.suggestedRaces.includes(race)
  return {
    ok,
    message: ok ? 'Excelente sinergia de raça para esta classe.' : 'Funciona, mas não é a raça mais sinérgica para esta classe.'
  }
}

export function getRecommendedAttributePlan(heroClass: HeroClass): Array<{ attribute: keyof HeroAttributes; priority: 'alta'|'media'|'baixa'; hint: string }>{
  const meta = CLASS_METADATA[heroClass]
  if (!meta) return []
  const b = meta.baseAttributes
  const pick = (attr: keyof HeroAttributes, priority: 'alta'|'media'|'baixa'): { attribute: keyof HeroAttributes; priority: 'alta'|'media'|'baixa'; hint: string } => ({ attribute: attr, priority, hint: `Priorize ${attr} (${priority}). Base ${b[attr]}` })
  switch (heroClass) {
    case 'guerreiro': return [pick('forca','alta'), pick('constituicao','alta'), pick('destreza','media')]
    case 'mago': return [pick('inteligencia','alta'), pick('sabedoria','alta'), pick('constituicao','media')]
    case 'ladino': return [pick('destreza','alta'), pick('forca','media'), pick('carisma','media')]
    case 'clerigo': return [pick('sabedoria','alta'), pick('inteligencia','media'), pick('constituicao','media')]
    case 'patrulheiro': return [pick('destreza','alta'), pick('sabedoria','media'), pick('forca','media')]
    case 'paladino': return [pick('constituicao','alta'), pick('forca','alta'), pick('sabedoria','media')]
    case 'arqueiro': return [pick('destreza','alta'), pick('sabedoria','media'), pick('forca','media')]
    case 'bardo': return [pick('carisma','alta'), pick('sabedoria','media'), pick('destreza','media')]
    case 'monge': return [pick('constituicao','alta'), pick('destreza','alta'), pick('sabedoria','media')]
    case 'assassino': return [pick('destreza','alta'), pick('forca','media'), pick('inteligencia','media')]
    case 'barbaro': return [pick('forca','alta'), pick('constituicao','alta'), pick('destreza','media')]
    case 'lanceiro': return [pick('destreza','alta'), pick('forca','alta'), pick('constituicao','media')]
    case 'druida': return [pick('sabedoria','alta'), pick('inteligencia','media'), pick('constituicao','media')]
    case 'feiticeiro': return [pick('inteligencia','alta'), pick('carisma','media'), pick('sabedoria','media')]
    default: return []
  }
}