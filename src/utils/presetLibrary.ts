import { HeroClass, HeroRace, HeroCreationData } from '../types/hero'
import { createInitialAttributes } from './attributeSystem'
import { getClassPreset } from './buildPresets'

type Preset = { id: string; name: string; class: HeroClass; race: HeroRace }

const PRESETS: Preset[] = [
  { id: 'mago-elfo-controle', name: 'Mago Elfo – Controle', class: 'mago', race: 'elfo' },
  { id: 'paladino-humano-defesa', name: 'Paladino Humano – Defesa', class: 'paladino', race: 'humano' },
  { id: 'assassino-halfling-critico', name: 'Assassino Halfling – Crítico', class: 'assassino', race: 'halfling' },
  { id: 'barbaro-orc-fogo', name: 'Bárbaro Orc – Fogo', class: 'barbaro', race: 'orc' }
]

export function getPresetOptions(): Preset[] { return PRESETS }

export function buildFromPreset(p: Preset): Partial<HeroCreationData> {
  const base = getClassPreset(p.class, p.race)
  return {
    name: '',
    race: p.race,
    class: p.class,
    alignment: 'neutro-puro',
    attributes: base.attributes || createInitialAttributes(),
    element: base.element,
    plannedTalents: base.plannedTalents
  }
}