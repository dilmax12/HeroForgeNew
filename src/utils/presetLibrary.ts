import { HeroClass, HeroRace, HeroCreationData } from '../types/hero'
import { createInitialAttributes } from './attributeSystem'
import { getClassPreset } from './buildPresets'

type Preset = { id: string; name: string; class: HeroClass; race: HeroRace }

const PRESETS: Preset[] = [
  { id: 'guerreiro-humano-equilibrado', name: 'Guerreiro Humano – Equilibrado', class: 'guerreiro', race: 'humano' },
  { id: 'guerreiro-anao-tanque', name: 'Guerreiro Anão – Tanque', class: 'guerreiro', race: 'anao' },

  { id: 'mago-elfo-controle', name: 'Mago Elfo – Controle', class: 'mago', race: 'elfo' },
  { id: 'mago-humano-raio', name: 'Mago Humano – Raio', class: 'mago', race: 'humano' },

  { id: 'ladino-halfling-critico', name: 'Ladino Halfling – Crítico', class: 'ladino', race: 'halfling' },
  { id: 'ladino-humano-evasao', name: 'Ladino Humano – Evasão', class: 'ladino', race: 'humano' },

  { id: 'clerigo-humano-suporte', name: 'Clérigo Humano – Suporte', class: 'clerigo', race: 'humano' },
  { id: 'clerigo-elfo-luz', name: 'Clérigo Elfo – Luz', class: 'clerigo', race: 'elfo' },

  { id: 'patrulheiro-elfo-precisao', name: 'Patrulheiro Elfo – Precisão', class: 'patrulheiro', race: 'elfo' },
  { id: 'patrulheiro-humano-versatil', name: 'Patrulheiro Humano – Versátil', class: 'patrulheiro', race: 'humano' },

  { id: 'paladino-humano-defesa', name: 'Paladino Humano – Defesa', class: 'paladino', race: 'humano' },
  { id: 'paladino-anao-resistencia', name: 'Paladino Anão – Resistência', class: 'paladino', race: 'anao' },

  { id: 'arqueiro-elfo-critico', name: 'Arqueiro Elfo – Crítico', class: 'arqueiro', race: 'elfo' },
  { id: 'arqueiro-halfling-precisao', name: 'Arqueiro Halfling – Precisão', class: 'arqueiro', race: 'halfling' },

  { id: 'bardo-humano-buffs', name: 'Bardo Humano – Buffs', class: 'bardo', race: 'humano' },
  { id: 'bardo-elfo-controle', name: 'Bardo Elfo – Controle', class: 'bardo', race: 'elfo' },

  { id: 'monge-humano-regeneracao', name: 'Monge Humano – Regeneração', class: 'monge', race: 'humano' },

  { id: 'assassino-halfling-critico', name: 'Assassino Halfling – Crítico', class: 'assassino', race: 'halfling' },
  { id: 'assassino-humano-furtividade', name: 'Assassino Humano – Furtividade', class: 'assassino', race: 'humano' },

  { id: 'barbaro-orc-fogo', name: 'Bárbaro Orc – Fogo', class: 'barbaro', race: 'orc' },
  { id: 'barbaro-humano-terra', name: 'Bárbaro Humano – Terra', class: 'barbaro', race: 'humano' },

  { id: 'lanceiro-elfo-perfuracao', name: 'Lanceiro Elfo – Perfuração', class: 'lanceiro', race: 'elfo' },
  { id: 'lanceiro-humano-salto', name: 'Lanceiro Humano – Salto', class: 'lanceiro', race: 'humano' },

  { id: 'druida-elfo-equilibrado', name: 'Druida Elfo – Equilibrado', class: 'druida', race: 'elfo' },
  { id: 'druida-humano-suporte', name: 'Druida Humano – Suporte', class: 'druida', race: 'humano' },

  { id: 'feiticeiro-humano-debuffs', name: 'Feiticeiro Humano – Debuffs', class: 'feiticeiro', race: 'humano' },
  { id: 'feiticeiro-orc-invocacoes', name: 'Feiticeiro Orc – Invocações', class: 'feiticeiro', race: 'orc' }
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